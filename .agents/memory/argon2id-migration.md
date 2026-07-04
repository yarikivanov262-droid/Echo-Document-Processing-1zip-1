---
name: Argon2id migration pattern
description: How SHA→Argon2id upgrade works in ECHO auth, and the poll access-control pattern.
---

## Argon2id auth migration

- `register`: hash seedHash with Argon2id, store both `seedHash` (Argon2) and `seedLookupHash` (HMAC-SHA256 of raw seedHash using SESSION_SECRET).
- `login`: lookup by username, then `verifySeed(stored, raw)` which handles both old SHA (direct compare) and Argon2 (argon2.verify). On successful login of legacy SHA account, upgrade BOTH `seedHash` AND `seedLookupHash`.
- `restore`: try `seedLookupHash` first (new accounts), then fall back to direct `seedHash = raw` (legacy SHA accounts). Verify with verifySeed. Migrate on success.

**Why:** Adding Argon2id lookup column `seedLookupHash` is necessary because Argon2 is one-way — you can't look up a user by their Argon2 hash during restore (no username is provided). The lookup hash is HMAC-SHA256 which is safe as a lookup key.

**How to apply:** If the seedHash in DB doesn't start with `$argon2`, it's a legacy SHA account; treat as unprotected hash. Always upgrade both fields together.

## Poll access control

All poll endpoints (GET /polls/:id, POST /polls/:id/vote, POST /polls/:id/close) require the requester to be a chat member of poll.chatId. Check BEFORE any business logic.

**Why:** Without this, any authenticated user can enumerate poll IDs and read/vote in polls from chats they don't belong to (IDOR).

Close endpoint: creator OR chat admin/owner can close.
