# PRD: Skill-Sync — AI CLI Configuration Synchronization Tool

**Label:** `ready-for-agent`

## Problem Statement

When configuring Claude Code or Codex on one device, all configuration must be manually replicated on every other device. This includes global instruction files, MCP servers, hooks, custom agents, plugins, and rules. It is easy to forget which configurations have been applied, which files have drifted, and whether Claude Code and Codex on the same device are consistent with each other. There is no tool that covers the full surface area beyond skills/agents/rules (which Skillshare already handles).

## Solution

Skill-Sync is a Node.js CLI tool (with an optional Claude Code skill wrapper) that synchronizes AI CLI tool configurations across devices and across tools. It complements Skillshare — Skillshare manages skills, agents, and rules; Skill-Sync manages everything else: global instruction files, MCP server inventories, non-official plugin inventories, hook inventories, and rule inventories.

The tool maintains a source of truth directory (`~/.config/skill-sync/`) that is intended to be version-controlled via Git for cross-device synchronization. It provides three core commands: `scan` (auto-detect current machine state), `diff` (compare source of truth against current machine), and `apply` (write source of truth to target locations with backup and confirmation).

Instruction files are synced as full content (one canonical `global.md` copied verbatim to both `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md`). All other configuration categories (MCP, plugins, hooks, rules) are synced as inventory lists — recording what is installed and its purpose, without storing configuration content or secrets.

## User Stories

1. As a developer with multiple machines, I want to scan my primary machine's AI tool configurations, so that I have a complete inventory of what's configured.
2. As a developer setting up a new device, I want to see the diff between my source of truth and the new device's current state, so that I know exactly what's missing or different.
3. As a developer setting up a new device, I want to apply my source of truth to the new device, so that my global instructions are identical across all machines.
4. As a developer, I want the tool to auto-detect existing Claude Code and Codex configurations during scan, so that I don't have to manually enumerate what's installed.
5. As a developer, I want MCP server entries in my inventory to never contain API keys or tokens, so that I can safely commit the inventory to a Git repository.
6. As a developer, I want the apply command to show me a diff and ask for confirmation before overwriting existing files, so that I don't accidentally lose local customizations.
7. As a developer, I want the apply command to always create a backup before overwriting, so that I can recover if something goes wrong.
8. As a developer, I want a `--force` flag on apply, so that I can skip interactive confirmation in scripted or familiar scenarios.
9. As a developer, I want each inventory item to have a `sync: true/false` flag, so that I can selectively exclude certain MCP servers, plugins, hooks, or rules from synchronization.
10. As a developer, I want official/vendor plugins to be automatically excluded from the inventory, so that I only track third-party customizations that I actually need to replicate.
11. As a developer, I want the tool to maintain a single canonical instruction file that writes to both CLAUDE.md and AGENTS.md, so that I don't have to maintain two copies with manual drift correction.
12. As a developer, I want scan results to include a human-readable summary printed to the terminal, so that I can quickly see what was discovered without reading YAML files.
13. As a developer, I want apply to print a checklist of inventory items that require manual setup (especially those with `requires_secret: true`), so that I know exactly what still needs hands-on configuration.
14. As a developer, I want to initialize the source of truth directory with `skill-sync init`, so that the directory structure and .gitignore are created correctly from the start.
15. As a developer using Claude Code, I want a `/skill-sync` skill that wraps the CLI, so that I can run scan/diff/apply conversationally and get LLM assistance for items that require secret configuration.
16. As a developer, I want backups stored in a `.gitignore`-excluded directory within the source of truth, so that they are centrally managed but never accidentally pushed to remote.
17. As a developer, I want diff to show both instruction file text diffs and inventory table diffs (missing/extra items), so that I get a complete picture in one command.
18. As a developer, I want the scan to read MCP server names and commands from Codex's config.toml without parsing args that may contain secrets, so that the extraction is safe by design.
19. As a developer, I want the scan to read Claude Code's installed_plugins.json and filter out official plugins automatically, so that the plugin inventory only contains my custom additions.
20. As a developer, I want a `--dry-run` flag on apply, so that I can preview what would change without writing anything to disk.

## Implementation Decisions

### Architecture: Complement Skillshare (ADR 0001)
Skill-Sync operates as a peer to Skillshare with non-overlapping domains. Skillshare manages skills, agents, and rules via `~/.config/skillshare/`. Skill-Sync manages instructions, MCP inventories, plugin inventories, hook inventories, and rule inventories via `~/.config/skill-sync/`. Neither tool depends on or calls the other at runtime.

### Inventory lists, not config content (ADR 0002)
MCP servers, plugins, hooks, and rules are stored as inventory lists (name, description, source, sync flag) rather than full configuration content. This eliminates secret leakage risk and avoids maintaining parallel JSON/TOML templates for different tools. The single exception is instruction files, which are full plain-text content copied verbatim.

### Secret handling
The scanner never reads secret-bearing fields. When parsing Codex's config.toml for MCP servers, only the server name and command are extracted — args arrays (which may contain API keys) are not read into memory. Inventory entries carry a `requires_secret: true/false` flag so the apply phase can prompt the user.

