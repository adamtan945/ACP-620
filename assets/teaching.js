(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function animateChange(el) {
    if (!el || reduceMotion.matches) return;
    el.classList.remove('teaching-change');
    void el.offsetWidth;
    el.classList.add('teaching-change');
  }
  const shared = document.querySelector('#shared .diagram');
  function updateShared(isChanged) {
    if (!shared) return;
    // Find the text by meaning, avoiding dependence on SVG element order.
    for (const text of shared.querySelectorAll('text')) {
      if (text.textContent.startsWith('To Do')) text.textContent = isChanged ? 'To Do → In Progress → Review → Done' : 'To Do → In Progress → Done';
    }
    animateChange(shared);
    document.querySelectorAll('.project').forEach(animateChange);
  }
  document.getElementById('change')?.addEventListener('click', () => updateShared(true));
  document.getElementById('reset')?.addEventListener('click', () => updateShared(false));

  const permissions = document.getElementById('permission-sim');
  if (permissions) {
    function updatePermissions() {
      const access = document.getElementById('access-choice').value;
      const viewer = document.getElementById('explicit-viewer').checked;
      const member = document.getElementById('explicit-member').checked;
      const group = document.getElementById('group-member').checked;
      const canEdit = access === 'Open' || member || group;
      const canView = access !== 'Private' || viewer || member || group;
      document.getElementById('baseline-role').textContent = access + ' → ' + (access === 'Open' ? 'Member' : access === 'Limited' ? 'Viewer' : '無預設一般角色');
      document.getElementById('extra-roles').textContent = [viewer && '直接 Viewer', member && '直接 Member', group && '群組 Member'].filter(Boolean).join(' ＋ ') || '沒有額外角色';
      document.getElementById('effective-role').textContent = canEdit ? '取得 Member 能力' : canView ? '取得 Viewer 能力' : '未取得存取權';
      document.getElementById('can-view').textContent = canView ? '可以' : '不可以';
      document.getElementById('can-edit').textContent = canEdit ? '可以' : '不可以';
      document.getElementById('permission-explain').textContent = canEdit ? (access === 'Open' ? 'Open 預設給 Member。即使指定 Viewer，也不會抵銷這份權限。' : '額外的 Member 角色提供編輯能力；直接或群組角色都可能是授權來源。') : canView ? '目前取得 Viewer 的協作能力，可查看與留言，不能建立或編輯 issue 本身。' : 'Private 沒有預設一般成員角色，也沒有其他角色授權，因此沒有存取權。';
      animateChange(permissions.querySelector('.role-stream'));
      animateChange(permissions.querySelector('.permission-out'));
    }
    permissions.querySelectorAll('select,input').forEach(el => el.addEventListener('change', updatePermissions));
    updatePermissions();
  }

  const block = document.getElementById('blocking-sim');
  if (block) {
    const checks = [...block.querySelectorAll('input')];
    const gate = document.getElementById('condition-gate');
    const status = document.getElementById('parent-status');
    const explain = document.getElementById('blocking-explain');
    function refreshCondition() {
      checks.forEach(el => el.nextElementSibling.textContent = el.checked ? 'Done' : 'In Progress');
      const ready = checks.every(el => el.checked);
      gate.textContent = ready ? '條件符合，可嘗試 transition' : '條件尚未滿足';
      gate.classList.toggle('ready', ready);
      status.textContent = 'In Progress';
      status.classList.remove('ready');
      explain.textContent = ready ? '兩筆 subtasks 都已 Done。Parent 不會自動完成，現在按「嘗試移到 Done」。' : '還有 subtasks 未完成。試著移動 parent，觀察條件會不會阻擋。';
      animateChange(gate);
    }
    checks.forEach(el => el.addEventListener('change', refreshCondition));
    document.getElementById('try-complete').addEventListener('click', () => {
      const ready = checks.every(el => el.checked);
      status.textContent = ready ? 'Done' : 'In Progress';
      status.classList.toggle('ready', ready);
      explain.textContent = ready ? '成功：subtasks 符合允許狀態，parent 通過這條 transition，現在是 Done。' : '被條件阻擋：至少一筆 subtask 未完成，parent 維持 In Progress。';
      animateChange(ready ? status : gate);
    });
    document.getElementById('reset-blocking').addEventListener('click', () => { checks.forEach(el => el.checked = false); refreshCondition(); });
  }

  const trash = document.getElementById('trash-sim');
  if (trash) {
    const move = document.getElementById('trash-move');
    const restore = document.getElementById('trash-restore');
    const expire = document.getElementById('trash-expire');
    const messages = {
      active: '使用中：會出現在目錄與搜尋；能否編輯仍依使用者權限。',
      trash: 'Trash：不出現在搜尋；direct link 仍可能查看但不能編輯。保留期限 60 天，符合權限的 admin 可還原。',
      deleted: '永久刪除：滿 60 天後資料被永久刪除，不能再還原。這個示範的「重設」只重設動畫，不代表 Jira 可以救回資料。'
    };
    function setState(state) {
      trash.querySelectorAll('[data-state]').forEach(el => { el.classList.toggle('current', el.dataset.state === state); if (el.dataset.state === state) animateChange(el); });
      move.disabled = state !== 'active'; restore.disabled = expire.disabled = state !== 'trash';
      document.getElementById('trash-explain').textContent = messages[state];
    }
    move.addEventListener('click', () => setState('trash'));
    restore.addEventListener('click', () => setState('active'));
    expire.addEventListener('click', () => setState('deleted'));
    document.getElementById('trash-reset').addEventListener('click', () => setState('active'));
  }

  // Open solutions for printing, then restore the learner's reading state.
  let closedDetails = [];
  window.addEventListener('beforeprint', () => {
    closedDetails = [...document.querySelectorAll('details:not([open])')];
    closedDetails.forEach(el => el.open = true);
  });
  window.addEventListener('afterprint', () => { closedDetails.forEach(el => el.open = false); });
  // Local section navigation highlights the section currently being read.
  const navLinks = [...document.querySelectorAll('.sidebar nav a[href^="#"]')];
  const sections = navLinks.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const entry = entries.find(e => e.isIntersecting);
      if (!entry) return;
      navLinks.forEach(a => { const active = a.hash === '#' + entry.target.id; a.classList.toggle('nav-active', active); if (active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    }, { rootMargin: '-5% 0px -65% 0px' });
    sections.forEach(section => observer.observe(section));
  }
})();

