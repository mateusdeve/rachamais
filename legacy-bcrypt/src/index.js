/**
 * Legacy bcrypt verifier.
 *
 * The Python API cannot check bcrypt hashes: Pyodide has no native modules, and
 * a pure-Python bcrypt at cost 12 would take seconds of CPU per login. This
 * worker exists only so users who registered against the old Express server can
 * still sign in. It is reachable exclusively through a service binding
 * (LEGACY_BCRYPT) — it is not routed on any public hostname.
 *
 * The Python side re-hashes the password with PBKDF2 on every successful
 * verification, so the number of accounts that need this shrinks to zero over
 * time and the worker can then be deleted.
 */

import bcrypt from "bcryptjs";

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { password, hash } = body ?? {};
    if (typeof password !== "string" || typeof hash !== "string") {
      return Response.json({ error: "password and hash are required" }, { status: 400 });
    }

    // Only ever asked about hashes the old server wrote.
    if (!/^\$2[aby]\$/.test(hash)) {
      return Response.json({ valid: false });
    }

    const valid = await bcrypt.compare(password, hash);
    return Response.json({ valid });
  },
};
