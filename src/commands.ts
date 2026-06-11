import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SourceStore } from './source-store.js';
import { scanInstructions, scanMcpServers, scanPlugins, scanHooksAndRules } from './scanner.js';
import { diff } from './differ.js';
import { apply, type ApplyOptions } from './applier.js';
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
    if (d.patch) lines.push(colorizePatch(d.patch));
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

export interface RunApplyResult {
  output: string;
  exitCode: number;
  needsConfirmation?: boolean;
}

export function runApply(basePath: string, homePath: string, opts: ApplyOptions): RunApplyResult {
  if (!existsSync(join(basePath, 'instructions'))) {
    return { output: 'Source of truth not found. Run `skill-sync scan` first.', exitCode: 1 };
  }

  const store = new SourceStore(basePath);
  const source = store.read();

  const instructions = scanInstructions(homePath);
  const mcpServers = scanMcpServers(homePath);
  const plugins = scanPlugins(homePath);
  const { hooks, rules } = scanHooksAndRules(homePath);
  const machine = { instructions, mcpServers, plugins, hooks, rules };

  const diffResult = diff(source, machine);

  if (!diffResult.hasDifferences) {
    return { output: 'Everything is up to date.', exitCode: 0 };
  }

  if (!opts.force && !opts.dryRun) {
    const preview = apply(source, diffResult, homePath, basePath, { dryRun: true, force: false });
    const lines: string[] = [];
    for (const p of preview.planned) lines.push(`  Would: ${p}`);
    for (const w of preview.warnings) lines.push(`Warning: ${w}`);
    if (preview.manualSetup.length > 0) {
      lines.push('Manual setup needed:');
      for (const m of preview.manualSetup) lines.push(`  - ${m}`);
    }
    return { output: lines.join('\n'), exitCode: 0, needsConfirmation: true };
  }

  const result = apply(source, diffResult, homePath, basePath, opts);

  const lines: string[] = [];
  if (opts.dryRun) {
    lines.push('Dry run — no changes written.');
    for (const p of result.planned) lines.push(`  Would: ${p}`);
  } else {
    for (const f of result.filesWritten) lines.push(`Written: ${f}`);
    for (const b of result.backups) lines.push(`Backup: ${b}`);
  }
  for (const w of result.warnings) lines.push(`Warning: ${w}`);
  if (result.manualSetup.length > 0) {
    lines.push('Manual setup needed:');
    for (const m of result.manualSetup) lines.push(`  - ${m}`);
  }

  return { output: lines.join('\n'), exitCode: 0 };
}

function colorizePatch(patch: string): string {
  const reset = '\x1b[0m';
  const green = '\x1b[32m';
  const red = '\x1b[31m';
  const cyan = '\x1b[36m';
  return patch.split('\n').map(line => {
    if (line.startsWith('+') && !line.startsWith('+++')) return `${green}${line}${reset}`;
    if (line.startsWith('-') && !line.startsWith('---')) return `${red}${line}${reset}`;
    if (line.startsWith('@@')) return `${cyan}${line}${reset}`;
    return line;
  }).join('\n');
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
