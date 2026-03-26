# Changelog

## [1.2.0] - 2026-03-26 (Cycle 2)
### Added
- Context provider with layered overrides and priority merging
- Bulk operations: enable, disable, archive, tag, delete multiple flags
- Flag scheduler for timed activations/deactivations
- Manifest comparator with sync plan generation
- File watcher for real-time flag change detection
- Middleware pipeline for evaluation interceptors
- Built-in logging, override, and tracking middleware
- Comprehensive formatter and git utility tests

## [1.1.0] - 2026-03-26 (Cycle 1)
### Added
- Manifest migration and versioning support
- Flag dependency tracking with circular dependency detection
- Flag templates: kill-switch, gradual-rollout, A/B test, environment-gate, temporary, config-value
- Advanced search with fuzzy matching and relevance scoring
- Tag and owner indexing with groupBy utility
- Multi-file flag discovery with duplicate detection
- Snapshot capture, comparison, and restore
- Flag analytics with evaluation tracking and metrics
- Flag guard: code usage scanning, orphan/undefined flag detection
- Flag linter with 9 builtin hygiene rules

## [1.0.0] - 2026-03-26
### Added
- Initial release
- Core flag evaluation engine with boolean, string, number, multivariate types
- YAML/JSON parsing and serialization
- CLI with full CRUD operations
- SDK client with caching and auto-refresh
- Targeting rules (eq, neq, in, nin, gt, lt, gte, lte, contains, matches)
- Percentage-based rollouts with deterministic hashing
- Environment-specific overrides
- Manifest diffing engine
- Multi-format export (YAML, JSON, ENV, CSV)
- TypeScript type generation
- Lifecycle hooks system
- Git integration utilities
