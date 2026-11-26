# Creating a regime

A **regime** says what state a market is in — trending, ranging, under stress —
so that strategies and overlays can behave accordingly.

This guide explains how to **build one**. To understand how to *use* regimes
inside a strategy, the guide is a different one:
`strategies/GUIDE_REGIME.md`.

---

## 1. Two artifacts, not one

A regime is always made of **two separate pieces**:

| piece | where | what it does |
|---|---|---|
| **rule** | `regime/logics/<name>.py` | the logic: turns the driver series into a state |
| **market** | `regime/markets/<name>.py` | declares which rule to use, on which driver, with which parameters |

They are separate for a concrete reason: **one rule serves several markets.**
Equities and crypto both use `trend_vol`, but with different parameters —
higher volatility, faster cycles, 365 days instead of 252. If they were a
single piece, every new market would force a rewrite of the logic.

Order of writing: **the rule first, the market second.** A market that names a
rule which does not exist is rejected.

---

## 2. The chain, from symbol to state

    symbol → market → driver → rule → series of states

A symbol is assigned to a market by matching it against the expressions in
`match`; when several match, the highest `priority` wins. The market says which
**driver** to look at — which is normally *not* the symbol itself: the equity
regime is read from SPY, not from each individual stock.

The driver is loaded **even if it is not part of the traded universe**. If a
strategy only operates on forex, the equity regime does not switch off just
because SPY is not among the traded symbols.

When a driver is unavailable, the declared fallbacks are used in turn, down to
`"self"` (the symbol's own series). If none is left, that market **does not
modulate**, and the fact is written to the log rather than passed over in
silence.

---

## 3. The rule

```python
"""Name of the rule: what it measures and when it makes sense to use it."""

META = {
    "key": "my_rule",             # = file name, [a-z0-9_]
    "label": "My rule",
    "description": "When it makes sense to use it, and on which assets.",
    "defaults": {"window": 60, "threshold": 1.5},
}


def compute(close, p):
    """From the driver series to the market state.

    `close`  close-price series of the driver
    `p`      parameters already merged: the `defaults` above, overridden by
             the ones declared by the market. Missing keys do not exist.

    Returns a Series aligned with `close`, holding the values
    'bull' / 'neutral' / 'bear'.
    """
    ...
```

### The real constraints

**`META` must contain literal values only.** The system reads it with
`ast.literal_eval`, that is **without running the file**. An `"x": np.pi` makes
the regime invisible — it does not raise an error, it simply never appears.

**`META["key"]` must match the file name.** `my_rule.py` must declare
`"key": "my_rule"`.

**The series must be aligned with `close`.** A different index produces silent
misalignment downstream: yesterday's state applied to today.

**No look-ahead.** Every value must depend only on data up to that instant. A
centred average, a `shift(-1)`, a `fillna(method="bfill")` all bring in
information from the future and produce a backtest that will never be
reproduced live.

### Hysteresis: why it is almost always needed

A state that flips between `bull` and `bear` on every bar makes the strategy
enter and exit constantly, and costs eat the edge. The existing rules use
hysteresis — N consecutive days beyond the threshold are needed to change
state — and it is almost always the right choice:

```python
"defaults": {"hysteresis_days": 4}
```

---

## 4. The market — you create it

The market declares which rule to use, on which **driver** to read it, and to
which **symbols** to apply it. It is created from the **Markets** page, not by
the agent.

The reason lies in the nature of the choice: the driver is the series that
represents the market (equities → SPY, crypto → BTC), and the symbols are the
ones you actually trade. These decisions depend on your universe, not on the
logic.

When you write a new rule, it appears among those selectable on the Markets
page: from there you choose where to apply it.

## 5. Who writes what

**The agent writes the RULE**, which is the technical part:

    write_artifact(kind="regime_logic", name="my_rule", files={"my_rule.py": "..."})

**You create the MARKET**, from the Markets page. This is not a technical
limitation: the market decides *which symbols* the rule applies to, and that is
a choice that requires knowing what you actually trade. A well-written rule
hooked to `match: [".*"]` applies to everything, and nobody notices until the
results change for no apparent reason.

Once written, the rule appears among those selectable on the Markets page. From
there you choose which market to use it on, with which driver and which
parameters.

After every write the system verifies, **without running the file**: that
`META` is readable and literal, that `key` matches the name, that the rule has
`compute`, and that the market points to an existing rule. Errors come back
with the reason, not with a generic "failed".

A file that is written but cannot be loaded is worse than no file at all,
because it looks installed.

---

## 6. Where to see them

The **Markets** page of the dashboard: list of markets, the rule attached, the
driver in use, the current state and its history. Parameters can be changed
from there too, without touching the files.

If a market you wrote does not appear, in this order:

1. `META` is not literal — there is an expression where a value should be;
2. `key` does not match the file name;
3. `enabled` is `False`;
4. the rule named in `logic` does not exist.

---

## 7. Mistakes that cost time

**Rule and market with the same name.** They are two distinct artifacts:
calling them both `momentum` works, but then you cannot tell which one you are
editing. Better `momentum_vol` for the rule and `equity_us` for the market.

**Duplicated parameters.** If a value lives in the rule's `defaults`, the
market overrides it only when needed. Copying them all means that changing the
rule will no longer change anything.

**States other than `bull` / `neutral` / `bear`.** Whoever consumes the regime
compares against those three strings. A `"rising"` raises no error: it simply
never matches.

**A rule tested on one market only.** Logic tuned on SPY often does not hold on
forex, where there is no drift. If the rule is meant to serve several markets,
test it on each one before declaring it shared.

---

## References

| file | topic |
|---|---|
| `regime/logics/LOGIC_TEMPLATE.md` | concise contract of the rule |
| `regime/markets/MARKET_TEMPLATE.md` | concise contract of the market |
| `strategies/GUIDE_REGIME.md` | how to *use* regimes in a strategy |
| `regime/logics/trend_vol.py` | a real rule, with hysteresis |
| `regime/markets/crypto.py` | a real market inheriting a shared rule |
