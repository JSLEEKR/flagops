<div align="center">

# 🚩 flagops

### Git-native feature flags with zero infrastructure

[![GitHub Stars](https://img.shields.io/github/stars/JSLEEKR/flagops?style=for-the-badge&logo=github&color=yellow)](https://github.com/JSLEEKR/flagops/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-373%20passing-brightgreen?style=for-the-badge)](#)

<br/>

**No servers. No databases. No third-party services. Just YAML files under version control.**

</div>

---

## Why This Exists

Every feature flag SaaS adds a runtime dependency to your stack -- a network call on every flag evaluation, a vendor contract, and an audit trail that lives outside your codebase. When the service is down, your flags are unreachable. When you leave the vendor, you lose your history.

`flagops` stores feature flags as YAML files that live in your git repository. Evaluation is local and instant. The audit trail is `git log`. Rollback is `git revert`. Zero infrastructure, zero cost, zero vendor lock-in.

- **~0ms evaluation** -- flags are local files, not network requests
- **Git is the audit trail** -- every flag change has an author, a timestamp, and a diff in your pull request history
- **Targeting and rollouts included** -- percentage-based rollouts, user attribute rules, and per-environment overrides with no external service needed

## Why flagops?

| Traditional Feature Flags | flagops |
|---------------------------|---------|
| SaaS dependency ($$$) | Zero cost, self-hosted |
| Network latency on eval | Local file evaluation (~0ms) |
| Vendor lock-in | Git-native, portable |
| Complex setup | `npm install -g flagops && flagops init` |
| Opaque audit trail | Git history IS your audit trail |

## Quick Start

```bash
# Install
npm install -g flagops

# Initialize in your project
flagops init

# Create a flag
flagops create dark-mode --description "Dark theme toggle" --tags ui,frontend

# Enable it
flagops enable dark-mode

# Evaluate
flagops eval dark-mode
# => dark-mode: true (default)

# Use in code
```

## SDK Usage

```typescript
import { createClient } from 'flagops';

const client = createClient({ filePath: '.flagops.yml' });

// Simple boolean check
if (client.isEnabled('dark-mode')) {
  enableDarkTheme();
}

// Typed values
const limit = client.getValue<number>('api-rate-limit');

// With context (environment, user targeting)
const result = client.evaluate('premium-feature', {
  environment: 'production',
  userId: 'user-123',
  attributes: { plan: 'pro', country: 'US' },
});

// Auto-refresh from file changes
client.startAutoRefresh(30000); // 30s interval
```

## Flag Definition (YAML)

```yaml
version: "1.0"
namespace: myapp
flags:
  - name: dark-mode
    description: "Dark theme toggle"
    status: active
    type: boolean
    defaultValue: true
    tags: [ui, frontend]
    owner: design-team

  - name: api-rate-limit
    description: "API rate limit per minute"
    status: active
    type: number
    defaultValue: 100
    environments:
      - name: production
        enabled: true
        value: 1000
      - name: staging
        enabled: true
        value: 50

  - name: beta-feature
    description: "Gradual rollout of beta feature"
    status: active
    type: boolean
    defaultValue: false
    rollout:
      percentage: 25
      seed: beta-v2
    rules:
      - attribute: plan
        operator: in
        value: [pro, enterprise]
    expiresAt: "2026-06-01T00:00:00Z"
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `flagops init` | Initialize manifest file |
| `flagops create <name>` | Create a new flag |
| `flagops list` | List all flags (table view) |
| `flagops list -v` | Verbose list with details |
| `flagops enable <name>` | Enable a flag |
| `flagops disable <name>` | Disable a flag |
| `flagops toggle <name>` | Toggle flag status |
| `flagops delete <name>` | Delete a flag |
| `flagops eval <name>` | Evaluate a flag |
| `flagops stats` | Show flag statistics |
| `flagops validate` | Validate manifest |
| `flagops export --format env` | Export as .env file |
| `flagops export --format csv` | Export as CSV |
| `flagops diff file1 file2` | Compare two manifests |
| `flagops typegen` | Generate TypeScript types |
| `flagops info` | Show project info |

## Advanced Features

### Targeting Rules

Evaluate flags based on user attributes:

```typescript
const result = client.evaluate('premium-feature', {
  attributes: {
    country: 'US',
    plan: 'enterprise',
    age: 25,
  },
});
```

Supported operators: `eq`, `neq`, `in`, `nin`, `gt`, `lt`, `gte`, `lte`, `contains`, `matches`

### Percentage Rollouts

Gradually roll out features with deterministic bucketing:

```yaml
rollout:
  percentage: 10    # 10% of users
  seed: experiment  # deterministic hash seed
```

### Environment Overrides

Different values per environment:

```yaml
environments:
  - name: production
    enabled: true
    value: 1000
  - name: staging
    enabled: true
    value: 50
  - name: development
    enabled: false
```

### Export Formats

```bash
# Environment variables
flagops export --format env --env production

# CSV for spreadsheets
flagops export --format csv

# TypeScript type safety
flagops typegen --output src/flags.d.ts
```

### Manifest Diffing

Compare flag configurations across branches or files:

```bash
flagops diff .flagops.yml .flagops.production.yml
```

### Lifecycle Hooks

```typescript
import { LifecycleHooks } from 'flagops';

const hooks = new LifecycleHooks();
hooks.on('flag:evaluated', ({ result, flag }) => {
  analytics.track('flag_evaluated', {
    flag: result.flagName,
    value: result.value,
  });
});
```

### Middleware Pipeline

```typescript
import { MiddlewarePipeline, createLoggingMiddleware } from 'flagops';

const pipeline = new MiddlewarePipeline();
pipeline.use('logger', createLoggingMiddleware());
pipeline.use('override', createOverrideMiddleware(new Map([['beta', true]])));
```

### Flag Templates

```typescript
import { createFromTemplate } from 'flagops';

const killSwitch = createFromTemplate('kill-switch', 'api-kill');
const rollout = createFromTemplate('gradual-rollout', 'new-ui', { percentage: 25 });
const abTest = createFromTemplate('ab-test', 'cta-experiment');
```

### Flag Linter

```bash
flagops validate  # Checks naming, descriptions, owners, expiry, rollout validity
```

### Bulk Operations

```typescript
import { bulkEnable, bulkAddTag } from 'flagops';

bulkEnable(flags, ['feature-a', 'feature-b', 'feature-c']);
bulkAddTag(flags, ['feature-a', 'feature-b'], 'release-v2');
```

### Flag Scheduling

```typescript
import { FlagScheduler } from 'flagops';

const scheduler = new FlagScheduler();
scheduler.schedule({
  flagName: 'holiday-banner',
  action: 'enable',
  scheduledAt: '2026-12-24T00:00:00Z',
});
scheduler.executeDue(flags);
```

## Architecture

```
src/
  core/
    types.ts         — Type definitions
    parser.ts        — YAML/JSON parsing & validation
    evaluator.ts     — Flag evaluation engine
    store.ts         — Flag CRUD & persistence
    exporter.ts      — Multi-format export (env, csv, types)
    diff.ts          — Manifest comparison engine
    migration.ts     — Manifest versioning & migration
    dependencies.ts  — Flag dependency tracking
    templates.ts     — Builtin flag templates
    search.ts        — Advanced search & indexing
    discovery.ts     — Multi-file flag discovery
    snapshot.ts      — State snapshot & restore
    analytics.ts     — Evaluation metrics
    guard.ts         — Code usage scanning
    linter.ts        — Flag hygiene rules
    bulk.ts          — Bulk operations
    scheduling.ts    — Timed activations
    comparator.ts    — Cross-manifest comparison
  rules/
    engine.ts      — Advanced rule engine (composite AND/OR)
  hooks/
    lifecycle.ts   — Event hooks for flag lifecycle
  sdk/
    client.ts      — Runtime SDK client with caching
    provider.ts    — Context provider with layered overrides
    watcher.ts     — File change detection
    middleware.ts  — Evaluation pipeline interceptors
  utils/
    hash.ts        — Deterministic hashing for rollouts
    git.ts         — Git integration utilities
    formatter.ts   — CLI output formatting
  cli/
    index.ts       — CLI entry point
```

## Git-Native Philosophy

flagops embraces git as the source of truth:

- **Version control** — Flag changes are commits. Branch for experiments. Merge to deploy.
- **Code review** — Flag changes go through PR review like any code change.
- **Audit trail** — `git log .flagops.yml` shows every flag change with author & timestamp.
- **Rollback** — `git revert` to undo flag changes instantly.
- **Branch isolation** — Different flag states per branch. No environment conflicts.

## License

MIT
