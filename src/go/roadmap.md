# Roadmap

This roadmap communicates **direction**, not guarantees. Dates are intentionally
omitted; items move as we learn.  

For issue-level tracking and discussions, see the GitHub [repo](https://github.com/mikros-dev/mikros)

## Near-term (stability and ergonomics)

- **Docs parity & polish**: refine Go pages (features, new service type, testing) as API stabilizes.
- **Example curation**: consolidate examples in repo; keep one example per concept with READMEs.
- **Testing ergonomics**: small helpers for common JSON assertions and error envelopes.
- **Feature config validation**: clearer error messages and defaults for common built-ins.

## Mid-term (capabilities)

- **More built-in features** (candidate list): tracing presets, metrics presets, rate limiting, auth hooks.
- **Observability pass**: structured fields alignment across logger/errors; guidance for correlation IDs.

## Longer-term (architecture)

- **Cross-language parity**: ensure Go/Rust feature and lifecycle semantics match where practical.
- **Generator ergonomics**: optional scaffolding for new services/features (create + wire + tests).

## Deprecations and breaking changes

- SemVer for the module.
- Document breaking changes in the code.
- Mark deprecated APIs as `Deprecated`

## How to propose changes

Open a GitHub issue with the label `proposal` and include:

1. **Problem statement** (what hurts today)
2. **Proposed change** (API or behavior)
3. **Impact** (who benefits, migration risk)
4. **Alternatives** considered

We iterate in public; meaningful proposals are welcomed.
