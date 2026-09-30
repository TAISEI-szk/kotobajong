(function (root) {
  'use strict';

  const MAX_ENGLISH = 18;
  const MAX_JAPANESE = 12;

  function parseCsv(text) {
    if (typeof text !== 'string') throw new Error('CSVを読み込めませんでした');
    const input = text.replace(/^\uFEFF/, '');
    const records = [];
    let record = [], field = '', quoted = false;
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      if (char === '"') {
        if (quoted && input[i + 1] === '"') { field += '"'; i++; }
        else quoted = !quoted;
      } else if (!quoted && char === ',') {
        record.push(field); field = '';
      } else if (!quoted && (char === '\r' || char === '\n')) {
        if (char === '\r' && input[i + 1] === '\n') i++;
        record.push(field); field = '';
        if (record.some(value => value.trim())) records.push(record);
        record = [];
      } else {
        field += char;
      }
    }
    if (quoted) throw new Error('CSVの引用符が閉じられていません');
    record.push(field);
    if (record.some(value => value.trim())) records.push(record);
    const header = (records.shift() || []).map(value => value.trim());
    for (const name of ['entry_no', 'group_id', 'english', 'japanese']) {
      if (!header.includes(name)) throw new Error(`CSVに「${name}」列がありません`);
    }
    const rows = records.map(record => Object.fromEntries(header.map((name, index) => [name, (record[index] || '').trim()])))
      .filter(row => row.entry_no && row.english && row.japanese && row.group_id);
    if (rows.length < 18) throw new Error('出題に使える単語が18件未満です');
    return rows.map(row => ({
      entry_no: row.entry_no,
      group_id: row.group_id,
      english: row.english,
      japanese: row.japanese,
      page: row.page || '',
      review_status: row.review_status || ''
    }));
  }

  function usable(row) {
    return row.english.length <= MAX_ENGLISH && row.japanese.length <= MAX_JAPANESE &&
      !/[<>□\[\]]/.test(row.english) && !/[□\[\]]/.test(row.japanese);
  }

  function key(value) { return value.trim().toLocaleLowerCase(); }

  function buildPairs(rows, mode, count = 18, random = Math.random) {
    if (!['translation', 'synonym', 'mix'].includes(mode)) throw new Error('不明な出題モードです');
    const eligible = rows.filter(usable);
    const translations = [];
    const usedEnglish = new Set();
    const usedJapanese = new Set();
    const translationCount = mode === 'mix' ? Math.floor(count / 2) : mode === 'translation' ? count : 0;
    if (translationCount) {
      for (const row of root.KotobaCore.shuffle(eligible, random)) {
        const en = key(row.english), ja = key(row.japanese);
        if (usedEnglish.has(en) || usedJapanese.has(ja)) continue;
        usedEnglish.add(en); usedJapanese.add(ja);
        translations.push({ id: `personal-t-${row.entry_no}`, type: 'translation', words: [row.english, row.japanese], meaning: row.japanese, example: '', number: row.entry_no, page: row.page, reviewStatus: row.review_status });
        if (translations.length === translationCount) break;
      }
    }
    if (translations.length < translationCount) throw new Error('日英ペアを十分に作れませんでした');

    const groups = new Map();
    for (const row of eligible) {
      if (!groups.has(row.group_id)) groups.set(row.group_id, []);
      groups.get(row.group_id).push(row);
    }
    const synonyms = [];
    const synonymCount = count - translationCount;
    if (synonymCount) {
      for (const members of root.KotobaCore.shuffle([...groups.values()], random)) {
        const choices = root.KotobaCore.shuffle(members, random);
        const first = choices.find(row => !usedEnglish.has(key(row.english)));
        const second = choices.find(row => row !== first && first && key(row.english) !== key(first.english) && !usedEnglish.has(key(row.english)));
        if (!first || !second) continue;
        usedEnglish.add(key(first.english)); usedEnglish.add(key(second.english));
        synonyms.push({ id: `personal-s-${first.entry_no}-${second.entry_no}`, type: 'synonym', words: [first.english, second.english], meaning: first.japanese, example: '', number: first.entry_no, page: first.page, reviewStatus: first.review_status === 'checked' && second.review_status === 'checked' ? 'checked' : 'ocr_unreviewed' });
        if (synonyms.length === synonymCount) break;
      }
    }
    if (synonyms.length < synonymCount) throw new Error('英英ペアを十分に作れませんでした');
    return root.KotobaCore.shuffle([...translations, ...synonyms], random);
  }

  const api = { parseCsv, buildPairs, usable };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KotobaPersonal = api;
})(typeof window !== 'undefined' ? window : globalThis);
