#!/usr/bin/env node
// Fetch the live TmpState MCP tool surface so you can verify this repo's
// docs/tools.md against what the server actually advertises right now.
//
//   node scripts/fetch-tools.mjs            # human-readable summary
//   node scripts/fetch-tools.mjs --json     # raw tools/list JSON

const ENDPOINT = process.env.TMPSTATE_MCP_URL ?? "https://tmpstate.dev/mcp"

async function rpc(method, params = {}, id = 1) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  })
  const text = await response.text()
  const raw = (response.headers.get("content-type") ?? "").includes("text/event-stream")
    ? text
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("")
    : text
  return JSON.parse(raw)
}

const init = await rpc("initialize", {
  protocolVersion: "2024-11-05",
  capabilities: {},
  clientInfo: { name: "fetch-tools", version: "1.0.0" },
})
const { tools } = (await rpc("tools/list", {}, 2)).result

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(tools, null, 2))
} else {
  const info = init.result.serverInfo
  console.log(`${info.name} v${info.version} at ${ENDPOINT}`)
  console.log(`\nInstructions:\n${init.result.instructions}\n`)
  console.log(`${tools.length} tools:\n`)
  for (const tool of tools) {
    console.log(`- ${tool.name}: ${tool.title}`)
  }
}
