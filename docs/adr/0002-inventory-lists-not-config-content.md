# ADR 0002: Inventory Lists, Not Config Content

## Status
Accepted

## Context
MCP servers, hooks, plugins, and rules have tool-specific formats (JSON for Claude Code, TOML for Codex) and often contain secrets (API keys) or machine-specific absolute paths. We considered three approaches:

1. Store full config content with secret redaction and template variables
2. Store full config content per-tool (maintain two formats)
3. Store only an inventory list — name, description, source, whether secrets are needed

## Decision
Option 3 — inventory lists only. The source of truth records *what* is installed, not *how* it is configured. During `apply`, the tool presents the inventory to the user (or to the LLM via the skill wrapper) and the user completes the actual tool-specific configuration themselves.

## Consequences
- Secrets are never read, never stored, never at risk of leaking into Git.
- No need to maintain parallel JSON/TOML templates or build a format translation layer.
- The tool cannot fully automate MCP/plugin setup — it can only tell the user what to install. This is an intentional trade-off: safety over automation for secret-bearing configs.
- The single exception is `instructions/global.md`, which is full content (plain text, no secrets, no paths) and is copied verbatim to both targets.
