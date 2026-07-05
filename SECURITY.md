# Security model

TmpState is deliberately tokenless. That is a design decision with a specific threat model, not an oversight. This page spells it out so you can judge whether it fits your use case.

## The capability URL model

Creating a database returns a URL containing a high-entropy capability (`s-` plus 30 random characters, ~155 bits). That URL is the only credential: anyone who holds it can read, write and delete that database. This is the same bearer-capability model used by unlisted links in mainstream file-sharing products.

What enforces it:

- **Entropy.** Capabilities are generated from a CSPRNG and are not enumerable or guessable.
- **Hashing at rest.** The server stores only a hash of the capability; a database leak does not leak usable URLs.
- **HTTPS only.** Capabilities never travel in cleartext; HSTS is enforced.
- **No indexing.** All database responses carry `X-Robots-Tag: noindex`; database URLs are never listed, sitemapped or logged in full.
- **Expiry by default.** Free databases live 24 hours. Ephemerality is itself a mitigation: a credential that stops working tomorrow is a small prize.
- **Revocation.** `DELETE $DB?confirm=true` (or the `delete_database` MCP tool) destroys a database immediately and works even after expiry. If a URL leaks, the holder of the URL can kill it - deletion is the revocation mechanism, exactly as in any bearer-capability system.

## What you should not store

TmpState is for temporary, disposable state: scratch data, agent working memory, prototypes, demo seeds, hand-offs between tools. Do not store secrets, credentials, or personal data you would not put in an unlisted pastebin. The product's own docs and MCP instructions say the same thing to agents.

## Consent gates for money and destruction

Every operation that spends money or irreversibly destroys data is two-step:

- `extend_database` returns a pricing table first; a checkout URL is only minted when a plan is explicitly chosen, and payment happens in the human's browser via Stripe. The server never sees card details.
- `pro_create_database` / `pro_attach_database` return `confirmation_required` with the exact price before charging overage.
- `pro_cancel` first discloses consequences (deletion of all account databases) and only proceeds with an explicit `confirm` argument.
- `delete_database` requires an explicit confirm flag; without it the API returns `confirmation_required` and nothing is deleted.

Tool descriptions instruct agents to relay these disclosures to the human and act only on explicit approval.

## MCP trust boundary

The hosted MCP server at `https://tmpstate.dev/mcp` is a thin adapter over the public HTTP API documented at [tmpstate.dev/llms.txt](https://tmpstate.dev/llms.txt): each tool synthesizes the equivalent HTTP request, so the two surfaces cannot drift. The complete tool surface (descriptions and schemas - the entire prompt-influence surface an MCP server has) is published in [docs/tools.md](docs/tools.md), and [scripts/fetch-tools.mjs](scripts/fetch-tools.mjs) lets you diff that against what the live server advertises at any moment.

The server requires no authentication and receives no ambient credentials from your client. The only sensitive material that ever crosses the boundary is data you choose to write and the capability URLs the service itself minted.

## Reporting

Found a vulnerability? Email [security@tmpstate.dev](mailto:security@tmpstate.dev). Please include reproduction steps; we aim to respond within 72 hours.
