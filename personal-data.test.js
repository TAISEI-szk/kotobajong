const test = require('node:test');
const assert = require('node:assert/strict');
require('./core.js');
const personal = require('./personal-data.js');

function random(seed) {
  let state = seed;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

test('imports quoted CSV fields and selects distinct cards in every mode', () => {
  const records = ['entry_no,group_id,english,japanese,page,review_status'];
  for (let group = 1; group <= 60; group++) {
    for (let member = 1; member <= 3; member++) {
      const no = (group - 1) * 3 + member;
      records.push(`${no},${group},word${no},"訳${no}、意味",${group},checked`);
    }
  }
  const rows = personal.parseCsv('\uFEFF' + records.join('\r\n'));
  assert.equal(rows.length, 180);
  assert.equal(rows[0].japanese, '訳1、意味');
  for (const mode of ['translation', 'synonym', 'mix']) {
    const pairs = personal.buildPairs(rows, mode, 18, random(1));
    assert.equal(pairs.length, 18);
    const labels = pairs.flatMap(pair => pair.words);
    assert.equal(new Set(labels).size, 36);
    assert.equal(pairs.filter(pair => pair.type === 'translation').length, mode === 'mix' ? 9 : mode === 'translation' ? 18 : 0);
  }
  const first = personal.buildPairs(rows, 'mix', 18, random(1));
  const second = personal.buildPairs(rows, 'mix', 18, random(2));
  assert.notDeepEqual(first.map(pair => pair.id), second.map(pair => pair.id));
});

test('rejects a CSV without the required columns', () => {
  assert.throws(() => personal.parseCsv('english,japanese\nhello,こんにちは'), /entry_no/);
});
