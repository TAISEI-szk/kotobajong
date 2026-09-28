(function (root) {
  'use strict';

  function makePositions(columns = 6) {
    if (columns !== 4 && columns !== 6) throw new Error('対応していない盤面幅です');
    const positions = [];
    const add = (row, col, layer) => positions.push({ id: positions.length, row, col, layer });
    const rows = columns === 4 ? 6 : 4;
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) add(row, col, 0);
    const middleRows = columns === 4 ? [2, 3] : [1, 2];
    const middleCols = columns === 4 ? [0, 1, 2, 3] : [1, 2, 3, 4];
    for (const row of middleRows) for (const col of middleCols) add(row, col, 1);
    const topCols = columns === 4 ? [1, 2] : [2, 3];
    for (const row of middleRows) for (const col of topCols) add(row, col, 2);
    return positions;
  }
  const POSITIONS = makePositions(6);

  function shuffle(items, random = Math.random) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function isFree(position, occupied, positions = POSITIONS) {
    if (!occupied.has(position.id)) return false;
    const above = positions.some(p => p.layer > position.layer && p.row === position.row && p.col === position.col && occupied.has(p.id));
    if (above) return false;
    const left = positions.some(p => p.layer === position.layer && p.row === position.row && p.col === position.col - 1 && occupied.has(p.id));
    const right = positions.some(p => p.layer === position.layer && p.row === position.row && p.col === position.col + 1 && occupied.has(p.id));
    return !left || !right;
  }

  function removalOrder(occupiedIds, random = Math.random, positions = POSITIONS) {
    const occupied = new Set(occupiedIds);
    const failed = new Set();
    function search() {
      if (!occupied.size) return [];
      const key = [...occupied].sort((a, b) => a - b).join(',');
      if (failed.has(key)) return null;
      const choices = shuffle(positions.filter(p => isFree(p, occupied, positions)), random);
      for (let i = 0; i < choices.length; i++) for (let j = i + 1; j < choices.length; j++) {
        const a = choices[i].id, b = choices[j].id;
        occupied.delete(a); occupied.delete(b);
        const rest = search();
        occupied.add(a); occupied.add(b);
        if (rest) return [[a, b], ...rest];
      }
      failed.add(key);
      return null;
    }
    const result = search();
    if (!result) throw new Error('この盤面はペアに分割できません');
    return result;
  }

  function deal(occupiedIds, pairs, random = Math.random, positions = POSITIONS) {
    if (occupiedIds.length !== pairs.length * 2) throw new Error('カード数とペア数が一致しません');
    const slots = removalOrder(occupiedIds, random, positions);
    const shuffledPairs = shuffle(pairs, random);
    const assignments = new Map();
    slots.forEach((slot, index) => {
      const pair = shuffledPairs[index];
      const sides = shuffle([0, 1], random);
      slot.forEach((tileId, sideIndex) => assignments.set(tileId, { pair, side: sides[sideIndex] }));
    });
    return assignments;
  }

  function legalPairs(tiles, positions = POSITIONS) {
    const occupied = new Set(tiles.filter(t => !t.removed).map(t => t.id));
    const free = tiles.filter(t => isFree(t, occupied, positions));
    const result = [];
    for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) {
      if (free[i].pair.id === free[j].pair.id) result.push([free[i], free[j]]);
    }
    return result;
  }

  const api = { POSITIONS, makePositions, shuffle, isFree, removalOrder, deal, legalPairs };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KotobaCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
