# Weight mode template (ensemble weighting mode)

A **weight mode** decides how to weight the streams of a project. It is a
self-registering plugin: adding one = creating it here; removing one = deleting
it.

## Time belongs to the engine

A weight mode **cannot see the future, by construction**. The engine
(`reporting/pesi_causali.py`) calls `compute()` at every rebalance date `t`
and passes it **only the days before `t`** — the last close known when the
decision is taken. The weights it returns are used from `t` until the next
rebalance. Whatever the code does, it has no later data to read: there is no
full-period estimate, and no way to write one.

The same function runs live, on the returns recorded up to the last close:
backtest and live decide the same way.

## Contract (mandatory)

A `weights/<key>/weight_mode.py` (or `weights/<key>.py`) file MUST expose two
things at module level:

### 1. `META` — metadata dictionary
```python
META = {
    "key":   "my_key",              # unique identifier [a-z0-9_], = folder name
    "label": "My label",            # name shown in the UI
    "group": "Risk / covariance",   # grouping in the UI
    "order": 50,                    # ordering in the UI
    "hint":  "Short description of what it does.",
    # optional — when the engine asks:
    "rebalance_days": 63,           # every how many days (default: the project's rebalance_freq_days)
    "min_history_days": 252,        # history needed before the first estimate (before: equal weights)
    "window_days": 504,             # rolling window; absent = all the history available
}
```
Instead of a number you can name a project parameter, e.g.
`"window_days": "estimation_window_days"`. The old `"kind"` key is accepted and
ignored.

### 2. `compute(eng, stream_pnls)` — the weights for the next period
```python
def compute(eng, stream_pnls: dict[str, pd.Series]) -> dict[str, float]:
    ...
    return {name: weight, ...}
```
- **Input** `stream_pnls`: `{stream_name: pandas series of PnL}`, **only the
  days before the decision** (and only the last `window_days`, if declared).
- **Input** `eng`: a read-only view of the engine at the decision date:
  `eng.data` (the decision date), the constraints `eng.min_weight`,
  `eng.max_weight`, `eng.vol_target`, the project parameters
  (`eng.rebalance_freq_days`, `eng.estimation_window_days`, ...) and the regime
  series the engine knows (e.g. `eng._trend_regime`), cut before `eng.data`.
  Nothing else: no full streams, no paths, no methods.
- **Output**: `{stream_name: weight}` — **long-only**, normalised to sum 1,
  clipped into `[eng.min_weight, eng.max_weight]`. Return `{}` if it cannot be
  computed: the engine uses equal weights for that period and counts it.
- No loop over time and no table of weights: one dictionary, for one date.
  (Old modes that return a DataFrame still work: the engine takes its last
  row — computed, like everything else, from the past only.)

## Allowed imports

Numerical work and the internal contract only:
`numpy`, `pandas`, `math`, `statistics`, `logging`, `scipy`, `sklearn`,
`lightgbm`, and `reporting.metrics` (e.g. `ANN_FACTOR`, `rolling_sharpe`).

**Forbidden** (the validator blocks them): `os`, `sys`, `subprocess`, `socket`,
`requests`, `open`, `eval`, `exec`, `__import__`, `importlib`, and any reading
or writing of files or the network — including pandas/numpy I/O
(`pd.read_parquet`, `pd.read_csv`, `df.to_csv`, `np.load`, ...). A weight mode
only does maths on the PnL it receives: reading the streams from disk would be
the one way around the rule above, and it is closed too.

## Complete minimal example
```python
"""Inverse-vol: weight ~ 1/volatility of each stream (template example)."""
import pandas as pd

META = {
    "key": "inv_vol_example", "label": "Inverse-Vol (example)",
    "group": "Risk / covariance", "order": 99,
    "hint": "Weight proportional to 1/volatility of each stream.",
    "rebalance_days": 21, "window_days": 126,
}

def compute(eng, stream_pnls: dict[str, pd.Series]) -> dict[str, float]:
    names = list(stream_pnls.keys())
    if not names:
        return {}
    vol = {n: float(pd.Series(stream_pnls[n]).std()) or 1e-9 for n in names}
    inv = {n: 1.0 / vol[n] for n in names}
    s = sum(inv.values()) or 1.0
    w = {n: max(eng.min_weight, min(eng.max_weight, inv[n] / s)) for n in names}
    tot = sum(w.values()) or 1.0
    return {n: v / tot for n, v in w.items()}
```

## What the project page shows

The weights **in force at the end** of the period (what live would use today),
their average over the period, and the full history of weights: every
rebalance, decided with the data available at that moment.

## Validation

Before being installed — and every time the registry loads it — the code goes
through the system validator: a **safety** check (allowed imports and calls,
no file or network access) plus a **structure** check (`META` and `compute`
present). If it does not pass, it is not loaded.

## Maintenance and external data (optional)

If the weight mode **fits a model that ages** or **reads external data that
must be kept fresh**, declare it in `META`. This is not documentation: the
system reads these keys to retrain it live on the right cadence and to refresh
its data, and the TEST broker simulation uses them to make the deadlines fire
in accelerated time.

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

**Almost always unnecessary.** A weight mode that recomputes the weights from
the covariance matrix at every rebalance — HRP, min-variance, ERC, i.e. all of
them, since the engine calls `compute()` at every rebalance — has no saved
model: it simply re-estimates. In that case write nothing: the absence
means "no maintenance", and it is the right answer.

And having a MODEL is not enough either. If the model is fitted **inside
`compute()`** — a Gaussian mixture over the current window, a LightGBM on the
history the engine passes — then it already re-estimates itself on every
call: there is no saved model, there is no pipeline to launch, and declaring
`retrain_every_days` creates a deadline for work that does not exist. Real
retraining is something else: running the component's backtest script and
promoting its result. A weight mode without that script does not have it.

The known keys are `retrain_every_days`, `retrain_every_bars`,
`retrain_on_drawdown_pct`, `data_refresh_every_days`. Sources are declared in
`required_external_data` (news, macro, fundamentals, rates): if you do not say
how often to refresh them, each one's typical cadence is used.

## One file or a folder?

A weight mode can be written in two forms, both valid:

```
weights/<key>.py                 single file — fine when one function is enough
weights/<key>/weight_mode.py     FOLDER — when several files are needed
    ├── __init__.py            (may stay empty)
    ├── weight_mode.py
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
weights/<key>/data_port.py

    FOLDER = "data/<data_folder>"

    def fetch(base_path, *, symbols=None, start=None, end=None, log=print):
        """Downloads what is missing and writes it into FOLDER."""
        return {"ok": True, "written": 0}
```

(If the artifact is still a single file, the port is a file alongside it:
`weights/<key>_data_port.py`.)

The weight mode always reads from the same folder, in backtest and live: only
who fills it changes. The system discovers the port by itself and calls it on
the declared cadence; if it fails, the runner carries on and records the
problem instead of stopping.

**A port is needed for "known" but non-downloadable sources too.** The internal
catalogue covers news, fundamentals and policy rates. Declaring
`required_external_data: ["macro"]` produces a calendar deadline, but nobody
downloads anything: macro data must be obtained with a port. See
`core/data_ports.py`.

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
