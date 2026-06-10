import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { BackupManager } from './backup-manager.js';

describe('BackupManager', () => {
  let tempDir: string;
  let sourceDir: string;
  let manager: BackupManager;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'skill-sync-backup-'));
    sourceDir = mkdtempSync(join(tmpdir(), 'skill-sync-source-'));
    manager = new BackupManager(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    rmSync(sourceDir, { recursive: true, force: true });
  });

  it('backs up a file with tool-prefixed name and returns the backup path', () => {
    const filePath = join(sourceDir, 'CLAUDE.md');
    writeFileSync(filePath, 'Original content.');

    const backupPath = manager.backup(filePath, 'claude');

    expect(existsSync(backupPath)).toBe(true);
    expect(readFileSync(backupPath, 'utf-8')).toBe('Original content.');
    expect(backupPath).toContain('claude--CLAUDE.md');
    expect(backupPath).toContain('backups');
  });

  it('returns null when source file does not exist', () => {
    const result = manager.backup('/nonexistent/path/file.md', 'claude');
    expect(result).toBeNull();
  });

  it('works when backups directory already exists', () => {
    mkdirSync(join(tempDir, 'backups'), { recursive: true });
    const filePath = join(sourceDir, 'AGENTS.md');
    writeFileSync(filePath, 'Codex content.');

    const backupPath = manager.backup(filePath, 'codex');

    expect(backupPath).not.toBeNull();
    expect(readFileSync(backupPath!, 'utf-8')).toBe('Codex content.');
    expect(backupPath).toContain('codex--AGENTS.md');
  });
});
