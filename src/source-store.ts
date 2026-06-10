import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import type { SourceOfTruth, McpServerEntry, PluginEntry, HookEntry, RuleEntry } from './types.js';

const SUBDIRS = ['instructions', 'mcp', 'plugins', 'hooks', 'rules', 'backups'];

export class SourceStore {
  constructor(private basePath: string) {}

  init(): void {
    for (const dir of SUBDIRS) {
      mkdirSync(join(this.basePath, dir), { recursive: true });
    }
    const gitignorePath = join(this.basePath, '.gitignore');
    if (!existsSync(gitignorePath)) {
      writeFileSync(gitignorePath, 'backups/\n');
    }
  }

  read(): SourceOfTruth {
    const instructionsPath = join(this.basePath, 'instructions', 'global.md');
    const instructions = existsSync(instructionsPath)
      ? readFileSync(instructionsPath, 'utf-8')
      : null;

    return {
      instructions,
      mcpServers: this.readYamlList<McpServerEntry>(join(this.basePath, 'mcp', 'servers.yaml'), 'mcp_servers'),
      plugins: this.readYamlList<PluginEntry>(join(this.basePath, 'plugins', 'plugins.yaml'), 'plugins'),
      hooks: this.readYamlList<HookEntry>(join(this.basePath, 'hooks', 'hooks.yaml'), 'hooks'),
      rules: this.readYamlList<RuleEntry>(join(this.basePath, 'rules', 'rules.yaml'), 'rules'),
    };
  }

  write(data: SourceOfTruth): void {
    this.init();

    if (data.instructions !== null) {
      writeFileSync(join(this.basePath, 'instructions', 'global.md'), data.instructions);
    }

    this.writeYamlList(join(this.basePath, 'mcp', 'servers.yaml'), 'mcp_servers', data.mcpServers);
    this.writeYamlList(join(this.basePath, 'plugins', 'plugins.yaml'), 'plugins', data.plugins);
    this.writeYamlList(join(this.basePath, 'hooks', 'hooks.yaml'), 'hooks', data.hooks);
    this.writeYamlList(join(this.basePath, 'rules', 'rules.yaml'), 'rules', data.rules);
  }

  private readYamlList<T>(filePath: string, key: string): T[] {
    if (!existsSync(filePath)) return [];
    try {
      const content = readFileSync(filePath, 'utf-8');
      const data = yaml.load(content) as Record<string, T[]>;
      return data?.[key] || [];
    } catch {
      return [];
    }
  }

  private writeYamlList(filePath: string, key: string, items: unknown[]): void {
    const content = yaml.dump({ [key]: items }, { lineWidth: -1 });
    writeFileSync(filePath, content);
  }
}
