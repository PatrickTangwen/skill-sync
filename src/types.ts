export interface InstructionState {
  claude: { found: boolean; content: string | null; path: string };
  codex: { found: boolean; content: string | null; path: string };
}

export interface McpServerEntry {
  name: string;
  description: string;
  install: string | null;
  requires_secret: boolean;
  source_tool: 'claude' | 'codex';
  sync: boolean;
}

export interface PluginEntry {
  name: string;
  description: string;
  source: string | null;
  target_tool: 'claude' | 'codex' | 'both';
  sync: boolean;
}

export interface HookEntry {
  name: string;
  description: string;
  trigger: string;
  target_tool: 'claude' | 'codex' | 'both';
  sync: boolean;
}

export interface RuleEntry {
  name: string;
  description: string;
  content: string;
  source_tool: 'claude' | 'codex';
  target_tool: 'claude' | 'codex' | 'both';
  sync: boolean;
}

export interface MachineState {
  instructions: InstructionState;
  mcpServers: McpServerEntry[];
  plugins: PluginEntry[];
  hooks: HookEntry[];
  rules: RuleEntry[];
}

export interface SourceOfTruth {
  instructions: string | null;
  mcpServers: McpServerEntry[];
  plugins: PluginEntry[];
  hooks: HookEntry[];
  rules: RuleEntry[];
}

export interface InstructionDiff {
  tool: 'claude' | 'codex';
  status: 'identical' | 'modified' | 'missing' | 'source_missing';
  patch: string | null;
}

export interface InventoryDiff<T> {
  missing: T[];
  extra: T[];
  matched: T[];
}

export interface DiffResult {
  instructions: InstructionDiff[];
  mcpServers: InventoryDiff<McpServerEntry>;
  plugins: InventoryDiff<PluginEntry>;
  hooks: InventoryDiff<HookEntry>;
  rules: InventoryDiff<RuleEntry>;
  hasDifferences: boolean;
}
