import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SourceStore } from './source-store.js';
import { scanInstructions, scanMcpServers, scanPlugins, scanHooksAndRules } from './scanner.js';
import { diff } from './differ.js';
import type { SourceOfTruth, DiffResult } from './types.js';

export function runInit(basePath: string): void {
  const store = new SourceStore(basePath);
  store.init();
}

export function runScan(basePath: string, homePath: string): string {
  const store = new SourceStore(basePath);
  store.init();

  const instructions = scanInstructions(homePath);
  const mcpServers = scanMcpServers(homePath);
  const plugins = scanPlugins(homePath);
  const { hooks, rules } = scanHooksAndRules(homePath);

  const existing = store.read();

  const data: SourceOfTruth = {
    instructions: existing.instructions ?? instructions.claude.content ?? instructions.codex.content ?? null,
    mcpServers: mergeByName(existing.mcpServers, mcpServers),
    plugins: mergeByName(existing.plugins, plugins),
    hooks: mergeByName(existing.hooks, hooks),
    rules: mergeByName(existing.rules, rules),
  };

  store.write(data);

  const lines = [
    `${data.mcpServers.length} MCP servers`,
    `${data.plugins.length} plugins`,
    `${data.hooks.length} hooks`,
    `${data.rules.length} rules`,
  ];
  if (data.instructions) lines.unshift('instructions: adopted');

  return lines.join(', ');
}

export function runDiff(basePath: string, homePath: string): { output: string; hasDifferences: boolean } {
  if (!existsSync(join(basePath, 'instructions'))) {
    return { output: 'Source of truth not found. Run `skill-sync scan` first.', hasDifferences: false };
  }

  const store = new SourceStore(basePath);
  const source = store.read();

  const instructions = scanInstructions(homePath);
  const mcpServers = scanMcpServers(homePath);
  const plugins = scanPlugins(homePath);
  const { hooks, rules } = scanHooksAndRules(homePath);
  const machine = { instructions, mcpServers, plugins, hooks, rules };

  const result = diff(source, machine);

  if (!result.hasDifferences) {
    return { output: 'No differences found.', hasDifferences: false };
  }

  const lines: string[] = [];

  for (const d of result.instructions) {
    if (d.status === 'identical' || d.status === 'source_missing') continue;
    lines.push(`[${d.tool}] instructions: ${d.status}`);
    if (d.patch) lines.push(d.patch);
  }

  const categories = [
    { name: 'MCP servers', inv: result.mcpServers },
    { name: 'plugins', inv: result.plugins },
    { name: 'hooks', inv: result.hooks },
    { name: 'rules', inv: result.rules },
  ];

  for (const { name, inv } of categories) {
    if (inv.missing.length > 0) {
      lines.push(`${name} missing from machine: ${inv.missing.map((i: { name: string }) => i.name).join(', ')}`);
    }
    if (inv.extra.length > 0) {
      lines.push(`${name} extra on machine: ${inv.extra.map((i: { name: string }) => i.name).join(', ')}`);
    }
  }

  return { output: lines.join('\n'), hasDifferences: true };
}

function mergeByName<T extends { name: string }>(existing: T[], scanned: T[]): T[] {
  const names = new Set(existing.map(e => e.name));
  const merged = [...existing];
  for (const item of scanned) {
    if (!names.has(item.name)) {
      merged.push(item);
    }
  }
  return merged;
}
