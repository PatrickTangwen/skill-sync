import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

export class BackupManager {
  private backupsDir: string;

  constructor(basePath: string) {
    this.backupsDir = join(basePath, 'backups');
  }

  backup(filePath: string, toolPrefix: string): string | null {
    if (!existsSync(filePath)) return null;

    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, '');
    const dir = join(this.backupsDir, timestamp);
    mkdirSync(dir, { recursive: true });

    const backupName = `${toolPrefix}--${basename(filePath)}`;
    const backupPath = join(dir, backupName);
    copyFileSync(filePath, backupPath);
    return backupPath;
  }
}
