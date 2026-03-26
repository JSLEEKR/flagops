#!/usr/bin/env node
/**
 * flagops CLI — Git-native feature flags
 */
import { Command } from 'commander';
import { FlagStore } from '../core/store';
import { FlagDefinition } from '../core/types';
import { exportFlags, generateTypeDefinition } from '../core/exporter';
import { diffManifests, formatDiff } from '../core/diff';
import {
  formatFlag,
  formatFlagTable,
  formatEvaluation,
  formatStats,
  formatValidationErrors,
} from '../utils/formatter';
import { parseRuleExpression } from '../rules/engine';
import { isGitRepo, getGitInfo } from '../utils/git';
import chalk from 'chalk';
import * as fs from 'fs';

const program = new Command();
const DEFAULT_FILE = '.flagops.yml';

function getStore(file?: string): FlagStore {
  const store = new FlagStore(file || DEFAULT_FILE);
  store.load();
  return store;
}

program
  .name('flagops')
  .description('Git-native feature flags with zero infrastructure')
  .version('1.0.0');

// Init
program
  .command('init')
  .description('Initialize a new flagops manifest')
  .option('-f, --file <path>', 'Manifest file path', DEFAULT_FILE)
  .option('-n, --namespace <name>', 'Namespace for flags')
  .action((opts) => {
    if (fs.existsSync(opts.file)) {
      console.log(chalk.yellow(`File ${opts.file} already exists.`));
      return;
    }
    const store = new FlagStore(opts.file);
    if (opts.namespace) store.setNamespace(opts.namespace);
    store.save();
    console.log(chalk.green(`✓ Created ${opts.file}`));
    if (isGitRepo()) {
      const info = getGitInfo();
      if (info) console.log(chalk.gray(`  Git branch: ${info.branch}`));
    }
  });

// List
program
  .command('list')
  .alias('ls')
  .description('List all flags')
  .option('-f, --file <path>', 'Manifest file', DEFAULT_FILE)
  .option('-s, --status <status>', 'Filter by status')
  .option('-t, --type <type>', 'Filter by type')
  .option('--tag <tag>', 'Filter by tag')
  .option('--owner <owner>', 'Filter by owner')
  .option('--search <term>', 'Search by name/description')
  .option('-v, --verbose', 'Verbose output')
  .action((opts) => {
    const store = getStore(opts.file);
    const flags = store.filterFlags({
      status: opts.status,
      type: opts.type,
      tag: opts.tag,
      owner: opts.owner,
      search: opts.search,
    });

    if (opts.verbose) {
      flags.forEach(f => console.log(formatFlag(f, true)));
    } else {
      console.log(formatFlagTable(flags));
    }
  });