// Review controls are local to this lesson. No account or network is involved.
(() => {
  const quizzes = [...document.querySelectorAll('.quiz')];
  if (!quizzes.length || document.querySelector('.review-toolbar')) return;
  const storageKey = 'acp620.quiz-bookmarks.v1';
  const page = location.pathname.split('/').pop() || 'index.html';
  let saved = {};
  let persistent = true;
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (data && typeof data === 'object' && !Array.isArray(data)) saved = data;
  } catch (_) { persistent = false; }
  let onlySaved = false;
  const toolbar = document.createElement('div');
  toolbar.className = 'review-toolbar';
  toolbar.setAttribute('role', 'group');
  toolbar.setAttribute('aria-label', '本課練習複習工具');
  const title = document.createElement('strong');
  title.textContent = '本課複習';
  toolbar.append(title);
  const status = document.createElement('p');
  status.className = 'review-status';
  status.setAttribute('role', 'status');
  const empty = document.createElement('p');
  empty.className = 'review-empty note';
  empty.textContent = '本課尚無書籤。選「顯示全部題目」，再按題目旁的「加入書籤」。';
  empty.hidden = true;
  const host = quizzes[0].closest('section') || quizzes[0].parentElement;
  host.insertBefore(toolbar, host.firstElementChild?.nextSibling || null);
  toolbar.after(status, empty);
  function button(text, fn) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'secondary';
    el.textContent = text;
    el.addEventListener('click', fn);
    toolbar.append(el);
    return el;
  }
  const filter = button('只看書籤', () => { onlySaved = !onlySaved; refresh(); });
  filter.setAttribute('aria-pressed', 'false');
  button('展開全部解析', () => quizzes.filter(q => !q.hidden).forEach(q => q.querySelectorAll('details').forEach(d => { d.open = true; })));
  button('收合全部解析', () => quizzes.forEach(q => q.querySelectorAll('details').forEach(d => { d.open = false; })));
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(saved)); }
    catch (_) { persistent = false; }
  }
  function refresh() {
    let count = 0;
    quizzes.forEach(q => {
      const marked = saved[q.dataset.bookmarkKey] === true;
      if (marked) count++;
      q.hidden = onlySaved && !marked;
      q.classList.toggle('quiz-saved', marked);
      const control = q.querySelector('.quiz-bookmark');
      control.setAttribute('aria-pressed', String(marked));
      control.textContent = marked ? '★ 已加入書籤' : '☆ 加入書籤';
    });
    filter.textContent = onlySaved ? '顯示全部題目' : '只看書籤';
    filter.setAttribute('aria-pressed', String(onlySaved));
    empty.hidden = !(onlySaved && count === 0);
    status.textContent = `本課 ${quizzes.length} 題，已加入 ${count} 題書籤。` + (persistent ? '書籤保存在此瀏覽器，不跨裝置同步。' : '瀏覽器無法儲存，目前書籤僅保留於本次頁面。');
  }
  quizzes.forEach((q, i) => {
    if (!q.id) q.id = `quiz-${i + 1}`;
    q.dataset.bookmarkKey = `${page}#${q.id}`;
    const mark = document.createElement('button');
    mark.type = 'button';
    mark.className = 'secondary quiz-bookmark';
    mark.setAttribute('aria-label', `第 ${i + 1} 題書籤`);
    mark.addEventListener('click', () => {
      const key = q.dataset.bookmarkKey;
      if (saved[key] === true) delete saved[key]; else saved[key] = true;
      persist();
      refresh();
      // Keep keyboard focus usable when a removed bookmark disappears.
      if (q.hidden) filter.focus();
    });
    q.prepend(mark);
    q.querySelectorAll('details.english-version').forEach(d => d.setAttribute('lang', 'en'));
  });
  // Respect bookmark changes in another tab on the same site.
  window.addEventListener('storage', event => {
    if (event.key !== storageKey) return;
    try {
      const data = JSON.parse(event.newValue || '{}');
      saved = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
      refresh();
    } catch (_) { /* Ignore malformed external storage values. */ }
  });
  refresh();
})();
