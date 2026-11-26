# Regime rule template

A **rule** is the detection logic itself: it receives the driver series and
returns the state of the market. **Markets** (`regime/markets/*.py`) only
declare which rule to inherit.

One file = one rule. Create and edit it from the **Markets → Rules** section
of the dashboard, or by writing the file here.

## Contract

```python
META = {
    "key": "my_rule",             # = file name, [a-z0-9_]
    "label": "My rule",
    "description": "When it makes sense to use it, and on which assets.",
    "defaults": {"window": 60},   # parameters and default values
}


def compute(close: pd.Series, p: dict) -> pd.Series:
    ...   # Series of 'bull' / 'neutral' / 'bear'
```

`META` is read without running the file (`ast.literal_eval`), so it must
contain **literal values only**.

`p` arrives already merged: the rule's `defaults`, overridden by the `params`
declared by the market. You do not need to handle missing keys.

## The two non-negotiable constraints

**1. Causality.** The value at time t may use data up to t only. That means
**expanding** statistics (`.expanding()`), not whole-sample ones: a `quantile()`
computed over the entire series is look-ahead, it flatters backtests and does
not exist in production. It is the easiest mistake to make here.

**2. The three labels.** Always `bull` / `neutral` / `bear`. Strategies declare
`regime_weights` on those keys: if you return anything else, the multiplier
falls back to 1.0 and the modulation disappears silently. The *meaning* is
free — for forex `bull` means "calm", not "rising".

## Available helpers

From `regime.logics._base`:

- `_realized_vol(close, window, ann)` — annualised realised volatility
- `_expanding_median(s, min_periods)` — expanding median (non-anticipative threshold)
- `_hysteresis(raw, n_days)` — changes state only after n consecutive days

Hysteresis matters: without it, a regime becomes a reaction to noise rather than
a state.

## Safety

The code goes through the same validator used in Studio: only `numpy`, `pandas`,
`math` and `regime` are allowed. No `import os`, no file access, no network, no
`eval`. A rejected save comes with the reason.

## Minimal example

```python
import pandas as pd

from regime.logics._base import _hysteresis

META = {
    "key": "above_average",
    "label": "Above the average",
    "description": "State given by the position relative to a moving average.",
    "defaults": {"window": 100, "hysteresis_days": 5},
}


def compute(close, p):
    close = close.astype(float).sort_index()
    avg = close.rolling(int(p["window"]), min_periods=int(p["window"])).mean()
    raw = pd.Series("neutral", index=close.index, dtype=object)
    raw[close > avg] = "bull"
    raw[close < avg] = "bear"
    return _hysteresis(raw[avg.notna()], int(p["hysteresis_days"]))
```

The two imports are needed: the file is loaded as a module, and `pd` and the
helpers are not there unless imported. The result may leave out the warm-up
bars (here the first `window` days): the system reads the state as of each
date and treats the dates before the first value as `neutral`.

## After saving

Rules are hot-reloaded: the new one appears immediately in the list and in the
dropdown of the markets Configuration tab. A backtest already running does not
change mid-flight — the regime snapshot is built at the start of the run.
