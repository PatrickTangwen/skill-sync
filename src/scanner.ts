import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import TOML from '@iarna/toml';
import type { InstructionState, McpServerEntry, PluginEntry, HookEntry, RuleEntry } from './types.js';
import { isOfficial } from './official-plugin-registry.js';

function readFileOrNull(path: string): string | null {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
}

export function scanInstructions(homePath: string): InstructionState {
  const claudePath = join(homePath, '.claude', 'CLAUDE.md');
  const codexPath = join(homePath, '.codex', 'AGENTS.md');

  const claudeContent = readFileOrNull(claudePath);
  const codexContent = readFileOrNull(codexPath);

  return {
    claude: { found: claudeContent !== null, content: claudeContent, path: claudePath },
    codex: { found: codexContent !== null, content: codexContent, path: codexPath },
  };
}

function hasSecretIndicators(args: unknown[]): boolean {
  const secretPatterns = ['--api-key', '--token', '--secret', '--password', '--credential'];
  return args.some(a => typeof a === 'string' && secretPatterns.some(p => a.toLowerCase().includes(p)));
}

export function scanMcpServers(homePath: string): McpServerEntry[] {
  const entries: McpServerEntry[] = [];

  const codexConfigPath = join(homePath, '.codex', 'config.toml');
  const codexContent = readFileOrNull(codexConfigPath);
  if (codexContent) {
    try {
      const config = TOML.parse(codexContent) as Record<string, unknown>;
      const servers = config.mcp_servers as Record<string, Record<string, unknown>> | undefined;
      if (servers) {
        for (const [name, serverConfig] of Object.entries(servers)) {
          const command = serverConfig.command as string | undefined;
          const args = serverConfig.args as unknown[] | undefined;
          const env = serverConfig.env as Record<string, unknown> | undefined;
          const requiresSecret = (args && args.length > 1 && hasSecretIndicators(args)) || false;

          entries.push({
            name,
            description: `MCP server: ${name}`,
            install: command || null,
            requires_secret: requiresSecret,
            source_tool: 'codex',
            sync: true,
          });
        }
      }
    } catch {
      // invalid TOML, skip
    }
  }

  const claudeMcpPath = join(homePath, '.mcp.json');
  const claudeMcpContent = readFileOrNull(claudeMcpPath);
  if (claudeMcpContent) {
    try {
      const config = JSON.parse(claudeMcpContent) as Record<string, unknown>;
      const servers = config.mcpServers as Record<string, Record<string, unknown>> | undefined;
      if (servers) {
        for (const [name, serverConfig] of Object.entries(servers)) {
          const command = serverConfig.command as string | undefined;
          const args = serverConfig.args as unknown[] | undefined;
          const requiresSecret = (args && args.length > 1 && hasSecretIndicators(args)) || false;

          entries.push({
            name,
            description: `MCP server: ${name}`,
            install: command || null,
            requires_secret: requiresSecret,
            source_tool: 'claude',
            sync: true,
          });
        }
      }
    } catch {
      // invalid JSON, skip
    }
  }

  return entries;
}

export function scanPlugins(homePath: string): PluginEntry[] {
  const entries: PluginEntry[] = [];

  // Claude Code plugins
  const installedPath = join(homePath, '.claude', 'plugins', 'installed_plugins.json');
  const installedContent = readFileOrNull(installedPath);
  const settingsPath = join(homePath, '.claude', 'settings.json');
  const settingsContent = readFileOrNull(settingsPath);

  let marketplaces: Record<string, { source?: { source?: string; repo?: string } }> = {};
  if (settingsContent) {
    try {
      const settings = JSON.parse(settingsContent);
      marketplaces = settings.extraKnownMarketplaces || {};
    } catch { /* skip */ }
  }

  if (installedContent) {
    try {
      const data = JSON.parse(installedContent);
      const plugins = data.plugins as Record<string, unknown> || {};
      for (const pluginId of Object.keys(plugins)) {
        if (isOfficial(pluginId, 'claude')) continue;
        const marketplaceName = pluginId.split('@').pop() || '';
        const marketplace = marketplaces[marketplaceName];
        const source = marketplace?.source?.repo
          ? `github:${marketplace.source.repo}`
          : null;

        entries.push({
          name: pluginId,
          description: `Claude Code plugin: ${pluginId.split('@')[0]}`,
          source,
          target_tool: 'claude',
          sync: true,
        });
      }
    } catch { /* skip */ }
  }

  // Codex plugins
  const codexConfigPath = join(homePath, '.codex', 'config.toml');
  const codexContent = readFileOrNull(codexConfigPath);
  if (codexContent) {
    try {
      const config = TOML.parse(codexContent) as Record<string, unknown>;
      const plugins = config.plugins as Record<string, Record<string, unknown>> | undefined;
      if (plugins) {
        for (const pluginId of Object.keys(plugins)) {
          if (isOfficial(pluginId, 'codex')) continue;
          entries.push({
            name: pluginId,
            description: `Codex plugin: ${pluginId.split('@')[0]}`,
            source: null,
            target_tool: 'codex',
            sync: true,
          });
        }
      }
    } catch { /* skip */ }
  }

  return entries;
}

export function scanHooksAndRules(homePath: string): { hooks: HookEntry[]; rules: RuleEntry[] } {
  const hooks: HookEntry[] = [];
  const rules: RuleEntry[] = [];

  // Claude hooks from settings.json
  const settingsPath = join(homePath, '.claude', 'settings.json');
  const settingsContent = readFileOrNull(settingsPath);
  if (settingsContent) {
    try {
      const settings = JSON.parse(settingsContent);
      if (settings.hooks) {
        for (const trigger of Object.keys(settings.hooks as Record<string, unknown[]>)) {
          hooks.push({
            name: trigger,
            description: `Claude Code hook: ${trigger}`,
            trigger,
            target_tool: 'claude',
            sync: true,
          });
        }
      }
    } catch { /* skip */ }
  }

  // Codex rules from ~/.codex/rules/
  const rulesDir = join(homePath, '.codex', 'rules');
  if (existsSync(rulesDir)) {
    try {
      const files = readdirSync(rulesDir);
      for (const file of files) {
        const content = readFileOrNull(join(rulesDir, file));
        if (content !== null) {
          const name = file.replace(/\.[^.]+$/, '');
          rules.push({
            name,
            description: `Codex rule: ${name}`,
            content,
            source_tool: 'codex',
            target_tool: 'codex',
            sync: true,
          });
        }
      }
    } catch { /* skip */ }
  }

  return { hooks, rules };
}
