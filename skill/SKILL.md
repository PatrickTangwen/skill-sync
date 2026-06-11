# skill-sync

Sync AI CLI tool configurations across devices and tools (Claude Code, Codex).

Use when the user invokes `/skill-sync`, or asks to sync their AI tool configurations, MCP servers, plugins, hooks, or rules across devices.

## Subcommands

`/skill-sync` accepts an optional subcommand: `scan`, `diff`, or `apply`. If no subcommand is given, run `skill-sync diff` to show current status.

## Process

### 1. Check CLI installation

Before running any command, verify the `skill-sync` CLI is available:

```bash
npx skill-sync --version
```

If the command fails, tell the user to install it:

```
npm install -g skill-sync
```

Then retry.

### 2. Execute the subcommand

#### `/skill-sync scan`

Run:
```bash
skill-sync scan
```

Present the output conversationally. Explain what was discovered: how many MCP servers, plugins, hooks, and rules were found, and whether instruction files were adopted.

#### `/skill-sync diff`

Run:
```bash
skill-sync diff
```

Present the results conversationally:
- If exit code is 0: tell the user everything is in sync.
- If exit code is 1: show what differs — instruction changes, missing/extra inventory items per category.

#### `/skill-sync apply`

This is interactive. Follow these steps:

1. First run a dry-run to preview changes:
   ```bash
   skill-sync apply --dry-run
   ```
2. Show the user what would change.
3. Ask the user for confirmation.
4. On confirmation, run:
   ```bash
   skill-sync apply --force
   ```
5. Present the results: files written, backups created, and items needing manual setup.

### 3. Handle requires_secret items

After `scan` or `apply`, check the output for items marked with `requires_secret`. For each such item, guide the user through manual configuration:

- Explain which MCP server or plugin needs a secret.
- Ask the user for the required API key, token, or credential.
- Guide them to manually add it to their tool's configuration file (`~/.claude/settings.json` or `~/.codex/config.toml`).
- Never store or log the secret yourself.

### 4. Default (no subcommand)

If the user runs `/skill-sync` with no arguments, run `skill-sync diff` and present a brief status summary.
