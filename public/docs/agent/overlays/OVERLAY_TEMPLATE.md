# Overlay template — reduces the ensemble's exposure

> **An overlay and a strategy with bypass are two different constructs. This is
> not a nuance.**
>
> | | OVERLAY | STRATEGY WITH BYPASS |
> |---|---|---|
> | exposes | `META` + `compute` | `DESCRIPTOR` (`bypass=True`) + `build` |
> | receives | the PnL of the already-built ensemble | some parameters |
> | returns | **multipliers** in [0, 1] | a **PnL of its own** |
> | decides | *how much* exposure to keep | *what* to do, as a stream in itself |
> | lives in | `overlays/<name>/overlay.py` | `strategies/<name>/strategy.py` |
> | is written from | Studio -> Overlays | Studio -> Strategies |
>
> `stream_category="ml_overlay"` on a strategy with bypass only says that its PnL
> behaves like a hedge (sparse, active in bursts). **It is still a strategy**: it
> is not an alternative way of writing an overlay, and in `overlays/` it would
> not be loaded — the registry looks for `META` + `compute`, would not find
> them, and the artifact would sit there invisible without raising an error. If
> your code exposes `build` and a `DESCRIPTOR`, save it from the Strategies
> section (see "Bypass" in `strategies/GUIDE_STRATEGIE_CUSTOM.md`).

## Contract (mandatory)

The file `overlays/<name>/overlay.py` (or `overlays/<name>.py`) must expose:

1. `META` — a dictionary with at least `key` and `label`; optionally `group`,
   `order`, `hint`.
2. `compute(eng, ensemble_pnl, stream_pnls) -> pandas.Series` — exposure
   MULTIPLIERS aligned to `ensemble_pnl.index`. `1.0` = full exposure,
   `0.5` = halved, `0.0` = out of the market. **Not** returns.

Allowed imports: `numpy`, `pandas`, `scipy`, `sklearn`, `lightgbm`, `math`,
`statistics`, `typing`, `logging`, plus `core` and `reporting`.
Forbidden: `os`, `sys`, `pathlib`, network, `eval`/`exec`.

## Conforming example

```python
from __future__ import annotations

import numpy as np
import pandas as pd

META = {
    "key": "my_overlay",
    "label": "My overlay",
    "group": "Risk",
    "order": 50,
    "hint": "What it is for, in one line.",
}


def compute(eng, ensemble_pnl: pd.Series, stream_pnls: dict) -> pd.Series:
    # Example: cuts back when the loss from the peak exceeds 10%.
    level = (1.0 + ensemble_pnl.fillna(0.0)).cumprod()
    drawdown = level / level.cummax() - 1.0
    # shift(1): today's decision cannot use today's return
    cut = (drawdown.shift(1) < -0.10)
    return pd.Series(1.0, index=ensemble_pnl.index).where(~cut, 0.5)
```

## Overlays installed in the old form

Some have `overlays/<name>/approach.py`: a PnL builder saved in the overlays
folder back when Studio wrote them that way. Those files are **not loaded as
overlays**: the registry looks for `META` + `compute`, does not find them, and
the artifact sits there without appearing among the switches and without
raising an error.

To recover them, one of two ways:

- if it really is an overlay (it decides *how much* exposure to keep), rewrite
  it in the form above: `META` + `compute`, in `overlays/<name>/overlay.py`;
- if it produces a PnL of its own, it is a strategy with bypass: move it to
  `strategies/<name>/strategy.py`, with `DESCRIPTOR = StrategyDescriptor(...,
  bypass=True, build=build)`, where it does get loaded.

## Maintenance and external data (optional)

If the overlay **fits a model that ages** or **reads external data that must be
kept fresh**, declare it in `META`. This is not documentation: the system reads
these keys to retrain it live on the right cadence and to refresh its data, and
the TEST broker simulation uses them to make the deadlines fire in accelerated
time.

```python
META = {
    "key": "...", "label": "...", "hint": "...",

    # how often the model must be revisited
    "maintenance": {
        "retrain_every_days": 30,
        "notes": "why this cadence",
    },
    # and/or: which external data is needed and how often to refresh it
    "required_external_data": ["macro"],
}
```

