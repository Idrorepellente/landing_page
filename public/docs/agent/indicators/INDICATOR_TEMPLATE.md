# Creating a custom INDICATOR

An indicator is NOT a normal Python module: it is a **vectorised script** run in
a sandbox, where series and functions are **already available**.
The file goes into `indicators/<name>.py` and is executed by the View page
(indicator editor) on the OHLCV of the selected symbol and timeframe.

## Non-negotiable rules (the runtime enforces them, they are not advice)

| Forbidden                          | Error you get                                        |
|------------------------------------|------------------------------------------------------|
| `import` of any kind               | `import not allowed (use the functions already available)` |
| `def` of functions                 | the script is vectorised: no definitions              |
| `for`/`while` loops over the bars  | everything is done with series operations             |
| names or attributes with `__`      | `name '__' not allowed`                               |
| `os`, `eval`, `exec`, `open`       | blocked by the sandbox                                |
| markdown or text outside the code  | `SyntaxError`                                         |

`pandas` and `numpy` **must not be imported**: they are already there as `pd`
and `np`. There is no `df` either: the series are used directly by name.

## What is already available

**Source series** (aligned to the OHLCV index):
`open`, `high`, `low`, `close`, `volume`, `hl2`, `hlc3`, `ohlc4`, `hlcc4`, `na`

**Functions**:
`sma(s, n)`, `ema(s, n)`, `rma(s, n)`, `wma(s, n)`, `stdev(s, n)` (alias `dev`),
`highest(s, n)`, `lowest(s, n)`, `change(s, n=1)`, `roc(s, n=1)`, `mom(s, n=1)`,
`shift(s, n)`, `cum(s)`, `nz(s, v=0)`, `sign(s)`, `abs_(s)`, `clip(s, lo, hi)`,
`correlation(a, b, n)`, `tr()`, `atr(n)`, `rsi(s, n)`, `macd(s, f, sl, sig)`,
`bbands(s, n, k)`, `crossover(a, b)`, `crossunder(a, b)`, `cross(a, b)`,
`vwap()`, `rolling_vwap(n)`, plus `np` and `pd` for everything else.

**Drawing** — EXACT signatures (other parameters raise `TypeError`):

| Function     | Full signature                                                                 |
|--------------|--------------------------------------------------------------------------------|
| `plot`       | `plot(series, title=None, color=None, width=1, pane="overlay", style="line")`   |
| `plot_hist`  | `plot_hist(series, title=None, color=None, pane="separate")`                    |
| `hline`      | `hline(value, title=None, color=None, pane="overlay")`                          |
| `log_print`  | `log_print(*args)`                                                             |

- `pane`: `"overlay"` (on the price chart) or `"separate"` (panel below).
- `style`: `"line"`, `"area"`, `"histogram"`, `"columns"`.
- `width`: integer 1–6. Maximum 12 plots per indicator.
- **The matplotlib parameters do not exist**: `linestyle`, `ls`, `linewidth`,
  `lw`, `alpha`, `label`, `figsize`. Using them immediately gives
  `TypeError: _Ctx.hline() got an unexpected keyword argument 'linestyle'`.
- Reference lines must go in the **same panel** as the indicator: if you used
  `pane="separate"` in the `plot`, put it in the `hline` calls too, otherwise
  they end up on the price chart.

## Mandatory export: the values strategies read

The script **always** exports its main value:

```python
export(<main series>)          # the same as the older: PRIMITIVE = <main series>
```

It is the series that represents the indicator: a strategy reads it with
`indicator("<name>", symbol)` (`core.custom_indicators`, see
`strategies/GUIDE_STRATEGIE_CUSTOM.md`) and the genetic evolution uses it as a
primitive. More values, numbers or True/False, get a name:

```python
export(rsi_val > 70, "overbought")     # indicator("<name>", symbol, "overbought")
export(signal_line, "signal")          # indicator("<name>", symbol, "signal")
```

Names: letters, digits and `_`, starting with a letter, at most 40; at most 16
exports. A True/False export must have no NaN (a comparison never does). Each
export is also a primitive for the genetics (`<name>: overbought`).

## Parameters a strategy can change

