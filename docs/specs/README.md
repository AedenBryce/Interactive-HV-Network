# Implementation specifications

## Interactive HV Network

- Published specification: [GitHub issue #1](https://github.com/AedenBryce/Interactive-HV-Network/issues/1).
- Local specification: [Interactive HV Network](interactive-hv-network.md).
- Label: `ready-for-agent`.
- Testing boundary approved and specification published on 22 October 2026.
- Implementation backlog: [25 published tickets](../tickets/README.md), GitHub issues #2-#26, with 68 verified native blocking relationships.
- Next flow: `implement` for [issue #2](https://github.com/AedenBryce/Interactive-HV-Network/issues/2), the first unblocked ticket.

The implementation specification retains unresolved network facts as review dependencies. Publication is not model acceptance.

### Follow-on feature

- Switching program capture and Word generation: [specification issue #29](https://github.com/AedenBryce/Interactive-HV-Network/issues/29) and [local specification](switching-program-generation.md).
- This is a feature-specific follow-on to #1; it does not modify #1 or the accepted electrical model and authored layout.
- The owner approved the workflow boundary and current sequence rules on 6 November 2026. Asset voltage/location source review remains to be completed before values are finalized.
- Implementation tickets: [#30 asset metadata](https://github.com/AedenBryce/Interactive-HV-Network/issues/30) and [#31 action capture](https://github.com/AedenBryce/Interactive-HV-Network/issues/31) can start independently; [#32 Word generation](https://github.com/AedenBryce/Interactive-HV-Network/issues/32) is blocked by #30 and #31; [#33 earth-close checks](https://github.com/AedenBryce/Interactive-HV-Network/issues/33) is blocked by #32. Blockers are recorded in ticket bodies because no native issue-dependency writer is available in the connected GitHub tools.
