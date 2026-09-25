# Template Source Authority Audit — 2026-09-25

## Invariant

A current `{templateKey}@{version}` has exactly one canonical package entrypoint. Internal package files are implementation details. Runtime/build roots may not reconstruct a current template through historical acceptance, fidelity, polish or prior-version chains.

Shared platform authorities remain shared: Runtime, Page Schema, Builder, cart, checkout, account/auth, search and commerce engines are not copied into template packages.

## Playroom

### Canonical runtime dependency

- `gaming.playroom@20`: `src/lib/builder/templates/gaming/playroom/v20/index.ts`
- Internal immutable snapshot: `src/lib/builder/templates/gaming/playroom/v20/canonical-package.json`
- The active catalog, Template Factory category foundation and preview theme resolve through that package authority.
- Preview design tokens are derived from the v20 Page Schema global-style metadata, not from the historical v1 source.

### Historical / migration / baseline boundary

The following families are not current runtime authorities and must not be reachable from active runtime/build roots:

- `playroom.ts`
- `playroom-reference-v2*.ts`
- `playroom-v18.ts`
- `playroom-v19-base.ts`
- `playroom-v19-reference-archetypes.ts`
- `playroom-v19-canonical.ts`
- `playroom-reference-v2-fidelity-*.ts`
- `playroom-reference-v2-desktop-polish*.ts`
- `playroom-wave38-acceptance.ts`

They are retained only while historical upgrade, migration or regression tests still require them. Their presence in Git is not permission for runtime import. Later Surface Reduction may move/delete them only after the dependent proofs are replaced.

## Loot Vault

- `gaming.loot-vault@1` remains the existing catalog/runtime authority in `src/lib/builder/templates/loot-vault.ts`.
- `loot-vault-wave39-acceptance.ts` is acceptance evidence only and must never assemble the runtime template.
- `gaming.loot-vault@2` is a separate Template Factory candidate identity. Its recovery must produce one canonical v2 package entrypoint and keep pages/media/recipe internals private to that package.
- v1 and v2 are not duplicate authorities because they are different versions/lifecycles; duplicate authority is evaluated per `{templateKey}@{version}`.

## Deterministic enforcement

The existing Architecture Health authority now:

1. discovers versioned canonical package entrypoints under `src/lib/builder/templates/**/v*/index.ts`;
2. derives identity from each package's canonical snapshot manifest;
3. blocks duplicate entrypoints for the same `{templateKey}@{version}`;
4. blocks imports that bypass the package entrypoint and deep-import package internals;
5. traces active runtime/build roots and blocks reachability into flat historical files for a managed template;
6. blocks active reachability through acceptance/fidelity/polish chains.

This is part of the existing Architecture Health decision and does not create a parallel gate or registry.
