import { UnitRegistry } from '@civ-clone/core-unit/UnitRegistry';
import Criterion from '@civ-clone/core-rule/Criterion';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
export type Exemption = (mover: Unit, to: Tile, from: Tile) => boolean;
export type Exerts = (other: Unit, mover: Unit) => boolean;
export interface ZoneOfControlOptions {
  exemptMovers: Exemption[];
  exerts: Exerts;
  exemptMoves: Exemption[];
}
export declare const zoneOfControl: (
  unitRegistry: UnitRegistry,
  { exemptMovers, exerts, exemptMoves }: ZoneOfControlOptions
) => Criterion;
export default zoneOfControl;
