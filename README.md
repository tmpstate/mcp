# TmpState MCP

TmpState (temp state) is a tokenless temporary JSON database. One curl creates a database; the URL is the only credential. No signup, no API keys. 24h free, $1 to keep for a week.

This repository is the public, auditable surface of the hosted TmpState MCP server at `https://tmpstate.dev/mcp`:

- [docs/tools.md](docs/tools.md) - the complete tool surface (names, descriptions, schemas)
- [SECURITY.md](SECURITY.md) - the threat model behind the URL-as-credential design
- [configs/](configs/) - copy-paste client configs (Cursor, VS Code, Claude Code)
- [scripts/fetch-tools.mjs](scripts/fetch-tools.mjs) - fetch what the live server advertises right now, so you can verify this repo against reality

The MCP layer is a thin adapter over the public HTTP API: every tool synthesizes the equivalent HTTP request, so validation, quotas, rate limits and billing consent behave identically over REST and MCP. The full HTTP API is documented at [tmpstate.dev/llms.txt](https://tmpstate.dev/llms.txt), with agent playbooks at [tmpstate.dev/skills](https://tmpstate.dev/skills).

## Quickstart (no MCP needed)

```sh
# Create a database - the returned URL is the only credential
curl https://tmpstate.dev/new

# Write and read
curl -X POST $DB/plants -d '{"name":"Monstera","water_days":7}'
curl $DB/plants
```

## MCP setup

The server speaks Streamable HTTP at `https://tmpstate.dev/mcp`. No auth, no keys.

**VS Code / clients with native remote MCP** ([configs/vscode-mcp.json](configs/vscode-mcp.json)):

```json
{
  "servers": {
    "TmpState": {
      "url": "https://tmpstate.dev/mcp",
      "type": "http"
    }
  }
}
```

**Cursor and clients that need a stdio proxy** ([configs/cursor.json](configs/cursor.json)):

```json
{
  "command": "npx",
  "args": ["-y", "mcp-remote@0.1.38", "https://tmpstate.dev/mcp"]
}
```

**Claude Code:**

```sh
claude mcp add --transport http tmpstate https://tmpstate.dev/mcp
```

## Tool surface

15 tools. Anything that costs money or destroys data is consent-gated: the first call returns pricing or a warning, and the tool only proceeds on an explicit confirm/plan argument after the human approves.

| Tool | What it does |
|---|---|
| `create_database` | Create a temporary JSON database (24h TTL, idempotency-key support) |
| `database_status` | Usage, limits, tier and expiry |
| `list_documents` | List documents in a collection (cursor pagination) |
| `get_document` | Read one document |
| `create_document` | Insert a JSON document |
| `update_document` | Shallow-merge a patch into a document |
| `delete_document` | Delete one document |
| `delete_collection` | Delete every document in a collection |
| `delete_database` | Destroy the whole database (confirm-gated, irreversible) |
| `extend_database` | Pricing table, then a Stripe checkout URL (consent-gated) |
| `pro_checkout` | Start a Pro subscription (consent-gated) |
| `pro_list_databases` | List the Pro account's databases |
| `pro_create_database` | Create an always-on Pro database (overage consent-gated) |
| `pro_attach_database` | Upgrade an existing database to Pro in place |
| `pro_cancel` | Cancel Pro (confirm-gated, discloses consequences first) |

Full descriptions and JSON schemas: [docs/tools.md](docs/tools.md). To verify against the live server:

```sh
node scripts/fetch-tools.mjs
```

## Pricing

Transparent and returned by the API itself (`extend_database` with no plan):

| Plan | Price | Adds |
|---|---|---|
| Free | $0 | 24h TTL, 100 docs, 100 writes, 10 KB/doc |
| Week | $1 | +7 days, 1,000 docs, +2,000 writes |
| Month | $3 | +30 days, 2,500 docs, +10,000 writes |
| Quarter | $9 | +90 days, 10,000 docs, +50,000 writes |
| Pro | $8/mo | 3 always-on databases included |

One-time extensions are payments, not subscriptions. Agents are instructed to never start a checkout without explicit human approval.

## Links

- Site: [tmpstate.dev](https://tmpstate.dev)
- Agent docs: [tmpstate.dev/llms.txt](https://tmpstate.dev/llms.txt)
- Playbooks: [tmpstate.dev/skills](https://tmpstate.dev/skills)
- Security model: [SECURITY.md](SECURITY.md)

## License

[MIT](LICENSE)