// Create
program
  .command('create <name>')
  .description('Create a new flag')
  .option('-f, --file <path>', 'Manifest file', DEFAULT_FILE)
  .option('-d, --description <desc>', 'Flag description')
  .option('-t, --type <type>', 'Flag type (boolean|string|number|multivariate)', 'boolean')
  .option('--default <value>', 'Default value')
  .option('--status <status>', 'Initial status', 'inactive')
  .option('--owner <owner>', 'Flag owner')
  .option('--tags <tags>', 'Comma-separated tags')
  .action((name, opts) => {
    const store = getStore(opts.file);

    let defaultValue: any = false;
    if (opts.default !== undefined) {
      if (opts.type === 'number') defaultValue = Number(opts.default);
      else if (opts.type === 'boolean') defaultValue = opts.default === 'true';
      else defaultValue = opts.default;
    }

    const flag: FlagDefinition = {
      name,
      status: opts.status,
      type: opts.type,
      defaultValue,
      description: opts.description,
      owner: opts.owner,
      tags: opts.tags?.split(',').map((t: string) => t.trim()),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.addFlag(flag);
    store.save();
    console.log(chalk.green(`✓ Created flag: ${name}`));
    console.log(formatFlag(flag, true));
  });

// Toggle
program
  .command('toggle <name>')
  .description('Toggle a flag on/off')
  .option('-f, --file <path>', 'Manifest file', DEFAULT_FILE)
  .action((name, opts) => {
    const store = getStore(opts.file);
    const flag = store.toggleFlag(name);
    store.save();
    console.log(chalk.green(`✓ Toggled ${name} → ${flag.status}`));
  });

// Enable
program
  .command('enable <name>')
  .description('Enable a flag')
  .option('-f, --file <path>', 'Manifest file', DEFAULT_FILE)
  .action((name, opts) => {
    const store = getStore(opts.file);
    store.updateFlag(name, { status: 'active' });
    store.save();
    console.log(chalk.green(`✓ Enabled: ${name}`));
  });

// Disable
program
  .command('disable <name>')
  .description('Disable a flag')
  .option('-f, --file <path>', 'Manifest file', DEFAULT_FILE)
  .action((name, opts) => {
    const store = getStore(opts.file);
    store.updateFlag(name, { status: 'inactive' });
    store.save();
    console.log(chalk.green(`✓ Disabled: ${name}`));
  });

// Delete
program
  .command('delete <name>')
  .description('Delete a flag')
  .option('-f, --file <path>', 'Manifest file', DEFAULT_FILE)
  .action((name, opts) => {
    const store = getStore(opts.file);
    if (store.removeFlag(name)) {
      store.save();
      console.log(chalk.green(`✓ Deleted: ${name}`));
    } else {
      console.log(chalk.red(`Flag '${name}' not found.`));
    }
  });

// Evaluate
program
  .command('eval <name>')
  .description('Evaluate a flag')
  .option('-f, --file <path>', 'Manifest file', DEFAULT_FILE)
  .option('-e, --env <environment>', 'Environment')
  .option('-u, --user <userId>', 'User ID')
  .option('-a, --attr <key=value>', 'Attribute (repeatable)', (val: string, prev: string[]) => {
    prev.push(val);
    return prev;
  }, [])
  .action((name, opts) => {
    const store = getStore(opts.file);
    const attributes: Record<string, any> = {};
    for (const attr of opts.attr) {
      const [k, v] = attr.split('=');
      attributes[k] = isNaN(Number(v)) ? v : Number(v);
    }
    const result = store.evaluate(name, {
      environment: opts.env,
      userId: opts.user,
      attributes: Object.keys(attributes).length ? attributes : undefined,
    });
    console.log(formatEvaluation(result));
  });

// Stats
program
  .command('stats')
  .description('Show flag statistics')
  .option('-f, --file <path>', 'Manifest file', DEFAULT_FILE)
  .action((opts) => {
    const store = getStore(opts.file);
    console.log(formatStats(store.getStats()));
  });

// Validate
program
  .command('validate')
  .description('Validate the manifest')
  .option('-f, --file <path>', 'Manifest file', DEFAULT_FILE)
  .action((opts) => {
    const store = getStore(opts.file);
    const errors = store.validate();
    console.log(formatValidationErrors(errors));
    if (errors.some(e => e.severity === 'error')) {
      process.exitCode = 1;
    }
  });

// Export
program
  .command('export')
  .description('Export flags to a format')
  .option('-f, --file <path>', 'Manifest file', DEFAULT_FILE)
  .option('--format <format>', 'Output format (yaml|json|env|csv)', 'yaml')
  .option('-e, --env <environment>', 'Environment for env export')
  .option('-o, --output <path>', 'Output file')
  .action((opts) => {
    const store = getStore(opts.file);
    const output = exportFlags(store.getManifest(), opts.format, {
      environment: opts.env,
    });
    if (opts.output) {
      fs.writeFileSync(opts.output, output);
      console.log(chalk.green(`✓ Exported to ${opts.output}`));
    } else {
      console.log(output);
    }
  });

// Diff
program
  .command('diff <file1> <file2>')
  .description('Compare two manifest files')
  .action((file1, file2) => {
    const store1 = getStore(file1);
    const store2 = getStore(file2);
    const diff = diffManifests(store1.getManifest(), store2.getManifest());
    console.log(formatDiff(diff));
  });

// Typegen
program
  .command('typegen')
  .description('Generate TypeScript type definitions')
  .option('-f, --file <path>', 'Manifest file', DEFAULT_FILE)
  .option('-o, --output <path>', 'Output file', 'flagops.d.ts')
  .action((opts) => {
    const store = getStore(opts.file);
    const types = generateTypeDefinition(store.getManifest());
    fs.writeFileSync(opts.output, types);
    console.log(chalk.green(`✓ Generated types: ${opts.output}`));
  });

// Info
program
  .command('info')
  .description('Show flagops and git info')
  .option('-f, --file <path>', 'Manifest file', DEFAULT_FILE)
  .action((opts) => {
    console.log(chalk.bold('flagops v1.0.0'));
    console.log(`  Manifest: ${opts.file}`);
    if (isGitRepo()) {
      const info = getGitInfo();
      if (info) {
        console.log(`  Branch: ${info.branch}`);
        console.log(`  Commit: ${info.commitHash}`);
        console.log(`  Author: ${info.author}`);
      }
    }
    try {
      const store = getStore(opts.file);
      const stats = store.getStats();
      console.log(`  Flags: ${stats.total} (${stats.active} active)`);
    } catch {
      console.log(`  Flags: (no manifest found)`);
    }
  });

program.parse();
