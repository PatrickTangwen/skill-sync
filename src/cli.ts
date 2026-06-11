#!/usr/bin/env node

import { Command } from 'commander';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { runInit, runScan, runDiff, runApply } from './commands.js';

const DEFAULT_BASE = join(homedir(), '.config', 'skill-sync');

const program = new Command();

program
  .name('skill-sync')
  .description('Sync AI CLI tool configurations across devices and tools')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize the source of truth directory (~/.config/skill-sync/)')
  .action(() => {
    runInit(DEFAULT_BASE);
    console.log('Initialized source of truth at', DEFAULT_BASE);
  });

program
  .command('scan')
  .description('Scan current machine and generate/update inventory lists')
  .action(() => {
    const summary = runScan(DEFAULT_BASE, homedir());
    console.log('Scan complete:', summary);
  });

program
  .command('diff')
  .description('Compare source of truth against current machine state')
  .action(() => {
    const { output, hasDifferences } = runDiff(DEFAULT_BASE, homedir());
    console.log(output);
    process.exitCode = hasDifferences ? 1 : 0;
  });

program
  .command('apply')
  .description('Apply source of truth to current machine')
  .option('--force', 'Skip interactive confirmation')
  .option('--dry-run', 'Preview changes without writing to disk')
  .action(async (options) => {
    const result = runApply(DEFAULT_BASE, homedir(), {
      dryRun: options.dryRun || false,
      force: options.force || false,
    });
    console.log(result.output);

    if (result.needsConfirmation) {
      const answer = await ask('Apply these changes? (y/N) ');
      if (answer.toLowerCase() === 'y') {
        const confirmed = runApply(DEFAULT_BASE, homedir(), { dryRun: false, force: true });
        console.log(confirmed.output);
        process.exitCode = confirmed.exitCode;
      } else {
        console.log('Aborted.');
      }
    } else {
      process.exitCode = result.exitCode;
    }
  });

function ask(prompt: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

program.parse();
