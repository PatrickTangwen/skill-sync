#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('skill-sync')
  .description('Sync AI CLI tool configurations across devices and tools')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize the source of truth directory (~/.config/skill-sync/)')
  .action(() => {
    console.log('skill-sync init: not yet implemented');
  });

program
  .command('scan')
  .description('Scan current machine and generate/update inventory lists')
  .action(() => {
    console.log('skill-sync scan: not yet implemented');
  });

program
  .command('diff')
  .description('Compare source of truth against current machine state')
  .action(() => {
    console.log('skill-sync diff: not yet implemented');
  });

program
  .command('apply')
  .description('Apply source of truth to current machine')
  .option('--force', 'Skip interactive confirmation')
  .option('--dry-run', 'Preview changes without writing to disk')
  .action((options) => {
    console.log('skill-sync apply: not yet implemented');
    if (options.force) console.log('  --force: enabled');
    if (options.dryRun) console.log('  --dry-run: enabled');
  });

program.parse();
