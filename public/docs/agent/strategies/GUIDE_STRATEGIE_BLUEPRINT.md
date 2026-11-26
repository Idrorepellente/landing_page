# Guide: writing a Strategy as a BLUEPRINT (node graph)

This guide applies **only** when the strategy is to be built from blocks
instead of writing its Python code. If you need to write code, the right guide
is `GUIDE_STRATEGIE_CUSTOM.md`: the two are alternatives, not complements.

---

## What a blueprint is

A blueprint is a **computation graph**: blocks that produce values, connected
up to two terminal blocks that say when to buy and when to sell.

It is not a sketch to be translated into code by hand afterwards. It *is* the
strategy: the system compiles it into valid Python on its own, installs it and
keeps the graph, so it stays editable as blocks.

The advantage over code is not power — a blueprint does fewer things than a
`.py` file — but the fact that **it cannot break silently**: there are no
imports to get wrong, no class contracts to respect, no method signatures to
guess. If the graph is valid, the strategy runs.

One of the things a blueprint does not do is **sizing**. The terminal blocks
emit buy/sell pulses, not weights: the compiled strategy always issues
`strength=1.0` (or `0.0` to close) and leaves the capital allocation to the
allocator. There is no `target_weight` here and there is no reason to look
for one — a graph of boolean conditions has no weight vector. If you need to
decide the weights yourself (a cross-sectional optimiser), that is written in
code: see `strategies/GUIDE_STRATEGIE_CUSTOM.md`.

---

## The format

A single JSON object, with two lists.

```json
{
  "nodes": [
    {"id": "price",   "type": "price",        "params": {"field": "close"}},
    {"id": "fast",    "type": "sma",          "params": {"period": 20}},
    {"id": "slow",    "type": "sma",          "params": {"period": 50}},
    {"id": "cross_up","type": "cross_above",  "params": {}},
    {"id": "cross_dn","type": "cross_below",  "params": {}},
    {"id": "enter",   "type": "buy",          "params": {}},
    {"id": "exit",    "type": "sell",         "params": {}}
  ],
  "edges": [
    {"from": "price",    "to": "fast",     "port": "input"},
    {"from": "price",    "to": "slow",     "port": "input"},
    {"from": "fast",     "to": "cross_up", "port": "a"},
    {"from": "slow",     "to": "cross_up", "port": "b"},
    {"from": "fast",     "to": "cross_dn", "port": "a"},
    {"from": "slow",     "to": "cross_dn", "port": "b"},
    {"from": "cross_up", "to": "enter",    "port": "signal"},
    {"from": "cross_dn", "to": "exit",     "port": "signal"}
  ]
}
```

(the `cross_dn` node, of type `cross_below`, is what handles the exit)

This is a complete strategy: it buys when the 20-period average crosses above
the 50-period one, and exits when it crosses back below.

### `nodes`

| field    | required | meaning |
|----------|----------|---------|
| `id`     | yes      | unique name in the graph. Use meaningful names (`sma_fast`), not `n1`: you need them to wire things up, and whoever rereads the graph needs them to understand it. |
| `type`   | yes      | one of the catalogue types. Inventing one makes compilation fail. |
| `params` | no       | parameters of the block. Those not listed take the default value. |

### `edges`

| field      | required | meaning |
|------------|----------|---------|
| `from`     | yes      | `id` of the node producing the value |
| `to`       | yes      | `id` of the node receiving it |
| `port`     | yes      | **which input** of the destination node. It is not optional: an `add` node has two inputs, `a` and `b`, and swapping them changes the result. |
| `fromPort` | no       | `"out"` (default) or `"not"` |

---

## Where the prices come from

The `price` node reads a field of the bar. **All** of them are available:

| `field`  | what it is |
|----------|------------|
| `close`  | the close (the default, and what is needed almost always) |
| `open`   | the open — useful for gaps: `open / close[t-1] - 1` |
| `high`   | high of the bar |
| `low`    | low of the bar |
| `volume` | traded volume |

During a backtest the engine gives the strategy the whole bar, not just the
close. A graph that compares the `close` with the highest of the last 20 bars
is legitimate, and reads real highs.

A note for those writing code instead of blocks: the same data lives on
`ind.open`, `ind.high`, `ind.low`, `ind.volume`, or all together with
`ind.ohlcv()`.

---

## Alternative format: one line per element

Nested JSON is precise but brittle: one quote mark inside a description, one
unclosed bracket forty lines down, and the whole call fails.

For this reason `graph` also accepts a **line-based text**, where there is
nothing to nest and nothing to balance:

```
node price    = price(field=close)
node fast     = sma(period=20)
node slow     = sma(period=50)
node cross_up = cross_above
node cross_dn = cross_below
node enter    = buy
node exit     = sell
edge price -> fast.input
edge price -> slow.input
edge fast -> cross_up.a
edge slow -> cross_up.b
edge fast -> cross_dn.a
edge slow -> cross_dn.b
edge cross_up -> enter.signal
edge cross_dn -> exit.signal
```

Only two rules:

- `node <id> = <type>(par=value, ...)` — the brackets are omitted when there
  are no parameters;
- `edge <from> -> <to>.<port>` — with ` not` at the end to take the negative
  branch of a comparison.

Empty lines and lines starting with `#` are ignored. If a line is wrong,
**only that line** is discarded, and you are told which one: you do not lose
the whole graph over a typo.

