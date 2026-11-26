# Metric template (numeric or chart)

A **custom metric** is a **vectorised** Python callback on the equity of a
stream or an ensemble. It lives in `metrics/<name>.py`: one file = one metric.
Metrics created in Studio are saved here automatically.

There are two types:

| type | what it produces | where it appears |
|---|---|---|
| `number` | one value, via `result(...)` | among the KPIs at the top of the page |
| `chart` | one or more figures, via `plot()` / `bars()` / `heatmap()` / `chart()` | with the charts, below the default ones |

## File structure

A `META` dictionary at the top, then the body of the metric:

```python
META = {
    "label": "Calmar",      # label shown on the page
    "type": "number",       # "number" or "chart"
    "chart_kind": None,     # line | function | bars | heatmap | figure (only if type="chart")
    "active": True,         # False = installed but not shown by default
}

result(calmar(), "Calmar", fmt="ratio")
```

The **name** of the metric is the file name (`calmar.py` -> `calmar`).
`META` is read without importing the file (literals only), so it cannot contain
code: only strings, numbers, booleans, `None`. In Studio you do not write
`META`: the **Output** and **Chart type** fields write it when you save, and
when you reopen a metric they are set back from it.

## Available series and functions

Ready-made series (all aligned on the same dates):

- `equity` — portfolio equity
- `returns` — fractional daily returns
- `bench_equity`, `bench_returns` — benchmark: on a stream page the
  stream's own, or SPY when it has none; on an ensemble page the ensemble's
- `dates` — the time index
- `ann_factor` — periods per year of these dates (252 for trading days)
- `equity_bars`, `returns_bars` — the same equity **bar by bar**, for an
  intraday strategy (M15, H1...): one value per bar instead of one per day.
  On a daily strategy, and on the pages that have no bar equity (ensembles),
  they are `equity` and `returns`
- `bars_timeframe` — the timeframe of `equity_bars` (`"M15"`, `"H1"`, ...;
  `"D1"` when it is the daily equity)

`equity` and the functions below stay daily, also for an intraday strategy:
Sharpe, CAGR, drawdown and the monthly tables are computed on days. The bar
series are for the questions about a window shorter than a day — for example
comparing the backtest with a live that ran for three days, from the hour it
started (example 6). The times are UTC; a chart shows them in your local time.

Portfolio functions (each takes an optional series, e.g. `sharpe(r=...)`,
`rolling_sharpe(63, r=...)`):

`sharpe()`, `sortino()`, `cagr()`, `vol()`, `max_drawdown()`, `drawdown()`,
`calmar()`, `hit_rate()`, `best()`, `worst()`, `cumulative()`,
`rolling_sharpe(n=63)`, `rolling_vol(n=21)`, `monthly_table()`,
`yearly_table()`, `downside_dev()`, `sma()`, `ema()`, `stdev()`.

`np` (numpy) and `pd` (pandas) are available: their functions and classes,
plus `np.linalg`, `np.random`, `np.fft`, `np.ma`, `np.polynomial`,
`np.lib.stride_tricks`, `pd.offsets`, `pd.tseries`, `pd.api.types`. Not the
rest (see *Safety*).

## System data: the `data` object

A metric can read everything loaded in the system (`data/`), not only the
equity of the page:

```python
data.categories()                         # the categories in the system
data.timeframe                            # the default timeframe (see below)

data.assets.get("SPY")                    # OHLCV, as on disk
data.assets.close("SPY")                  # close, aligned to the metric's dates
data.assets.returns("SPY", timeframe="D1")
data.earnings.series("AAPL", "sue")       # one field of a file
data.earnings.events("AAPL")              # one row per release
data.fundamentals.series("AAPL", "earnings_yield")
data.rates.series("USD")                  # policy rate (0.05 = 5%)
data.macro.series("vix")                  # a macro file or a field of the macro driver
data.news.series("AAPL", "count_5d")      # headlines per day / last 5 days
data.mms.get("SPY")                       # MMS features
data["my_category"].series("AAPL", "score")   # a category made in Settings > Data
```

Every category is a class with the same methods:

| method | gives |
|---|---|
| `names(timeframe=None)` / `symbols()` | the files (symbols or shared files) |
| `timeframes(name=None)` | the timeframe folders on disk, finest first |
| `has(name, timeframe=None)` | whether `name` can be read |
| `columns(name)` | the fields of a file |
| `get(name, timeframe=None, start=None, end=None)` | the file as on disk (DataFrame) |
| `series(name, field=None, timeframe=None, align=True)` | one field, aligned to the dates of the metric |

`data.assets` adds `ohlcv()`, `close()`, `returns(symbol, log=False)`;
`data.earnings` adds `events()`. `data.align(series)` aligns any series of
yours the same way.

**Timeframes.** Categories split by timeframe (`assets/D1/`, `assets/H1/`,
MMS files `SPY_H1`, custom categories with `M5/`, `H1/`... folders) read the
**default timeframe** unless the code asks for one:

- the default is the timeframe of the strategy behind the page; for a
  multi-timeframe strategy, the **lowest** one (M15 + H1 + D1 -> M15);
  strategies with bypass and pages without a strategy use D1; on an ensemble page, the
  lowest among its streams' strategies;
- leaving `timeframe` out, or `timeframe=None` / `timeframe="default"`, uses
  the default; `timeframe="H1"` picks one from code (`data.timeframe` says
  which one is the default, `data.strategy_timeframes` lists them all);
- a timeframe that is not on disk is **built from a finer one** that divides
  it (H4 from H1, D1 from M5) with the OHLCV rules; if that is not possible,
  the error lists the timeframes that exist.

**Alignment.** `series()`, `close()` and `returns()` are aligned to the dates
of the metric with the engine's rule: at date *t* the last value known at *t*,
never a later one. Intraday data is first closed to the day (last value, sum
for volumes), so date *t* gets the close of *t*. Before the first value the
series is NaN, which pandas statistics skip. `align=False` gives the raw series.

**Missing data.** A file, field or timeframe that is not there raises
`DataError`, with what is actually there. Catch it to fall back
(`except DataError:`); uncaught, the metric is shown as **"Data not
available"** — it is not a code error: Studio lets you save it, and it works
as soon as the data is loaded.

## Output

**Numeric metric** — a single call:

```python
result(value, "Label", fmt="ratio")   # fmt: ratio | pct | money | num
```

**Chart metric** — one or more figures (up to 8):

```python
plot(series, title="Rolling Sharpe", color="#42a5f5")   # line over time
plot(series, title="Signal", overlay=True)              # drawn on the equity
bars(series, title="Monthly returns")                   # bars
heatmap(table, title="Monthly")                         # heatmap (e.g. monthly_table())
```

**Figure** (`chart_kind: "figure"`) — several series in one chart, points,
reference lines, and an x axis that is either **dates** or **numbers**
(beta, an excess return...):

```python
fig = chart("Title", x="Beta", y="Annual return", x_format="num", y_format="pct")
fig.line(x, y, name="...", color="#8b95a3", dash="dash")   # or fig.line(series_over_time)
fig.scatter(x, y, name="Days", size=4)
fig.bars(x, y)            fig.area(series)
fig.point(1.0, 0.08, name="S&P 500", label="text next to it")
fig.hline(0.0, name="zero")     fig.vline(1.0)
```

Formats: `pct`, `ratio`, `money`, `num`. Up to 16 series per figure; one
figure is either on dates or on numbers, not both. A figure left empty is not
shown.

The value label works as on the default charts: one label that follows the
pointer along x, with the value of every series there (the x in the format of
`x_format`). On an x axis of numbers a line with few points — a regression
line or the security market line drawn from two points — gets in-between
points along its own segments, so the label shows its value anywhere along
it; there is no need to compute many points yourself. A figure made only of
points (`scatter`, `point`) shows the label of the point under the pointer.

## Where metrics appear

- **Stream pages.** Every metric, default or yours, number or chart, can be
  hidden (the button that appears on hover) and shown again with **Choose
  metrics**. The choice holds for every stream. Your metrics are computed only
  when shown; a metric created after a choice shows up by itself. Your
  numbers come after the default ones, your charts at the bottom of the page,
  after the default charts and tables. On hover, **New number metric** (after
  the numbers) and **New chart metric** (at the very bottom) open Studio ›
  Metrics with the output already chosen; the pencil on one of your metrics
  opens it in Studio.
  Charts and tables are panels arranged like windows: drag one by its title
  (up to three per row, or a new row), pull its bottom edge to make the row
  taller, the divider between two panels to change their widths, double-click
  the title to maximize it. A metric that draws several charts makes one
  panel per chart. The arrangement holds for every stream; **Reset layout**
  in Choose metrics brings back the original order.