```python
period = param("length", 14)     # 14 here and in the View; a strategy can ask for 28
```

`param(name, default)`: the type follows the default (whole number, decimal,
True/False, text). A strategy asks for other values with
`indicator("<name>", symbol, params={"length": 28})`; a name the indicator does
not have is an error that lists the ones it has.

## Causal: each bar uses only the bars up to it

A strategy reads the value of the decision bar. In a backtest the indicator is
computed once on the whole history and read bar by bar, so it must not look
ahead: no `shift(-n)`, no statistics of the whole history (`s.mean()`,
`s.max()`, `s / s.iloc[-1]`), no `bfill()`, no centred windows. The **Preview**
of the editor checks it (recomputing up to some bars of the history) and says
`Causal` or `Looks ahead`; an indicator that looks ahead still works in a
backtest, computed bar by bar (slower), and the agent's check refuses it.
`cum()` and `ema()` are causal: they depend on where the data starts, like on
TradingView.

## Order flow: the footprint of the asset

On an asset with footprint data (Dukascopy ticks downloaded on the Data page,
or an order-flow file) `fp` gives the volumes at each price of each bar,
split between the sellers who hit the bid and the buyers who lifted the ask.
Elsewhere every value is NaN (and False) and the editor's log says why.

| Per bar (Series)                  | What it is |
|-----------------------------------|------------|
| `fp.buy`, `fp.sell`, `fp.volume`  | bought at the ask, sold at the bid, their sum |
| `fp.delta`, `fp.delta_pct`        | buy − sell, and as a % of the volume |
| `fp.cvd`, `fp.cum_delta(reset)`   | cumulative delta; `reset` "D" (every day, UTC), "W", "M", None, "auto" (the default of `cvd`: daily below D1, weekly on D1, monthly above) |
| `fp.delta_max`, `fp.delta_min`    | the highest and lowest delta reached inside the bar (from 0 at the open, minute by minute on the Dukascopy M1) |
| `fp.poc`, `fp.poc_volume`         | the price with the most volume, and its volume |
| `fp.vah`, `fp.val`                | the value area (`va_percent` of the volume around the POC) |
| `fp.buy_imbalances`, `fp.sell_imbalances` | how many rows have a diagonal imbalance (ask ≥ `imbalance` × the bid of the row below; bid ≥ `imbalance` × the ask of the row above) |
| `fp.stacked_buy`, `fp.stacked_sell` | the tallest stack of imbalances on consecutive rows |
| `fp.unfinished_high`, `fp.unfinished_low` | bought AND sold on the top / bottom row (an unfinished auction) |
| `fp.trades`, `fp.rows_count`, `fp.step`, `fp.available` | trades (from a time & sales file), rows in the bar, the height of a row, True where the bar has order flow |

| Methods                                   | What they give |
|-------------------------------------------|----------------|
| `fp.stacked_imbalances(count=3)`          | table: `buy`, `sell` (True/False) and the zone `buy_bottom`/`buy_top`, `sell_bottom`/`sell_top` |
| `fp.absorption(rows=2, share=0.2, ratio=2.0)` | +1 sellers absorbed at the low (and the bar closes in its upper half), −1 the mirror, 0 none |
| `fp.iceberg(bars=2, mult=3.0)`            | table: `buyer`/`seller` and their price: a level that absorbs at least `mult` times the average cell and holds for `bars` bars in a row |
| `fp.at(price)`                            | table: `buy`, `sell`, `volume`, `delta` at a price (a number or a Series, e.g. `fp.poc.shift(1)`) |
| `fp.rows`                                 | one row per bar and price: `bar`, `time`, `price`, `bottom`, `top`, `buy`, `sell`, `volume`, `delta`, `buy_imbalance`, `sell_imbalance`, `poc`, `value_area` |
| `fp.by_bar(values, how="sum")`            | a computation on `fp.rows` brought back to the bars (`sum`, `mean`, `max`, `min`, `count`, `first`, `last`) |

Other settings: `f = footprint(ticks_per_row=2, va_percent=70, imbalance=3.0,
min_cell=0.02)` gives the same object with rows of two price steps, another
value area or another imbalance ratio. The rules are those the View draws
(the POC is the row with the most volume, the lowest on a tie; a price inside
the bar without trades counts as zero; cells under 2% of the fullest one do not
count).

