-- RachaMais — D1 (SQLite) schema
-- Ported from prisma/schema.prisma (PostgreSQL).
--
-- Key deltas vs Postgres:
--   * Decimal(10,2) -> INTEGER cents. SQLite has no exact decimal type; REAL would
--     let float error accumulate through the balance/settlement math. All money is
--     stored in cents and converted to reais at the API boundary.
--   * DateTime -> TEXT holding ISO-8601 UTC ("2026-07-13T12:34:56.789Z"), which is
--     exactly what the Express API already serialized to the app.
--   * Json -> TEXT holding an encoded JSON document.
--   * ON DELETE CASCADE is preserved, but SQLite only enforces it when
--     `PRAGMA foreign_keys = ON`. D1 enables FK enforcement by default.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  avatarUrl  TEXT,
  pixKey     TEXT,
  createdAt  TEXT NOT NULL,
  updatedAt  TEXT NOT NULL
);

-- Login looks users up by email on every attempt.
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS groups (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  emoji       TEXT NOT NULL DEFAULT '👥',
  description TEXT,
  inviteCode  TEXT NOT NULL UNIQUE,
  createdById TEXT NOT NULL,
  createdAt   TEXT NOT NULL,
  updatedAt   TEXT NOT NULL,
  FOREIGN KEY (createdById) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON groups(inviteCode);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(createdById);

CREATE TABLE IF NOT EXISTS group_members (
  id       TEXT PRIMARY KEY,
  groupId  TEXT NOT NULL,
  userId   TEXT NOT NULL,
  role     TEXT NOT NULL DEFAULT 'MEMBER', -- ADMIN | MEMBER
  joinedAt TEXT NOT NULL,
  UNIQUE (groupId, userId),
  FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (userId)  REFERENCES users(id)  ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(userId);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(groupId);

CREATE TABLE IF NOT EXISTS expenses (
  id          TEXT PRIMARY KEY,
  groupId     TEXT NOT NULL,
  paidById    TEXT NOT NULL,
  amount      INTEGER NOT NULL,               -- cents
  description TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'OTHER',  -- FOOD | TRANSPORT | ACCOMMODATION | ENTERTAINMENT | SHOPPING | UTILITIES | HEALTH | OTHER
  splitType   TEXT NOT NULL DEFAULT 'EQUAL',  -- EQUAL | EXACT | PERCENTAGE | SHARES
  date        TEXT NOT NULL,
  createdAt   TEXT NOT NULL,
  updatedAt   TEXT NOT NULL,
  FOREIGN KEY (groupId)  REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (paidById) REFERENCES users(id)
);

-- Expense lists and balance math both scan by group, newest first.
CREATE INDEX IF NOT EXISTS idx_expenses_group_date ON expenses(groupId, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paidById);

CREATE TABLE IF NOT EXISTS expense_splits (
  id         TEXT PRIMARY KEY,
  expenseId  TEXT NOT NULL,
  userId     TEXT NOT NULL,
  amount     INTEGER NOT NULL,  -- cents
  percentage REAL,              -- nullable; only set for PERCENTAGE splits
  UNIQUE (expenseId, userId),
  FOREIGN KEY (expenseId) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (userId)    REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON expense_splits(expenseId);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user ON expense_splits(userId);

CREATE TABLE IF NOT EXISTS settlements (
  id            TEXT PRIMARY KEY,
  groupId       TEXT NOT NULL,
  fromUserId    TEXT NOT NULL,
  toUserId      TEXT NOT NULL,
  amount        INTEGER NOT NULL,           -- cents
  paymentMethod TEXT NOT NULL DEFAULT 'PIX', -- PIX | CASH | TRANSFER | CREDIT_CARD | OTHER
  note          TEXT,
  settledAt     TEXT NOT NULL,
  createdAt     TEXT NOT NULL,
  FOREIGN KEY (groupId)    REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (fromUserId) REFERENCES users(id),
  FOREIGN KEY (toUserId)   REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_settlements_group ON settlements(groupId, settledAt DESC);

CREATE TABLE IF NOT EXISTS activities (
  id          TEXT PRIMARY KEY,
  groupId     TEXT NOT NULL,
  userId      TEXT NOT NULL,
  type        TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata    TEXT,             -- JSON-encoded document, NULL when absent
  createdAt   TEXT NOT NULL,
  FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (userId)  REFERENCES users(id)
);

-- The activity feed reads "recent activity across my groups", newest first.
CREATE INDEX IF NOT EXISTS idx_activities_group_created ON activities(groupId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(createdAt DESC);

CREATE TABLE IF NOT EXISTS device_tokens (
  id        TEXT PRIMARY KEY,
  userId    TEXT NOT NULL,
  token     TEXT NOT NULL UNIQUE,
  platform  TEXT NOT NULL,  -- ios | android
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(userId);
