# base-zone-of-control

A zone of control for a ruleset's move actions:

- `lib/zoneOfControl`: `zoneOfControl(unitRegistry, { exemptMovers, exerts, exemptMoves })` is a criterion that stops a
  unit moving from a tile next to a unit that exerts a zone of control over it to another tile next to one.
  `exerts(other, mover)` says whether a unit on a neighbouring tile holds the mover back. `exemptMovers` (movers it
  never applies to) and `exemptMoves` (moves that are always allowed) are lists of `(mover, to, from)` predicates.
  The result is a single `Or`: each mover exemption first, then the neighbour scan, then each exempt move, each its own
  criterion, tried in that order until one holds. The neighbour scan defaults `from` to the mover's tile; the
  exemptions get `from` exactly as the action criterion was given it.

A library: it has no `main` and registers no rules. See `civ1-unit` for Civilization's zone of control.
