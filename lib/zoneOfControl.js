"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zoneOfControl = void 0;
const Criterion_1 = require("@civ-clone/core-rule/Criterion");
const Or_1 = require("@civ-clone/core-rule/Criteria/Or");
// A criterion for a move action: a unit may not move from a tile next to a unit that exerts a zone of control over it to
// another tile next to one. Each exemption is its own criterion, tried in order (the movers', then the neighbour scan,
// then the moves'), and the first that holds allows the move without trying the rest. List the cheapest first.
const zoneOfControl = (unitRegistry, { exemptMovers, exerts, exemptMoves }) => new Or_1.default(...exemptMovers.map((exempt) => new Criterion_1.default(exempt)), new Criterion_1.default(
// Not next to a unit that exerts a zone of control both where it starts and where it ends.
(unit, to, from = unit.tile()) => !(from
    .getNeighbours()
    .some((tile) => unitRegistry
    .getByTile(tile)
    .some((tileUnit) => exerts(tileUnit, unit))) &&
    to
        .getNeighbours()
        .some((tile) => unitRegistry
        .getByTile(tile)
        .some((tileUnit) => exerts(tileUnit, unit))))), ...exemptMoves.map((exempt) => new Criterion_1.default(exempt)));
exports.zoneOfControl = zoneOfControl;
exports.default = exports.zoneOfControl;
//# sourceMappingURL=zoneOfControl.js.map