### Source of truth directory structure
```
~/.config/skill-sync/
├── .gitignore
├── instructions/global.md
├── mcp/servers.yaml
├── plugins/plugins.yaml
├── hooks/hooks.yaml
├── rules/rules.yaml
└── backups/          (gitignored)
```

### Official plugin filtering
The Scanner module maintains hardcoded allowlists of official plugin identifiers for both Claude Code (e.g., `feature-dev@claude-plugins-official`, `frontend-design@claude-plugins-official`, `context7@claude-plugins-official`) and Codex (e.g., `github@openai-curated`, `documents@openai-primary-runtime`, `browser@openai-bundled`). Plugins matching these identifiers are excluded from the inventory during scan.

### Modules

1. **Scanner** — Detects Claude Code and Codex configs on the current machine. Returns a unified MachineState object. Pure data extraction with no side effects beyond reading the filesystem.

2. **SourceStore** — Reads and writes the `~/.config/skill-sync/` directory. Handles YAML serialization/deserialization and directory initialization.

3. **Differ** — Takes a SourceOfTruth and a MachineState, produces a structured DiffResult containing text diffs for instructions and addition/removal/mismatch tables for inventory items.

4. **Applier** — Consumes a SourceOfTruth and DiffResult. Performs backup, writes instruction files, prints inventory checklist. Handles `--force` and `--dry-run` flags.

5. **BackupManager** — Creates timestamped backup copies of files before overwrite. Manages the backups directory and its .gitignore.

6. **OfficialPluginRegistry** — Hardcoded allowlists used by Scanner to filter vendor plugins from the inventory.

### Technology stack
- Runtime: Node.js >= 20
- Language: TypeScript
- CLI framework: commander
- YAML: js-yaml
- TOML: @iarna/toml
- Text diff: diff (npm)
- Distribution: npm install -g skill-sync

### CLI commands
- `skill-sync init` — create source of truth directory structure
- `skill-sync scan` — auto-detect and generate/update inventories
- `skill-sync diff` — compare source of truth vs current machine
- `skill-sync apply [--force] [--dry-run]` — apply source of truth with backup

## Testing Decisions

Good tests for this project verify external behavior through the module's public interface, not internal implementation. Given that the core logic is filesystem-based, tests should use mock data structures (in-memory MachineState, SourceOfTruth objects) rather than touching the real filesystem.

### Modules to test

1. **Scanner** — the highest-value test target. Test that given mock file contents (a CLAUDE.md string, a config.toml string, an installed_plugins.json object), the scanner produces the correct MachineState. Test official plugin filtering. Test that secret-bearing args are not included in MCP entries.

2. **Differ** — pure function, highly testable. Test that given a SourceOfTruth and MachineState with known differences, the DiffResult correctly identifies: identical instructions, changed instructions, missing inventory items, extra inventory items, items with `sync: false` excluded.

3. **OfficialPluginRegistry** — trivial but worth a smoke test to ensure the allowlists are correct and `isOfficial` returns expected results.

4. **Applier** — test with a mock filesystem abstraction. Verify that backup is created before overwrite, that `--dry-run` produces no writes, that `--force` skips confirmation, that items with `sync: false` are skipped.

### No prior test art
This is a greenfield project with no existing test infrastructure. Tests will use Node.js built-in test runner (`node:test`) or vitest, to be decided during scaffold.

## Out of Scope

- **settings.json and config.toml synchronization** — these files contain machine-specific paths, secrets, and runtime state. They remain manually managed.
- **Project-level configuration** — `.claude/CLAUDE.md`, project-level `AGENTS.md`, and similar per-repo configs are already version-controlled via Git. May be added in a future version.
- **Instruction file override/merge logic** — no shared + tool-specific override composition. One canonical file written identically to both targets.
- **Skills, agents, and rules content synchronization** — this is Skillshare's domain.
- **Automatic secret provisioning** — the tool never stores, transfers, or fills in secrets. It only flags which items require them.
- **Cross-platform support (Windows, WSL, Linux)** — MVP targets macOS. Cross-platform path handling is a post-MVP enhancement.
- **Real-time file watching or auto-sync** — users run commands manually and use Git for cross-device propagation.
- **Web dashboard or GUI** — CLI only for MVP, with an optional skill wrapper for conversational interaction.

## Further Notes

### Migration strategy from current manual setup
The recommended migration path is: run `skill-sync scan` on the primary machine to bootstrap the source of truth, review and adjust sync flags, commit to a private Git repo, then `git clone` + `skill-sync apply` on each additional device.

### Relationship to Skillshare
Skill-Sync and Skillshare can coexist in the same dotfiles Git repo (e.g., both `~/.config/skillshare/` and `~/.config/skill-sync/` tracked together) for a unified cross-device sync workflow. They have no runtime coupling.

### Skill wrapper
The Claude Code skill (`/skill-sync`) is a thin wrapper that shells out to the CLI. Its primary added value is guiding users through manual MCP/plugin configuration for items flagged with `requires_secret: true`, leveraging the LLM's conversational ability.
