const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('./core.js');

test('only an uncovered tile with an open side is selectable', () => {
  const all = new Set(core.POSITIONS.map(p => p.id));
  const baseCorner = core.POSITIONS.find(p => p.layer === 0 && p.row === 0 && p.col === 0);
  const baseMiddle = core.POSITIONS.find(p => p.layer === 0 && p.row === 0 && p.col === 2);
  const covered = core.POSITIONS.find(p => p.layer === 0 && p.row === 1 && p.col === 2);
  assert.equal(core.isFree(baseCorner, all), true);
  assert.equal(core.isFree(baseMiddle, all), false);
  assert.equal(core.isFree(covered, all), false);
  all.delete(core.POSITIONS.find(p => p.layer === 0 && p.row === 0 && p.col === 1).id);
  assert.equal(core.isFree(baseMiddle, all), true);
});

test('generated boards have a complete playable solution', () => {
  for (const columns of [4, 6]) {
    const positions = core.makePositions(columns);
    assert.equal(positions.length, 36);
    for (let trial = 0; trial < 200; trial++) {
      const pairs = Array.from({ length: positions.length / 2 }, (_, id) => ({ id }));
      const assignments = core.deal(positions.map(p => p.id), pairs, Math.random, positions);
      const tiles = positions.map(p => ({ ...p, ...assignments.get(p.id), removed: false }));
      for (let remaining = pairs.length; remaining > 0; remaining--) {
        const move = core.legalPairs(tiles, positions)[0];
        assert.ok(move, `${columns} columns: no move with ${remaining} pairs remaining`);
        move.forEach(tile => { tile.removed = true; });
      }
      assert.equal(core.legalPairs(tiles, positions).length, 0);
    }
  }
});