The two forms are equivalent. If JSON gives you trouble, switch to this one
instead of giving up on the blueprint.

---

## The `not` port: why no "if" nodes are needed

Comparison and logic nodes have **two outputs**:

- `out` — the condition is true;
- `not` — the condition is false.

A single `A > B` node therefore feeds both the `buy` (from the `out` port) and
the `sell` (from the `not` port). There is no "if/else" block and none is
needed: duplicating the comparison with the operands swapped is wrong, because
`A > B` being false is **not** the same as `B > A` (the equality case would be
missing).

### Careful: events and states do not behave the same way

This shortcut holds for **state** comparisons — `greater_than`, `less_than`,
`and`, `or` — which are true for as long as the condition holds.

**It does not hold for crossovers.** `cross_above` and `cross_below` are
**events**: they are true *only on the single bar* where the crossing happens.
Their `not` branch is therefore true **almost always**, and wiring it to `sell`
closes the position the day after opening it — the strategy enters and exits
constantly, or never holds anything.

A crossover strategy needs **two distinct nodes**:

```
node cross_up = cross_above
node cross_dn = cross_below
edge fast -> cross_up.a
edge slow -> cross_up.b
edge fast -> cross_dn.a
edge slow -> cross_dn.b
edge cross_up -> enter.signal
edge cross_dn -> exit.signal
```

Alternatively use the **state**: `greater_than` into `buy` from the `out` port
and into `sell` from the `not` port. The two formulations are not identical —
the first enters only on the crossing, the second holds the position for as
long as the relation holds — but both make sense. The `not` branch of a
crossover does not.

The validator warns you if you do it.

---

## Rules the validator enforces

1. **Every declared input must be connected.** A `greater_than` node without
   `b` connected does not compile. There are no optional inputs.
2. **An input accepts a single connection.** To combine two conditions use an
   `and` / `or` node.
3. **At least one `buy` is required.** A graph with no actions compiles but
   never trades: it is rejected.
4. **No cycles.** Connections go from the sources to the actions. A node cannot
   depend, directly or indirectly, on itself.
5. **Protective exits come in two alternative families.** Either the ATR ones
   (`stop_loss`, `take_profit`, which are configuration nodes with no
   connections), or the value ones (`stop_loss_value`, `take_profit_value`,
   which receive a price level from the graph). Mixing them is an error.
6. **Terminal nodes have no outputs.** `buy`, `sell` and the protections cannot
   appear as the `from` of a connection.

---

## How to proceed

1. **Describe the rule in words** before drawing it: "I buy when X rises above
   Y and the RSI is below 70". If you cannot say it in one sentence, the graph
   will be confused.
2. **Start from the sources.** Almost always a `price` node, feeding the
   indicators.
3. **Build the condition**, one comparison at a time, combining them with
   `and` / `or`.
4. **Wire the actions**: the condition into `buy`, the same condition into
   `sell` from the `not` port — unless the exit has a rule of its own, in which
   case build it separately.
5. **Check with `check_blueprint`** before installing. It returns *all* the
   errors at once and the code that would come out: fixing yourself there costs
   one round, fixing yourself after installing costs three.
6. **Install with `write_blueprint`**.
7. **If the user asked for it to be run**, launch `run_backtest`. If it fails
   or the metrics do not reach the target, **change the graph** and repeat: do
   not rewrite in code a strategy that was born from blocks.

---

## Typical mistakes

**Inventing node types.** `macd`, `bollinger`, `if_then`, `stop` do not exist.
The catalogue is the one you are given: if the block you need is missing,
compose it from the ones that exist (a MACD is the difference between two EMAs)
or tell the user that this rule has to be written in code.

**Forgetting `port`.** Without it the system does not know which input to
attach the connection to, and rejects it.

**Connecting a terminal.** `buy` produces nothing: it cannot be the `from` of a
connection.

**Using `not` on a non-boolean node.** The complementary port exists only on
comparisons and logic, not on `sma` or `add`.

**Rebuilding from scratch instead of fixing.** If the graph has three errors,
the validator tells you all of them: fix those and resubmit the same graph.
Redoing it from zero introduces new ones.

---

## When NOT to use a blueprint

The graph covers conditions on price series, indicators, auxiliary data and
arithmetic. It does **not** cover: explicit loops, state surviving between
bars, dynamic universe selection, machine learning, parameter optimisation.

If the request needs one of these, say so clearly and propose code. A blueprint
forced to do what it cannot do produces a strategy that looks right and is not
— which is worse than a refusal.

---

## Maintenance

A node graph **has no models to retrain**: it computes indicators and
comparisons on a series, and today's result depends only on today's data. It
does not even use auxiliary data — the `data_*` nodes read series that the
system aligns by itself.

For this reason the generated code declares `maintenance={}`, that is "no
maintenance". It is not an oversight: it is information, and the system uses it
not to schedule retraining that is not needed.

If the strategy you have in mind **does** need a model that retrains, the
blueprint is not the right tool: it must be written in code, where you can
declare its cadence (see `GUIDE_STRATEGIE_CUSTOM.md`).

For the same reason a blueprint has no **data port** (`data_port.py`): the
nodes read series that the system aligns by itself, not external sources to
download. If your idea needs a feed of its own, it must be written in code.