- **Ensemble pages.** The active metrics (`"active": True`), after the
  default ones.

In Studio, **Save** checks the code and saves it in one go; if something is
wrong, the reason appears under the editor and nothing is saved. When the
code draws charts and *Output* says *Number* (or the other way round), the
output is corrected by itself, and *Chart type* follows what the code draws
(`chart(...)` -> *Figure*).

## Conforming examples

### 1. Number — Calmar ratio

```python
META = {"label": "Calmar", "type": "number", "chart_kind": None, "active": True}

result(calmar(), "Calmar", fmt="ratio")
```

### 2. Number — beta against SPY, read from the system data

```python
META = {"label": "Beta vs SPY", "type": "number", "chart_kind": None, "active": True}

r_m = data.assets.returns("SPY", timeframe="D1")
both = returns.notna() & r_m.notna()
result(returns[both].cov(r_m[both]) / r_m[both].var(), "Beta vs SPY", fmt="ratio")
```

### 3. Chart — 63-day rolling Sharpe

```python
META = {"label": "Rolling Sharpe", "type": "chart", "chart_kind": "line", "active": True}

plot(rolling_sharpe(63), title="Rolling Sharpe 63d", color="#42a5f5")
```

### 4. Chart — heatmap of monthly returns

```python
META = {"label": "Monthly", "type": "chart", "chart_kind": "heatmap", "active": True}

heatmap(monthly_table(), title="Monthly returns")
```

### 5. Figure — CAPM against the S&P 500

The strategy seen as a holding on one asset (`ASSET = None`: its own returns;
`ASSET = "AAPL"`: a buy-and-hold on that asset), the S&P 500 as the market,
the USD rate as the risk-free rate: Security Market Line, characteristic line,
rolling beta and alpha, rolling Sharpe against the CAPM one.

```python
META = {"label": "CAPM vs S&P 500", "type": "chart", "chart_kind": "figure", "active": True}

ASSET = None
MARKET = "SPY"
WINDOW = 63            # the window of rolling_sharpe()

r_m = data.assets.returns(MARKET, timeframe="D1")
r_i = returns if ASSET is None else data.assets.returns(ASSET, timeframe="D1")
try:
    rf_year = data.rates.series("USD").ffill().fillna(0.0)
except DataError:
    rf_year = pd.Series(0.0, index=returns.index)
rf = rf_year / ann_factor

both = r_i.notna() & r_m.notna()
if both.sum() < WINDOW + 2:
    raise ValueError(f"only {int(both.sum())} days with both the holding and {MARKET}")
ex_i = (r_i - rf).where(both)
ex_m = (r_m - rf).where(both)

beta = ex_i.cov(ex_m) / ex_m.var()
alpha = (ex_i.mean() - beta * ex_m.mean()) * ann_factor
rf_ann = rf_year[both].mean()
mkt_ann = r_m[both].mean() * ann_factor
hold_ann = r_i[both].mean() * ann_factor
premium = mkt_ann - rf_ann
capm_ann = rf_ann + beta * premium

sml = chart("CAPM - Security Market Line", x="Beta", y="Annual return", y_format="pct")
b_max = max(2.0, beta + 0.5)
sml.line([0.0, b_max], [rf_ann, rf_ann + b_max * premium],
         name="SML  rf + beta (E[Rm] - rf)", color="#8b95a3", dash="dash")
sml.point(0.0, rf_ann, name="Risk-free", color="#8b95a3")
sml.point(1.0, mkt_ann, name="S&P 500", color="#f2b33d")
sml.point(beta, capm_ann, name="CAPM expected", color="#42a5f5")
sml.point(beta, hold_ann, name="Holding", color="#4caf7a" if alpha >= 0 else "#e57373",
          label=f"beta {beta:.2f}  alpha {alpha:+.2%}")

cl = chart("CAPM - Characteristic line", x="S&P 500 excess return",
           y="Holding excess return", x_format="pct", y_format="pct")
cl.scatter(ex_m, ex_i, name="Days", color="#42a5f5", size=4)
x_end = np.array([ex_m.min(), ex_m.max()])
cl.line(x_end, alpha / ann_factor + beta * x_end,
        name=f"alpha + beta x  (beta {beta:.2f})", color="#f2b33d")

r_beta = ex_i.rolling(WINDOW).cov(ex_m) / ex_m.rolling(WINDOW).var()
r_alpha = (ex_i.rolling(WINDOW).mean() - r_beta * ex_m.rolling(WINDOW).mean()) * ann_factor
roll = chart(f"Rolling CAPM ({WINDOW} days)", y="Beta / annual alpha")
roll.line(r_beta, name="Rolling beta", color="#42a5f5")
roll.line(r_alpha, name="Rolling alpha (annual)", color="#4caf7a")
roll.hline(1.0, name="beta = 1")
roll.hline(0.0, name="alpha = 0", color="#8b95a3")

sh_i = rolling_sharpe(WINDOW, r=ex_i)
sh_capm = ex_i.rolling(WINDOW).corr(ex_m) * rolling_sharpe(WINDOW, r=ex_m)
rs = chart(f"Rolling Sharpe vs CAPM ({WINDOW} days)", y="Sharpe ratio (annual)")
rs.line(sh_i, name="Holding  rolling_sharpe()", color="#42a5f5")
rs.line(sh_capm, name="CAPM  corr x Sharpe of the S&P 500", color="#f2b33d", dash="dash")
rs.hline(0.0, color="#8b95a3")
```