**Almost always unnecessary.** An overlay that computes a threshold on the
realised volatility of the current window has nothing to retrain. In that case
write nothing: the absence means "no maintenance", and it is the right answer.

And having a MODEL is not enough either. If the model is fitted **inside
`compute()`** — a Gaussian mixture over the current window, a walk-forward
LightGBM at every rebalance — then it already re-estimates itself on every
call: there is no saved model, there is no pipeline to launch, and declaring
`retrain_every_days` creates a deadline for work that does not exist. Real
retraining is something else: running the component's backtest script and
promoting its result. An overlay without that script does not have it.

The known keys are `retrain_every_days`, `retrain_every_bars`,
`retrain_on_drawdown_pct`, `data_refresh_every_days`. Sources are declared in
`required_external_data` (news, macro, fundamentals, rates): if you do not say
how often to refresh them, each one's typical cadence is used.

## One file or a folder?

An overlay can be written in two forms, both valid:

```
overlays/<key>.py                single file — fine when one function is enough
overlays/<key>/overlay.py        FOLDER — when several files are needed
    ├── __init__.py            (may stay empty)
    ├── overlay.py
    └── data_port.py           (optional, see below)
```

**Prefer the folder for new ones.** An artifact that needs a data port, a saved
model or notes is not a single file, and keeping those pieces scattered means
publishing, installing or deleting it becomes three operations instead of one.

Single files already installed keep working: nothing breaks. They convert
themselves on the first save from Studio.

### When the system does not know the data: the port

For a source the system does not know — a proprietary feed, an archive of your
own — you need a **port**. In the folder form it lives inside, next to the
artifact:

```
overlays/<key>/data_port.py

    FOLDER = "data/<data_folder>"

    def fetch(base_path, *, symbols=None, start=None, end=None, log=print):
        """Downloads what is missing and writes it into FOLDER."""
        return {"ok": True, "written": 0}
```

(If the artifact is still a single file, the port is a file alongside it:
`overlays/<key>_data_port.py`.)

## Complete example: an overlay that uses news

`overlays/news_pressure/` is a working example of an overlay with external
data. Two files:

```
overlays/news_pressure/
    overlay.py       META + compute — reads data/news/*.csv
    data_port.py     fetch()        — downloads the news into data/news/
```

The point to grasp: **`overlay.py` knows nothing about downloading**. It reads
`data/news/` and that is all, in backtest and live. Only who fills that folder
changes — past files in backtest, the port live.

Two practical details the example shows:

- **An overlay cannot import `data.*`.** The validator allows `core`,
  `reporting`, `strategies`, numpy, pandas, scipy, sklearn, lightgbm, math,
  statistics, typing, logging. Files are read directly with pandas starting
  from `core.paths.DATA_ROOT`. The **port**, on the other hand, may import
  `data.*`: fetching data is its job.
- **Without an archive the overlay stays transparent** (multiplier 1.0), it
  does not zero the exposure. Returning zero for missing data would empty the
  portfolio because of a file problem.

If you do not need it, it is deleted with the folder: `overlays/news_pressure/`.

### Backtest and live: what changes for the port

The port is **the same** in both worlds and fills **the same folder**. Only who
calls it, and with which bounds, changes:

| | who calls | when | `start` / `end` | `context` |
|---|---|---|---|---|
| **backtest** | the engine, when the run starts | once | the **backtest period** | `"backtest"` |
| **live** | the runner | on the cadence declared in `maintenance` | absent | `"live"` |

In a backtest the period is closed and known, so the port receives the exact
bounds: a backtest on 2015 asks for 2015 data, not "the last thirty days". Live
the period is open — tomorrow's data does not exist yet — and the port decides
by itself how far back to look (its fallback window, usually the last year).

`context` is optional: you only receive it if you declare it among the
parameters. Almost no port needs it — filling a folder is the same work in both
worlds — but it is there for those who must distinguish (for example using a
historical source in backtest and a real-time feed live).

```python
def fetch(base_path, *, symbols=None, start=None, end=None,
          context="live", log=print):
    begin = start or (_dt.date.today() - _dt.timedelta(days=365)).isoformat()
    finish = end or _dt.date.today().isoformat()
    ...
```

**The artifact knows nothing about any of this.** It reads its folder and that
is all, identical in both worlds. It is the only way for what you measure to be
what you run.
