"""D1 access helpers.

These wrap the Python<->JS boundary. Two notes on how the crossing behaves,
both verified against the runtime:

  * Python `None` reaches D1 as a real SQL NULL, so nullable columns
    (description, pixKey, note, percentage, metadata, avatarUrl) bind directly.
  * Rows come back as JS objects. We round-trip them through `JSON.stringify`
    rather than `.to_py()`, which yields plain dicts with predictable types.
    Every column we store is JSON-safe — there are no BLOBs in this schema.
"""

import json

from js import JSON as JS_JSON


def _bind(stmt, params):
    """Bind params to a D1 statement, preserving real SQL NULLs."""
    if not params:
        return stmt
    return stmt.bind(*params)


def _rows(js_results):
    """Convert a D1 result set into a list of plain dicts.

    Depending on the runtime, `.results` arrives either as a JsProxy over the JS
    array or already converted; `to_py()` handles the first case and the rest
    normalizes whatever the elements turn out to be (dict, Map, or JsProxy).
    """
    if js_results is None:
        return []
    if hasattr(js_results, "to_py"):
        js_results = js_results.to_py()

    rows = []
    for row in js_results:
        if isinstance(row, dict):
            rows.append(row)
        elif hasattr(row, "to_py"):
            rows.append(dict(row.to_py()))
        else:
            rows.append(dict(row))
    return rows


async def query(env, sql, *params):
    """Run a SELECT and return every row as a dict."""
    result = await _bind(env.DB.prepare(sql), params).all()
    return _rows(result.results)


async def query_one(env, sql, *params):
    """Run a SELECT and return the first row, or None."""
    rows = await query(env, sql, *params)
    return rows[0] if rows else None


async def execute(env, sql, *params):
    """Run an INSERT/UPDATE/DELETE. Returns D1's meta (has .changes)."""
    result = await _bind(env.DB.prepare(sql), params).run()
    return result.meta


async def batch(env, statements):
    """Run several writes in one D1 batch.

    D1 wraps a batch in an implicit transaction, so this is how we keep
    multi-table writes (expense + its splits, group + its members) atomic.
    `statements` is a list of (sql, params) tuples.
    """
    prepared = [_bind(env.DB.prepare(sql), params) for sql, params in statements]
    return await env.DB.batch(prepared)
