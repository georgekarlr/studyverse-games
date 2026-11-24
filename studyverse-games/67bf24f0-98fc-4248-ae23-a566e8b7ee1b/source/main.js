// StudyVerse Module renderer: one Multiple Choice item, one deliberate answer.
// The host owns evaluation, feedback timing, and persistence.
const layout = [
 'G..#..G',
 '##.#.##',
 '...#...',
 '.#...#.',
 '.###.#.',
 '...#...',
 'G#...#G'
];
const gates = [{x:0,y:0},{x:6,y:0},{x:0,y:6},{x:6,y:6}];
const start = {x:3,y:3};
const pageSize = 4;

const get = id => document.querySelector('#' + id);
const board = get('board');
const optionsBox = get('options');
const question = get('question');
const progress = get('progress');
const status = get('status');
const playArea = get('play-area');
const pageInfo = get('page-info');
const confirm = get('confirm');
const previous = get('previous');
const next = get('next');
const reset = get('reset');
const exit = get('exit');
const up = get('up');
const down = get('down');
const left = get('left');
const right = get('right');
const movement = [up, down, left, right];
const tiles = [];
const optionRows = [];
let sdk = null;
let item = null;
let options = [];
let page = 0;
let position = {...start};
let moves = 0;
let phase = 'loading';