### 6. Chart — the backtest from the hour a live started

To compare a live with the backtest run afterwards on the same bars: the
backtest equity from the last bar closed when the live started, rebased to the
capital of the demo account, to lay next to the account's curve. `START` is
written as the runner's journal shows it, in local time, with the distance
from UTC.

```python
META = {"label": "Live window: equity from START", "type": "chart",
        "chart_kind": "line", "active": True}

START = "2026-11-23 09:00"      # local time, as in the runner's journal
UTC_OFFSET = 1                  # hours from UTC (Italy: 1 in winter)
CAPITAL = 100000.0              # the account's balance at START

t0 = pd.Timestamp(START) - pd.Timedelta(hours=UTC_OFFSET)       # UTC
bar = equity_bars.index.to_series().diff().min()                # one bar
closed = equity_bars.index[equity_bars.index + bar <= t0]       # closed at START
if len(closed) == 0:
    raise ValueError(f"no bar closed before START: the backtest starts at "
                     f"{equity_bars.index[0]} UTC")
eq = equity_bars[equity_bars.index >= closed[-1]]
if len(eq) < 2:
    raise ValueError(f"no bars after START: the backtest ends at "
                     f"{equity_bars.index[-1]} UTC")
curve = eq / eq.iloc[0] * CAPITAL
gain = eq.iloc[-1] / eq.iloc[0] - 1.0
plot(curve, f"Backtest from {START} (UTC{UTC_OFFSET:+g}) ({gain:+.2%}, "
            f"{len(eq) - 1} {bars_timeframe} bars)", color="#42a5f5")
```

The base is the last bar **closed** at `START`, not the first one after it:
the live's first cycle decides on that bar and trades right after it, with
the balance `CAPITAL`.

## Running a metric in Studio, without a strategy

**Run** (or Ctrl+Enter) runs the code in the editor and shows, right under
it, the number, the charts, the tables and the printed lines. **Run on**
picks where it runs:

- **Auto**: without a strategy when the code does not read the equity of a
  strategy (`equity`, `returns`, `bench_*`, `dates`, or a portfolio function
  called without its series, such as `sharpe()`); otherwise on the stream
  with the most data. Studio says which one it chose and why;
- **Data only**: always without a strategy;
- **a stream** with backtest results.

Without a strategy there is no equity: the code works on the system data, as
a strategy sees it.

