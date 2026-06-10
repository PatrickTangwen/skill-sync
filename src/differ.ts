import { createTwoFilesPatch } from 'diff';
import type { SourceOfTruth, MachineState, DiffResult, InstructionDiff, InventoryDiff } from './types.js';

function diffInstruction(tool: 'claude' | 'codex', sourceContent: string | null, targetContent: string | null): InstructionDiff {
  if (sourceContent === null) {
    return { tool, status: 'source_missing', patch: null };
  }
  if (targetContent === null) {
    return { tool, status: 'missing', patch: null };
  }
  if (sourceContent === targetContent) {
    return { tool, status: 'identical', patch: null };
  }
  const patch = createTwoFilesPatch('current', 'source-of-truth', targetContent, sourceContent);
  return { tool, status: 'modified', patch };
}

function diffInventory<T extends { name: string; sync: boolean }>(sourceItems: T[], machineItems: T[]): InventoryDiff<T> {
  const syncedSource = sourceItems.filter(i => i.sync);
  const sourceNames = new Set(syncedSource.map(i => i.name));
  const machineNames = new Set(machineItems.map(i => i.name));

  return {
    missing: syncedSource.filter(i => !machineNames.has(i.name)),
    extra: machineItems.filter(i => !sourceNames.has(i.name)),
    matched: syncedSource.filter(i => machineNames.has(i.name)),
  };
}

export function diff(source: SourceOfTruth, machine: MachineState): DiffResult {
  const instructions = [
    diffInstruction('claude', source.instructions, machine.instructions.claude.content),
    diffInstruction('codex', source.instructions, machine.instructions.codex.content),
  ];

  const mcpServers = diffInventory(source.mcpServers, machine.mcpServers);
  const plugins = diffInventory(source.plugins, machine.plugins);
  const hooks = diffInventory(source.hooks, machine.hooks);
  const rules = diffInventory(source.rules, machine.rules);

  const hasInstructionDiffs = instructions.some(d => d.status === 'modified' || d.status === 'missing');
  const hasInventoryDiffs = [mcpServers, plugins, hooks, rules].some(
    inv => inv.missing.length > 0 || inv.extra.length > 0,
  );

  return {
    instructions,
    mcpServers,
    plugins,
    hooks,
    rules,
    hasDifferences: hasInstructionDiffs || hasInventoryDiffs,
  };
}
