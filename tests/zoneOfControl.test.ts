import { Exemption, zoneOfControl } from '../lib/zoneOfControl';
import Criterion from '@civ-clone/core-rule/Criterion';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import UnitRegistry from '@civ-clone/core-unit/UnitRegistry';
import { expect } from 'chai';

describe('zoneOfControl', (): void => {
  // Stand-in tiles, units and registry: the criterion only asks a tile for its neighbours, a unit for its tile, and the
  // registry for the units on a tile. Each tile records the order its neighbours are asked for in.
  type StandInTile = Tile & { name: string };
  type StandInUnit = Unit & { name: string };

  const setUp = () => {
    const asked: string[] = [],
      neighbours = new Map<StandInTile, StandInTile[]>(),
      units = new Map<StandInTile, StandInUnit[]>(),
      tile = (name: string): StandInTile => {
        const tile = {
          name,
          getNeighbours: (): StandInTile[] => {
            asked.push(name);

            return neighbours.get(tile) ?? [];
          },
        } as unknown as StandInTile;

        return tile;
      },
      // `from` and `to` are neighbours, each with two tiles of its own.
      from = tile('from'),
      to = tile('to'),
      nearFrom = tile('nearFrom'),
      nearTo = tile('nearTo'),
      nearBoth = tile('nearBoth'),
      unit = (name: string, on: StandInTile): StandInUnit => {
        const unit = { name, tile: (): Tile => on } as unknown as StandInUnit;

        units.set(on, [...(units.get(on) ?? []), unit]);

        return unit;
      },
      unitRegistry = {
        getByTile: (tile: StandInTile): Unit[] => units.get(tile) ?? [],
      } as unknown as UnitRegistry;

    neighbours.set(from, [to, nearFrom, nearBoth]);
    neighbours.set(to, [from, nearTo, nearBoth]);

    return { asked, from, to, nearFrom, nearTo, nearBoth, unit, unitRegistry };
  };

  // Exerted by every unit named `holds...`.
  const exertsByName = (other: Unit): boolean =>
    (other as StandInUnit).name.startsWith('holds');

  it('should stop a move from a tile next to an exerting unit to another tile next to one', (): void => {
    const { from, to, nearFrom, nearTo, unit, unitRegistry } = setUp(),
      mover = unit('mover', from);

    unit('holdsFrom', nearFrom);
    unit('holdsTo', nearTo);

    const criterion = zoneOfControl(unitRegistry, {
      exemptMovers: [],
      exerts: exertsByName,
      exemptMoves: [],
    });

    expect(criterion.validate(mover, to, from)).false;
  });

  it('should allow a move when only one end is next to an exerting unit', (): void => {
    const { from, to, nearFrom, nearTo, unit, unitRegistry } = setUp(),
      mover = unit('mover', from),
      criterion = zoneOfControl(unitRegistry, {
        exemptMovers: [],
        exerts: exertsByName,
        exemptMoves: [],
      });

    unit('holdsFrom', nearFrom);

    expect(criterion.validate(mover, to, from)).true;

    const {
      from: from2,
      to: to2,
      unit: unit2,
      unitRegistry: registry2,
    } = setUp();

    unit2('holdsTo', nearTo);

    expect(
      zoneOfControl(registry2, {
        exemptMovers: [],
        exerts: exertsByName,
        exemptMoves: [],
      }).validate(unit2('mover', from2), to2, from2)
    ).true;
  });

  it('should count one unit next to both ends against both', (): void => {
    const { from, to, nearBoth, unit, unitRegistry } = setUp(),
      mover = unit('mover', from);

    unit('holdsBoth', nearBoth);

    expect(
      zoneOfControl(unitRegistry, {
        exemptMovers: [],
        exerts: exertsByName,
        exemptMoves: [],
      }).validate(mover, to, from)
    ).false;
  });

  it('should ask `exerts` about each neighbouring unit and the mover', (): void => {
    const { from, to, nearFrom, nearTo, unit, unitRegistry } = setUp(),
      mover = unit('mover', from),
      asked: [string, string][] = [];

    unit('ignored', nearFrom);
    unit('holdsFrom', nearFrom);
    unit('holdsTo', nearTo);

    expect(
      zoneOfControl(unitRegistry, {
        exemptMovers: [],
        exerts: (other: Unit, about: Unit): boolean => {
          asked.push([
            (other as StandInUnit).name,
            (about as StandInUnit).name,
          ]);

          return exertsByName(other);
        },
        exemptMoves: [],
      }).validate(mover, to, from)
    ).false;

    // `from`'s neighbours first, stopping at the first unit that exerts; then `to`'s, where `from` holds the mover.
    expect(asked).eql([
      ['ignored', 'mover'],
      ['holdsFrom', 'mover'],
      ['mover', 'mover'],
      ['holdsTo', 'mover'],
    ]);
  });

  it('should scan `from` first, and not scan `to` when nothing exerts next to `from`', (): void => {
    const { asked, from, to, nearTo, unit, unitRegistry } = setUp(),
      mover = unit('mover', from);

    unit('holdsTo', nearTo);

    expect(
      zoneOfControl(unitRegistry, {
        exemptMovers: [],
        exerts: exertsByName,
        exemptMoves: [],
      }).validate(mover, to, from)
    ).true;
    expect(asked).eql(['from']);
  });

  it("should scan the mover's own tile when no `from` is given", (): void => {
    const { asked, from, to, nearFrom, nearTo, unit, unitRegistry } = setUp(),
      mover = unit('mover', from);

    unit('holdsFrom', nearFrom);
    unit('holdsTo', nearTo);

    expect(
      zoneOfControl(unitRegistry, {
        exemptMovers: [],
        exerts: exertsByName,
        exemptMoves: [],
      }).validate(mover, to)
    ).false;
    expect(asked).eql(['from', 'to']);
  });

  it('should pass each exemption exactly the arguments it was given, with no default `from`', (): void => {
    const { from, to, nearBoth, unit, unitRegistry } = setUp(),
      mover = unit('mover', from),
      given: any[][] = [],
      recording =
        (): Exemption =>
        (...args: any[]): boolean => {
          given.push(args);

          return false;
        };

    unit('holdsBoth', nearBoth);

    const criterion = zoneOfControl(unitRegistry, {
      exemptMovers: [recording()],
      exerts: exertsByName,
      exemptMoves: [recording()],
    });

    criterion.validate(mover, to);
    criterion.validate(mover, to, from);

    expect(given).eql([
      [mover, to],
      [mover, to],
      [mover, to, from],
      [mover, to, from],
    ]);
  });

  it('should try the exemptions in order, the scan between them, and stop at the first that holds', (): void => {
    const { from, to, nearFrom, nearTo, unit, unitRegistry } = setUp(),
      mover = unit('mover', from),
      called: string[] = [],
      exemption =
        (name: string, holds: () => boolean): Exemption =>
        (): boolean => {
          called.push(name);

          return holds();
        };

    unit('holdsFrom', nearFrom);
    unit('holdsTo', nearTo);

    let holding = '';

    const criterion = zoneOfControl(unitRegistry, {
      exemptMovers: [
        exemption('mover1', () => holding === 'mover1'),
        exemption('mover2', () => holding === 'mover2'),
      ],
      exerts: (other: Unit): boolean => {
        called.push('exerts');

        return holding !== 'scan' && exertsByName(other);
      },
      exemptMoves: [
        exemption('move1', () => holding === 'move1'),
        exemption('move2', () => holding === 'move2'),
      ],
    });

    const run = (holds: string): [boolean, string[]] => {
      holding = holds;
      called.length = 0;

      const result = criterion.validate(mover, to, from);

      return [result, called.filter((name) => name !== 'exerts')];
    };

    expect(run('mover1')).eql([true, ['mover1']]);
    expect(run('mover2')).eql([true, ['mover1', 'mover2']]);
    expect(run('scan')).eql([true, ['mover1', 'mover2']]);
    expect(called).includes('exerts');
    expect(run('move1')).eql([true, ['mover1', 'mover2', 'move1']]);
    expect(run('move2')).eql([true, ['mover1', 'mover2', 'move1', 'move2']]);
    expect(run('none')).eql([false, ['mover1', 'mover2', 'move1', 'move2']]);
  });

  it('should be one criterion per exemption, plus one for the scan', (): void => {
    const { from, to, nearFrom, nearTo, unit, unitRegistry } = setUp(),
      mover = unit('mover', from),
      validate = Criterion.prototype.validate;

    unit('holdsFrom', nearFrom);
    unit('holdsTo', nearTo);

    const counts: number[] = [];

    for (const exemptions of [0, 1, 2]) {
      let count = 0;

      Criterion.prototype.validate = function (
        this: Criterion,
        ...args: any[]
      ): boolean {
        count++;

        return validate.apply(this, args);
      };

      try {
        zoneOfControl(unitRegistry, {
          exemptMovers: Array(exemptions).fill((): boolean => false),
          exerts: exertsByName,
          exemptMoves: Array(exemptions).fill((): boolean => false),
        }).validate(mover, to, from);
      } finally {
        Criterion.prototype.validate = validate;
      }

      counts.push(count);
    }

    expect(counts).eql([1, 3, 5]);
  });
});
