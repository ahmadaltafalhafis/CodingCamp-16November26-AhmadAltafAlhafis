/* =============================================
   APP.JS — Personal Dashboard
   Challenges: Dark/Light mode, Custom name,
               Change Pomodoro time, Prevent
               duplicate tasks, Sort tasks
   ============================================= */

function $(id) { return document.getElementById(id); }

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function saveLS(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function loadLS(key, def) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : def; }
  catch { return def; }
}

// ── THEME ─────────────────────────────────────
let isDark = loadLS('theme', false);
function applyTheme() {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : '');
  $('theme-toggle').textContent = isDark ? '☀️' : '🌙';
}
$('theme-toggle').addEventListener('click', () => {
  isDark = !isDark;
  saveLS('theme', isDark);
  applyTheme();
});
applyTheme();

// ── GREETING + CLOCK ──────────────────────────
let userName = loadLS('userName', '');

function getGreetingWord() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
}

function updateGreeting() {
  const name = userName ? `, <span>${userName}</span>!` : '!';
  $('greeting-text').innerHTML = getGreetingWord() + name;
}

function updateClock() {
  const now = new Date();
  $('current-time').textContent = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  $('current-date').textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  updateGreeting();
}

$('name-input').value = userName;
$('save-name').addEventListener('click', () => {
  const val = $('name-input').value.trim();
  userName = val;
  saveLS('userName', userName);
  updateGreeting();
  showToast(val ? 'Hi, ' + val + '! 👋' : 'Name cleared.');
});
$('name-input').addEventListener('keydown', e => { if (e.key === 'Enter') $('save-name').click(); });

updateClock();
setInterval(updateClock, 1000);

// ── FOCUS TIMER ───────────────────────────────
let timerDuration = loadLS('timerDuration', 25);
let timerTotal    = timerDuration * 60;
let timerLeft     = timerTotal;
let timerInterval = null;
let timerRunning  = false;

$('duration-input').value = timerDuration;

function formatTime(s) {
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function updateTimerUI() {
  $('timer-time').textContent = formatTime(timerLeft);
  const pct = timerTotal > 0 ? (timerLeft / timerTotal) * 100 : 100;
  $('timer-bar').style.width = pct + '%';
}

function timerTick() {
  if (timerLeft <= 0) {
    clearInterval(timerInterval);
    timerRunning = false;
    $('timer-start').textContent = '▶ Start';
    $('timer-label').textContent = '🎉 Session complete!';
    showToast('Focus session done! Take a break. 🎉');
    return;
  }
  timerLeft--;
  updateTimerUI();
}

$('timer-start').addEventListener('click', () => {
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
    $('timer-start').textContent = '▶ Start';
    $('timer-label').textContent = 'Paused';
  } else {
    if (timerLeft === 0) timerLeft = timerTotal;
    timerInterval = setInterval(timerTick, 1000);
    timerRunning = true;
    $('timer-start').textContent = '⏸ Pause';
    $('timer-label').textContent = 'Focus session running…';
  }
});

$('timer-stop').addEventListener('click', () => {
  clearInterval(timerInterval);
  timerRunning = false;
  timerLeft = timerTotal;
  $('timer-start').textContent = '▶ Start';
  $('timer-label').textContent = 'Stopped';
  updateTimerUI();
});

$('timer-reset').addEventListener('click', () => {
  clearInterval(timerInterval);
  timerRunning = false;
  timerLeft = timerTotal;
  $('timer-start').textContent = '▶ Start';
  $('timer-label').textContent = 'Ready';
  updateTimerUI();
});

$('set-duration').addEventListener('click', () => {
  const val = parseInt($('duration-input').value);
  if (isNaN(val) || val < 1 || val > 180) {
    showToast('Enter a duration between 1 and 180 minutes.');
    return;
  }
  clearInterval(timerInterval);
  timerRunning  = false;
  timerDuration = val;
  timerTotal    = val * 60;
  timerLeft     = timerTotal;
  saveLS('timerDuration', timerDuration);
  $('timer-start').textContent = '▶ Start';
  $('timer-label').textContent = 'Ready';
  updateTimerUI();
  showToast('Timer set to ' + val + ' min.');
});

updateTimerUI();

// ── TO-DO LIST ────────────────────────────────
let tasks  = loadLS('tasks', []);
let filter = 'all';
let sortBy = 'none';

function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getFilteredTasks() {
  let list = [...tasks];
  if (filter === 'active') list = list.filter(t => !t.done);
  if (filter === 'done')   list = list.filter(t =>  t.done);
  if (sortBy === 'az') list.sort((a, b) => a.text.localeCompare(b.text));
  if (sortBy === 'za') list.sort((a, b) => b.text.localeCompare(a.text));
  return list;
}

