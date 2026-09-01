# Jaryan.Gen2 Release-1 Re-cut

Release identity: `JARYAN-RELEASE-1-RECUT-2026-09-01`

Status: provenance-valid re-cut release, identified by its immutable release
commit and annotated Git tag.

## Historical distinction

This is a re-cut release. It is not the historical `e810e41` release.

Historical release
`e810e41c1133a84eb07ff4f5c119cd93a9b32d92` remains unrecoverable from
available Git provenance. No historical Git object, branch, tag, or release
artifact is recreated or substituted here.

## Source and identity

- Continuation branch before re-cut: `master`
- Continuation anchor: `6ec78fd41f3a38e44045c4d5c8092afd6ea54b82`
- Release commit: the immutable commit targeted by the annotated
  `release-1-recut-2026-09-01` tag
- Release branch: `release/release-1-recut-2026-09-01`
- Package version: `0.1.0`

The release commit and annotated tag are the authoritative Git provenance for
this re-cut. The historical SHA is not an ancestor or identity of this
release.

## Validation evidence

The release source tree is required to pass:

```text
npm run typecheck
npm test
npm run build
git diff --check
```

The release does not authorize production activation. Production activation
remains a separate operational authorization gate, with the historical
activation handoff unavailable.