function makeBoard() {
 let y = 0;
 for (const line of layout) {
  const row = document.createElement('div');
  row.className = 'maze-row';
  let x = 0;
  for (const kind of line) {
   const el = document.createElement('span');
   el.className = 'tile';
   el.setAttribute('aria-hidden', 'true');
   tiles.push({x, y, kind, el});
   row.append(el);
   x += 1;
  }
  board.append(row);
  y += 1;
 }
 for (let i = 0; i < pageSize; i += 1) {
  const el = document.createElement('p');
  el.className = 'option';
  optionRows.push(el);
  optionsBox.append(el);
 }
}
function activeOptions() {
 return options.slice(page * pageSize, (page + 1) * pageSize);
}
function atGate(x, y) {
 return gates.findIndex(gate => gate.x === x && gate.y === y);
}
function offeredAt(x, y) {
 const index = atGate(x, y);
 if (index < 0) return null;
 return activeOptions().find((option, i) => i === index) || null;
}
function available(x, y) {
 const tile = tiles.find(cell => cell.x === x && cell.y === y);
 return !!tile && tile.kind !== '#' &&
  (tile.kind !== 'G' || !!offeredAt(x, y));
}
function currentOption() {
 return offeredAt(position.x, position.y);
}
function gateNumber(index) {
 return page * pageSize + index + 1;
}
function setStatus(message) {
 status.textContent = message;
}
function draw() {
 const active = activeOptions();
 const ready = phase === 'playing';
 for (const tile of tiles) {
  const here = tile.x === position.x && tile.y === position.y;
  const index = atGate(tile.x, tile.y);
  const gate = index >= 0 && index < active.length;
  tile.el.className = 'tile ' + (here ? 'player' :
   gate ? 'gate' : tile.kind === '#' || index >= 0 ? 'wall' : 'path');
  tile.el.textContent = here ? 'P' : gate ? String(gateNumber(index)) : '';
 }
 for (const [index, row] of optionRows.entries()) {
  const option = active.find((entry, i) => i === index);
  row.hidden = !option;
  row.className = option && option === currentOption() ? 'option selected' : 'option';
  row.textContent = option ? gateNumber(index) + '. ' + option.text : '';
 }
 const pages = Math.ceil(options.length / pageSize);
 pageInfo.textContent = 'Gates ' + (page * pageSize + 1) + '-' +
  (page * pageSize + active.length) + ' of ' + options.length +
  ' | Page ' + (page + 1) + ' of ' + pages;
 previous.disabled = !ready || page === 0;
 next.disabled = !ready || page + 1 >= pages;
 for (const button of movement) button.disabled = !ready;
 reset.disabled = !ready;
 confirm.disabled = !ready || !currentOption();
 progress.textContent = 'Moves: ' + moves + ' | Row ' + (position.y + 1) +
  ', column ' + (position.x + 1);
 const selected = currentOption();
 confirm.textContent = selected ? 'Confirm gate ' +
  gateNumber(atGate(position.x, position.y)) : 'Confirm answer';
}
function move(dx, dy) {
 if (phase !== 'playing') return;
 const x = position.x + dx;
 const y = position.y + dy;
 if (!available(x, y)) {
  setStatus('Blocked path. Try another direction.');
  return;
 }
 position = {x,y};
 moves += 1;
 draw();
 const selected = currentOption();
 if (selected) {
  setStatus('Gate ' + gateNumber(atGate(x,y)) + ': ' + selected.text +
   '. Confirm this answer or continue exploring.');
 } else {
  setStatus('Moved to row ' + (y + 1) + ', column ' + (x + 1) + '.');
 }
}
function restartMaze(message) {
 position = {...start};
 moves = 0;
 draw();
 setStatus(message);
}
function changePage(delta) {
 if (phase !== 'playing') return;
 const target = page + delta;
 if (target < 0 || target * pageSize >= options.length) return;
 page = target;
 restartMaze('New gates available. The player is back at the start.');
}
async function submit() {
 if (phase !== 'playing') return;
 const selected = currentOption();
 if (!selected || !options.some(option => option.id === selected.id)) return;
 phase = 'submitting';
 draw();
 exit.disabled = true;
 setStatus('Sending your chosen answer to StudyVerse...');
 try {
  const receipt = await sdk.submitAnswer({
   item_id: item.id,
   response: {value: selected.id}
  });
  phase = 'submitted';
  setStatus(receipt && receipt.status === 'preview_only'
   ? 'Preview response received. No answer or score was saved.'
   : 'Response sent to StudyVerse. Follow the host to continue.');
 } catch {
  phase = 'uncertain';
  setStatus('Submission could not be confirmed. Exit to Standard or restart the preview. No automatic retry.');
 } finally {
  exit.disabled = false;
  draw();
 }
}
async function leave() {
 if (!sdk || phase === 'submitting' || phase === 'exiting' || phase === 'exited') return;
 const oldPhase = phase;
 phase = 'exiting';
 exit.disabled = true;
 if (options.length) draw();
 setStatus('Returning to Standard...');
 try {
  await sdk.exitToStandard();
  phase = 'exited';
  setStatus('Exited to Standard.');
 } catch {
  phase = oldPhase;
  exit.disabled = false;
  if (options.length) draw();
  setStatus('Could not exit through the Game. Use the StudyVerse host controls.');
 }
}
function validItem(candidate) {
 if (!candidate || candidate.item_type !== 'multiple_choice' ||
  typeof candidate.id !== 'string' || !candidate.id ||
  !candidate.content || typeof candidate.content.question !== 'string' ||
  !candidate.content.question.trim()) return false;
 const choices = candidate.content.options;
 if (!Array.isArray(choices) || choices.length < 2 || choices.length > 30) return false;
 return choices.every(option => option && typeof option.id === 'string' &&
  option.id.length > 0 && option.id.length <= 80 &&
  typeof option.text === 'string' && option.text.trim()) &&
  new Set(choices.map(option => option.id)).size === choices.length;
}
async function init() {
 exit.addEventListener('click', leave);
 if (typeof GameSDK === 'undefined' || !GameSDK.module) {
  phase = 'unavailable';
  exit.disabled = true;
  question.textContent = 'Open this game inside StudyVerse.';
  setStatus('The Module SDK is unavailable.');
  return;
 }
 sdk = GameSDK.module;
 try {
  item = await sdk.getItem();
  if (!validItem(item)) {
   phase = 'unavailable';
   question.textContent = 'This Study Item cannot be played in Maze Quest.';
   setStatus('Use Exit to Standard to continue.');
   return;
  }
  options = item.content.options.slice();
  question.textContent = item.content.question;
  makeBoard();
  up.addEventListener('click', () => move(0,-1));
  down.addEventListener('click', () => move(0,1));
  left.addEventListener('click', () => move(-1,0));
  right.addEventListener('click', () => move(1,0));
  previous.addEventListener('click', () => changePage(-1));
  next.addEventListener('click', () => changePage(1));
  reset.addEventListener('click', () => restartMaze('Maze reset. Choose any gate.'));
  confirm.addEventListener('click', submit);
  document.addEventListener('keydown', event => {
   if (phase !== 'playing') return;
   if (event.key === 'ArrowUp') { event.preventDefault(); move(0,-1); }
   else if (event.key === 'ArrowDown') { event.preventDefault(); move(0,1); }
   else if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1,0); }
   else if (event.key === 'ArrowRight') { event.preventDefault(); move(1,0); }
  });
  phase = 'playing';
  playArea.hidden = false;
  restartMaze('Start in the center. Reach the gate for your chosen answer.');
 } catch {
  phase = 'unavailable';
  question.textContent = 'Maze Quest could not load this Study Item.';
  setStatus('Use Exit to Standard to continue.');
 }
}
void init();