function renderTasks() {
  const ul = $('todo-list');
  const filtered = getFilteredTasks();
  ul.innerHTML = '';

  if (filtered.length === 0) {
    ul.innerHTML = '<li class="empty-state">No tasks here. Add one! ✨</li>';
    return;
  }

  filtered.forEach(task => {
    const li = document.createElement('li');
    li.className = 'todo-item' + (task.done ? ' done' : '');
    li.dataset.id = task.id;
    li.innerHTML =
      '<input type="checkbox"' + (task.done ? ' checked' : '') + '>' +
      '<span class="todo-text">' + escapeHTML(task.text) + '</span>' +
      '<div class="todo-actions">' +
        '<button class="btn-warning edit-btn" title="Edit">✏️</button>' +
        '<button class="btn-danger delete-btn" title="Delete">🗑️</button>' +
      '</div>';

    li.querySelector('input[type="checkbox"]').addEventListener('change', () => {
      const t = tasks.find(x => x.id === task.id);
      if (t) { t.done = !t.done; saveLS('tasks', tasks); renderTasks(); }
    });

    li.querySelector('.delete-btn').addEventListener('click', () => {
      tasks = tasks.filter(x => x.id !== task.id);
      saveLS('tasks', tasks);
      renderTasks();
      showToast('Task deleted.');
    });

    li.querySelector('.edit-btn').addEventListener('click', () => {
      const span = li.querySelector('.todo-text');
      const inp  = document.createElement('input');
      inp.className = 'edit-input';
      inp.value = task.text;
      span.replaceWith(inp);
      inp.focus();

      function saveEdit() {
        const newText = inp.value.trim();
        if (!newText) { showToast('Task cannot be empty.'); inp.focus(); return; }
        const dup = tasks.find(x => x.id !== task.id && x.text.toLowerCase() === newText.toLowerCase());
        if (dup) { showToast('Duplicate task! 🚫'); inp.focus(); return; }
        const t = tasks.find(x => x.id === task.id);
        if (t) { t.text = newText; saveLS('tasks', tasks); renderTasks(); }
      }

      inp.addEventListener('blur', saveEdit);
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter')  saveEdit();
        if (e.key === 'Escape') renderTasks();
      });
    });

    ul.appendChild(li);
  });
}

function addTask() {
  const input = $('todo-input');
  const text  = input.value.trim();
  if (!text) { showToast('Type a task first.'); input.focus(); return; }
  const dup = tasks.find(t => t.text.toLowerCase() === text.toLowerCase());
  if (dup) { showToast('That task already exists! 🚫'); input.focus(); return; }
  tasks.push({ id: Date.now(), text, done: false });
  saveLS('tasks', tasks);
  input.value = '';
  renderTasks();
  showToast('Task added! ✅');
}

$('add-task').addEventListener('click', addTask);
$('todo-input').addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTasks();
  });
});

$('sort-select').addEventListener('change', () => {
  sortBy = $('sort-select').value;
  renderTasks();
});

renderTasks();

// ── QUICK LINKS ───────────────────────────────
let links = loadLS('quickLinks', [
  { id: 1, name: 'Google',  url: 'https://google.com' },
  { id: 2, name: 'YouTube', url: 'https://youtube.com' },
  { id: 3, name: 'GitHub',  url: 'https://github.com' },
  { id: 4, name: 'ChatGPT', url: 'https://chat.openai.com' },
]);

function getFavicon(url) {
  try { return 'https://www.google.com/s2/favicons?sz=32&domain=' + new URL(url).origin; }
  catch { return ''; }
}

function renderLinks() {
  const grid = $('links-grid');
  grid.innerHTML = '';
  links.forEach(link => {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';

    const a = document.createElement('a');
    a.className  = 'link-card';
    a.href       = link.url;
    a.target     = '_blank';
    a.rel        = 'noopener noreferrer';

    const img = document.createElement('img');
    img.className = 'link-icon';
    img.src = getFavicon(link.url);
    img.alt = link.name;
    img.onerror = () => { img.style.display = 'none'; };

    const name = document.createElement('span');
    name.className   = 'link-name';
    name.textContent = link.name;

    a.appendChild(img);
    a.appendChild(name);

    const del = document.createElement('button');
    del.className   = 'link-delete';
    del.textContent = '×';
    del.title       = 'Remove';
    del.addEventListener('click', e => {
      e.preventDefault();
      links = links.filter(x => x.id !== link.id);
      saveLS('quickLinks', links);
      renderLinks();
      showToast('Link removed.');
    });

    wrapper.appendChild(a);
    wrapper.appendChild(del);
    grid.appendChild(wrapper);
  });
}

function addLink() {
  const nameVal = $('link-name-input').value.trim();
  const urlVal  = $('link-url-input').value.trim();
  if (!nameVal || !urlVal) { showToast('Enter both a name and a URL.'); return; }

  let url = urlVal;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  try { new URL(url); } catch { showToast('Invalid URL.'); return; }

  links.push({ id: Date.now(), name: nameVal, url });
  saveLS('quickLinks', links);
  $('link-name-input').value = '';
  $('link-url-input').value  = '';
  renderLinks();
  showToast('Link added! 🔗');
}

$('add-link').addEventListener('click', addLink);
$('link-url-input').addEventListener('keydown', e => { if (e.key === 'Enter') addLink(); });

renderLinks();
