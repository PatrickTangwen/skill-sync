# Manifest Schema

## instructions/global.md

Plain markdown file. No schema — raw content is the value. Copied verbatim to targets.

## mcp/servers.yaml

```yaml
mcp_servers:
  - name: context7
    description: "Fetch up-to-date library documentation via Context7 API"
    install: "npx -y @upstash/context7-mcp"
    requires_secret: true
    source_tool: codex           # which tool this was discovered from
    sync: true                   # user-controlled: include in sync or not

  - name: node_repl
    description: "Codex built-in Node.js REPL for browser and code execution"
    install: null                # null = bundled with the tool, no install needed
    requires_secret: false
    source_tool: codex
    sync: false                  # built-in, no need to sync
```

## plugins/plugins.yaml

```yaml
plugins:
  - name: claude-hud
    description: "Custom status line HUD for Claude Code"
    source: "github:jarrodwatts/claude-hud"
    target_tool: claude          # claude | codex | both
    sync: true

  - name: andrej-karpathy-skills
    description: "Karpathy's coding guidelines as a skill plugin"
    source: "github:forrestchang/andrej-karpathy-skills"
    target_tool: claude
    sync: true
```

## hooks/hooks.yaml

```yaml
hooks:
  - name: pre-commit-lint
    description: "Run linter before committing"
    trigger: "pre-commit"
    target_tool: claude          # claude | codex | both
    sync: true
```

## rules/rules.yaml

```yaml
rules:
  - name: allow-curl
    description: "Allow curl commands without confirmation"
    content: 'prefix_rule(pattern=["curl"], decision="allow")'
    source_tool: codex
    target_tool: codex           # claude | codex | both
    sync: true
```

## Common Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | yes | Unique identifier within its category |
| description | string | yes | Human-readable purpose |
| sync | boolean | yes | Whether this item participates in sync |
| source_tool | string | no | Which tool this was originally discovered from (claude / codex) |
| target_tool | string | no | Which tool(s) this should be applied to (claude / codex / both) |
| requires_secret | boolean | no | MCP-specific: whether setup needs API keys or tokens |
| install | string | null | no | MCP-specific: install command, null if bundled |
| source | string | no | Plugin-specific: repository or registry source |
| trigger | string | no | Hook-specific: when the hook fires |
| content | string | no | Rule-specific: the rule definition (rules are small enough to inline) |