| name | what it gives |
|---|---|
| `candles("ES=F", "M15")` | the candles as an indicator sees them: `.close`, `.volume`, `.sma(s, n)`, `.rsi(s, n)`, `.atr(n)`, the order flow `.fp`, the liquidity heatmap `.hm`, the table `.df` |
| `indicator("ema_gap", "SPY")` | the values of an indicator of your library (the main one, or `export="name"`; `params=`, `timeframe=`) |
| `data` | the system data, as above |
| `stats` | `scipy.stats` (`stats.ttest_1samp(r, 0)`, `stats.pearsonr(x, y)`, ...) |
| `ols(y, x, ...)` | a linear regression: `coef`, `se`, `t`, `p`, `r2`, `adj_r2`, `n`, `resid`, `fitted`; `table(fit)` shows it |

The portfolio functions want the series explicitly (`sharpe(r)`,
`vol(r)`), and annualize it from its frequency: trading days, crypto days,
intraday bars.

**Stop** ends a run; a run that lasts more than 120 seconds stops by itself.
An error comes back with its line, which the editor marks.

## Tables and 3D charts

- `table(obj, "Title")`: a DataFrame, a Series, a dict, a `stats` test or an
  `ols` fit, as a table (up to 8 tables of 500 rows and 40 columns). Studio
  shows them under the editor.
- `surface(z, x=..., y=..., title=..., x_title=..., y_title=..., z_title=...,
  z_format="pct")`: a surface, `z` a table (rows = `y`, columns = `x`), up to
  40,000 cells (beyond that it is thinned).
- `scatter3d(x, y, z, title=..., values=...)`: points in space, colored by
  `values`.
- `fig = chart3d("Title", x="Window", y="Date", z="Vol")`, then
  `fig.surface(...)`, `fig.scatter(...)`, `fig.line(...)`: several series in
  one 3D chart.

Color scales: `viridis`, `plasma`, `inferno`, `magma`, `cividis`, `blues`,
`greens`, `reds`, `greys`, `rdbu`, and `diverging` (the one of the app's
heatmaps). The axes can be dates, numbers or names; the 2D charts take axes of
names too. 3D charts show in Studio, on the results pages and in the agent's
chat; the export (Excel, CSV) writes a surface as a colored table and points
or lines as a table of x, y and z per series.

```python
# without a strategy: volatility by window, month by month, as a surface
r = candles("SPY", "D1").close.pct_change().dropna()
windows = [5, 10, 21, 42, 63, 126]
vol = pd.DataFrame({w: r.rolling(w).std() * 252 ** 0.5 for w in windows}).dropna()
monthly = vol.groupby([vol.index.year, vol.index.month]).tail(1)
surface(monthly.T, x=monthly.index, y=windows, title="Volatility by window",
        x_title="Month", y_title="Window (days)", z_title="Volatility", z_format="pct")
```

## A metric written elsewhere

**Studio › Metrics › Import…** takes the metric's `.py` file (or several):
never a folder, never a .zip, because a metric is one file. The file name
becomes the metric's name (`Live VS backtest.py` → `live_vs_backtest`); META
gives its label and output. Before importing, the metric is tried as with
«Validate», and what it says is shown.

## Safety

The body runs in a **sandbox** with restricted builtins: no `import`, `open`,
`eval`, `exec`, no `__dunder__` or `_private` attributes. `np` and `pd` come
without their internal modules (from which one could reach the operating
system) and without file, network or clipboard readers and writers
(`pd.read_*`, `to_csv`, `to_pickle`, `np.load`...), `eval`, `query` and
`plot`: the system data is read with `data`. A column whose name collides
with one of these is read as `df["load"]`. The common exceptions are there
(`ValueError`, `KeyError`, ...): `raise ValueError("why")` stops the metric
with your message.

This is a layer inside the app's process, not an isolation: a metric from
someone you do not trust is still code that runs on your computer.

## Common mistakes

- A `number` metric that never calls `result(...)` -> it produces nothing.
- A `chart` metric that never draws -> it produces nothing.
- `META` with expressions instead of literals -> it is ignored and the default
  values are used.
- A file name with uppercase letters or spaces -> use `[a-z0-9_]`.
- Reading an asset at the default timeframe when the strategy is intraday:
  `data.assets.returns("SPY")` is then intraday data closed to the day; pass
  `timeframe="D1"` to read the daily file.
