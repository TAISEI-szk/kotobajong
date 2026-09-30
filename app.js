(function () {
  'use strict';
  const core = window.KotobaCore;
  const $ = id => document.getElementById(id);
  const board = $('board');
  const status = $('status');
  const personalStorageKey = 'kotobajong-personal-words-v1';
  let personalRows = [];
  try {
    const saved = JSON.parse(localStorage.getItem(personalStorageKey) || '[]');
    if (Array.isArray(saved) && saved.length >= 18) personalRows = saved;
  } catch (_) { /* Storage may be unavailable. */ }
  const state = { course: 'ngsl', mode: 'mix', positions: core.POSITIONS, tiles: [], selected: null, history: [], score: 0, hints: 3, elapsed: 0, started: false, completed: false, interval: null, spokenWord: '' };
  if (personalRows.length) state.course = 'personal';

  function formatTime(seconds) {
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function bestKey() { return `kotobajong-best-${state.course}-${state.mode}`; }
  function updateStats() {
    $('remaining').textContent = String(state.tiles.filter(t => !t.removed).length / 2);
    $('timer').textContent = formatTime(state.elapsed);
    $('score').textContent = String(state.score);
    try { $('best').textContent = localStorage.getItem(bestKey()) || '—'; } catch (_) { $('best').textContent = '—'; }
    $('hints-left').textContent = String(state.hints);
    $('hint-button').disabled = state.hints === 0 || state.completed;
    $('undo-button').disabled = state.history.length === 0 || state.completed;
    $('shuffle-button').disabled = state.completed;
  }

  function say(message, error = false) {
    status.textContent = message;
    status.classList.toggle('error', error);
  }

  function wordPairs() {
    if (state.course === 'personal') return window.KotobaPersonal.buildPairs(personalRows, state.mode);
    if (state.course === 'ielts') return window.KotobaPersonal.buildPairs(window.KOTOBA_IELTS_ROWS, state.mode);
    const raw = window.KOTOBA_COURSES[state.course];
    const toPair = (entry, type, index) => ({ id: `${type}-${index}`, type, words: entry.slice(0, 2), meaning: entry[2], example: entry[3] });
    const translations = core.shuffle(raw.translation.map((e, i) => toPair(e, 'translation', i)));
    const synonyms = core.shuffle(raw.synonym.map((e, i) => toPair(e, 'synonym', i)));
    if (state.mode === 'translation') return translations.slice(0, 18);
    if (state.mode === 'synonym') return synonyms.slice(0, 18);
    const chosen = translations.slice(0, 9);
    const usedEnglish = new Set(chosen.map(pair => pair.words[0]));
    for (const pair of synonyms) {
      if (pair.words.some(word => usedEnglish.has(word))) continue;
      chosen.push(pair);
      pair.words.forEach(word => usedEnglish.add(word));
      if (chosen.length === 18) break;
    }
    return core.shuffle(chosen);
  }

  function startGame() {
    clearInterval(state.interval);
    state.tiles = [];
    state.selected = null;
    state.history = [];
    state.score = 0;
    state.hints = 3;
    state.elapsed = 0;
    state.started = false;
    state.completed = false;
    state.spokenWord = '';
    $('word-note').textContent = 'ペアがそろうと、ここに単語の学習メモが表示されます。';
    $('speak-button').disabled = true;
    const columns = window.matchMedia('(max-width: 700px)').matches ? 4 : 6;
    state.positions = core.makePositions(columns);
    board.dataset.cols = String(columns);
    const pairs = wordPairs();
    const assignments = core.deal(state.positions.map(p => p.id), pairs, Math.random, state.positions);
    state.tiles = state.positions.map(position => ({ ...position, ...assignments.get(position.id), removed: false }));
    render();
    const messages = {
      personal: `個人の単語集（${personalRows.length}語）から毎回ランダムに出題します。`,
      ielts: `IELTS単語帳（${window.KOTOBA_IELTS_ROWS.length}語）から毎回ランダムに出題します。`
    };
    say(messages[state.course] || 'カードを２枚選んで、ペアを見つけましょう。');
  }

  function beginTimer() {
    if (state.started) return;
    state.started = true;
    state.interval = setInterval(() => { state.elapsed++; updateStats(); }, 1000);
  }

  function render() {
    const occupied = new Set(state.tiles.filter(t => !t.removed).map(t => t.id));
    board.replaceChildren();
    state.tiles.filter(t => !t.removed).forEach(tile => {
      const free = core.isFree(tile, occupied, state.positions);
      const covered = state.positions.some(p => p.layer > tile.layer && p.row === tile.row && p.col === tile.col && occupied.has(p.id));
      const belowCount = state.positions.filter(p => p.layer < tile.layer && p.row === tile.row && p.col === tile.col && occupied.has(p.id)).length;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `tile layer-${tile.layer} ${tile.pair.type === 'translation' && tile.side === 1 ? 'jp' : ''} ${covered ? 'covered' : !free ? 'blocked-side' : ''} ${state.selected === tile.id ? 'selected' : ''}`;
      button.style.setProperty('--row', tile.row);
      button.style.setProperty('--col', tile.col);
      button.style.setProperty('--layer', tile.layer);
      button.dataset.id = tile.id;
      button.dataset.layer = tile.layer;
      button.disabled = !free;
      const word = tile.pair.words[tile.side];
      const floorName = ['下段', '中段', '上段'][tile.layer];
      button.setAttribute('aria-label', `${word}、${floorName}${belowCount ? `、下に${belowCount}枚` : ''}、${free ? '選択可能' : '選択不可'}`);
      const kind = document.createElement('span');
      kind.className = 'tile-kind';
      kind.textContent = tile.pair.type === 'translation' ? (tile.side === 0 ? 'EN' : 'JP') : 'EN';
      const floor = document.createElement('span');
      floor.className = 'tile-floor';
      floor.textContent = floorName;
      floor.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = 'tile-text';
      label.textContent = word;
      const stack = document.createElement('span');
      stack.className = 'tile-stack';
      stack.textContent = belowCount ? `↓ ${belowCount}枚` : '';
      stack.setAttribute('aria-hidden', 'true');
      const ornament = document.createElement('span');
      ornament.className = 'tile-ornament';
      ornament.setAttribute('aria-hidden', 'true');
      ornament.textContent = '✦';
      button.append(kind, floor, label, stack, ornament);
      button.addEventListener('click', () => choose(tile.id));
      board.append(button);
    });
    updateStats();
  }

  function note(pair) {
    const [first, second] = pair.words;
    $('word-note').textContent = `${first}  ↔  ${second} ｜ ${pair.meaning}${pair.example ? `。例：${pair.example}` : ''}`;
    state.spokenWord = first;
    $('speak-button').disabled = !('speechSynthesis' in window);
  }

  function choose(id) {
    if (state.completed) return;
    const tile = state.tiles.find(t => t.id === id);
    const occupied = new Set(state.tiles.filter(t => !t.removed).map(t => t.id));
    if (!tile || !core.isFree(tile, occupied, state.positions)) return;
    beginTimer();
    if (state.selected === id) { state.selected = null; render(); say('選択を解除しました。'); return; }
    if (state.selected === null) { state.selected = id; render(); say('意味が合うもう１枚を選んでください。'); return; }
    const first = state.tiles.find(t => t.id === state.selected);
    state.selected = null;
    if (first.pair.id !== tile.pair.id) {
      render();
      for (const wrong of [first, tile]) board.querySelector(`[data-id="${wrong.id}"]`)?.classList.add('wrong');
      say('この２枚はペアではありません。もう一度探してみましょう。', true);
      return;
    }
    first.removed = tile.removed = true;
    state.history.push([first.id, tile.id]);
    state.score += 100;
    note(first.pair);
    render();
    if (state.tiles.every(t => t.removed)) { finishGame(); return; }
    if (core.legalPairs(state.tiles, state.positions).length === 0) say('選べるペアがありません。「並べ替え」で続けられます。', true);
    else say(`正解！ ${first.pair.words[0]} と ${first.pair.words[1]} がつながりました。`);
  }

  function hint() {
    if (state.hints < 1 || state.completed) return;
    const moves = core.legalPairs(state.tiles, state.positions);
    if (!moves.length) { say('ペアがありません。「並べ替え」を押してください。', true); return; }
    state.hints--;
    state.score = Math.max(0, state.score - 25);
    state.selected = null;
    render();
    moves[0].forEach(t => board.querySelector(`[data-id="${t.id}"]`)?.classList.add('hinted'));
    say('光っている２枚がペアです。');
  }

  function undo() {
    const last = state.history.pop();
    if (!last || state.completed) return;
    last.forEach(id => { state.tiles.find(t => t.id === id).removed = false; });
    state.score = Math.max(0, state.score - 100);
    state.selected = null;
    render();
    say('最後に消したペアを戻しました。');
  }

  function redeal() {
    if (state.completed) return;
    const remaining = state.tiles.filter(t => !t.removed);
    const pairs = [...new Map(remaining.map(t => [t.pair.id, t.pair])).values()];
    let assignments;
    try {
      assignments = core.deal(remaining.map(t => t.id), pairs, Math.random, state.positions);
    } catch (_) {
      // A player's removal order can leave an awkward shape. Move the remaining
      // cards to a known removable subset before dealing them again.
      const fullOrder = core.removalOrder(state.positions.map(p => p.id), Math.random, state.positions).flat();
      const newSlots = fullOrder.slice(-remaining.length);
      state.tiles.filter(t => t.removed).forEach((tile, index) => { tile.id = -index - 1; });
      remaining.forEach((tile, index) => Object.assign(tile, state.positions[newSlots[index]]));
      assignments = core.deal(newSlots, pairs, Math.random, state.positions);
    }
    remaining.forEach(tile => Object.assign(tile, assignments.get(tile.id)));
    state.history = [];
    state.selected = null;
    state.score = Math.max(0, state.score - 50);
    render();
    say('残りのカードを並べ替えました。新しいペアを探しましょう。');
  }

  function fitBoardToViewport() {
    const columns = window.matchMedia('(max-width: 700px)').matches ? 4 : 6;
    if (state.completed || board.dataset.cols === String(columns)) return;
    const positions = core.makePositions(columns);
    const remaining = state.tiles.filter(t => !t.removed);
    const pairs = [...new Map(remaining.map(t => [t.pair.id, t.pair])).values()];
    const fullOrder = core.removalOrder(positions.map(p => p.id), Math.random, positions).flat();
    const slots = fullOrder.slice(-remaining.length);
    state.tiles.filter(t => t.removed).forEach((tile, index) => { tile.id = -index - 1; });
    remaining.forEach((tile, index) => Object.assign(tile, positions[slots[index]]));
    const assignments = core.deal(slots, pairs, Math.random, positions);
    remaining.forEach(tile => Object.assign(tile, assignments.get(tile.id)));
    state.positions = positions;
    board.dataset.cols = String(columns);
    state.history = [];
    state.selected = null;
    render();
    say('画面幅に合わせてカードを並べ直しました。');
  }

  function finishGame() {
    state.completed = true;
    clearInterval(state.interval);
    const time = formatTime(state.elapsed);
    try {
      const old = localStorage.getItem(bestKey());
      if (!old || state.elapsed < Number(old.split(':')[0]) * 60 + Number(old.split(':')[1])) localStorage.setItem(bestKey(), time);
    } catch (_) { /* Private browsing may disable storage. */ }
    updateStats();
    $('win-time').textContent = time;
    $('win-score').textContent = String(state.score);
    say('全ペア達成！ お見事です。');
    $('win-dialog').showModal();
  }

  document.querySelectorAll('.mode-button').forEach(button => button.addEventListener('click', () => {
    state.mode = button.dataset.mode;
    document.querySelectorAll('.mode-button').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
    startGame();
  }));
  document.querySelectorAll('.mode-button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode)));
  $('course-select').addEventListener('change', event => {
    if (event.target.value === 'personal' && !personalRows.length) {
      event.target.value = state.course;
      $('personal-file').click();
      return;
    }
    state.course = event.target.value;
    startGame();
  });
  $('import-button').addEventListener('click', () => $('personal-file').click());
  $('personal-file').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const rows = window.KotobaPersonal.parseCsv(await file.text());
      window.KotobaPersonal.buildPairs(rows, 'mix');
      personalRows = rows;
      state.course = 'personal';
      $('course-select').value = 'personal';
      let saved = true;
      try { localStorage.setItem(personalStorageKey, JSON.stringify(rows)); } catch (_) { saved = false; }
      startGame();
      say(saved ? `${rows.length}語をこの端末に保存しました。毎回ランダムに出題します。` : `${rows.length}語を読み込みました。この端末に保存できなかったため、次回は再読込してください。`);
    } catch (error) {
      say(error.message || 'CSVの読み込みに失敗しました。', true);
    } finally {
      event.target.value = '';
    }
  });
  $('hint-button').addEventListener('click', hint);
  $('undo-button').addEventListener('click', undo);
  $('shuffle-button').addEventListener('click', redeal);
  $('new-button').addEventListener('click', startGame);
  $('rules-button').addEventListener('click', () => $('rules-dialog').showModal());
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
  $('play-again-button').addEventListener('click', () => { $('win-dialog').close(); startGame(); });
  $('speak-button').addEventListener('click', () => {
    if (!state.spokenWord || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(state.spokenWord);
    utterance.lang = 'en-US';
    utterance.rate = .85;
    speechSynthesis.speak(utterance);
  });
  window.addEventListener('resize', fitBoardToViewport);
  $('course-select').value = state.course;
  startGame();
})();
