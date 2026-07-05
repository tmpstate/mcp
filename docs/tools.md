# TmpState MCP tool reference

Endpoint: `https://tmpstate.dev/mcp` (Streamable HTTP, no auth).

Every tool is a thin adapter over the public HTTP API documented at [tmpstate.dev/llms.txt](https://tmpstate.dev/llms.txt): the tool synthesizes the equivalent HTTP request and returns the handler's JSON verbatim, so validation, quotas, rate limits and billing consent behave identically over REST and MCP.

To verify this file against the live server: `node ../scripts/fetch-tools.mjs --json` (run from `docs/`), or from the repo root `node scripts/fetch-tools.mjs`.

Common arguments:

- `db` - the database URL returned at creation, the admin URL, or the bare `s-...` capability.
- `pro_token` - Pro account token (`pt_...`). Optional if the MCP connection already sends `Authorization: Bearer pt_...`.

## Server instructions

> TmpState is a zero-key temporary JSON database: create_database returns a db URL that is the only credential. Persist every db URL and pro_token you mint (local ~/.tmpstate/credentials file, project README, and your own memory) - they cannot be recovered later. Free databases expire after 24h (then stay restorable for 72h); one-time extensions and the Pro subscription keep them alive - always get the human's explicit approval before any tool that costs money. When work is done (or a db URL leaks), tear down with delete_database - confirm-gated and irreversible. Full docs: https://tmpstate.dev/llms.txt - playbooks: https://tmpstate.dev/skills

## Database lifecycle

### `create_database`

Create a temporary JSON database (24h TTL, no signup, no keys). Returns the db URL - the only credential - plus admin URL, limits and expiry. Create once per project/task, persist the db URL immediately, and reuse it instead of creating again.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `idempotency_key` | string (1-200) | no | Stable retry key. Reusing it from the same client returns the same database. |

### `database_status`

Usage, limits, tier and expiry for a database (`GET $DB/__meta` equivalent). Also the way to confirm a paid extension landed: the new expiry and tier show up here.

| Argument | Type | Required |
|---|---|---|
| `db` | string | yes |

### `extend_database`

Without a plan: returns the transparent pricing table. With a plan: returns a Stripe checkout URL for the human to pay - never buy without the user's explicit approval. Works on expired (frozen) databases too: paying restores them. After the user says they have paid, call `database_status` to confirm.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `db` | string | yes | |
| `plan` | `"week"` \| `"month"` \| `"quarter"` | no | Omit to get pricing without buying. |

### `delete_database`

Destroy a database and all its documents immediately - the teardown for finished work and the revocation kill switch for a leaked db URL. Irreversible: unlike expiry there is no restore window. Works on expired databases too and consumes no quota. Two-step: without `confirm` the API returns `confirmation_required` and nothing is deleted; pass `confirm: "true"` only after the user approved.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `db` | string | yes | |
| `confirm` | `"true"` | no | Required to actually delete. |

## Documents

Collections are created implicitly on first write. Stored fields live under `.data`.

### `list_documents`

List documents in a collection, oldest first. Response shape: `{collection, items: [{id, data, created_at, updated_at}], next_cursor}`.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `db` | string | yes | |
| `collection` | string | yes | |
| `limit` | integer 1-100 | no | |
| `cursor` | string | no | `next_cursor` from the previous page. |

### `get_document`

Read one document by id.

| Argument | Type | Required |
|---|---|---|
| `db` | string | yes |
| `collection` | string | yes |
| `id` | string (`doc_...`) | yes |

### `create_document`

Insert a JSON object into a collection. Counts against the write and document quotas.

| Argument | Type | Required |
|---|---|---|
| `db` | string | yes |
| `collection` | string | yes |
| `data` | object | yes |

### `update_document`

Shallow-merge a patch into a document (top-level keys overwrite; keys are never deleted). Counts against the write quota.

| Argument | Type | Required |
|---|---|---|
| `db` | string | yes |
| `collection` | string | yes |
| `id` | string | yes |
| `patch` | object | yes |

### `delete_document`

Delete one document. Never blocked by quotas; frees a document slot. Emptying a whole collection? Use `delete_collection` instead of looping this.

| Argument | Type | Required |
|---|---|---|
| `db` | string | yes |
| `collection` | string | yes |
| `id` | string | yes |

### `delete_collection`

Delete every document in a collection at once (useful to re-seed). Irreversible. To destroy the entire database, use `delete_database` instead.

| Argument | Type | Required |
|---|---|---|
| `db` | string | yes |
| `collection` | string | yes |

## Pro account

All billable Pro operations are consent-gated: they return `confirmation_required` with exact prices or consequences first, and only proceed on an explicit consent argument.

### `pro_checkout`

Mint a Pro account token plus a Stripe subscription checkout URL ($8/mo, 3 always-on databases included). Persist `pro_token` immediately; the human pays in a browser. Never start checkout without the user's explicit request. No arguments.

### `pro_list_databases`

List the Pro account's databases (ids, usage, limits, expiry) so a fresh session can reconcile against persisted db URLs. URLs are never stored server-side.

| Argument | Type | Required |
|---|---|---|
| `pro_token` | string | no* |

*Optional if the connection sends `Authorization: Bearer pt_...`.

### `pro_create_database`

Create a new always-on database owned by the Pro account. Beyond the included allotment this costs extra per month - the tool then returns `confirmation_required` with the exact price; only retry with `accept_overage_usd` after explicit user approval.

| Argument | Type | Required | Notes |
|---|---|---|---|
| `pro_token` | string | no* | |
| `accept_overage_usd` | string | no | Explicit overage consent, e.g. `"1.50"`. |

### `pro_attach_database`

Attach an existing free/extended database to the Pro account: same URL, same data, TTL removed, quotas raised. Same overage consent rules as `pro_create_database`.

| Argument | Type | Required |
|---|---|---|
| `pro_token` | string | no* |
| `db` | string | yes |
| `accept_overage_usd` | string | no |

### `pro_cancel`

Cancel at period end. Not just a billing change - it schedules deletion of ALL databases on the account. Two-step: without `confirm` the response spells out the consequences with concrete dates; pass `confirm: "cancel"` only after the user approved.

| Argument | Type | Required |
|---|---|---|
| `pro_token` | string | no* |
| `confirm` | `"cancel"` | no |
