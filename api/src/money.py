"""Money handling.

The Express API kept money as Prisma `Decimal` in Postgres but did the balance
and split math in JS floats. SQLite has no exact decimal type, so we store
integer cents and do all arithmetic in integers — the results are the same as
the old server's intent, minus the float dust it accumulated.

The wire format is preserved exactly: entity payloads (expense.amount,
settlement.amount) serialize as decimal *strings* ("150.00"), because that is
what Prisma's Decimal.toJSON() emitted and what the app already parses.
Computed values (balances, totalSpent, userBalance) stay JSON numbers.
"""

import math


def js_round(value: float) -> int:
    """Round half-up toward +infinity, the way JavaScript's Math.round does.

    Python's round() is banker's rounding and would disagree on .5 boundaries,
    which is exactly where money bugs hide.
    """
    return math.floor(value + 0.5)


def to_cents(amount) -> int:
    """Reais (as sent by the app) -> integer cents."""
    return js_round(float(amount) * 100)


def to_reais(cents: int) -> float:
    """Integer cents -> a JSON number, for computed//balance payloads."""
    return (cents or 0) / 100


def to_decimal_string(cents: int) -> str:
    """Integer cents -> "150.00", matching Prisma's Decimal JSON encoding."""
    cents = cents or 0
    sign = "-" if cents < 0 else ""
    cents = abs(cents)
    return f"{sign}{cents // 100}.{cents % 100:02d}"


def to_br_string(cents: int) -> str:
    """Integer cents -> "150,00", for user-facing pt-BR copy."""
    return to_decimal_string(cents).replace(".", ",")
