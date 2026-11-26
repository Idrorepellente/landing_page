# Guide: writing a custom Strategy

This guide explains how to add a new strategy to Lyra. The system uses a
**plugin descriptor pattern**: each strategy lives in its own folder, exposes a
`DESCRIPTOR` object, and is loaded automatically by the dashboard.

---

## Contents

1. [Quick start](#quick-start) — 5 minutes to a working strategy
2. [Folder structure](#folder-structure)
3. [The `strategy.py` file and the DESCRIPTOR](#the-strategypy-file-and-the-descriptor)
4. [Implementing the strategy](#implementing-the-strategy)
5. [Shared indicators](#shared-indicators)
6. [Universe filtering](#universe-filtering)
7. [Allocator and sizing](#allocator-and-sizing)
7b. [Bypassing the allocator: `bypass=True`](#bypassing-the-allocator-bypasstrue) — a strategy that produces its own daily returns
8. [Exit Policy (TP/SL)](#exit-policy-tpsl)
9. [Testing the strategy](#testing-the-strategy)
10. [Drawing on the chart: `core.chart`](#drawing-on-the-chart-corechart) — see in the View what the strategy computed, next to its trades
10b. [Reading your indicators: `core.custom_indicators`](#reading-your-indicators-corecustom_indicators) — the values an indicator of the View exports, without rewriting it
11. [Conventions and best practices](#conventions-and-best-practices)
12. [Real examples](#real-examples)
13. [Troubleshooting](#troubleshooting)

---

## Quick start

Want a "Hello World" strategy in 5 minutes? Here are the 5 minimal files.
Studio and the agent write `__init__.py` and `run_backtest.py` by themselves:
by hand you write all five.

### 1. Create the folder

```
strategies/
└── my_strategy/
    ├── __init__.py
    ├── strategy.py
    ├── my_impl.py
    └── run_backtest.py
```

### 2. `__init__.py`

```python
"""My custom strategy."""
from .my_impl import MyStrategyImpl
from .strategy import DESCRIPTOR

__all__ = ["MyStrategyImpl", "DESCRIPTOR"]
```

### 3. `my_impl.py`

> **WARNING — mandatory engine contract**: the signature of
> `generate_signals` is EXACTLY
> `generate_signals(self, t_decision, t_execution, indicators_by_symbol, portfolio) -> list[Signal]`
> (the engine calls it by keyword: other parameter names blow up with
> `TypeError: missing arguments 'date' and 'data'`). The `style` and
> `allowed_asset_classes` properties and the `reset()` method remain mandatory.
> ALWAYS copy the skeleton below, imports included.

```python
"""Implementation of the strategy (real engine contract)."""
import pandas as pd

from strategies.base import BaseAtomicStrategy
from core.types import Side, Signal, StrategyStyle
from data.universe import AssetClass


class MyStrategyImpl(BaseAtomicStrategy):
    def __init__(self, lookback: int = 20, threshold: float = 0.05):
        super().__init__()          # sets up excluded_symbols / applicable_symbols()
        self.lookback = lookback
        self.threshold = threshold
        self._open: set = set()

    # --- engine contract (MANDATORY) --------------------------------------
    @property
    def style(self) -> StrategyStyle:
        # VALID values (core.types.StrategyStyle): TREND, MEAN_REVERSION,
        # MOMENTUM, BREAKOUT, STAT_ARB, STAT_ARB_INTRADAY, FACTOR, VALUE,
        # MACRO, CARRY, VOL. No other names exist.
        return StrategyStyle.TREND

    @property
    def allowed_asset_classes(self) -> set:
        return {AssetClass.EQUITY_STOCK, AssetClass.EQUITY_ETF}

    def reset(self):
        """Called by the engine at the start of every backtest/fold."""
        self._open = set()
    # ---------------------------------------------------------------------

    def generate_signals(self, t_decision, t_execution,
                         indicators_by_symbol, portfolio) -> list:
        """Test momentum: LONG if the return over `lookback` bars is above
        `threshold`; FLAT when the signal decays. Anti-lookahead: it uses
        ONLY `.loc[:t_decision]`."""
        t = pd.Timestamp(t_decision)
        signals: list = []
        for symbol, ind in (indicators_by_symbol or {}).items():
            close = ind.close.loc[:t]
            if len(close) < self.lookback + 1:
                continue
            ret = close.iloc[-1] / close.iloc[-self.lookback] - 1
            if ret > self.threshold:
                self._open.add(symbol)
                signals.append(Signal(symbol=symbol, side=Side.LONG,
                                      timestamp=t_execution, strength=1.0,
                                      style=self.style))
            elif symbol in self._open:
                self._open.discard(symbol)
                signals.append(Signal(symbol=symbol, side=Side.FLAT,
                                      timestamp=t_execution, strength=0.0,
                                      style=self.style))
        return signals
```

### 4. `strategy.py`

```python
"""Plugin descriptor."""
from strategies.descriptor import (
    StrategyDescriptor, StrategyTimeframe, StrategyCategory,
)
from .my_impl import MyStrategyImpl

DESCRIPTOR = StrategyDescriptor(
    name="my_strategy",
    description="Trend following 20-day lookback, threshold 5%",
    category=StrategyCategory.D1_LONG_ONLY,
    timeframe=StrategyTimeframe.D1,
    factory=lambda params: MyStrategyImpl(**params),
    default_params={"lookback": 20, "threshold": 0.05},
    required_indicators=[],   # no indicator from the shared pool
    author="Your Name",
    tags=["trend", "lookback"],
    # Exit policy: signal_only (the default) means "it closes at the next
    # rebalance, with a hard catastrophic SL at -20% per position".
    # For TP/SL by ATR or custom, see the Exit Policy section.
    exit_policy_type="signal_only",
    # Without these two the strategy is in the registry but not in «Run
    # backtest», and its results never become a stream (see step 5).
    backtest_script="strategies/my_strategy/run_backtest.py",
    output_path_pattern="output/strategies/wf_my_strategy_oos_equity*.parquet",
)
```

### 5. `run_backtest.py`

The script that «Run backtest» launches. It only delegates to the generic
walk-forward runner, which reads the DESCRIPTOR:

```python
"""Walk-forward launch: delegates to the generic runner."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from execution.run_walkforward import run_walkforward

if __name__ == "__main__":
    sys.exit(run_walkforward("my_strategy"))
```

**Done.** The registry scans `strategies/` every time it is asked: the
strategy appears in «Run backtest» without restarting, and after its first
backtest its stream appears in «Streams».

**Written elsewhere?** A strategy that already exists as a folder — written
in another editor, received as a .zip — does not need to be copied by hand:
**Studio › Strategies › Import…** takes the folder, a .zip that contains it
(or several), or a single `strategy.py`. It looks for every folder with a
`strategy.py`, takes it with all its files, shows what it found and what is
wrong before writing anything, and the strategy is in «Run backtest» right
after, without restarting. A strategy with the same name is replaced only if
you tick it, and the previous version is kept in `.studio_import/sostituiti/`.
The folder name is the strategy's name: lowercase letters, digits and
underscores, starting with a letter. The same works for overlays and weight
modes; a metric is imported from its `.py` file. A folder with an
`approach.py` (the old form of a strategy with bypass) is converted while it
is imported: see [Bypassing the allocator](#bypassing-the-allocator-bypasstrue).

Check:
```
GET http://127.0.0.1:5000/api/plugins
```

> **NB**: the generic runner attaches the DESCRIPTOR to the instance by itself,
> so the exit policy declared in it is the one the engine applies. Only a
> legacy walk-forward script must do it by hand (see the
> [Exit Policy](#exit-policy-tpsl) section → "Attaching the descriptor in the
> walk-forward script").

---

## Folder structure

The discovery system scans `strategies/` looking for folders that contain a
`strategy.py` file. The convention is:

```
strategies/
├── descriptor.py              # PROVIDED by the framework
├── registry.py                # PROVIDED by the framework
├── base.py                    # PROVIDED (the AtomicStrategy contract)
│
├── <strategy_name>/           # ← ONE FOLDER PER STRATEGY
│   ├── __init__.py            # optional but recommended
│   ├── strategy.py            # MANDATORY - exposes DESCRIPTOR
│   ├── <impl>.py              # the implementation
│   └── <subfolder>/           # arbitrary dependencies allowed
│       └── ...
```

### Discovery rules

- ✅ The folder is scanned if it contains `strategy.py`
- ❌ Folders starting with `_` or `.` are ignored (e.g. `_archived/`)
- ❌ `__pycache__` and `_archived` are skipped explicitly. The library strategies ship disabled, with a leading underscore (`strategies/_momentum/`): read them, and copy what you need under a name without it
- ❌ If `strategy.py` does not expose `DESCRIPTOR`, the strategy is skipped with a WARNING
- ❌ If the import fails (e.g. a missing dependency), the strategy is skipped
- ✅ Errors in one strategy do not break the others

### Strategy name

The name is determined by the **folder name**, not by the descriptor's `name`
field (although it is recommended that they match). So:
- `strategies/momentum/` → strategy "momentum"
- `strategies/my_cool_strategy/` → strategy "my_cool_strategy"

Convention: lowercase, snake_case, no spaces.

---

## The `strategy.py` file and the DESCRIPTOR

`strategy.py` must export a global variable called `DESCRIPTOR` of
type `StrategyDescriptor`. The framework looks it up by exact name.

### DESCRIPTOR fields

#### Required

| Field | Type | Example |
|---|---|---|
| `name` | str | `"my_strategy"` |
| `description` | str | `"Custom mean-rev 5d hold"` |
| `category` | StrategyCategory | `StrategyCategory.D1_LONG_ONLY` |
| `timeframe` | StrategyTimeframe | `StrategyTimeframe.D1` |
| `factory` | callable | `lambda p: MyImpl(**p)` |
| `default_params` | dict | `{"lookback": 20}` |
| `backtest_script` | str | `"strategies/my_strategy/run_backtest.py"` — without it the strategy is not in «Run backtest» |
| `output_path_pattern` | str | `"output/strategies/wf_my_strategy_oos_equity*.parquet"` — without it the results never become a stream |

The framework would load a DESCRIPTOR without the last two, but the dashboard
could neither run it nor show its results: for a strategy that must work in
the dashboard they are mandatory.

#### Optional

| Field | Type | Default | Notes |
|---|---|---|---|
| `excluded_instruments` | list[str] | `[]` | Tickers to exclude |
| `included_instruments` | list[str] | `[]` | If not empty, a WHITELIST (overrides the universe) |
| `required_indicators` | list[str] | `[]` | Names from the indicator pool; informative: see [Shared indicators](#shared-indicators) |
| `extra_timeframes` | list[str] | `[]` | Other timeframes whose OHLCV the runner attaches as `self.timeframes[tf][symbol]` |
| `min_lookback_days` | int | 252 | Minimum warm-up days |
| `author` | str | `""` | For ownership/credits |
| `tags` | list[str] | `[]` | Free tags (shown in the UI) |
| `enabled` | bool | True | Disable without removing |
| `exit_policy_type` | str | `"signal_only"` | The exit policy type. See the [Exit Policy](#exit-policy-tpsl) section. |
| `allocator_overrides` | dict | `{}` | Allocator overrides for THIS strategy only. See the [Allocator and sizing](#allocator-and-sizing) section. Essential for CONCENTRATED strategies (few assets). |
| `signal_overlap` | float \| None | `None` | How much the signals on different assets are THE SAME IDEA (1.0) or INDEPENDENT information (close to 0). The `correlation` sizing uses it; `None` = the walk-forward estimates it. See [Correlations between the strategy's assets](#correlations-between-the-strategys-assets). |

### Enum StrategyCategory

```python
class StrategyCategory(str, Enum):
    D1_LONG_ONLY        # daily long-only (momentum, value, quality)
    D1_LONG_SHORT       # daily long-short
    ML_OVERLAY          # ML overlay regime-dependent
    INTRADAY_MEAN_REV   # intraday mean reversion
    INTRADAY_TREND      # intraday trend
    STAT_ARB            # statistical arbitrage / pairs
    CUSTOM              # anything else (default for examples)
```

### Enum StrategyTimeframe

```python
class StrategyTimeframe(str, Enum):
    D1          # daily
    H4, H1, M30, M15, M5    # intraday
    INTRADAY    # generico intraday multi-TF
```

---

## Implementing the strategy

Your strategy class can have **any interface**, as long as the descriptor's
`factory` knows how to instantiate it. Following the framework conventions is
recommended nonetheless.

### The contract, in full

There is one, and it is not negotiable: the engine calls **by keyword** and
expects a **list of `Signal`**. A different signature — `(date, data, ...)` —
stops the backtest at the first bar with a `TypeError`, and a returned `dict`
is not even looked at.

```python
from core.types import Side, Signal, StrategyStyle, flat_signal
from strategies.base import BaseAtomicStrategy
from data.universe import AssetClass


class MyStrategyImpl(BaseAtomicStrategy):
    def __init__(self, **params):
        super().__init__()
        self.lookback = params.get("lookback", 20)

    @property
    def style(self) -> StrategyStyle:
        return StrategyStyle.TREND

    @property
    def allowed_asset_classes(self) -> set:
        return {AssetClass.EQUITY_STOCK}

    def reset(self):
        """Called by the engine at the start of every fold."""
        pass

    def generate_signals(self, t_decision, t_execution,
                         indicators_by_symbol, portfolio) -> list:
        """
        t_decision  : close of the OBSERVATION bar (T-1). The indicators are
                      read here: `.loc[:t_decision]`.
        t_execution : open of the EXECUTION bar (T). It goes into
                      `Signal.timestamp`.
        portfolio   : the current state, read-only.

        Returns list[Signal]:
            Side.LONG / Side.SHORT  -> open or keep
            Side.FLAT               -> close explicitly (`flat_signal`)
            symbol absent           -> "no opinion": the position stays
        """
        return []
```

#### The `Signal` fields that concern the size

| field | what it means | who reads it |
|---|---|---|
| `side` | the direction. `Side.FLAT` closes | always |
| `strength` ∈ [0,1] | **conviction**, not weight: it multiplies the vol budget the allocator has already distributed. It can only reduce | `correlation`, `equal_weight`, `stream_level`, `covariance` |
| `target_vol` | a vol **cap** for that position, never a target (in `correlation` the size `target_vol / vol` is the position's cap: whoever asks for a fixed 25% gets exactly that) | `correlation`, `equal_weight`, `stream_level`, `covariance` |
| `target_weight` | the **real weight** you want, as a fraction of capital. It is a MAGNITUDE: the sign is given by `side` | `explicit` only |
| `leg_id` | two legs on the same symbol that do not net (a hedge) | always |

**`strength` is not a weight.** Passing `strength=0.45` thinking "45% of the
capital" squashes the sizing by about 2x on top of the cap. If you want to
express a relative tilt between the legs, use values normalised to the maximum
(SPY 1.0, IEF 0.7, GLD 0.45), not portfolio fractions.

#### If your logic produces a WEIGHT VECTOR

It is the case of a cross-sectional optimiser: mean-variance, min-variance,
ERC between stocks, a book built with precise proportions. That vector used
not to get through — `strength` only reduces, `target_vol` is a cap, and the
allocator recomputed everything with its own budget anyway. Now it is
declared:

```python
# w = the output of your optimiser, {symbol: signed weight}
for sym, weight in w.items():
    if abs(weight) < 1e-6:
        signals.append(flat_signal(sym, t_execution, style=self.style))
        continue
    signals.append(Signal(
        symbol=sym,
        side=Side.LONG if weight > 0 else Side.SHORT,
        timestamp=t_execution,
        strength=1.0,
        target_weight=abs(weight),      # MAGNITUDE: the sign is in `side`
        style=self.style,
    ))
```

and in the YAML (or in the descriptor's `allocator_overrides`):

```yaml
strategy_mix_mode: explicit
```

In that mode the allocator **takes the vector as given**: no vol-targeting,
because whoever declares the weights has already decided how much to risk.
Only the three caps (`max_position_weight`, `max_asset_class_gross`,
`max_gross_leverage`) and the risk manager stay in force.

Three things to know before using it:

- **in every other mode `target_weight` is ignored.** Declaring it is not an
  error: a strategy can always fill it and work everywhere. But if you expect
  your weights and the mode is not `explicit`, you will not get them;
- **whoever does not declare the weight counts as zero**, in that mode. Mixing
  "I decide" and "you decide" in one book would mean that neither controls the
  total risk. The allocator flags it once per run;
- **no vol-targeting, and `portfolio_target_vol_annual` has NO effect here.**
  The key stays in the YAML but does nothing: the allocator tells you once per
  run. A fixed vector does not have a fixed risk — the same weights that make
  the account swing by 11% in a calm market make it swing by 41% in a crisis,
  with the same capital employed.

If you want your weights **and** a stable risk, ask for it:

```yaml
strategy_mix_mode: explicit
explicit_vol_target: 0.12      # absent = execute what I declared
```

The book is multiplied by a single factor, computed on the estimated
correlations: the proportions between the stocks stay identical, the size
changes. Without a usable estimate nothing is rescaled and the weights stay
yours.

> **Inside a project with several streams there is a second rescaling, and it
> is not yours.** Before weighting the streams, the ensemble brings each one to
> `ensemble.target_vol` (10% a year by default). It holds in backtest and live
> in the same way, so it is not a surprise in production — but it means that
> **the vol your strategy declares on its own is not the one it will run with
> in a project**: a book at 4% is multiplied by 2.5, one at 25% by 0.4. On its
> own (a runner on a single artifact) the rescaling does not happen. The
> details are in ARCHITETTURA.md §7.1.

If instead you want "I decide the SHAPE, the system takes care of the risk"
without declaring absolute weights, the right mode is still `covariance` — see
the caveat further on and ARCHITETTURA.md §6.

> **The node blueprint does not use `target_weight`.** A graph of boolean
> conditions emits buy/sell impulses, not weights: the strategies compiled from
> a blueprint stay at `strength` 1.0/0.0 and are sized by the allocator.

### Anti-lookahead-bias

**GOLDEN RULE**: use only data `<=` the current decision time.

```python
# ✅ RIGHT
close = ind.close.loc[:t_decision]   # all the data UP TO t_decision (included)

# ❌ WRONG
close = ind.close                    # it may contain future dates
last_value = ind.close.iloc[-1]      # in a backtest, the last row is the FUTURE
```

If you use an IndicatorPool of your own, its values are pre-computed on the
whole history — so read them with `.loc[:t_decision]` too:
`pool.get(sym, "sma_200").loc[:t_decision].iloc[-1]`.

### Compatibility with the existing system (AtomicStrategy)

To run in `WalkForward`/`engine.py` (the backtest system, and the live runner
that replays it) a strategy extends `BaseAtomicStrategy` from
`strategies/base.py`. The 3 core strategies (momentum, quality_lv, value) use
this contract.

> ⚠️ **WARNING — the only signature the walk-forward and the live accept**
>
> `generate_signals(self, t_decision, t_execution, indicators_by_symbol, portfolio)`,
> called by keyword, returning a **list of `Signal`**. Another signature
> (`(date, data, ...)`) stops the backtest at the first bar with a
> `TypeError`; a `dict {symbol: weight}` returned instead of the list is not
> read at all.

#### Required imports

```python
from datetime import datetime

from core.indicators import PrecomputedIndicators   # per-symbol data
from core.portfolio import Portfolio                 # portfolio state
from core.types import Side, Signal, StrategyStyle, flat_signal
from data.universe import AssetClass
from strategies.base import BaseAtomicStrategy
```

#### The full signature of `generate_signals`

```python
import pandas as pd


class MyAtomicStrategy(BaseAtomicStrategy):

    _STYLE   = StrategyStyle.MOMENTUM
    _ALLOWED = {AssetClass.EQUITY_STOCK}

    def __init__(self, my_param: int = 20):
        super().__init__()          # WITHOUT arguments
        self.my_param = my_param
        # internal state
        self._current_longs:  set[str] = set()
        self._current_shorts: set[str] = set()

    @property
    def style(self) -> StrategyStyle:       # a property, not a class attribute
        return self._STYLE

    @property
    def allowed_asset_classes(self) -> set[AssetClass]:   # the same
        return self._ALLOWED

    def reset(self) -> None:
        """Called by the engine at the start of every fold."""
        self._current_longs.clear()
        self._current_shorts.clear()

    def generate_signals(
        self,
        t_decision: datetime,               # decision timestamp (bar close)
        t_execution: datetime,              # execution timestamp (bar open T+1)
        indicators_by_symbol: dict[str, PrecomputedIndicators],
        portfolio: Portfolio,
    ) -> list[Signal]:                      # a LIST of Signal, NOT a dict
        t_dec = pd.Timestamp(t_decision)

        target_longs:  set[str] = set()
        target_shorts: set[str] = set()

        for sym, ind in indicators_by_symbol.items():
            # ✅ Price access: ind.close is a pd.Series with a DatetimeIndex
            close = ind.close.loc[:t_dec].dropna()
            # The WHOLE BAR is available: open, high, low, volume are
            # pd.Series like close, aligned to the same DatetimeIndex.
            #   highs = ind.high.loc[:t_dec]
            #   gap   = ind.open / ind.close.shift(1) - 1
            # If you need it all together: ind.ohlcv() -> an OHLCV DataFrame.
            if len(close) < self.my_param:
                continue
            # ... signal logic ...
            target_longs.add(sym)

        signals: list[Signal] = []

        # Close the positions that left the target
        for sym in (self._current_longs - target_longs):
            signals.append(flat_signal(
                symbol=sym, timestamp=t_execution, style=self._STYLE,
            ))

        # Emit the longs (new and kept)
        for sym in target_longs:
            signals.append(Signal(
                symbol=sym,
                side=Side.LONG,
                target_vol=0.005,           # vol ann target per position
                timestamp=t_execution,
                style=self._STYLE,
            ))

        self._current_longs  = target_longs
        self._current_shorts = target_shorts
        return signals
```

### Maintenance: retraining and data freshness

The system needs to know how often the strategy retrains and how often the
data it uses must be re-downloaded. It needs this to actually schedule the work
— live and in the TEST broker simulation — not for documentation.

**In most cases you do not need to write anything.** These cadences are
usually already in the code, and the system reads them from there.

From the parameters the strategy already exposes:

| if `default_params` contains... | it is read as |
|---|---|
| `retrain_every_days`, `retrain_days` | retraining in days |
| `retrain_every`, `retrain_every_bars` | retraining in bars |
| `retrain_dd`, `retrain_on_drawdown_pct` | drawdown threshold |
| `data_refresh_every_days` | data freshness |

A threshold written as a fraction (`retrain_dd=0.05`) is recognised as 5%,
not as 0.05%.

A cadence in bars becomes time with the strategy's timeframe and market: 16
M15 bars are 4 hours on forex and crypto (24 hours a day) and 16/26 of a
session on stocks (6.5 hours). The market is the one of the instruments in
`included_instruments`, stocks when it lists none. Before, on a real account
every bar counted as a day: an M15 strategy that retrains every 16 bars was
scheduled every 16 days.

And from the data sources you already declare in `required_external_data`
(plus `required_mms_features` and `required_volume_profile`): if you do not say
how often to update them, the typical cadence of each one is used — news every
day, fundamentals every quarter.

So a normal strategy — one that parametrises its own retraining and declares
the data it needs — **adds nothing**:

```python
DESCRIPTOR = StrategyDescriptor(
    ...
    default_params={"retrain_every_days": 14, "retrain_dd": 0.08},
    required_external_data=["news"],
    # and that is all: the system deduces "retrain every 14 days or on a
    # drawdown > 8%, news to update every day"
)
```

A strategy that does not retrain and uses no auxiliary data writes nothing at
all: it is the most common case, and it is right that way.

#### When it must be declared by hand

Only if the cadence **appears nowhere** — for example a model that retrains
inside the training pipeline, without a matching parameter. In that case there
is the `maintenance` field:

```python
    maintenance={
        "retrain_every_days": 30,          # or in bars: retrain_every_bars
        "retrain_on_drawdown_pct": 5.0,    # the drop threshold
        "data_refresh_every_days": 1,      # data freshness
        "notes": "why this cadence",
    },
```

All the keys are optional.

**Do not write it if the value already exists elsewhere.** Duplicating it
creates two numbers free to diverge: you change the parameter, you forget the
field, and the system schedules on the old cadence. `retrain_on_drawdown_pct`
fires when the threshold is crossed, not for the whole time you stay below it:
it becomes ready again when the drop recovers, otherwise a prolonged decline
would retrain every day.

#### Retraining inside the strategy's own code

There are two kinds of retraining, and the runner treats them differently:

- **a component with a training pipeline** (`pipeline.py`,
  `run_ml_pipeline.py` or an `ml/` folder next to `strategy.py`): the runner
  launches the pipeline at the declared cadence, as in the backtest;
- **a strategy that refits its model by itself**, inside `generate_signals`
  (every N bars, every few hours, on a drawdown): there is nothing to launch.
  Live and in the TEST simulation the journal says it once — *"retraining
  every 4 hours happens inside its own code, nothing to launch here: its
  refits appear in this journal when they happen"* — and then shows each
  refit, if the strategy reports it with `runner_events` (next paragraph).

Declaring the cadence (`retrain_every_bars`, `retrain_every_days` or
`maintenance`) is still useful in the second case: it is what the maintenance
panel shows. The cadence is written as people say it: *every 4 hours*,
*every 10 minutes*, *every day*, *every 14 days*.

Before, the runner launched the training pipeline also for the strategies of
the second kind, which have none: the step failed every time, and the refits
that did happen were invisible.

#### Telling the live journal what happens: `runner_events`

A strategy can keep a list called `runner_events` and append to it what is
worth knowing while it runs: a model refitted, a datum that is missing, a
filter that switched off trading. Live, the stream empties the list after
every bar and writes each item into the runner's journal, with its colour.

```python
class MyStrategy:
    def __init__(self, ...):
        self.runner_events = []        # the live journal reads and empties it

    def generate_signals(self, t, data, ...):
        if self._refit_due(t):
            n = self._fit(...)
            self.runner_events.append({
                "text": f"model refit on {n} bars up to {t:%Y-%m-%d %H:%M}",
                "kind": "maintenance",   # info | maintenance | warning
                "time": str(t),          # the bar it refers to
            })
            del self.runner_events[:-50] # in backtest nobody empties it
        ...
```

The rules:

| | |
|---|---|
| an item | a text; a dictionary `{"text", "kind", "time"}`; or a pair `(kind, text)` |
| `kind` | `info` (default), `maintenance`, `warning`; anything else becomes `info` |
| per bar | at most 20 lines, then one line saying how many more there were |
| the replayed history | when the stream builds the strategy it replays the past bars: those events are the past. The first time the journal gets **one line** with how many there were and the last one; on later rebuilds (new extra data, a restart) only the items whose `time` is **after the last bar already seen** |
| backtest | nobody reads the list: keep only the last items (`del self.runner_events[:-50]`) |

Put `time` on the items: without it, the events produced while replaying the
history cannot be told apart from the new ones, and on a rebuild they are
dropped.

### The data port: `data_port.py`

If the strategy reads data that **does not exist yet** at the moment it will
run live — news, a proprietary feed, anything arriving from outside — it must
tell the system how to get it.

The key point: **the strategy always reads from the same folder**, in backtest
and live. Only who fills it changes. In backtest the files are already there
because they cover the past; live the port downloads what follows and
writes it **to the same place**. That way the strategy's code does not change by
one line between the two worlds, and there is no way they read different data.

It is written in a `data_port.py` file inside the strategy's folder:

```
strategies/<name>/
    strategy.py
    data_port.py      <-- here
```

```python
"""Data port of <name>: gets <what> the strategy reads."""
import datetime as _dt

FOLDER = "data/news"        # where the backtest reads (optional, informative)


def fetch(base_path, *, symbols=None, start=None, end=None, log=print) -> dict:
    """Downloads what is missing and writes it into FOLDER."""
    finish = end or _dt.date.today().isoformat()
    ...
    return {"ok": True, "written": 12}
```

**One mandatory function**: `fetch`. All the arguments after `base_path` are
optional and can be ignored.

What happens next, with nothing else on your part:

- the system **discovers** it from the file name, no registration needed;
- it calls it live on the maintenance cadence, and once at the start of a
  backtest to fill the gaps;
- if the strategy does not declare `data_refresh_every_days`, having a port
  already implies a **daily** cadence — the most cautious one;
- if the port fails, the runner **carries on**: the strategy works on the data
  it has and the problem goes into the log. Stopping everything because a feed
  does not answer would be worse than the missing data.

**Before writing a port, check whether the data is a category.** The data
categories (Settings › Data) have a **source** that keeps them up to date by
itself — news, earnings, fundamentals, policy rates, macro series, MMS
features, and any category you create once you write its `_source.py`
(`DATA_SOURCE_TEMPLATE.md`). For those **no port needs writing**: declare them
in `required_external_data` and the system downloads what is missing at the
start of a backtest (up to the end of its period), and keeps them updated live
at your cadence, in the background. New rows are **added** to the files; the
rows already there never change.

The port is for data that is private to the strategy and that no category
describes. It must not write into the folder of a category: two writers with
different rules on the same files is exactly the divergence this whole
mechanism exists to prevent.

#### Live: the new rows go to `data/live`

While a live runner is on, what a port (or a category source) downloads does
not go into the files of `data/` that the backtests read, but into
`data/live/`, with the same folders (`data/news/AAPL.parquet` →
`data/live/news/AAPL.parquet`), and the runner reads the two together. The
strategy does not need to know: inside the runner `pd.read_parquet`,
`pd.read_csv` and `pd.read_feather` on a file of `data/` return the rows of
`data/` followed by those of `data/live`. The user merges them into `data/`
from Settings › Data › Live data (the check fills the empty periods or asks)
or deletes them; outside the runner — a backtest, a page — only `data/` is
seen.

What a port should do:

- **write with `data.estendi.estendi(path, new_rows, key)`**: it adds only
  the rows the file lacks, keeps the file's format (a CSV its header,
  separator and date style) and, live, writes into `data/live` by itself.
  `key="index"` for a series with the dates as index, a list of columns for
  events (`["date", "headline"]`);
- **restart from `data.estendi.ultima_data(path)`**: live it is the most
  recent date between `data/` and `data/live`;
- **look for files with `data.vivo.esiste(path)` and
  `data.vivo.elenca(folder, "*.parquet")`**: `Path.exists()` sees only
  `data/`, so live a file downloaded the day before would look missing and be
  downloaded again from the start.

A port that writes on its own with pandas — `df.to_parquet(path)`,
`df.to_csv(path, mode="a")`, a temporary file then `os.replace` — is
intercepted live: the new rows go into `data/live` with the format of the
file, never into `data/`. A write with `open()` (a JSON, a text file) cannot
be intercepted: ask where to write with `data.vivo.destinazione(path)` — the
path itself outside the live, its copy in `data/live` inside.

#### Critical points

| What | ✅ Right | ❌ Wrong |
|---|---|---|
| `super().__init__()` | With no arguments | With `**kwargs` → crash |
| `style` / `allowed_asset_classes` | `@property` | A static class attribute |
| Price access | `ind.close.loc[:t_dec]` | `data[sym]["close"]` |
| Whole bar | `ind.high`, `ind.low`, `ind.open`, `ind.volume` — or `ind.ohlcv()` | `ind.df` (does not exist) |
| Return type | `list[Signal]` | `dict[str, float]` |
| Closing a position | `flat_signal(sym, ...)` | `{sym: 0}` |
| `logger` in `__init__` | `logger.debug(...)` | `logger.info(...)` → floods the log |

#### Handling positions between rebalances

A symbol missing from the list means "I hold" (see the contract above): a
strategy with a periodic rebalance (e.g. weekly) can return `[]` outside the
rebalance days, and the book stays as it is. What it must not do is emit only
part of the book on those days: the signals of a bar are sized together, so
the ones emitted would be resized while the others stay put. Either nothing,
or the whole current book, as below:

```python
def __init__(self, rebalance_every: int = 5, ...):
    super().__init__()
    self._days_since_rebalance: int = 9999  # forces a rebalance at the first step
    self._current_longs:  set[str] = set()
    self._current_shorts: set[str] = set()

def generate_signals(self, t_decision, t_execution, indicators_by_symbol, portfolio):
    self._days_since_rebalance += 1
    if self._days_since_rebalance < self.rebalance_every:
        # Outside the rebalance: re-emit the unchanged Signals
        return self._emit_current(t_execution)

    self._days_since_rebalance = 0
    # ... recompute the target and build the Signals ...

def _emit_current(self, t_execution: datetime) -> list[Signal]:
    signals = []
    for sym in self._current_longs:
        signals.append(Signal(symbol=sym, side=Side.LONG,
                              target_vol=self.target_vol, timestamp=t_execution,
                              style=self._STYLE))
    for sym in self._current_shorts:
        signals.append(Signal(symbol=sym, side=Side.SHORT,
                              target_vol=self.target_vol, timestamp=t_execution,
                              style=self._STYLE))
    return signals
```

Initialising `_days_since_rebalance = 9999` (instead of 0) guarantees that the
first step is always a rebalance, with no separate `if first_run` logic.

See `strategies/_ising_inverse/strategy.py` for a complete example.

---

## Shared indicators

`indicators_by_symbol[sym]` is a `core.indicators.PrecomputedIndicators`: the
engine builds it once per symbol, on the whole range, before the folds run
(there is no look-ahead as long as the strategy slices with
`.loc[:t_decision]`). It holds the raw bar and a fixed set of indicators, all
`pd.Series` on the same `DatetimeIndex`:

| Field | What it is | Window |
|---|---|---|
| `open`, `high`, `low`, `close`, `volume` | the raw bar (`ohlcv()` returns them as one DataFrame) | — |
| `log_returns`, `returns_pct` | bar-to-bar returns | — |
| `atr` | Average True Range (Wilder) | 14 |
| `sma_fast`, `sma_slow` | simple moving averages | 20, 100 |
| `zscore` | (close − mean) / std | 20 |
| `rolling_std` | std of the pct returns | 20 |
| `realized_vol` | annualised vol of the log returns | 60 |
| `regression_slope`, `regression_r2` | OLS slope of log(close) and its R² | 90 |
| `rolling_beta` | beta against the benchmark (SPY) | 60 |

Any other window or indicator is computed from the bar, inside
`generate_signals`, on the data up to `t_decision`:

```python
close = ind.close.loc[:t_decision]
sma_200 = close.rolling(200).mean().iloc[-1]
d = close.diff()
up = d.clip(lower=0).ewm(alpha=1 / 14, adjust=False).mean()
dn = (-d).clip(lower=0).ewm(alpha=1 / 14, adjust=False).mean()
rsi_14 = (100 - 100 / (1 + up / dn)).iloc[-1]
```

For a D1 strategy recomputing a window at every bar costs little. When it does
not (long windows on intraday bars, many symbols), compute the whole series
once — on the first call, or from data passed by `prepare_extra_data` — and
read it with `.loc[:t_decision]` afterwards.

### The indicator pool and `required_indicators`

`core/indicator_pool.py` names indicators with strings, `<base>_<param1>_<param2>...`:

| Name | Examples | What it does |
|---|---|---|
| `sma_<N>` | `sma_50`, `sma_200` | Simple Moving Average over N bars |
| `ema_<N>` | `ema_21`, `ema_50` | Exponential Moving Average |
| `rsi_<N>` | `rsi_14` | Relative Strength Index |
| `atr_<N>` | `atr_14` | Average True Range |
| `bb_<N>_<std>` | `bb_20_2` | Bollinger bands, N periods, std multiplier |
| `realized_vol_<N>` | `realized_vol_21`, `realized_vol_252` | Realized volatility (annualised) |
| `momentum_<lookback>_<skip>` | `momentum_252_21` | Return from `lookback` to `skip` bars ago |
| `zscore_<N>` | `zscore_60` | Rolling z-score of the returns |
| `drawdown` | `drawdown` | Current drawdown vs the running max |

**The engine does not pass the pool to `generate_signals` yet.** The names in
`required_indicators` say what the strategy uses (the dashboard lists them);
they do not add attributes to `indicators_by_symbol[sym]`, and a strategy that
declares them is not exercised by the agent's quick check (its walk-forward is
the test). A strategy that wants the pool builds one of its own (see
[Usage pattern (today)](#usage-pattern-today)).

### Registering new built-in indicators

If you add one you use often, register it in the global pool:

```python
# In a module loaded at start-up (e.g. my_extension.py)
from core.indicator_pool import register_indicator

def _my_oscillator(df, period):
    # ... compute ...
    return series

register_indicator("my_osc", _my_oscillator)
# Now an IndicatorPool can compute "my_osc_14"
```

### The strategy does not appear in «Run backtest»

Almost always `backtest_script` is missing from the descriptor:

```python
DESCRIPTOR = StrategyDescriptor(
    name="my_strategy",
    ...
    backtest_script="strategies/my_strategy/run_backtest.py",
)
```

`list_available_strategies()` lists only the strategies whose descriptor
declares the script: it is how the system tells a runnable strategy from a
support library. Without that field the strategy is still discovered by the
registry — it appears in the startup logs with `[OK]` — but it is not in the
list of backtests, and that is easy to misread.

Quick check:

```
python -c "from execution.backtest_runner import list_available_strategies; \
           print('my_strategy' in list_available_strategies())"
```

## The backtest runs but the stream does not appear in «Streams»

`output_path_pattern` is missing. They are two different things and both are
needed:

```python
DESCRIPTOR = StrategyDescriptor(
    ...
    # so that it appears in «Run backtest»
    backtest_script="strategies/my_strategy/run_backtest.py",

    # so that the RESULT appears in «Streams»
    output_path_pattern="output/strategies/wf_my_strategy_oos_equity*.parquet",
    stream_type="equity_curve",     # or pnl_daily, pnl_sparse
    stream_category="d1",           # or intraday
)
```

The stream registry skips with `continue` every descriptor lacking
`output_path_pattern`: without it, it would not know where to look for the
result. `run_walkforward` writes the file as `wf_<name>_oos_equity.parquet`,
so the pattern must be written with the strategy's name.

Quick check:

```
python -c "from dashboard.config import build_streams_config; \
           print('my_strategy' in [s.name for s in build_streams_config()])"
```

## Declaring a custom category

Categories are no longer a fixed list: they can be added from Config or from
the Data page, and a strategy can declare them like any other.

```python
from data.universe import AssetClass

class MyStrategy:
    _ALLOWED = {AssetClass.FX_SPOT}              # a system category
    _ALLOWED = {"physical_energy"}               # a category you added
    _ALLOWED = {AssetClass.FX_SPOT, "physical_energy"}   # both
```

The three forms are equivalent: the comparison is on the strings, so
`AssetClass.FX_SPOT`, `"fx_spot"` and `"FX_SPOT"` mean the same thing.

The identifier to use is the one shown next to the name in Config (in
monospace): `physical_energy`, not `Physical energy`.

**One thing to watch.** If you delete a category that a strategy declares,
the strategy is left with an empty universe and the backtest stops saying
there are not enough symbols. Deleting from Config asks where to move the
assets, but the strategies naming the category must be updated by hand.

## Multi-timeframe: INDICATORS on higher timeframes

> Two distinct mechanisms, often confused because they used to have the same
> title. Here: **indicators** computed on a larger TF, named with the `@<TF>`
> suffix. Further on: **whole OHLCV series** on other TFs, with
> `extra_timeframes` — [Multi-timeframe: additional SERIES](#multi-timeframe-additional-series-extra_timeframes).
> They can be used together.

**What works today.** The `@<TF>` names belong to `core.indicator_pool.IndicatorPool`.
The engine does not pass the pool to `generate_signals` (see
[Shared indicators](#shared-indicators)): `ind.get("sma_50@H4")` does not exist
on `indicators_by_symbol[sym]`. Two supported routes:

- **`extra_timeframes`** (recommended): the runner attaches the series of the
  other timeframes to the instance, `self.timeframes["H4"]["EURUSD"]` → an
  OHLCV DataFrame, already aligned to the common period. You compute the
  indicator on the **last closed bar** of that series;
- **a pool of your own** inside the strategy, built on the data that
  `prepare_extra_data` passes to the constructor (the pattern at the end of
  this section).

#### Syntax

The `@<TF>` suffix on the indicator's name:

```python
pool.precompute([
    "atr_14",            # base-TF ATR
    "sma_50@H4",         # SMA 50 computed on H4
    "sma_200@D1",        # SMA 200 computed on D1
    "rsi_14@H4",         # RSI 14 computed on H4
])
```

Supported timeframes: `M5`, `M15`, `M30`, `H1`, `H4`, `D1`, `W1`. The minimum granularity is M5 because it is the finest data currently in cache (Polygon equity, Dukascopy FX). To support M1 in future, just add the corresponding row to `TIMEFRAME_MAP` in `core/indicator_pool.py`, ONLY after M1 data is actually available.

Constraint: the target timeframe must be **>=** the base one. A D1 strategy cannot request M5 indicators (M5 bars cannot be derived from D1 bars).

#### Access from the strategy

With `extra_timeframes=["H4"]` in the DESCRIPTOR:

```python
def generate_signals(self, t_decision, t_execution, indicators_by_symbol, portfolio):
    h4 = self.timeframes.get("H4", {}).get("EURUSD")
    if h4 is None:
        return []                                   # not attached: nothing to decide
    closed = h4.loc[h4.index < t_decision]           # only the H4 bars already closed
    sma_h4 = closed["close"].rolling(50).mean().iloc[-1]
    atr_m5 = indicators_by_symbol["EURUSD"].atr.loc[:t_decision].iloc[-1]
    # ... logic ...
```

Whether the bar labelled `t_decision` is closed depends on how the file
labels its bars: `strategies/_mtf_esempio/` shows the check for the D1/H4 case.

#### Anti-leak guarantee (important)

The pool applies a precise rule to prevent look-ahead bias:

> A bar of the target timeframe becomes visible to the strategy **only after it closes**.

Example (base M5, target H4):
- the strategy decides at the M5 timestamp 14:30
- H4 bar `[12:00-16:00]` is "in progress" (it will close at 16:00) → **NOT visible**
- H4 bar `[08:00-12:00]` is already closed → **visible**, value used by the strategy

So `sma_200@H4` read at 14:30 is using an SMA bar computed on data up to 12:00. The minimum necessary lag, no extra delay.

When the next H4 closes (at 16:00 in the example), the value becomes available on the 16:00 M5 bar — a strategy deciding at 16:00 can already use it. Consistent with the engine's T+1 pattern (signal computed at the close, trade at the next open).

#### Internal implementation (for those who want to understand)

`core/indicator_pool.py` handles the multi-timeframe in 3 steps:
1. Resample of the base dataframe (M5) to the target (H4) with `closed='right', label='right'` (bar `[12:00-16:00]` has index 16:00)
2. Computation of the indicator on the resampled dataframe
3. Reindex onto the base index with `method='ffill'`: the target bar's value is propagated onto the base bars **starting from the target bar's own index** (= its close time)

The anti-leak guarantee comes from the semantics of `ffill`: a target bar with close time T propagates its value ONLY from T onwards, never onto base timestamps in the range `[T-target_tf, T)` (that is, while the bar is forming). No artificial shifts are needed, and it is impossible for the strategy to "see the future".

#### Usage pattern (today)

The system has two indicator infrastructures side by side:

- **`core.indicators.PrecomputedIndicators`**: a dataclass with fixed fields, used by the engine and the existing strategies. Single timeframe. It holds:
  - the **raw bar**: `open`, `high`, `low`, `close`, `volume` (pd.Series), or `ohlcv()` which returns them together as a DataFrame;
  - the **derived indicators**: `atr`, `sma_fast`, `sma_slow`, `regression_slope`, `regression_r2`, `zscore`, `rolling_std`, `realized_vol`, `log_returns`, `returns_pct`, and the optional `rolling_beta`, `mms`, `volume_profile_zones`.

  `has_full_bars()` says whether open/high/low are the real ones: on a source lacking those fields `ohlcv()` falls back to `close` instead of raising, and this method lets you notice.
- **`core.indicator_pool.IndicatorPool`**: a dynamic string-keyed pool (`sma_200`, `rsi_14@H4`, etc.), it supports multi-timeframe and automatic routing per asset class. Not wired into the engine yet.

For a strategy that wants the pool, the clean route today is to **instantiate `IndicatorPool` internally**, on the data the `prepare_extra_data` hook passes to the constructor:

```python
from core.indicator_pool import IndicatorPool
from strategies.base import BaseAtomicStrategy

def prepare_extra_data(cfg: dict) -> dict:
    from data.loader import load_fx_pair
    pairs = ["EURUSD", "GBPUSD"]
    return {"all_data": {p: load_fx_pair(p, interval="M5") for p in pairs}}

class FXMultiTFTrend(BaseAtomicStrategy):
    def __init__(self, all_data: dict, base_tf: str = "M5", **params):
        super().__init__()
        # A multi-TF pool private to the strategy
        self._pool = IndicatorPool(data=all_data, base_timeframe=base_tf)
        self._pool.precompute([
            "atr_14",            # M5 ATR (base)
            "sma_50@H4",         # SMA on H4 (resample + anti-leak)
            "sma_200@D1",        # SMA on D1
            "rsi_14@H4",
        ])

    def generate_signals(self, t_decision, t_execution, indicators_by_symbol, portfolio):
        # indicators_by_symbol comes from the engine (PrecomputedIndicators),
        # the multi-TF values come from the internal pool
        for sym in self._pool.data:
            sma_d1 = self._pool.get(sym, "sma_200@D1").loc[:t_decision].iloc[-1]
            sma_h4 = self._pool.get(sym, "sma_50@H4").loc[:t_decision].iloc[-1]
            rsi_h4 = self._pool.get(sym, "rsi_14@H4").loc[:t_decision].iloc[-1]
            # ... multi-TF logic ...
```

The keys returned by `prepare_extra_data` reach the constructor as keyword
arguments (see [Optional hooks](#optional-hooks-for-strategies-with-special-needs)).

In future the engine may become natively multi-TF by integrating `IndicatorPool` as the default. Until then, the routes above are the supported ones.

---

## Universe filtering

Every strategy can filter the available universe in two ways:

### Excluded (blacklist)

```python
DESCRIPTOR = StrategyDescriptor(
    ...
    excluded_instruments=["TSLA", "GME", "AMC"],
)
```

The strategy does not trade these tickers. All the other tickers in the
universe are allowed.

### Included (whitelist)

```python
DESCRIPTOR = StrategyDescriptor(
    ...
    included_instruments=["AAPL", "MSFT", "GOOGL", "AMZN", "META"],
)
```

The strategy trades ONLY these 5 tickers. Everything else is ignored.

**Rule**: if `included_instruments` is non-empty, it overrides `excluded_instruments`.

### Helper

```python
from strategies.registry import filter_universe

filtered = filter_universe(symbols_full_universe, DESCRIPTOR)
# filtered holds only the tickers the strategy allows
```

### Delisted assets and index membership

A universe built from today's constituents of an index holds only the
survivors: the companies that were taken over, went bankrupt or dropped out of
the index are missing, and the backtest of a stock strategy looks better than
reality would have been. A backtest without that bias needs two things: the
prices of every asset that was ever a member, delisted ones included (Yahoo
Finance drops delisted tickers, Polygon keeps them), and the membership
itself: who was in the index on each date.

**What the engine does when a series ends.** A delisted asset has bars up to
its last trading day, then nothing. When the series of a symbol ends more than
7 days before the end of the backtest, the engine closes a position on it at
the close of its last bar, with the usual costs, and from the next bar its
signals no longer take part in the sizing (`backtest/fine_serie.py`). The
trade's reason is `exit_trigger:series_end`. A series that ends within the
last 7 days is left alone, because it is more likely a file updated a day
earlier than the others; gaps in the middle of a series do not count. The live
runner does not apply the rule: there a series that stops may be a feed
problem, and the broker holds the real position. Strategies with
`bypass=True` compute their own returns and handle a delisting themselves.

**Membership as auxiliary data.** Create a per-asset category on the Data
page, for example `sp500_members`, with one file per ticker and a column
`in_index`: 1 on the date the asset joins, 0 on the date it leaves
(re-entries are just more rows). Declare it in `required_external_data` and
read it with `custom_series`, which aligns it as-of: at every bar, the last
value known by then. A ticker reused by another company needs a different
symbol for each company (`ABC`, `ABC_2008`), otherwise two price histories end
up in one file.

**Leaving the index is the strategy's job.** An asset that leaves the index
but stays listed keeps its prices, so the engine has nothing to do: the
strategy closes the position. A symbol missing from the signals means "I
hold", so it must emit a `flat_signal`: if it simply stops naming the symbol,
the position stays open.

```python
from core.node_data import custom_series
from core.types import flat_signal

def __init__(self, **params):
    super().__init__()
    self._membership = {}            # symbol -> in_index series, built once

def _member(self, sym, ind, t_decision) -> bool:
    series = self._membership.get(sym)
    if series is None:
        bars = ind.close.to_frame("close")
        bars.attrs["symbol"] = sym   # the 1:1 file is data/sp500_members/<sym>.parquet
        series = self._membership[sym] = custom_series("sp500_members", "in_index", bars)
    known = series.loc[:t_decision]
    return len(known) > 0 and known.iloc[-1] > 0.5

def generate_signals(self, t_decision, t_execution, indicators_by_symbol, portfolio):
    signals = []
    for sym, ind in indicators_by_symbol.items():
        if not self._member(sym, ind, t_decision):
            if sym in portfolio.positions:
                signals.append(flat_signal(sym, t_execution, style=self.style))
            continue
        ...                          # the strategy's own logic, on members only
    return signals
```

### FX strategies

FX spot pairs (`AssetClass.FX_SPOT`) are handled transparently by the framework. A strategy trading FX simply declares:

```python
class FXTrendStrategy(BaseAtomicStrategy):
    _ALLOWED = {AssetClass.FX_SPOT}

    @property
    def allowed_asset_classes(self) -> set[AssetClass]:
        return self._ALLOWED
```

Nothing else needs touching: the framework automatically handles:

1. **Data loading**: `load_universe()` detects FX symbols and loads them from `data/cache_fx_d1/` (Dukascopy) instead of yfinance.
2. **Indicator annualisation**: `realized_vol` for FX uses 260 bars/year instead of 252 (FX trades 5 days a week without equity holidays).
3. **Execution costs**: the engine applies `fx_spread_bps=0.5` and `fx_slippage_bps=0.5` for every FX trade, instead of the equity `spread_bps=2.0` / `slippage_bps=5.0`. The round-trip cost on a major pair is ~2 bps, reflecting interbank liquidity.

The FX cost parameters can be overridden in the `PortfolioConfig` passed to the engine:

```python
PortfolioConfig(
    initial_capital=1_000_000,
    # Standard equity costs
    spread_bps=2.0,
    slippage_bps=5.0,
    # FX override (default 0.5/0.5)
    fx_spread_bps=1.0,        # more conservative: a 1 bps half-spread
    fx_slippage_bps=1.0,      # 1 bps slippage
)
```

> ⚠️ **WARNING — intraday strategies (M5/M15/M30/H1)**: point 1 above (data loading via `load_universe`) loads **D1** for every symbol (both FX and equity), **even if the strategy declares `timeframe=StrategyTimeframe.M5`**. The descriptor's `timeframe` field is informative, it does NOT drive the loader.
>
> An intraday strategy that does not handle the problem explicitly will receive daily data and fail silently: hourly kill zones never fire (a daily timestamp is not inside London 07:00-09:00 UTC), the warm-up on an M5 EMA(200) needs 800 bars but daily gives you ~250 a year, intra-bar sweep & reclaim makes no sense. The diagnosis is treacherous: the backtest runs without errors, but makes 0 trades over 0 folds.
>
> **The solution**: a `prepare_extra_data(cfg)` hook that loads the real intraday TF, plus the `__replace_data_for_symbols__` key in the return. Documented in:
> - **"Intraday FX strategies"** just below (loader: `load_fx_pair(interval="M5")`)
> - **"Intraday equity strategies"** (loader: `load_equity_intraday(interval="M5")`)
> - **"Internal multi-timeframe"** (the `resample_to_tf` utility to derive H1/H4/D1 from M5)
>
> The pattern is asset-agnostic: the fix in the runner (`run_walkforward.py` section 5b, `__replace_data_for_symbols__`) replaces **any** symbol in the `data` dict, and the engine natively supports heterogeneous TFs (`backtest/engine.py:_build_trading_calendar` takes the `union` of the indices; the main loop and mark-to-market skip symbols missing at a given `t`).

### Intraday FX strategies: the M5 pattern with `prepare_extra_data`

For any FX strategy trading on a timeframe below D1, you must:

1. Download M5 with `python scripts/download_dukascopy_fx.py --m5-only --yes` (populates `data/cache_fx_m5/`). M5 granularity is the minimum the system supports.
2. Define a `prepare_extra_data(cfg)` hook in the descriptor that loads `cache_fx_m5/` with `load_fx_pair(pair, interval="M5", start=..., end=...)`.
3. Pre-compute in the hook any timeframe-sensitive indicators too (e.g. ATR), because the framework's indicator pool will compute them on the D1 data loaded by default.
4. Make the strategy class accept extra kwargs (`ohlcv_by_symbol`, `precomputed_atr_by_symbol`, etc.) that the framework injects automatically into the constructor.
5. Make the strategy read the data from the kwargs instead of the standard `PrecomputedIndicators` (which stay at D1 granularity).
6. **Also return from the hook the special key `__replace_data_for_symbols__: dict(ohlcv_by_symbol)`**. This is essential, because otherwise the backtest's `data` dict holds the FX pairs at D1 (loaded by `load_universe`) and the engine iterates over D1 timestamps, preventing any intraday kill zone from firing.

#### Consistency with the framework's multi-TF design

The framework **natively** supports symbols at heterogeneous timeframes in the backtest's `data` dict. The proof is in `backtest/engine.py`:

- `_build_trading_calendar` (~line 1191): the loop's time axis is the UNION of all the symbols' indices (`union_idx.union(df.index)`). So if `data["EURUSD"]` is M5 and `data["SPY"]` is D1, the loop iterates over all the M5 timestamps plus all the daily ones.
- Main loop (~line 909): `if t_execution not in df_sym.index: continue`. A silent skip for symbols with no bar at a given `t`. So at an M5 timestamp of 09:35 the loop does not trade SPY (which only has the 00:00 daily bar).
- Mark-to-market (~line 1060): the same protection.

Practical consequence: replacing `data["EURUSD"]` from D1 with M5 is **architecturally legitimate** and breaks nothing. The `indicator@TF` syntax (e.g. `sma_200@H4`) keeps working and stays orthogonal for higher-TF derivations inside the same strategy.

**Current design limit** (a future case, not blocking today): if an ensemble combines strategies on the same symbol at different TFs (e.g. `hvn_hedge_fx` D1 + `fx_volumetric_intraday` M5 on the same EURUSD), `data["EURUSD"]` must be at the **finest TF required** (M5 in this case); the D1 strategy will then have to read from `close@D1` (internal resample) or have its own data access channel. For the single-strategy case this is not a problem.

A bare-bones minimal example (see `strategies/_fx_volumetric_intraday/` for a complete implementation):

```python
# strategies/<name>/strategy.py

FX_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", ...]  # the pairs the strategy trades

def prepare_extra_data(cfg: dict) -> dict:
    """Loads M5 explicitly from cache_fx_m5/ and pre-computes the M5 ATR."""
    from data.loader import load_fx_pair
    import pandas as pd

    start = cfg.get("data", {}).get("start_date")
    end = cfg.get("data", {}).get("end_date")

    ohlcv_by_symbol, atr_by_symbol = {}, {}
    for pair in FX_PAIRS:
        df = load_fx_pair(pair, interval="M5", start=start, end=end)
        if df is None or df.empty:
            continue
        ohlcv_by_symbol[pair] = df
        # ATR(14) on the real M5 bars (NOT on the D1 bars the framework would use)
        tr = pd.concat([
            df["high"] - df["low"],
            (df["high"] - df["close"].shift(1)).abs(),
            (df["low"]  - df["close"].shift(1)).abs(),
        ], axis=1).max(axis=1)
        atr_by_symbol[pair] = tr.rolling(14, min_periods=1).mean()

    if not ohlcv_by_symbol:
        raise RuntimeError(
            "No M5 pair loaded. Run:\n"
            "    python scripts/download_dukascopy_fx.py --m5-only --yes"
        )
    return {
        # Data passed as kwargs to the strategy's __init__
        "ohlcv_by_symbol": ohlcv_by_symbol,
        "precomputed_atr_by_symbol": atr_by_symbol,
        # SPECIAL KEY read by run_walkforward.py: it replaces, in the backtest's
        # `data` dict, the DataFrames of these symbols with the real M5 bars.
        # Without this key, the engine keeps iterating over D1 timestamps
        # (loaded by load_universe by default) and the hourly M5 kill zones
        # never fire. The key is removed from the kwargs before they are
        # passed to the strategy's __init__ (it does not reach the constructor).
        "__replace_data_for_symbols__": dict(ohlcv_by_symbol),
    }


DESCRIPTOR = StrategyDescriptor(
    name="my_fx_intraday",
    timeframe=StrategyTimeframe.M5,
    factory=lambda params: MyFXStrategy(**{
        k: v for k, v in params.items() if not k.startswith("exit_")
    }),
    default_params={
        # ... tunable parameters of the strategy. Do NOT put here parameters
        # used only by prepare_extra_data (e.g. atr_period): the factory would
        # pass them to an __init__ that does not accept them -> TypeError.
    },
    extra_universe_symbols=FX_PAIRS,
    # ...
)
```

In the strategy's `__init__`:

```python
class MyFXStrategy(BaseAtomicStrategy):
    def __init__(
        self,
        # ... tunable parameters ...
        ohlcv_by_symbol: Optional[dict] = None,
        precomputed_atr_by_symbol: Optional[dict] = None,
    ):
        super().__init__()
        # ... parameter assignments ...
        # Preferred channel: the M5 data pre-loaded by the hook
        self._ohlcv_by_symbol = ohlcv_by_symbol or {}
        self._atr_by_symbol = precomputed_atr_by_symbol or {}
```

And when reading data (e.g. inside `generate_signals`):

```python
def _ohlcv(self, ind, t_dec, sym):
    """Reads OHLCV: first from the M5 data loaded by the hook, otherwise from PrecomputedIndicators."""
    # Channel 1: the real M5 from the hook (preferred)
    if sym in self._ohlcv_by_symbol:
        sub = self._ohlcv_by_symbol[sym].loc[:t_dec]
        return sub["open"], sub["high"], sub["low"], sub["close"], sub["volume"]
    # Channel 2: fallback on PrecomputedIndicators (usually D1 - degraded mode)
    return None  # or fallback logic if the strategy also runs on D1
```

**Common pitfalls this pattern avoids:**

| Symptom | Cause | Fix |
|---|---|---|
| `TypeError: __init__() got unexpected keyword argument 'atr_period'` | You put `atr_period` (or another hook-only param) in `default_params` but `__init__` does not accept it | Remove the param from `default_params`. The hook reads it from `cfg["strategy"]["params"]` with a default |
| 0 trades over 0 folds, "Backtest range ~700 bars/2 years" | You are receiving D1 (the default loader). `prepare_extra_data` is missing | Add the hook as above |
| The log says `Hook returned kwargs: [...]` with M5 loaded, BUT "Backtest range" stays at ~700 bars | The hook loads M5 but does NOT replace the backtest's `data` dict. The engine keeps iterating over D1 | Add the key `__replace_data_for_symbols__: dict(ohlcv_by_symbol)` to the hook's return |
| Endless warm-up, the first signal never emitted | The warm-up threshold `bias_ema_slow * 4` was sized for M5 (~800 bars = 3 days of M5 = fine) but you are receiving D1 (800 bars = 3 years!) | Fix with `prepare_extra_data` + `__replace_data_for_symbols__` as above |
| The "London 07:00-09:00 UTC" kill zone never fires | On D1 every timestamp is 00:00 UTC, so it never falls inside the window | Fix with `prepare_extra_data` as above |
| Crash with `KeyError: 'open'` or similar | The pre-loaded data does not have the required column | Check that `load_fx_pair` returns a DataFrame with `[open, high, low, close, volume]` as the minimum columns |

For a complete reference implementation see `strategies/_fx_volumetric_intraday/`.

### Intraday equity strategies: the M5 pattern with `load_equity_intraday`

The same `prepare_extra_data` + `__replace_data_for_symbols__` pattern applies to intraday **equity** strategies. The symmetric loader is `load_equity_intraday` (a clean alias over `polygon_loader.load_minute`, with the same signature as `load_fx_pair`):

```python
from data.loader import load_equity_intraday
df = load_equity_intraday("SPY", interval="M5", start="2020-01-01", end="2026-01-01")
```

Key differences from the FX case (important):

1. **A different loader**: `load_equity_intraday(symbol, interval, start, end)`. It supports `interval` in `["M1", "M5", "M15", "M30", "H1"]`; `load_fx_pair` supports only `["D1", "M5"]`.
2. **Cache directory**: `cache_polygon_m{N}/` (N = minutes) instead of `cache_fx_m5/`. To populate it: `python scripts/download_polygon_m5.py --pairs <SYMBOL> --minutes 5`.
3. **Timezone**: `load_equity_intraday` returns **tz-naive UTC** by default (`normalize_tz_to_utc=True`), for consistency with the rest of the framework. If you want tz-aware US/Eastern (handy for NYSE kill zones), pass `normalize_tz_to_utc=False`.
4. **Regular hours**: filters 09:30-16:00 ET by default (`regular_hours_only=True`). Pre-market/after-hours excluded. To include them: `regular_hours_only=False`.
5. **Typical range**: 78 M5 bars a day (equity regular hours) against 288 M5 bars a day (FX, 24 hours).
6. **Costs**: the framework applies `spread_bps=2.0` + `slippage_bps=5.0` for equity, vs `fx_spread_bps=0.5` / `fx_slippage_bps=0.5` for FX. Over 1500 trades a year the difference is worth ~3% of the annual costs.

Minimal example for intraday equity (structure identical to the FX case):

```python
# strategies/<name>/strategy.py

EQUITY_INTRADAY_SYMBOLS = ["SPY", "QQQ", "NVDA", "AAPL", "MSFT", ...]

def prepare_extra_data(cfg: dict) -> dict:
    """Loads M5 equity from cache_polygon_m5/ and pre-computes the M5 ATR."""
    from data.loader import load_equity_intraday
    import pandas as pd

    start = cfg.get("data", {}).get("start_date")
    end = cfg.get("data", {}).get("end_date")

    ohlcv_by_symbol, atr_by_symbol = {}, {}
    for sym in EQUITY_INTRADAY_SYMBOLS:
        try:
            df = load_equity_intraday(sym, interval="M5", start=start, end=end)
        except FileNotFoundError:
            continue
        if df is None or df.empty:
            continue
        ohlcv_by_symbol[sym] = df
        # ATR(14) on the real M5 bars
        tr = pd.concat([
            df["high"] - df["low"],
            (df["high"] - df["close"].shift(1)).abs(),
            (df["low"]  - df["close"].shift(1)).abs(),
        ], axis=1).max(axis=1)
        atr_by_symbol[sym] = tr.rolling(14, min_periods=1).mean()

    if not ohlcv_by_symbol:
        raise RuntimeError(
            "No M5 equity symbol loaded. Run:\n"
            "    python scripts/download_polygon_m5.py --yes  (needs a Polygon API key)"
        )
    return {
        "ohlcv_by_symbol": ohlcv_by_symbol,
        "precomputed_atr_by_symbol": atr_by_symbol,
        # SPECIAL KEY (see the intraday FX section above)
        "__replace_data_for_symbols__": dict(ohlcv_by_symbol),
    }
```

The descriptor is **structurally identical** to the FX case, replacing:
- `extra_universe_symbols=EQUITY_INTRADAY_SYMBOLS` (equity tickers)
- `category=StrategyCategory.INTRADAY_MEAN_REV` (or similar)
- `timeframe=StrategyTimeframe.M5`
- `tags=["equity", "intraday", "m5", ...]`

**Pitfalls specific to intraday equity:**

| Symptom | Cause | Fix |
|---|---|---|
| `cache_polygon_m5/SPY.parquet` does not exist | You have not downloaded Polygon M5 | `python scripts/download_polygon_m5.py --yes` (needs a Polygon API key, NOT free like Dukascopy FX) |
| The 09:30-11:00 ET kill zone does not fire even with M5 loaded | The data is UTC-naive by default, but you are doing `t.hour == 9` expecting ET | Pass `normalize_tz_to_utc=False` to the loader and think in ET, or shift the time windows into UTC (e.g. 14:30-16:00 UTC = 09:30-11:00 EDT in summer) |
| Only ~78 bars a day | The default `regular_hours_only=True` filters 09:30-16:00 ET | For pre-market/after-hours: `load_equity_intraday(..., regular_hours_only=False)` |
| SPY M5 + SPY D1 conflict in the same ensemble | `data["SPY"]` can hold only one TF | An architectural limit of the `data` dict. If SPY is needed at both TFs: either use `resample_to_tf(data["SPY"], "D1")` internally in the D1 strategy, or declare only one of the two TFs in `extra_universe_symbols` |

For an equity reference implementation, **there is not yet a strategy in the project** (as of this guide): the `_fx_volumetric_intraday` strategy is the template, replacing loader and symbols as above.

### Multi-timeframe inside a strategy: `resample_to_tf`

A strategy receiving data at a given TF (e.g. M5 via `prepare_extra_data`) can derive higher TFs internally (H1, H4, D1) with the OHLCV-aware utility:

```python
from data.loader import resample_to_tf

# Inside generate_signals or in __init__:
m5_df = self._ohlcv_by_symbol[sym]      # base M5
h1_df = resample_to_tf(m5_df, "H1")     # derived H1 for the higher-TF bias
d1_df = resample_to_tf(m5_df, "D1")     # derived D1 for the daily levels
```

The aggregation applied is OHLCV-correct: open=first, high=max, low=min, close=last, volume=sum. **Constraint**: target TF >= base TF (M5 cannot be derived from D1, the intra-day information does not exist).

For patterns such as "HTF bias on H4 + entry on M5" (Setup C of the volumetric forex manual) this is the standard way of working inside the strategy, without having to load two separate caches.

### Mixing equity + FX in the same strategy

A strategy can declare `allowed_asset_classes = {AssetClass.EQUITY_STOCK, AssetClass.FX_SPOT}` if it trades both. In that case the framework keeps loading each symbol from the right cache and applying the correct costs to every trade.

### Policy rates (FRED) for FX carry strategies

For strategies needing central bank rates (e.g. `fx_carry`), the framework provides a dedicated loader reading from the `data/cache_rates/` cache. Downloading is handled by the `scripts/download_fred_rates.py` script (requires `FRED_API_KEY` in `.env`).

#### Loader API

```python
from data.loader import (
    load_policy_rates,
    load_policy_rates_universe,
    decompose_fx_pair,
    compute_pair_carry,
)

# Single currency
usd_rates = load_policy_rates("USD", start="2010-01-01")
# DataFrame with a daily DatetimeIndex, column 'rate' (decimal, e.g. 0.0535)

# Universe (recommended in a strategy that trades many pairs)
rates_universe = load_policy_rates_universe(
    ["USD", "EUR", "JPY", "GBP", "AUD", "CAD", "CHF", "NZD"],
    start="2010-01-01",
)
# dict {ccy: DataFrame}

# Automatic decomposition of the pair into (buy_ccy, sell_ccy)
buy, sell = decompose_fx_pair("EURUSD")  # ("EUR", "USD")
buy, sell = decompose_fx_pair("USDJPY")  # ("USD", "JPY")

# Ready-to-use carry differential
carry_df = compute_pair_carry("AUDUSD", rates_universe)
# DataFrame with the columns 'rate_buy', 'rate_sell', 'carry'
# carry = rate_buy - rate_sell (decimal)
# For AUDUSD: long AUD, short USD; when the AUD rate > the USD rate, carry > 0
```

#### Supported currencies

USD, EUR, GBP, JPY, AUD, CAD, CHF, NZD. Enough coverage for the 12 FX pairs currently in the universe.

FRED series frequency: USD, EUR, GBP are daily; JPY, AUD, CAD, CHF, NZD are monthly (FRED aggregates them from the OECD). The loader applies forward-fill onto a daily index automatically during the download, so the strategy always receives daily data with no gaps. For a D1 carry trade this is perfectly adequate: policy rates change rarely (8-12 times a year at central bank meetings), so ffill is the correct representation of "the effective rate on day X".

#### Anti-leak for the rates

Rates published by FRED have a typical latency of 1-2 days after the central bank's actual decision (the Fed's DFF is published the next day). That latency is already included in the FRED datapoint's timestamp: when the loader returns `rate` at timestamp `T`, that value is genuinely available to the market at `T`.

The strategy should still access the rates with the framework's standard convention (`.loc[:t_decision].iloc[-1]`) to make sure the value used is "as of t_decision", not a future one.

#### Skeleton example: `fx_carry`

```python
class FXCarryStrategy(BaseAtomicStrategy):
    _ALLOWED = {AssetClass.FX_SPOT}

    def __init__(self, all_fx_data, rates_universe, n_long=3, ...):
        super().__init__()
        self._fx_data = all_fx_data
        self._rates = rates_universe
        # Pre-compute the carry of every pair (negligible cost, small data)
        self._carry_by_pair = {
            pair: compute_pair_carry(pair, rates_universe)
            for pair in all_fx_data
        }

    def generate_signals(self, t_decision, t_execution, indicators_by_symbol, portfolio):
        # Current carry of every pair (decimal)
        current_carries = {
            pair: df.loc[:t_decision]["carry"].iloc[-1]
            for pair, df in self._carry_by_pair.items()
        }
        # Rank the top-N positive carries, etc.
        ...
```

---

## Allocator and sizing

The `allocator` turns the `Signal`s emitted by the strategy into actual
**capital weights**, applying vol-targeting and a series of **risk caps**.
These caps live in `AllocatorConfig` and by default they are GLOBAL (shared by
all the strategies, taken from the `[portfolio]` config):

| Parameter | Default | What it does |
|---|---|---|
| `portfolio_target_vol_annual` | 0.12 | the stream's annual vol budget |
| `max_position_weight` | 0.05 | **cap on |weight| per single position** |
| `max_asset_class_gross` | 1.00 | gross cap per asset class |
| `max_gross_leverage` | 1.00 | cap on the total gross leverage |
| `strategy_mix_mode` | `correlation` | how the book is sized: see [Correlations between the strategy's assets](#correlations-between-the-strategys-assets) |

### The problem with CONCENTRATED strategies (read before writing)

The default `max_position_weight = 0.05` is tuned for
**cross-sectional** strategies: momentum holds ~25 stocks at ~4% each (25 × 5% =
125% gross, then capped at 100%). For those strategies 5% is correct.

But if your strategy is **concentrated** — few assets, e.g. a macro one
rotating 2-4 ETFs — the 5% cap **strangles it silently**:

> 4 positions × a 5% cap = **20% of the capital invested at most**. With assets
> at ~15% vol, the realised portfolio vol collapses to **~2%**: the strategy
> becomes irrelevant (it does not lose, but it weighs nothing). And the Sharpe
> does not tell you, because it is scale-invariant: a strangled strategy and a
> properly sized one have the **same Sharpe**, but completely different returns
> and contributions to the ensemble.

Typical symptom: a **ridiculous ANNUAL VOL (~2%)** in the report, a crushed
equity curve, and no error in the logs. It is a silent failure: the backtest
runs, the numbers look "small but plausible", and time is lost optimising the
edge when the real problem is that the strategy was never invested.

### The solution: `allocator_overrides` in the descriptor

The `[portfolio]` config is global: the cap cannot be changed for one strategy
without touching the others. That is why the descriptor exposes the
`allocator_overrides` field — a dict that **overrides the `AllocatorConfig`
ONLY for that strategy**, leaving the global config and the other strategies
unchanged.

```python
DESCRIPTOR = StrategyDescriptor(
    # ... standard fields ...

    # Concentrated strategy (2-4 ETFs): with the global 5% cap it would be strangled.
    allocator_overrides={
        "max_position_weight": 0.45,   # one asset can reach 45%
        "max_gross_leverage": 1.0,     # no leverage, but investable capital
        "max_asset_class_gross": 1.0,
    },
)
```

Allowed keys (the others are ignored with a WARNING):

| Key | When to raise it |
|---|---|
| `max_position_weight` | a strategy with few assets that wants to concentrate (default 0.05 → e.g. 0.40-0.50) |
| `max_gross_leverage` | whether the strategy does or does not want leverage (default 1.0) |
| `max_asset_class_gross` | if it concentrates heavily on a single asset class |
| `portfolio_target_vol_annual` | to give that strategy a vol budget other than the 0.12 default |
| `strategy_mix_mode` | to size this strategy in another mode (`equal_weight`, `covariance`, `explicit`) |
| `explicit_vol_target` | only with `explicit`: the vol the declared book is scaled to |

Default `{}` = no override = the historical behaviour, unchanged. The existing
strategies (momentum, value, etc.) declare NOTHING and keep the 5% cap.

### Check the sizing BEFORE a long backtest

After writing the strategy, check that the expected vol makes sense
(typically 7-12% for a single stream). If the report shows an ANNUAL VOL of
~2-3% and the strategy is concentrated, it is almost certainly the cap: add
`allocator_overrides`.

### Caveat 1: `strength` is conviction, NOT weight

In `Signal`s, the `strength` field ∈ [0,1] is a **conviction multiplier**
that the allocator applies ON TOP of the already-distributed vol budget — it is
not the capital weight. For full exposure use `strength=1.0`;
if you want to express relative tilts between the legs, use relative values
normalised to the maximum (e.g. SPY 1.0, IEF 0.7, GLD 0.45), NOT the portfolio
fractions (0.45, 0.30...). Passing `strength=0.45` thinking it means "45% of
capital" squashes the sizing by ~2x on top of the cap.

Not even in `covariance` mode does `strength` become a weight: it stays the
multiplier that defines the SHAPE of the book, while the scale is decided by
the measured volatility of the whole book. What changes is that the scale is
exact instead of deduced — see below.

### Caveat 1-bis: the book's vol, assumed or measured

The default mode, `correlation`, measures the correlations between the assets
and brings the book to the wanted risk on the real vol (section below). With
the hierarchy (`strategy_mix_mode: equal_weight`) the allocator instead deduces
it from assumptions (`/sqrt(N)` across strategies and across classes, `/N`
within a class), and on a LONG/SHORT book it is badly wrong: it treats legs that
offset each other as if they added up, and the result is about a fifth of the
wanted risk. If an old backtest of a market-neutral strategy shows an annual
vol far below the target, this is almost always why: run it again with the
default before raising the caps with `allocator_overrides`. See
ARCHITETTURA.md §6.

### Correlations between the strategy's assets

If the strategy proposes the same trade on two correlated assets, it takes on
twice what is partly the same risk. The default mode, `correlation`, accounts
for it in the size of the book **and** in the way the risk is split between the
positions. How to split it depends on something the strategy knows, not the
assets: its signals on different assets are

- **the same idea** repeated — the same rule on assets that move together: a
  trend, an RSI, a single model applied to every pair. Two signals that agree
  confirm the idea, they do not add a second one; two opposite signals are a
  disagreement, not a hedge. The positions stay in proportion to conviction
  and volatility;
- or **independent information** — distinct models or data per asset, or an
  optimiser choosing between stocks. Two correlated positions shrink the more
  correlated they are; two opposite ones become a position on the difference,
  which risks little and gets more room (mean-variance).

The degree between the two readings is `signal_overlap`, from 0.1 to 1. If you
know it, declare it:

```python
DESCRIPTOR = StrategyDescriptor(
    # ... standard fields ...
    signal_overlap=0.9,     # the same trend rule on every pair
)
```

If you do not declare it (`None`, the default) the **walk-forward estimates
it**, fold by fold, on the out-of-sample history of the previous folds only: it
looks at which mix of the two forms would have earned more, net of costs and at
equal risk, starting from 1 and going down only when the statistics justify it.
The final value holds for the live, which reads it again from
`output/strategies/wf_<name>_sizing.json`. The stream page shows it
("Signal overlap 0.27 · estimated", with the why in the tooltip).

Three guarantees, for any degree:

- **the sign of a signal is never inverted**, and **an emitted signal never
  ends at zero** (some strategies would read a vanished position as an exit);
- **the positions held count**: the book is the whole one, with the positions
  opened by earlier signals. Silence on a symbol means "I hold", as always;
  when the composition changes a held position is realigned only if the new
  weight differs from the current one by more than 25% relative
  (`held_rebalance_band` in the YAML);
- **the sizes you declare stay yours**: with `target_vol` the position does not
  exceed `target_vol / vol`, and if you ask for a fixed weight you get it
  exactly.

If instead you want exactly the old behaviour, choose it for your strategy
only:

```python
allocator_overrides={"strategy_mix_mode": "equal_weight"},   # or "covariance"
```

### The per-position cap is a safety limit

With `correlation` the size of each position is decided by the correlations
and the wanted risk; `max_position_weight` must only stop the position that a
wrong estimate would inflate. If it stops most of the positions, they all get
the same size and the sizing no longer matters. The walk-forward measures it
and, beyond half of the positions, says so: in the backtest log
("WARNING the per-position cap (5%) stopped 82% of the positions") and with a
label on the stream page ("Cap 5% sets 82% of sizes"). The remedy is to raise
the cap for your strategy with `allocator_overrides` (above) or for all of
them from Settings.

### Caveat 2: cash-like assets in vol-targeting

A very low-vol asset (e.g. SHY, ~1.5% vol; a T-bill ETF) is **pathological**
in a vol-targeting framework: to give it its assigned vol budget the allocator
applies enormous leverage (`budget / vol_floor`), inflating a cash position
that makes no sense. The `min_vol_floor` (default 0.05) limits the damage but
does not remove it. Practical consequence: **you do not "go to cash" to reduce
risk** in this system (the allocator re-levers to the budget anyway). To reduce
the directional exposure you ROTATE towards defensive assets with a normal vol
(bonds/gold), you do not park in cash. If your logic calls for "cash", either
exclude it from the basket or accept that it becomes just a short-duration
tilt.

### Real example

`strategies/_macro_regime/` is a concentrated strategy (it rotates
SPY/TLT/IEF/GLD): it declares
`allocator_overrides={"max_position_weight": 0.45, ...}`. Without it, it ran
at a 2% vol (irrelevant); with it, it runs at ~10% (sensible). See that
descriptor as a reference.

---

## Bypassing the allocator: `bypass=True`

A strategy normally says, bar by bar, which symbols to hold (`Signal`), and the
engine does the rest: sizing, the allocator, costs, exits, the walk-forward
folds, the live runner. Some logics do not have that shape: an ML model trained
on the whole universe with its own validation windows, a portfolio rule whose
natural output is already a series of daily returns, a study you want in
«Streams» and in projects next to the other strategies. For these the
DESCRIPTOR takes `bypass=True` and a `build` function instead of a `factory`:
the strategy computes its own daily returns and the allocator is bypassed.

In «Run backtest» these strategies carry the **Approach** category: before
this version they were a separate artifact, the «approach»
(`approaches/<name>/approach.py`). The contract is the same; only the folder
and the descriptor changed (see [The old form](#the-old-form-approaches)).

**Prefer a normal strategy whenever the logic can be written as signals.** A
strategy with bypass gets none of what the engine does for the others: no
sizing, no allocator, no transaction costs (subtract your own), no exit policy,
no walk-forward folds, and live it needs a provider written on purpose
([Live](#live-a-provider-written-on-purpose)).

### Minimal structure

```
strategies/<name>/
├── __init__.py        # created by the system if missing
├── strategy.py        # DESCRIPTOR with bypass=True and build
└── run_backtest.py    # created by the system: the same launcher as every strategy
```

```python
# strategies/<name>/strategy.py
import numpy as np
import pandas as pd

from strategies.descriptor import StrategyDescriptor
from data.loader import load_universe
from data.universe import AssetClass, symbols_by_class


def build(params: dict) -> pd.Series:
    """DAILY returns of the strategy, as fractions (0.001 = +0.1%)."""
    symbols = symbols_by_class(AssetClass.EQUITY_ETF)
    data = load_universe(symbols=symbols, start=params["start"], skip_failures=True)
    closes = pd.DataFrame({s: df["close"] for s, df in data.items()}).sort_index()
    returns = closes.pct_change()

    momentum = closes.pct_change(params["lookback"])
    held = momentum.rank(axis=1, pct=True).ge(0.8).astype(float)
    weights = held.div(held.sum(axis=1).replace(0, np.nan), axis=0)

    # the weights decided at the close of t-1 earn the returns of t
    return (weights.shift(1) * returns).sum(axis=1, min_count=1).dropna()


DESCRIPTOR = StrategyDescriptor(
    name="<name>",
    description="Top quintile of ETFs by six-month momentum, equal weight.",
    bypass=True,
    build=build,
    default_params={"start": "2010-01-01", "lookback": 126},
    stream_category="d1",
)
```

`category`, `timeframe` and `factory` are not needed: the engine does not run
the strategy bar by bar. `label` (optional) is the name shown on the card of
«Run backtest». `maintenance`, `required_external_data` and the other optional
fields keep their meaning ([Maintenance](#maintenance-retraining-and-data-freshness)).

### The contract of `build`

- **Signature**: `build(params)`, or `build(params, checkpoint)` to save the
  steps of a long computation ([below](#long-computations-the-checkpoint)).
  `params` is `default_params` updated with the YAML parameters of the
  strategy (`strategies.<name>.params`).
- **Output**: a `pandas.Series` of DAILY returns as fractions, indexed by date.
  NaN values are dropped, a time zone is removed, duplicated dates keep the
  last value. With `stream_type="equity_curve"` return the equity curve
  instead; `"pnl_daily"` is the default.
- **Causal**: the position decided with the data up to the close of `t-1` earns
  the return of `t`. Shift the weights (`weights.shift(1) * returns`), never the
  returns.
- **Data only from the loaders**: `data.loader.load_universe` (and the other
  loaders of the [marketplace SDK](#code-for-the-marketplace)) return
  `{symbol: DataFrame}` with lowercase `open, high, low, close, volume`. Through
  them the system cuts the data at the hidden boundary of an agent objective
  and records which symbols the strategy read (the coverage shown on the
  marketplace); a file read by hand escapes both.
- **pandas, the rule that blows everything up**: a DataFrame (dates × symbols)
  combined with a date-indexed Series needs `axis=0` — `df.div(s, axis=0)`,
  `df.mul(s, axis=0)`, `df.sub(s, axis=0)`, never `df / s`. Without it pandas
  aligns the Series on the COLUMNS, builds a table of thousands of empty
  columns and the run ends in a `MemoryError`.

### Long computations: the checkpoint

If `build` accepts a second argument it receives the run's checkpoint. Wrap
each long step in `checkpoint.step(key, compute)` and report the progress with
`checkpoint.progress(done, total, note)`:

```python
def build(params, checkpoint=None):
    years = list(range(2012, 2025))
    pieces = []
    for i, year in enumerate(years):
        model = checkpoint.step(f"model_{year}", lambda: train_until(year))
        pieces.append(predict(model, year))
        checkpoint.progress(i + 1, len(years), f"year {year}")
    return pd.concat(pieces).sort_index()
```

- `step` returns the value already computed by an interrupted run, or computes
  it and saves it. The key must identify the step (`f"model_{year}"`, not
  `"model"`).
- `progress` feeds the progress bar and the time estimate of «Run backtest».
- The series `build` returns is saved before it is checked and written: if
  something fails afterwards, the next run does not compute it again.
- Saved state is reused only by a run with the **same signature**: the code of
  the strategy, the indicators it reads, the engine, the parameters, the
  environment and a fingerprint of the data folder. When one of them changes the
  saved state is discarded and the log says which one
  (`[Checkpoint] the saved state of an earlier run is not reused …: the parameters changed`).
  A completed run removes its checkpoint.
- Values are saved with pickle: a value that cannot be pickled is computed
  anyway, and the log says so.

### What the run produces

- `output/strategies/<name>_pnl_daily.parquet`: the stream, in the column of
  its `stream_type` (`pnl_daily`, `pnl` for `"pnl_sparse"`, `equity` for
  `"equity_curve"`); `output_path_pattern` names another file;
- `output/strategies/wf_<name>.json` and `wf_<name>_robustness.json`, as for a
  walk-forward: aggregate metrics, alpha against the benchmark, the
  configuration, the symbols read with their bars, the robustness diagnostics.
  The agent, its objectives and the marketplace read them like the others.

### Live: a provider written on purpose

In backtest `build` produces a return series; live the runner must know which
positions to hold, and that part is not in `build`. A strategy with bypass runs
live only with a provider registered in `live/bypass.py` (`_PROVIDER`: an object
with `.name`, `.target_weights(history, now)` and `.signals(history, now)`).
Without one the runner refuses to start and says which strategy is missing it,
rather than running with fewer components than were measured.

### The old form: approaches

A folder `approaches/<name>/approach.py` with
`APPROACH_DESCRIPTOR = ApproachDescriptor(...)` is the same thing written before
this version. At start-up it is converted into `strategies/<name>/strategy.py`
with `bypass=True` (`core/migrazione_bypass.py`): imports and paths are
rewritten, projects, runners and marketplace records follow the new name, and
the original files are kept in `.lyra/migrazione_bypass/`. If a strategy with
the same name already exists the converted one becomes `<name>_bypass`, and the
log says so. Studio's import and the marketplace's install convert an approach
the same way.

## Exit Policy (TP/SL)

**Exit policies** define HOW positions are closed, besides the periodic rebalance. The framework offers 4 built-in types, declared in the descriptor with `exit_policy_type`.

### Background: why exit policies exist

Without an exit policy, a position is only closed:
1. When the strategy explicitly emits `FLAT`
2. When the signal is not re-emitted at the next rebalance
3. When the `RiskManager` triggers a portfolio-level kill switch

**The gap**: between rebalances, a position can lose dramatically with nobody closing it. E.g. catastrophic earnings, fraud, an overnight gap. With a monthly rebalance (21 days), you could see -50% on a position with nobody reacting.

Exit policies solve this by adding **intra-bar triggers** (checked on the high/low of each bar) to close positions when they touch given prices.

### Catastrophic SL floor (universal, always on)

**Every exit policy** has a **catastrophic floor** applied by default at **-20% per position**. That means that, whatever policy type you choose, no position will lose more than 20% intra-rebalance — unless it is explicitly disabled. It is an **opt-out** default: it applies even if the strategy does not declare it (see `DEFAULT_CATASTROPHIC_SL_PCT` in `core/exit_policy.py`).

Rationale (valid for CONCENTRATED / single-name / FX bets):
- Vol-targeting limits size ex ante, but does not protect against catastrophic overnight gaps
- Tight tactical SLs (-5%, -10%) make momentum worse OOS (quant literature)
- A wide catastrophic SL (-20%) does not fire on normal whipsaws but protects against a single-name black swan (fraud, bankruptcy, profit warning)

> ⚠️ **MANDATORY CARVE-OUT FOR DIVERSIFIED LONG-ONLY BASKETS.**
> On an equal-weight basket of many names (momentum, quality_lv, value, ising_inverse: ~16-25 stocks), the per-position **-20% floor is harmful and must be disabled** (`exit_catastrophic_sl_pct=None`).
>
> Why: in a **market crash** (COVID 2020, the 2022 bear market) the basket's stocks fall >20% from entry *all together*. The floor closes them intra-bar **at the low** → puts them on the **blacklist** → at the next rebalance the strategy **buys them back on the bounce**. Result: systematic sell-low/buy-high churn. Measured on ising_inverse (timed_basket, 2010-2026): with the stop enabled, MaxDD **-41%**, vol **19%**, beta vs SPY **0.20**, CAGR **negative**; with the stop disabled the same strategy/universe/data turns **positive**, vol ~3%, MaxDD ~-5%. The floor does not "never fire" as the calm 2018-2023 data might suggest: **it fires all right in crashes**, and that is where it does the damage.
>
> For a diversified basket **diversification IS the risk control**: you ride through the drawdown, you do not stop out at the lows. System drawdown stays covered by the **account kill switch** (`core/risk_manager.py`, portfolio level) — the right place for a floor on a diversified book, not the per-position one.

Rule of thumb:

| Strategy type | `exit_catastrophic_sl_pct` |
|---|---|
| Diversified long-only basket (≥10 equal-weight names) | **`None`** (disable it) |
| Concentrated bet / single-name / a few ETFs | `-0.20` default (or tighter) |
| FX / market-neutral (pairs, coint) | judge case by case — a per-leg stop can break the hedge |

Override via `default_params`:
```python
default_params={
    ...
    "exit_catastrophic_sl_pct": None,    # diversified basket: MANDATORY
    # or, for a concentrated one that wants a tighter floor:
    "exit_catastrophic_sl_pct": -0.15,
}
```

> **Authoring note.** If the strategy's `factory` does `Strategy(**params)`, it must **filter out the `exit_`** keys before passing them to the constructor, otherwise `exit_catastrophic_sl_pct` ends up in the constructor → `TypeError`. `build_exit_policy()` reads them from `default_params` anyway. Pattern:
> ```python
> factory=lambda params: MyStrategy(**{
>     k: v for k, v in params.items() if not k.startswith("exit_")
> }),
> ```

### When the stops are checked

For every bar `t` the engine does, in this order:

1. the strategy decides on the close of `t-1`;
2. the orders are executed at the open of `t`;
3. TP and SL are checked on the high and low of `t`, for the positions that
   were already open before this open;
4. the portfolio is marked to market on the close of `t`.

The positions opened (or flipped) at the open of `t` are watched from the
next bar. This is the order the live has by force: it executes at the open,
then the bar runs and the sentinel watches the stops. Before, step 3 came
first: the strategy, deciding on the close of `t-1`, already found in its
portfolio the exits that happened *during* bar `t` (it saw the future), and a
position that the decision closed at the open could instead exit at the stop
price touched later in the same bar. The live stream replays the history
with this same engine, so a live that rebuilds from the past and a live that
moves bar by bar now give the same trades.

### The 4 policy types

#### Type 1: `signal_only` (default)

```python
DESCRIPTOR = StrategyDescriptor(
    ...
    exit_policy_type="signal_only",
)
```

Behaviour: **no tactical TP/SL**, only the -20% catastrophic floor. The position closes because of:
- an explicit `FLAT` signal
- not being selected again at the next rebalance
- Catastrophic SL hit (-20% intra-bar)
- Account kill switch

**When to use it**: cross-sectional momentum/quality/value strategies with a periodic rebalance, where the rebalance is the real exit mechanism. The recommended default for D1 factor-based strategies. ⚠️ For these baskets **disable the catastrophic floor** (`exit_catastrophic_sl_pct=None`) — see "Catastrophic SL floor" above: the per-position -20% churns them in crashes.

#### Type 2: `atr` (ATR-based TP/SL)

```python
DESCRIPTOR = StrategyDescriptor(
    ...
    exit_policy_type="atr",
    required_indicators=["atr_14"],          # documents the ATR the policy uses
    default_params={
        ...
        "exit_tp_atr_mult": 3.0,             # TP = entry + 3 * ATR (long)
        "exit_sl_atr_mult": 2.0,             # SL = entry - 2 * ATR (long)
        "exit_atr_period": 14,               # ATR(14)
    },
)
```

Behaviour:
- TP = `entry_price + tp_atr_mult * ATR(period)` for LONG (mirrored for SHORT)
- SL = `entry_price - sl_atr_mult * ATR(period)` for LONG (mirrored for SHORT)
- the ATR is the last value **before** the entry bar — the last bar closed
  when the decision was taken — and stays frozen for the life of the position
  (no trailing). Same value in backtest and live. Before, the backtest took
  the ATR of the entry bar itself, whose high and low are not known yet at the
  open (a small look-ahead); live that bar was still forming, so its ATR did
  not exist and the stops were not placed at all
- the ATR is the engine's own `PrecomputedIndicators.atr` (Wilder, 14 bars):
  `exit_atr_period` and the period in an `atr_<N>` name do not change it today,
  so multipliers tuned on another period place the stops at other distances
  than you computed
- The -20% catastrophic floor applies on top: the tighter of ATR-SL and catastrophic wins

**When to use it**: strategies whose exit point can be reasoned about in units of volatility. Typically mean-reversion (tight SL) or trend-following (wide TP).

> ⚠️ **Mandatory parameters, or a SILENT fallback.** `atr` (and `combined`)
> need **both** `exit_tp_atr_mult` **and** `exit_sl_atr_mult` in
> `default_params`. If you forget even one, `build_exit_policy`
> raises `ValueError` and the framework **does not crash**: it falls back to
> `SignalOnlyPolicy`, logging a WARNING like:
> ```
> WARNING: Strategy ...: build_exit_policy failed: ATRBasedPolicy requires
> 'exit_tp_atr_mult' in params. Falling back to SignalOnlyPolicy.
> ```
> The backtest runs all the same, but **with no tactical TP/SL** (only the
> -20% catastrophic floor). It is insidious because it does not block you: you
> notice the problem only by reading the WARNINGs, or by seeing that the
> strategy never closes at the ATR levels you expected. **Always check the
> build_exit_policy WARNINGs in the first lines of the log after
> "Loaded descriptor".**
> The `exit_policy_type` field (at the top of the descriptor) and the `exit_*`
> parameters (inside `default_params`, further down) are in two separate places
> of the descriptor and must agree: it is easy to update one and forget the
> other.
>
> Table of required parameters per policy type:
>
> | `exit_policy_type` | REQUIRED parameters in `default_params`          | Optional                           |
> |--------------------|--------------------------------------------------|------------------------------------|
> | `signal_only`      | none                                             | `exit_catastrophic_sl_pct`         |
> | `atr`              | `exit_tp_atr_mult`, `exit_sl_atr_mult`           | `exit_atr_period` (def. 14, see below) |
> | `combined`         | `exit_tp_atr_mult`, `exit_sl_atr_mult`           | `exit_atr_period`; override from metadata |
> | `custom`           | none (TP/SL come from the `Signal.metadata`)     | —                                  |
>
> The ATR of `atr` and `combined` is the engine's `ind.atr` (14 bars) whatever
> `exit_atr_period` says; `required_indicators=["atr_14"]` documents it.

#### Type 3: `custom` (per-trade in Signal.metadata)

```python
DESCRIPTOR = StrategyDescriptor(
    ...
    exit_policy_type="custom",
)
```

And in your strategy, emit signals with metadata:

```python
# Relative format (percentages)
signals.append(Signal(
    symbol="AAPL",
    side=Side.LONG,
    timestamp=t_execution,
    target_vol=0.005,
    style=self.style,
    metadata={"tp_pct": 0.15, "sl_pct": -0.08},   # +15% TP, -8% SL
))

# Absolute format (prices)
signals.append(Signal(
    symbol="AAPL",
    side=Side.LONG,
    timestamp=t_execution,
    target_vol=0.005,
    style=self.style,
    metadata={"tp_price": 230.0, "sl_price": 180.0},
))
```

**When to use it**: sophisticated strategies where the TP/SL depends on the trade's context (e.g. SL at the recent swing low, TP at the next resistance level). The signal emits TP/SL specific to each trade.

**Note**:
- If Signal.metadata does not contain `tp_pct/sl_pct/tp_price/sl_price`, the policy falls back to "no tactical TP/SL" (but the catastrophic floor stays active).
- The absolute format wins over the relative one if both are present.
- You can give only a TP, only an SL, or both.

#### Type 4: `combined` (ATR fallback + custom override)

```python
DESCRIPTOR = StrategyDescriptor(
    ...
    exit_policy_type="combined",
    required_indicators=["atr_14"],
    default_params={
        ...
        "exit_tp_atr_mult": 3.0,
        "exit_sl_atr_mult": 2.0,
    },
)
```

Behaviour: it uses ATR as the **default**, but if the Signal.metadata specifies `tp_pct/sl_pct/tp_price/sl_price`, those values **win** over the ATR computation.

**When to use it**: strategies that have a "general" ATR-based logic but want overrides for special cases (e.g. earnings coming up → a tighter SL).

### Intra-bar behaviour

The engine checks TP/SL on the **high/low of each bar**, not just the close. So:
- For LONG: if `low <= sl_price` → SL hit, filled at `sl_price`
- For LONG: if `high >= tp_price` → TP hit, filled at `tp_price`
- For SHORT: symmetric (high for SL, low for TP)
- If both are touched in the same bar (rare): **the SL wins** (a conservative convention)

Granularity: the strategy's native bar (D1, H1, M5). D1 strategies check the daily high/low; M5 strategies check the 5-minute high/low.

### Blacklist post-trigger

After an SL/TP trigger fires, the symbol is **blacklisted until the next rebalance**. That is, even if the signal includes it among the targets, it is not reopened until the strategy reconfirms it on the next rebalance day.

Rationale: a trigger hit means "the thesis is broken or exhausted". We wait for the next rebalance to reconfirm it structurally.

### Override via YAML

All exit policy parameters can be overridden in the YAML like any other params:

```yaml
strategies:
  my_strategy:
    params:
      exit_tp_atr_mult: 4.0           # A/B test with a wider TP
      exit_catastrophic_sl_pct: -0.15  # more conservative
```

Without changing the strategy's code.

### Attaching the descriptor in the walk-forward script

**IMPORTANT**: for the engine to "discover" your strategy's exit policy, a legacy walk-forward script must attach the `DESCRIPTOR` to the instance (the generic runner of the self-contained pattern does it by itself):

```python
# In tests/walk_forward_my_strategy.py
from strategies.my_strategy import DESCRIPTOR as MY_DESCRIPTOR
from strategies.my_strategy import MyImpl

def make_my_strategy():
    s = MyImpl(...)
    s.descriptor = MY_DESCRIPTOR   # <-- needed for the discovery
    return s
```

Without this attach, the engine falls back to `SignalOnlyPolicy({})` with the -20% catastrophic default — correct for signal_only strategies, but not for ATR/custom ones.

### Trigger reasons (for debugging)

When a trigger fires, the engine's INFO log reports the reason. The possible reasons:

| `TriggerReason` | Meaning |
|---|---|
| `ATR_TP` | Take Profit ATR-based hit |
| `ATR_SL` | Stop Loss ATR-based hit |
| `CUSTOM_TP` | Custom Take Profit (from Signal.metadata) hit |
| `CUSTOM_SL` | Stop Loss custom hit |
| `CATASTROPHIC_SL` | Floor -20% (or override) hit |
| `SIGNAL_FLAT` | The strategy emitted an explicit FLAT (handled at rebalance, not intra-bar) |
| `KILL_SWITCH` | Account kill switch -20% (RiskManager, portfolio level) |

Filter the logs for "TRIGGER HIT" for a historical audit.

### Complete example: mean-reversion with ATR

```python
# strategies/short_term_meanrev/strategy.py
from strategies.descriptor import (
    StrategyDescriptor, StrategyCategory, StrategyTimeframe,
)
from .impl import ShortTermMeanReversion

DESCRIPTOR = StrategyDescriptor(
    name="short_term_meanrev",
    description="Long when RSI(2) < 10, held until an ATR-based TP/SL",
    category=StrategyCategory.D1_LONG_ONLY,
    timeframe=StrategyTimeframe.D1,
    factory=lambda params: ShortTermMeanReversion(**{
        k: v for k, v in params.items() if not k.startswith("exit_")
    }),
    required_indicators=["rsi_2", "atr_14"],
    default_params={
        "rsi_oversold": 10.0,
        "max_positions": 20,
        "target_vol_per_stock": 0.005,
        # Exit policy params:
        "exit_tp_atr_mult": 2.5,    # TP at 2.5 ATR (mean-rev, moderate target)
        "exit_sl_atr_mult": 1.5,    # tight SL (1.5 ATR: a "wrong" mean-rev shows at once)
        "exit_atr_period": 14,
        # A tighter catastrophic SL (-15%): an intraday mean-reversion
        # should never lose 15% if the thesis is valid
        "exit_catastrophic_sl_pct": -0.15,
    },
    exit_policy_type="atr",
    min_lookback_days=50,
    tags=["mean-reversion", "rsi", "atr-exit"],
)
```

And in the associated walk-forward script (legacy pattern only: the generic
runner of the self-contained pattern attaches the descriptor by itself):

```python
from strategies.short_term_meanrev import DESCRIPTOR as STMR_DESC
from strategies.short_term_meanrev import ShortTermMeanReversion

def make_strategy():
    s = ShortTermMeanReversion(
        rsi_oversold=PARAMS.get("rsi_oversold", 10.0),
        max_positions=PARAMS.get("max_positions", 20),
        target_vol_per_stock=PARAMS.get("target_vol_per_stock", 0.005),
    )
    s.descriptor = STMR_DESC
    return s
```

---

## Testing the strategy

### Quick test (no walk-forward)

The engine calls `generate_signals` **by keyword**, with the indicators of
each symbol and a portfolio. A quick test calls it the same way, on bars you
build yourself:

```python
# tests/test_my_strategy.py
import sys; sys.path.insert(0, '.')
import numpy as np, pandas as pd
from core.indicators import build_indicators
from core.portfolio import Portfolio, PortfolioConfig
from strategies.my_strategy.strategy import DESCRIPTOR

# Instantiate with the default params
strategy = DESCRIPTOR.instantiate()

# Or override:
strategy = DESCRIPTOR.instantiate({"lookback": 50})

# Synthetic OHLCV bars, in the format of the real files
idx = pd.bdate_range("2021-01-04", periods=400)
close = 100 * np.cumprod(1 + np.random.default_rng(1).normal(0.0004, 0.012, len(idx)))
bars = pd.DataFrame({"open": close, "high": close * 1.005, "low": close * 0.995,
                     "close": close, "volume": 1e6}, index=idx)
indicators = {"AAPL": build_indicators(bars, "AAPL")}

strategy.reset()
signals = strategy.generate_signals(
    t_decision=idx[-2],          # the close of the observed bar
    t_execution=idx[-1],         # the open of the bar the order executes on
    indicators_by_symbol=indicators,
    portfolio=Portfolio(PortfolioConfig()),
)
print(signals)                   # a list of core.types.Signal
```

It is the same check the agent runs on every strategy it writes, before
saving it.

### Walk-forward backtest

The real test is the walk-forward. With `backtest_script` and
`output_path_pattern` in the DESCRIPTOR (see [Quick start](#quick-start)):

1. **Run backtest** in the dashboard (or the agent's `run_backtest`) starts
   `strategies/<name>/run_backtest.py`, which delegates to the generic runner
   (`execution/run_walkforward.py`);
2. the runner loads the universe's data, builds the strategy from the
   descriptor, runs the train/test folds and applies allocator, costs and exit
   policy;
3. the out-of-sample equity is saved as
   `output/strategies/wf_<name>_oos_equity_<timestamp>.parquet`, and the
   dashboard shows it as a stream.

The legacy strategies keep their own scripts in `tests/walk_forward_<name>.py`
(see [Self-contained pattern](#self-contained-pattern-for-dashboard-integration)).

---

## Drawing on the chart: `core.chart`

The View shows the trades of a strategy on each asset. To see **why** it
traded, the strategy can draw what it computes — the lines it compares, the
levels it watches, the zones it waits for — TradingView style. In the
backtest every call is recorded bar by bar; the walk-forward saves the
out-of-sample part next to the trades
(`output/strategies/wf_<name>_oos_charts.zip`, one file per asset) and the
View draws it with the trades, in the price pane or in panes of their own.

```python
from core.chart import chart

def generate_signals(self, t_decision, t_execution, indicators_by_symbol, portfolio):
    out = []
    for sym, ind in indicators_by_symbol.items():
        close = ind.close.loc[:t_decision]
        fast, slow = close.rolling(20).mean(), close.rolling(50).mean()
        d = close.diff()
        up = d.clip(lower=0).ewm(alpha=1 / 14, adjust=False).mean()
        dn = (-d).clip(lower=0).ewm(alpha=1 / 14, adjust=False).mean()
        rsi = 100 - 100 / (1 + up / dn)

        ch = chart(sym)                                     # the surface of this asset
        ch.plot(fast.iloc[-1], "SMA 20", color="#4c8dff")   # one point per bar
        ch.plot(slow.iloc[-1], "SMA 50", color="#f0a24d")
        ch.plot(rsi.iloc[-1], "RSI 14", pane="RSI")         # a pane below the price
        ch.hline(70, "Overbought", pane="RSI", color="#ef5350")
        ch.hline(30, "Oversold", pane="RSI", color="#26a69a")

        if fast.iloc[-1] > slow.iloc[-1] and fast.iloc[-2] <= slow.iloc[-2]:
            out.append(Signal(symbol=sym, side=Side.LONG, timestamp=t_execution,
                              strength=1.0, style=self.style))
            ch.label(None, None, "cross", shape="arrow_up", position="below")
    return out
```

### The calls

| Call | What it draws |
|---|---|
| `plot(value, title, color, width, pane, style, dash=, time=)` | A series that grows by one point per bar. `value` is a number (the current bar, or `time`), `None`/NaN for a gap, or a pandas Series indexed by date (only the points up to the current bar are added, each once). `title` names it in the legend and identifies it. `style`: `line`, `step`, `area`, `histogram`, `dots`. A `color` that changes from bar to bar colours that point (histograms by sign, for instance). |
| `hline(price, title, color, pane, width=, dash=)` | A fixed level across the pane (70/30 of an RSI, a zero). Calling it every bar does not duplicate it; levels count in the pane's scale. |
| `fill(a, b, color)` | Colours the space between two plots of the same pane, by title (`fill("BB upper", "BB lower", "rgba(76,141,255,0.1)")`). |
| `bgcolor(color, time=, pane=)` | The background of the current bar (`None` leaves it empty). A pandas Series of colours adds the new bars. |
| `line(x1, y1, x2, y2, color, width, dash=, extend=, arrow=, pane=, text=)` | A segment; `extend="right"`/`"left"`/`"both"` makes it a ray or a line, `arrow="end"`/`"start"`/`"both"` a vector. |
| `box(left, top, right, bottom, color, fill, width=, dash=, text=, text_color=, pane=, extend=)` | A rectangle between two times and two prices: a range, a zone, a gap. `right=None` is the current bar. Without `color` and with a `fill` it is just a shaded zone. |
| `label(x, y, text, color, text_color=, position=, shape=, size=, pane=)` | A label at a price, or on the candle with `y=None` (above the high with `position="above"`, below the low with `"below"`; price pane only). `shape`: `label`, `arrow_up`, `arrow_down`, `circle`, `square`, `diamond`, `cross`, `none`. |
| `vline(x, color, width=, dash=, text=, pane=)` | A vertical line at a time (an event, a regime change). |

`line`, `box`, `label` and `vline` return the drawing: `.set(...)` changes it
at a later bar (`box.set(right=None)` stretches a range bar after bar),
`.delete()` removes it. Removed drawings stay in the replay of the View for the
bars in which they existed.

**Times** (`x`, `x1`, `left`, `time`...): `None` is the current decision bar;
a date (`Timestamp`, `datetime`, ISO string) is that bar; a negative integer is
*bars ago* (`-20`). **Panes**: `pane=None` or `"price"` is the price pane; any
other name opens a pane below it (at most 8), shared by every call with the
same name. **Colours**: `"#4c8dff"`, `"rgba(76,141,255,0.3)"`, `"hsl(...)"` or a
CSS name. **Dash**: `"solid"`, `"dashed"`, `"dotted"`.

### Three rules

* **Drawing never changes the results.** Outside a backtest that records
  (quick tests, validation) `chart()` returns a surface that does
  nothing: the same code runs everywhere. Recording is on in the walk-forward,
  for its out-of-sample bars, and in the live only with **Save debug data**
  on (Settings → Data → Live data). That setting needs **Keep the data the
  live downloads**, since the View draws the live drawings on the live bars,
  and a runner started without keeping them records from its next start.
  Then each live bar is recorded with the trades of the stream
  (`output/live_debug/<strategy>/<session>/`) and the View shows them as
  «<strategy> · live». With the setting off the drawing
  calls cost a variable read and nothing else — unlike the values read with
  `core.custom_indicators`, which are part of the decision and are always
  computed.
* **It never raises.** A wrong argument, an invalid colour, a limit exceeded
  become a *note*, shown in the View next to the strategy's legend ("2 notes");
  an exception inside `generate_signals` would drop that bar's signals.
* **What the strategy knew.** A point belongs to the bar in which it was
  plotted; a Series adds only the points up to the current bar. Plotting the
  future (`time=` after the current bar) is possible and shows in the chart,
  but the replay hides everything past its cursor.

Limits, per strategy and asset: 64 series, 8 panes, 2,000 lines / boxes /
labels / vertical lines alive at once (the oldest are removed, as in
TradingView), 200 levels; for the whole run 12 million points and 300,000
drawings. Plotting a scalar per bar is the cheap way; recomputing a long
Series and plotting it every bar costs the slicing, not the storage.

### In the View

The strategy timeframe opens by default; on other timeframes series and
backgrounds move to the candle that contains the end of the strategy's bar
(the value is known at its close), drawings to the candle that contains
their time. Each pane has its legend with the values under the cursor; a click
on a value hides that plot, the eye hides everything the strategy drew.
*Indicators → Strategy* and the settings panel turn plots and drawings off.
In the replay only what existed at the last complete bar is drawn: on a bar
still forming (the replay stopped inside an hour seen on the hourly chart) the
drawings wait for its close, as the strategy does.

Walk-forward folds start from scratch: a ray or an open box that a fold could
not remove stops where the fold ends.

---

## Reading your indicators: `core.custom_indicators`

An indicator written in the View (`indicators/<name>.py`, see
`indicators/INDICATOR_TEMPLATE.md`) **exports** values: `export(series)` is
the main one (the older `PRIMITIVE = series` is the same), `export(series,
"name")` adds others, numbers or True/False. The genetics uses them as
primitives; a strategy reads them without rewriting the computation:

```python
from core.custom_indicators import indicator, indicator_series

def generate_signals(self, t_decision, t_execution, indicators_by_symbol, portfolio):
    out = []
    for sym in indicators_by_symbol:
        rsi = indicator("rsi_bands", sym)                        # the main export, at the decision bar
        if indicator("rsi_bands", sym, "oversold"):             # a named True/False export
            ...
        before = indicator("rsi_bands", sym, offset=1)          # the bar before
        slow = indicator("rsi_bands", sym, params={"length": 28})   # its param(...) values
        daily = indicator("rsi_bands", sym, timeframe="D1")     # an extra timeframe: the last CLOSED bar
        last50 = indicator_series("rsi_bands", sym, bars=50)    # the last values, read-only
```

* **What the strategy sees** is the value the indicator computes with the bars
  up to the decision bar. For an extra timeframe (it must be in
  `extra_timeframes`), the last bar of that timeframe that has *closed* by the
  close of the decision bar: a D1 value read by an H4 strategy at the 20:00 bar
  is yesterday's, as the live sees it.
* **Fast and exact.** In a backtest the indicator is computed once per asset
  and parameters, on the whole history, and read bar by bar — if it is
  *causal* (a bar uses only the bars up to it). The first computation checks
  it, recomputing up to 5%, 25%, 50% and 75% of the history. An indicator that
  looks ahead (`shift(-1)`, `s.mean()` of the whole history, `bfill()`) is
  computed bar by bar with only the bars known at each decision, as the live
  does: slower, never wrong; the log says so (`[IND] ... NOT causal`). In the
  live the indicator is recomputed on the stream's bars at every bar.
* **Always computed.** These reads are part of the decision: unlike
  `chart()`, they run in the backtest and in the live, with or without the
  debug data.
* **Order flow.** An indicator may read the footprint (`fp.delta`, `fp.cvd`,
  `fp.stacked_imbalances(3)`, `fp.iceberg()`...): the strategy reads it like
  any other. In the live the bars just closed are downloaded from Dukascopy
  for the assets whose footprint comes from its ticks; a footprint loaded from
  a file has no new bars there, and the stream warns.
* **Errors stop the backtest at once**, with the reason: an indicator that is
  not in the library, an export or a param it does not have, an error in its
  code (`IndicatorError`). Outside `generate_signals` the calls raise.
* **Types.** A number (NaN before the indicator has a value) or, for a
  True/False export, a `bool` (False before the first bar).
  `indicator_series` returns the series in memory for every bar: `.copy()` it
  to change it.

The values of an indicator are those of its file **now**: a backtest uses the
code it finds, and the log line `[IND] custom indicator 'rsi_bands'
(4b957ff4b3b5)` records its fingerprint. The strategies the genetics generates
carry a copy of their indicators instead (`gp_primitives.py`).

---

## Conventions and best practices

### Naming

- Folder + DESCRIPTOR name: snake_case, no spaces, no capitals
- Implementation files: descriptive (`mean_reversion.py`, `momentum_filter.py`)

### Parameters

- ALL the tunable parameters in `default_params`, NO magic numbers in the code
- Document the rationale of the defaults (a comment in the code)
- Avoid parameters optimised on test data: this is a well-known anti-pattern

### Edge cases

- Handle NaN in the features explicitly
- Check that there is enough history (`min_lookback_days`)
- What to do if `applicable_symbols` is empty?
- What to do in extreme regimes (vol > 100% annual)?

### Anti-overfitting

- Lookback windows: use multiples of 21 (1 trading month) or 252 (1 year)
- Thresholds: choose "natural" numbers (0.05, 0.10, not 0.073)
- If you must tune, **run a walk-forward cross-validation inside the train fold**
- Always document the STRUCTURAL rationale of the parameters

### Computational performance

- Vectorise as much as possible (`np.where`, `df.rolling`, no `for symbol in ...`)
- Use the IndicatorPool instead of recomputing
- Profile with `cProfile` if a backtest takes > 10 minutes

---

## Real examples

The library strategies ship disabled, with a leading underscore in the folder
name (the registry skips those folders): read them as references, and copy what you need into a
folder of your own.

### 1. `strategies/_momentum/` — Jegadeesh-Titman 12-1

Classic cross-sectional momentum. Top decile, monthly rebalance.

- File: `cross_sectional.py` (240 lines)
- Indicators: `momentum_252_21`
- Sharpe OOS: 0.81 (9 folds, 2015-2023)

### 2. `strategies/_quality_lv/` — Quality + Low-Vol stacking

Factor stacking with a quality proxy (return stability) + low realized volatility.

- File: `quality_lowvol.py`
- Indicators: `realized_vol_252`
- Sharpe OOS: 0.60

### 3. `strategies/_value/` — 52W Value Proxy

Buys names near their 52W low with SMA200 still positive (no falling knife).

- File: `value_52w.py`
- Indicators: `sma_200`
- Sharpe OOS: 0.49

### 4. `strategies/_custom_example/` — RSI Mean Reversion (for teaching)

**Example for documentation**, disabled by default. It shows:
- the minimal structure
- the use of IndicatorPool (RSI + ATR)
- state management (`current_positions`)
- exit logic + entry logic
- **Exit policy `atr`** with TP at 3×ATR and SL at 2×ATR (a teaching example
  to show the difference from the `signal_only` of the 3 core strategies)

See the 3 files inside the folder as a reference when you write your first
strategy.

---

## Troubleshooting

### "My strategy does not appear in the dashboard"

Checklist:
1. ✓ Is the folder in `strategies/`?
2. ✓ Does it contain `strategy.py`?
3. ✓ Does `strategy.py` expose the global variable `DESCRIPTOR`?
4. ✓ Is `DESCRIPTOR` an instance of `StrategyDescriptor` (not a dict)?
5. ✓ Does the folder NOT start with `_` or `.`?
6. ✓ Was the dashboard **restarted** after adding the strategy?

Check in the dashboard's startup log:
```
INFO: Discovering strategies in .../strategies ...
INFO:   Found 5 candidate strategy folders: [...]
INFO:   [OK] 'my_strategy': My description
```

If you see a WARNING instead of [OK], the strategy has an import error or a
malformed DESCRIPTOR.

### "Error: 'StrategyDescriptor' object has no attribute X"

You are probably passing a dict instead of a StrategyDescriptor:
```python
# ❌ WRONG
DESCRIPTOR = {"name": "my_strategy", ...}

# ✅ RIGHT
DESCRIPTOR = StrategyDescriptor(name="my_strategy", ...)
```

### "TypeError: factory takes 0 positional arguments but 1 was given"

The factory must accept a dict:
```python
# ❌ WRONG
factory=lambda: MyStrategyImpl()

# ✅ RIGHT
factory=lambda params: MyStrategyImpl(**params)
```

### "ImportError in my strategy"

Import errors in your strategy do not crash the whole dashboard, but your
strategy is skipped with a WARNING.

For local debugging:
```bash
python -c "from strategies.my_strategy.strategy import DESCRIPTOR; print(DESCRIPTOR.to_dict())"
```

### "My indicators are not pre-computed"

Check:
1. ✓ Is the strategy `enabled=True` in the DESCRIPTOR?
2. ✓ Does `required_indicators` contain the exact name (e.g. `"sma_200"`)?
3. ✓ Does the name follow the `<base>_<param>` convention?
4. ✓ Is the `base` registered in `INDICATOR_REGISTRY`?

Test:
```python
from core.indicator_pool import IndicatorPool, INDICATOR_REGISTRY
print(list(INDICATOR_REGISTRY.keys()))   # the available bases
```

### "My strategy has a ridiculous ANNUAL VOL (~2%): it does not lose, but it does not earn"

**Almost certain cause**: the strategy is CONCENTRATED (few assets) and hits
the global cap `max_position_weight = 0.05`. With 2-4 positions at 5% each,
only ~10-20% of the capital is invested → portfolio vol ~2%. The strategy is
strangled: it runs, it does not lose, but it weighs nothing.

**Why it is insidious**: no error in the logs, the Sharpe looks "normal" (it
is scale-invariant, it does not change with sizing), and you end up optimising
the edge when the real problem is that the strategy was never invested.

**Fix**: declare `allocator_overrides` in the descriptor to raise the cap ONLY
for this strategy:
```python
allocator_overrides={"max_position_weight": 0.45, "max_gross_leverage": 1.0},
```
See the [Allocator and sizing](#allocator-and-sizing) section for the details,
the allowed keys, and the caveats on `strength` (it is conviction, not weight)
and on cash-like assets in vol-targeting.

**Quick check** that the overrides are read (after "Loaded descriptor" the log
must show `[ALLOCATOR_OVERRIDE] <name>: {...}`); if it does not appear, either
the descriptor does not have them or `run_walkforward.py` is out of date.

### "WARNING: build_exit_policy failed: ... requires 'exit_tp_atr_mult'. Falling back to SignalOnlyPolicy"

**Cause**: you declared `exit_policy_type="atr"` (or `"combined"`) but the
mandatory `exit_*` parameters are missing from `default_params`. The ATR policy
needs **both** `exit_tp_atr_mult` and `exit_sl_atr_mult`; if one is missing,
building it fails and the framework falls back to `SignalOnlyPolicy`.

**Why it is insidious**: it is NOT a crash. The backtest runs to the end, but
with no tactical TP/SL (only the -20% catastrophic floor). The numbers you get
are NOT those of the strategy you think you are testing.

**Fix**: add the missing parameters to `default_params`:
```python
default_params={
    ...
    "exit_tp_atr_mult": 2.5,
    "exit_sl_atr_mult": 1.5,
    "exit_atr_period": 14,   # optional, default 14
},
```
See the "required parameters per policy type" table in Exit Policy.
Remember: the `exit_*` parameters go in `default_params` (the factory filters
them out of the constructor with `if not k.startswith("exit_")`), NEVER as
arguments of the strategy's constructor.

**Quick check** that the policy is the right one before a long backtest:
```python
from strategies.registry import discover_strategies
d = discover_strategies()["my_strategy"]
print(type(d.build_exit_policy()).__name__)   # must print ATRBasedPolicy,
                                               # NOT SignalOnlyPolicy
```

### "My atr exit_policy never fires during the backtest"

Possible causes:

1. **Descriptor not attached to the instance in the walk-forward script**.
   Check that `s.descriptor = MY_DESCRIPTOR` is present in the factory.
   Without it, the engine uses `SignalOnlyPolicy({})` as a fallback with only
   the -20% catastrophic floor.

2. **Multipliers sized on another ATR period**. The policy reads the engine's
   `ind.atr` (Wilder, 14 bars) whatever `exit_atr_period` says: a stop sized
   on an ATR(5) lands much further away on the ATR(14) the engine uses.

3. **TP/SL multipliers too wide**. E.g. `exit_sl_atr_mult: 5.0` on a stock
   with 25% annual vol means an SL at ~-8% per position (5 × 1.57%
   daily stdev). On long-holding strategies it rarely fires. Consider tighter
   multipliers for mean-reversion.

4. **Logging at WARNING or above**. The triggers are logged at INFO.
   Check that the run's logger is set to DEBUG or INFO:
   ```python
   logging.basicConfig(level=logging.INFO)
   ```
   and look for "TRIGGER HIT" in the log.

### "The backtest is identical to before despite the exit_policy"

Expected behaviour for `signal_only` when the catastrophic floor does not fire.
Historically the system's MaxDD is -11%, so the -20% floor **never** fires in
the historical data. Practical effect = zero on the backtest numbers.

To check that the catastrophic floor would trigger in extreme scenarios:
```python
# Synthetic test with an artificial bar that gaps to -25%
from core.exit_policy import build_exit_policy, Side, check_bar_triggers
p = build_exit_policy("signal_only", {})
t = p.compute_triggers("AAPL", 100.0, Side.LONG, None)
# t.sl_price should be 80.0 (catastrophic -20%)
reason, fill = check_bar_triggers(t, bar_high=85, bar_low=75, side=Side.LONG)
print(reason, fill)   # CATASTROPHIC_SL, 80.0
```

### "I want to test it by hand"

```python
# Test discovery
from strategies.registry import discover_strategies
reg = discover_strategies()
print(reg.keys())

# Inspect descriptor
desc = reg["my_strategy"]
print(desc.to_dict())

# Instantiate
print(type(strat))
```

---

## Recommended workflow

1. **Sketch**: write pseudo-code of the logic on paper or in markdown
2. **Implementation**: code the `MyImpl` class in `<name>/<impl>.py`
3. **Descriptor**: write `strategy.py` with a minimal DESCRIPTOR
4. **Unit test**: test the strategy on made-up data
5. **Walk-forward**: run its backtest (Run backtest, or `run_backtest.py`)
6. **Iterate**: if the numbers do not hold out of sample, **do NOT tune on the
   test data**. Change the structural approach, or discard it.
7. **Document**: add a README in the strategy's folder explaining
   the rationale, the edge thesis and the OOS results

---

## Self-contained pattern for dashboard integration

A new strategy can be visible in the dashboard as a runnable stream **without touching any file outside its own folder**. It is the recommended pattern for every new strategy (the classic strategies `momentum`, `quality_lv`, etc. use a legacy pattern kept for compatibility).

### TradingView-style philosophy

The strategist writes only the **logic** (class + `DESCRIPTOR` in `strategies/<name>/strategy.py`). The framework's infrastructure takes care of everything else: data loading, walk-forward, allocator, costs, saving the output, reporting.

No duplicated boilerplate. No 280-line `run_backtest.py` in every folder.

### What it takes

1. **Minimal backtest script** — a 23-line `strategies/<name>/run_backtest.py` that delegates to the generic runner
2. **Descriptor with 4 extra fields** — `backtest_script`, `output_path_pattern`, `stream_type`, `stream_category`

### The backtest script reduces to a delegation

The framework offers a **generic TradingView-style runner** in `execution/run_walkforward.py` that does all the walk-forward work reading directly from the `DESCRIPTOR`:

```python
# strategies/<name>/run_backtest.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from execution.run_walkforward import run_walkforward

if __name__ == "__main__":
    sys.exit(run_walkforward("<name>"))
```

**23 lines in total**, and only 1 of them has specific content (the strategy's name). Everything else is inferred from the descriptor.

### Example of a self-contained descriptor

```python
DESCRIPTOR = StrategyDescriptor(
    # ... standard fields (name, factory, default_params, etc.) ...

    # Self-contained dashboard integration
    backtest_script="strategies/<name>/run_backtest.py",
    output_path_pattern="output/strategies/wf_<name>_oos_equity_*.parquet",
    stream_type="equity_curve",   # or "pnl_daily" / "pnl_sparse"
    stream_category="d1",          # or "intraday" / "ml_overlay"

    # Optional: extra symbols besides those derived from the
    # allowed_asset_classes (e.g. SPY for regime detection in an FX-only strategy)
    extra_universe_symbols=[],
```

### Optional hooks for strategies with special needs

If the strategy needs to load extra data (e.g. policy rates from FRED for `fx_carry`, ML predictions for `fx_risk_overlay`), it defines a hook function in the `strategy.py` module that the runner calls automatically:

```python
# strategies/_fx_carry/strategy.py

def prepare_extra_data(cfg: dict) -> dict:
    """Hook run by the generic runner before the strategy is built.
    Returns a dict passed as kwargs to the strategy's constructor."""
    from data.loader import load_policy_rates_universe
    rates = load_policy_rates_universe(
        ["USD", "EUR", "JPY", "GBP", "AUD", "CAD", "CHF", "NZD"],
        start=cfg["data"]["start_date"],
    )
    return {"rates_universe": rates}

# The class accepts the matching kwarg:
class FXCarryStrategy(BaseAtomicStrategy):
    def __init__(self, rates_universe, n_long=3, ...):
        self._rates = rates_universe
        # ...
```

**Live, the same hook runs too.** The live runner calls `prepare_extra_data`
with the configuration of the backtest (`config/quantsys.yaml`), the end of
the period moved to the bar being decided, `cfg["base_path"]` (the working
folder) and `cfg["live"] = True`, and passes the result to the constructor
exactly as the backtest does. It is computed again on a new decision day (on a
new bar for intraday strategies) and whenever one of the categories in
`required_external_data` receives new rows; if it fails, the strategy keeps
the data of the previous cycle and the journal says so. The
`__replace_data_for_symbols__` key is ignored live: the bars come from the feed.

Two consequences for whoever writes a strategy:

- read the data **from the files of the categories you declare**, not from a
  path of your own: those are the files the system keeps up to date;
- live, the instance is **rebuilt by replaying the bars** (at start-up, after
  a missed bar, when the extra data or the parameters change — see «Live:
  context, state and exits» below): state kept in `self` survives from one bar
  to the next only if it is a function of the bars and of the extra data. A
  value that depends on the wall clock, or on something the replay cannot see,
  is lost at the next rebuild. Deriving the state from the data at each call
  (as `strategies/_pead_classic/strategy.py` derives its holding windows from
  the event table) is still the safest choice.

Similarly there is `post_run_hook(result, out_dir, timestamp)` for custom output after the run (specific plots, extra statistics).

### What the framework does automatically

At this point, **with no change outside the folder**:

- `execution/run_walkforward.py` runs the generic walk-forward reading from the descriptor
- `execution/backtest_runner.py` routes the dashboard's "Run Backtest" button to your `run_backtest.py` (which in turn delegates to the generic one)
- `dashboard/config.py::_build_streams_config()` discovers the stream through `discover_strategies()` and adds it to `STREAMS_CONFIG`
- On restart the dashboard shows the strategy both among the Run options and among the viewable streams

No `STRATEGY_SCRIPTS` to edit, no entry in `_STREAM_TYPE_MAP`, no duplicated 280-line boilerplate.

### Difference from the legacy pattern

The classic strategies (`momentum`, `quality_lv`, `value`, `bear_overlay`, `avellaneda`) use a legacy pattern:
- a script in `tests/walk_forward_<name>.py` (~280 lines of boilerplate each)
- an entry in `execution/backtest_runner.py::STRATEGY_SCRIPTS` (hardcoded)
- an entry in `dashboard/config.py::_STREAM_TYPE_MAP` (hardcoded)

The self-contained pattern replaces all of it with:
- 23 lines in `strategies/<name>/run_backtest.py`
- 4 extra fields in the descriptor
- zero changes to the framework

The classic strategies keep working (automatic fallback in `backtest_runner`), but **new** strategies should follow the self-contained pattern.

### Summary: what leaves the strategy's folder

```
strategies/<name>/
├── __init__.py            # exposes DESCRIPTOR + the class
├── strategy.py            # logic + DESCRIPTOR + optional hooks (prepare_extra_data, post_run_hook)
├── run_backtest.py        # 23 lines delegating to the generic runner
├── <logic_module>.py      # support code if needed (cross_sectional, thermodynamics, etc.)
└── README.md              # rationale + OOS results (post-merge)
```

Outputs produced by the generic runner (in `execution/run_walkforward.py`):
```
output/strategies/
├── wf_<name>_<timestamp>.json                   # aggregate + per-fold metrics
└── wf_<name>_oos_equity_<timestamp>.parquet     # OOS equity (read by the dashboard)
```

No file in `tests/`, no circular imports, no dependency outside the strategy's folder (except the framework primitives: `core/`, `data/`, `validation/`, `execution/`).

---

*Document version: 2.3 (catastrophic floor carve-out for diversified long-only baskets: `exit_catastrophic_sl_pct=None` mandatory; applied to momentum, quality_lv, value, ising_inverse)*
---

## Live: context, state and exits

What the live runner does with a strategy, so that what runs live is what its
walk-forward measured (details in `ARCHITETTURA.md`, section 7.2).

**The bars it gets.** The runner asks the broker for the bars of the
strategy's universe at its `timeframe` (and at each of its
`extra_timeframes`): as many as `min_lookback_days` at that timeframe, plus the
stretch it replays to rebuild the state, plus a margin. Whatever the broker
lacks — a symbol it does not quote, history it does not go back to — comes
from the backtest repository and from the providers (Yahoo Finance,
Dukascopy, Polygon), checked against the broker's bars where they overlap.
Only closed bars reach the strategy. So:

- declare in `min_lookback_days` the history your indicators really need: it
  is what the runner asks for, at your timeframe;
- a strategy that needs another market's series (a driver, an index) should
  have it in its universe or read it through `prepare_extra_data`: the runner
  only fetches what is declared.

**The state.** Live, the strategy runs as a stream: its configuration
(parameters from `config/quantsys.yaml`, universe, allocator, minimum number of
symbols) is built by the same function as the walk-forward
(`execution/config_strategia.py`), with its own `RiskManager`, portfolio and
exits. At start-up the state is rebuilt by replaying **the backtest engine
itself** from an anchor saved on disk (about a year of daily bars before the
first start), then the stream advances one bar at a time: exits on the bar's
high and low, mark-to-market, decision at the close, execution at the broker's
price. Your `generate_signals` is therefore called exactly as in the backtest,
on the same instance from one bar to the next, until the next rebuild.

**Exits.** The exit policy of the DESCRIPTOR (`exit_*` parameters, catastrophic
stop) applies live as in the backtest; between two cycles the runner checks
stops and take-profits on the broker's prices every minute, and a position
closed that way is out of the strategy's book at once.

**When it cannot run.** If `prepare_extra_data` fails (the category files are
missing) or the replay raises, the stream says it once in the runner's journal
and waits; it is retried when the data change. Raise a clear error from
`prepare_extra_data` (what is missing, how to get it): it is the message the
user reads.

---

## Multi-timeframe: additional SERIES (`extra_timeframes`)

A strategy declares the timeframes it needs in its own `DESCRIPTOR`:

```python
DESCRIPTOR = StrategyDescriptor(
    ...
    timeframe=StrategyTimeframe.M5,          # the one it trades on
    extra_timeframes=["H1", "H4", "D1"],     # the ones it reads for context
)
```

The runner resolves each timeframe with a single rule: **if the file exists it
is used, otherwise it is built from the nearest finer one available**. With M5
and H1 on disk, `H4` is built from H1 (not from M5, which is further away) and
`M15` from M5.

The reason for the nearest one is precision: aggregating H1 into H4 means four
bars, aggregating M5 means forty-eight, and every rounding of the open, the
high and the low accumulates.

**The common period wins.** If M5 starts in 2021 and D1 in 2010, every series
starts in 2021. Comparing a signal that has existed for three years with one
that has existed for fifteen would produce a backtest whose first twelve years
are half blind, without saying so.

If even a single symbol in the universe cannot obtain one of the requested
timeframes, **the backtest does not start** and says which one is missing:
carrying on would skip it in silence, and a cross-sectional strategy would give
different results without flagging it.

Strategies that do not declare `extra_timeframes` find `self.timeframes`
containing only their own: nothing changes for them.

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

---

## Code for the marketplace

A strategy (with or without bypass), an overlay, a weight mode or a regime rule
that goes on the marketplace runs on the buyer's computer, next to their broker
credentials. For this reason its code must **compute on the data Lyra passes
to it**, and nothing else. `core/analisi_codice.py` checks it twice: when you
publish it (the *Sell* page shows «Code check» with the lines to fix) and on
the buyer's computer, before installing. Your own strategies, the ones you do
not publish, have none of these constraints.

**Allowed imports**
- the computational standard library: `math`, `statistics`, `random`,
  `datetime`, `zoneinfo`, `collections`, `itertools`, `functools`,
  `dataclasses`, `enum`, `typing`, `json`, `re`, `logging` (without
  `handlers`/`config`), …;
- `numpy`, `pandas`, `scipy`, `sklearn`, `statsmodels`, `lightgbm`, without
  the submodules that read or write files or go on the network (`pandas.io`,
  `numpy.lib.npyio`, `sklearn.datasets`, `scipy.io`, …);
- from Lyra only the SDK: `core.types`, `core.indicators`, `core.portfolio`,
  `core.volume_profile`, `core.exit_policy`, `core.chart` (`chart`: the
  drawings for the View), `core.custom_indicators` (`indicator`,
  `indicator_series`, `exports_of`, `serie_da_codice`, `valori_pit`,
  `IndicatorError`: the values of the indicators), `strategies.base`,
  `strategies.descriptor`, `data.universe`,
  `data.loader` (`load_universe`, `load_fx_pair`, `decompose_fx_pair`,
  `load_policy_rates_universe`, without `cache_dir=`), `core.node_data`
  (`data_series`, `custom_series`: the auxiliary data by category),
  `features.feature_engine`,
  `features.panel_features`, `reporting.metrics`, `regime.logics._base`
  (`_hysteresis`, `_realized_vol`, `_expanding_median`), `volume_profile`
  (`get_zones_at`);
- the files of **its own** folder with a relative import
  (`from .rules import sign`): never its own folder by name
  (`strategies.mine.rules`), because the buyer can install it under another
  name, and never another artifact.

**What is not allowed**
- files: `open`, `pathlib`, `os`, `pd.read_*`, `df.to_csv`, `np.load`,
  `np.save`, arguments such as `cache_dir=`, `path=`, `filename=`;
- network, programs, system threads: `socket`, `requests`, `urllib`,
  `subprocess`, `multiprocessing`;
- code built at run time: `eval`, `exec`, `compile`, `__import__`,
  `df.eval`, `df.query`, `typing.get_type_hints`;
- introspection: `globals`, `locals`, `vars`, the `__dunder__` attributes
  (except the protocols: `__init__`, `__call__`, `__getitem__`, `__name__`,
  `__class__`, …), frames and tracebacks (`tb_frame`, `f_globals`), `gc`,
  `inspect`, `sys`;
- `getattr` with a computed name: write the attribute (`ind.rsi_14`) or use
  `core.types.by_name(ind, f"rsi_{n}")`, which runs the same checks at the
  moment of the call;
- changing Lyra's or the libraries' objects: `UNIVERSE.clear()`,
  `np.mean = …`, `pd.set_option(…)`.

**What Lyra does at installation**
- it writes **its own** `run_backtest.py` (the one in the package is not used)
  and pins script and results to the artifact's folder, whatever the
  descriptor says;
- it records the fingerprint of every file: if the buyer changes a file, it is
  checked again with the same rules when it is loaded;
- when the code runs, a guard (`core/guardia.py`) blocks files, network,
  processes and introspection requested by it anyway — even through a Python
  or Lyra function — and the engine passes it the portfolio read-only and the
  indicators as a copy. A block is a `PermissionError` with the artifact's
  name.

Data it needs that the engine does not pass (earnings, news, fundamentals,
macro series, categories created on the Data page) are declared in the
descriptor (`required_external_data=[...]`) and read with
`core.node_data.data_series` / `custom_series`, by category and never by path:
the system downloads them, and the product page lists them for the buyer.
