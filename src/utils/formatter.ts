/**
 * Output formatting utilities
 */
import chalk from 'chalk';
import { FlagDefinition, EvaluationResult, FlagStats, ValidationError } from '../core/types';

/**
 * Format a flag for display
 */
export function formatFlag(flag: FlagDefinition, verbose: boolean = false): string {
  const statusIcon = getStatusIcon(flag.status);
  const typeLabel = chalk.gray(`[${flag.type}]`);
  const name = chalk.bold(flag.name);
  const desc = flag.description ? chalk.gray(` — ${flag.description}`) : '';

  let output = `${statusIcon} ${name} ${typeLabel}${desc}`;

  if (verbose) {
    output += `\n   Default: ${chalk.cyan(String(flag.defaultValue))}`;
    if (flag.owner) output += `\n   Owner: ${chalk.yellow(flag.owner)}`;
    if (flag.tags?.length) output += `\n   Tags: ${flag.tags.map(t => chalk.magenta(t)).join(', ')}`;
    if (flag.environments?.length) {
      output += `\n   Environments: ${flag.environments.map(e =>
        `${e.name}(${e.enabled ? chalk.green('on') : chalk.red('off')})`
      ).join(', ')}`;
    }
    if (flag.rollout) {
      output += `\n   Rollout: ${chalk.cyan(`${flag.rollout.percentage}%`)}`;
    }
    if (flag.expiresAt) output += `\n   Expires: ${chalk.yellow(flag.expiresAt)}`;
    output += `\n   Created: ${chalk.gray(flag.createdAt)}`;
    output += `\n   Updated: ${chalk.gray(flag.updatedAt)}`;
  }

  return output;
}

/**
 * Format flag list as table
 */
export function formatFlagTable(flags: FlagDefinition[]): string {
  if (flags.length === 0) return chalk.gray('No flags found.');

  const header = `${pad('Name', 30)} ${pad('Status', 10)} ${pad('Type', 12)} ${pad('Default', 15)} ${pad('Tags', 20)}`;
  const separator = '-'.repeat(90);

  const rows = flags.map(f => {
    const status = colorStatus(f.status);
    const tags = f.tags?.join(', ') || '';
    return `${pad(f.name, 30)} ${pad(status, 10)} ${pad(f.type, 12)} ${pad(String(f.defaultValue), 15)} ${pad(tags, 20)}`;
  });

  return [chalk.bold(header), separator, ...rows].join('\n');
}

/**
 * Format evaluation result
 */
export function formatEvaluation(result: EvaluationResult): string {
  const icon = result.value === true ? chalk.green('✓') : result.value === false ? chalk.red('✗') : chalk.cyan('→');
  return `${icon} ${chalk.bold(result.flagName)}: ${chalk.cyan(String(result.value))} (${chalk.gray(result.reason)})`;
}

/**
 * Format stats
 */
export function formatStats(stats: FlagStats): string {
  const lines = [
    chalk.bold('Flag Statistics'),
    `  Total: ${chalk.cyan(String(stats.total))}`,
    `  Active: ${chalk.green(String(stats.active))}`,
    `  Inactive: ${chalk.yellow(String(stats.inactive))}`,
    `  Archived: ${chalk.gray(String(stats.archived))}`,
    `  Expired: ${chalk.red(String(stats.expired))}`,
  ];

  if (Object.keys(stats.byType).length) {
    lines.push('', chalk.bold('  By Type:'));
    for (const [type, count] of Object.entries(stats.byType)) {
      lines.push(`    ${type}: ${count}`);
    }
  }

  if (Object.keys(stats.byTag).length) {
    lines.push('', chalk.bold('  By Tag:'));
    for (const [tag, count] of Object.entries(stats.byTag)) {
      lines.push(`    ${chalk.magenta(tag)}: ${count}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format validation errors
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return chalk.green('✓ No validation issues found.');

  return errors.map(e => {
    const icon = e.severity === 'error' ? chalk.red('✗') : chalk.yellow('⚠');
    return `${icon} ${chalk.bold(e.field)}: ${e.message}`;
  }).join('\n');
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'active': return chalk.green('●');
    case 'inactive': return chalk.yellow('○');
    case 'archived': return chalk.gray('◌');
    default: return chalk.gray('?');
  }
}

function colorStatus(status: string): string {
  switch (status) {
    case 'active': return chalk.green(status);
    case 'inactive': return chalk.yellow(status);
    case 'archived': return chalk.gray(status);
    default: return status;
  }
}

function pad(str: string, len: number): string {
  // Strip ANSI codes for length calculation
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, '');
  const padding = Math.max(0, len - stripped.length);
  return str + ' '.repeat(padding);
}