```python
# delta_divergence — the price makes a new high, the buyers do not.
d = fp.delta
new_high = high > highest(high, 20).shift(1)
weak = new_high & (d < 0)
plot(fp.cvd, "CVD", pane="separate")
plot(d, "delta", pane="separate", style="histogram")
export(d)
export(weak, "weak_high")
export(fp.stacked_imbalances(3).buy, "stacked_buy")
```

```python
# volume at the previous POC, from the rows
r = fp.rows
heavy = r.volume > 3 * r.groupby("bar").volume.transform("mean")
plot(fp.by_bar(heavy, "sum"), "heavy rows", pane="separate", style="histogram")
export(fp.at(fp.poc.shift(1)).volume, "at_prev_poc")
export(fp.by_bar(heavy, "sum"))
```

## Correct skeleton (copy this)

```python
# sma_deviation — distance of price from the moving average, normalised in ATR.
# Positive = price extended above the average; negative = below.

period = 20
avg = sma(close, period)
distance = close - avg

# normalisation in ATR units: makes the indicator comparable across symbols
# with different prices and volatility
distance_norm = distance / nz(atr(period), 1.0)

plot(distance_norm, "SMA deviation (ATR)", color="#42a5f5", pane="separate",
     style="line")
hline(0.0, color="#5f6b7a")

PRIMITIVE = distance_norm
```

No `import`, no `def`, no `df`: `close` and `atr` are already there
(`export(distance_norm)` would be the same as the last line).
The warm-up (the first `period` bars at `NaN`) is handled by the functions.

## Second example: RSI with thresholds (separate panel)

```python
# rsi_thresholds — classic RSI with the overbought/oversold lines.

period = 14
rsi_val = rsi(close, period)

plot(rsi_val, "RSI (14)", color="#42a5f5", pane="separate", style="line")

# the thresholds go in the SAME panel as the RSI: pane="separate"
hline(70.0, "Overbought", color="#ff9800", pane="separate")
hline(50.0, "Median",     color="#9e9e9e", pane="separate")
hline(30.0, "Oversold",   color="#f44336", pane="separate")

PRIMITIVE = rsi_val
```

## Typical mistakes

| Symptom                                              | Cause                                            |
|------------------------------------------------------|--------------------------------------------------|
| `import not allowed`                                 | you wrote `import pandas as pd`: remove it, `pd` is already there |
| `SyntaxError` on the first line                      | you pasted markdown or the code-block fences      |
| `name 'df' is not defined`                           | `df` does not exist: use `close`, `high`, ... directly |
| the indicator is not visible                         | `plot(...)` is missing, or the series is all `NaN` |
| it does not appear among the primitives              | the `export(...)` (or `PRIMITIVE = ...`) line is missing |
| `export 'x' is defined twice`                        | two `export(..., "x")`, or `export(s)` and `PRIMITIVE = s` both meant as different values |
| `unknown param(s) ...`                               | a strategy asked for a param the indicator does not declare with `param(...)` |
| `Looks ahead` in the editor log                      | `shift(-n)`, `s.mean()`/`s.max()` of the whole series or `bfill()`: use rolling windows |
| `fp: no order flow for ...` in the log               | the asset has no footprint at this timeframe: download the Dukascopy ticks or load an order-flow file on the Data page |
| huge values on some symbols                          | normalisation is missing (divide by `atr(...)` or use `roc`) |
| `unexpected keyword argument 'linestyle'`            | a matplotlib parameter that does not exist: `plot`/`hline` only accept title, color, width, pane, style |
| the thresholds appear on the price chart             | `hline` without `pane="separate"` while the indicator is in a separate panel |
| `too many plots (max 12)`                            | more than 12 between `plot` and `hline`             |

## Check before considering it ready

1. No `import` and no `def` in the file.
2. It opens in the indicator editor of the View page and draws something.
3. The first bars are `NaN` (warm-up), not zeros.
4. It exports its main value: `export(<series>)` (or `PRIMITIVE = <series>`).
5. The Preview of the editor says `Causal`.
