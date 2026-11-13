import { UnitRegistry } from '@civ-clone/core-unit/UnitRegistry';
import Criterion from '@civ-clone/core-rule/Criterion';
import Or from '@civ-clone/core-rule/Criteria/Or';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';

// Each is called exactly as an action criterion is, `(unit, to, from)`, with whatever `from` the caller passed: a
// predicate that reads `from` gives it its own default if it wants one.
export type Exemption = (mover: Unit, to: Tile, from: Tile) => boolean;
export type Exerts = (other: Unit, mover: Unit) => boolean;

export interface ZoneOfControlOptions {
  // Movers a zone of control never holds back, such as units of a domain it doesn't apply to, or units that ignore it.
  exemptMovers: Exemption[];
  // Whether `other`, a unit on a tile neighbouring the move, holds `mover` back.
  exerts: Exerts;
  // Moves that are always allowed, such as onto a tile the mover's player already holds.
  exemptMoves: Exemption[];
}

// A criterion for a move action: a unit may not move from a tile next to a unit that exerts a zone of control over it to
// another tile next to one. Each exemption is its own criterion, tried in order (the movers', then the neighbour scan,
// then the moves'), and the first that holds allows the move without trying the rest. List the cheapest first.
export const zoneOfControl = (
  unitRegistry: UnitRegistry,
  { exemptMovers, exerts, exemptMoves }: ZoneOfControlOptions
): Criterion =>
  new Or(
    ...exemptMovers.map((exempt) => new Criterion(exempt)),
    new Criterion(
      // Not next to a unit that exerts a zone of control both where it starts and where it ends.
      (unit: Unit, to: Tile, from: Tile = unit.tile()): boolean =>
        !(
          from
            .getNeighbours()
            .some((tile: Tile) =>
              unitRegistry
                .getByTile(tile)
                .some((tileUnit: Unit): boolean => exerts(tileUnit, unit))
            ) &&
          to
            .getNeighbours()
            .some((tile: Tile) =>
              unitRegistry
                .getByTile(tile)
                .some((tileUnit: Unit): boolean => exerts(tileUnit, unit))
            )
        )
    ),
    ...exemptMoves.map((exempt) => new Criterion(exempt))
  );

export default zoneOfControl;
