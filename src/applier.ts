import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { BackupManager } from './backup-manager.js';
import type { SourceOfTruth, DiffResult, McpServerEntry } from './types.js';

export interface ApplyOptions {
  dryRun: boolean;
  force: boolean;
}

export interface ApplyResult {
  filesWritten: string[];
  backups: string[];
  planned: string[];
  manualSetup: string[];
  warnings: string[];
}

const TOOL_PATHS: Record<string, { dir: string; file: string }> = {
  claude: { dir: '.claude', file: 'CLAUDE.md' },
  codex: { dir: '.codex', file: 'AGENTS.md' },
};

export function apply(source: SourceOfTruth, diffResult: DiffResult, homePath: string, storePath: string, opts: ApplyOptions): ApplyResult {
  const result: ApplyResult = {
    filesWritten: [],
    backups: [],
    planned: [],
    manualSetup: [],
    warnings: [],
  };

  const backupMgr = new BackupManager(storePath);

  for (const d of diffResult.instructions) {
    if (d.status === 'identical' || d.status === 'source_missing') continue;

    const toolPath = TOOL_PATHS[d.tool];
    const targetDir = join(homePath, toolPath.dir);
    const targetFile = join(targetDir, toolPath.file);

    if (!existsSync(targetDir)) {
      result.warnings.push(`${d.tool} directory not found (${targetDir}), skipping`);
      continue;
    }

    result.planned.push(`Write ${toolPath.file} to ${targetDir}`);

    if (opts.dryRun) continue;

    const backupPath = backupMgr.backup(targetFile, d.tool);
    if (backupPath) result.backups.push(backupPath);

    writeFileSync(targetFile, source.instructions!);
    result.filesWritten.push(targetFile);
  }

  const categories = [
    { name: 'MCP servers', inv: diffResult.mcpServers },
    { name: 'plugins', inv: diffResult.plugins },
    { name: 'hooks', inv: diffResult.hooks },
    { name: 'rules', inv: diffResult.rules },
  ];

  for (const { name, inv } of categories) {
    for (const item of inv.missing) {
      const secret = 'requires_secret' in item && (item as McpServerEntry).requires_secret;
      const marker = secret ? ' [requires secret]' : '';
      result.manualSetup.push(`${name}: ${item.name}${marker}`);
    }
  }

  return result;
}
