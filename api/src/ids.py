"""ID and timestamp generation, matching the formats already in the database."""

import time

from js import Uint8Array, crypto

_counter = 0
_BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz"


def _base36(value: int, width: int = 0) -> str:
    if value == 0:
        digits = "0"
    else:
        digits = ""
        while value:
            value, remainder = divmod(value, 36)
            digits = _BASE36[remainder] + digits
    return digits.rjust(width, "0")


def _random_block(length: int) -> str:
    raw = crypto.getRandomValues(Uint8Array.new(length)).to_py()
    return "".join(_BASE36[b % 36] for b in raw)


def cuid() -> str:
    """A collision-resistant id in the same shape Prisma's @default(cuid()) wrote.

    Format: 'c' + timestamp(base36) + counter(base36, 4) + fingerprint + random.
    Existing rows keep their ids; this only has to be unique alongside them.
    """
    global _counter
    _counter = (_counter + 1) % (36**4)
    timestamp = _base36(int(time.time() * 1000))
    counter = _base36(_counter, 4)
    return f"c{timestamp}{counter}{_random_block(4)}{_random_block(8)}"


def uuid4() -> str:
    """Invite codes were Prisma @default(uuid()) — keep them UUID-shaped."""
    return crypto.randomUUID()


def now_iso() -> str:
    """ISO-8601 UTC with milliseconds and a trailing Z.

    This is byte-for-byte what JSON.stringify(new Date()) produced, which is the
    format the app has been parsing all along.
    """
    from js import Date

    return Date.new().toISOString()
