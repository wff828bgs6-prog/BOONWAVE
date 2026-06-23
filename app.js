(() => {
  'use strict';

  const STORAGE_KEY = 'boonwave_test_accounts_v1';
  const SESSION_KEY = 'boonwave_test_session_v1';
  const state = {
    mode: 'login',
    accountEmail: null,
    data: null,
    selectedIcon: '◉',
    pendingParentId: null,
    currentNodeType: 'project',
    drag: null,
  };

  const $ = (id) => document.getElementById(id);
  const screens = ['splash', 'authScreen', 'welcomeScreen', 'workspaceScreen'];
  const nodeLabels = {
    project: ['Проект', '▣'], goal: ['Цель', '◎'], stage: ['Этап', '⌁'], task: ['Задача', '✓'],
    person: ['Человек', '◉'], idea: ['Идея', '◇'], purchase: ['Покупка', '▤'], wish: ['Желание', '☆'],
    meeting: ['Встреча', '◷'], material: ['Материал', '▥'], file: ['Файл', '▧'], payment: ['Платёж', '₽'],
    expense: ['Затрата', '−'], note: ['Заметка', '≡'], habit: ['Привычка', '↻'], document: ['Документ', '▱'],
    self: ['Я', '◉']
  };

  const personalActions = ['goal', 'task', 'purchase', 'wish', 'meeting', 'idea', 'person', 'habit', 'document', 'note'];
  const workActions = ['project', 'goal', 'stage', 'task', 'person', 'idea', 'material', 'file', 'payment', 'expense', 'note'];

  function accounts() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }

  function saveAccounts(obj) { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }

  function freshData() {
    return {
      version: 1,
      onboarded: false,
      welcomeShown: false,
      activeWorkspaceId: null,
      workspaces: [],
      createdAt: new Date().toISOString(),
    };
  }

  function saveData() {
    if (!state.accountEmail || !state.data) return;
    const all = accounts();
    if (!all[state.accountEmail]) return;
    all[state.accountEmail].data = state.data;
    saveAccounts(all);
  }

  function showScreen(id) {
    screens.forEach((screenId) => $(screenId).classList.toggle('active', screenId === id));
  }

  function showModal(id) { $(id).classList.remove('hidden'); }
  function hideModal(id) { $(id).classList.add('hidden'); }

  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.remove('hidden');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.add('hidden'), 2300);
  }

  function uuid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function currentWorkspace() {
    return state.data?.workspaces.find(w => w.id === state.data.activeWorkspaceId) || null;
  }

  function start() {
    setTimeout(() => {
      const email = localStorage.getItem(SESSION_KEY);
      const all = accounts();
      if (email && all[email]) {
        state.accountEmail = email;
        state.data = all[email].data || freshData();
        enterApp();
      } else {
        showScreen('authScreen');
      }
    }, 1550);
  }

  function setAuthMode(mode) {
    state.mode = mode;
    $('loginTab').classList.toggle('active', mode === 'login');
    $('registerTab').classList.toggle('active', mode === 'register');
    $('confirmField').classList.toggle('hidden', mode !== 'register');
    $('confirmInput').required = mode === 'register';
    $('passwordInput').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
    $('authSubmit').textContent = mode === 'register' ? 'Создать аккаунт' : 'Войти';
    $('authError').textContent = '';
  }

  function handleAuth(event) {
    event.preventDefault();
    const email = $('emailInput').value.trim().toLowerCase();
    const password = $('passwordInput').value;
    const confirm = $('confirmInput').value;
    const error = $('authError');
    error.textContent = '';

    if (!email || !email.includes('@')) return error.textContent = 'Введите корректный email.';
    if (password.length < 4) return error.textContent = 'Пароль должен содержать минимум 4 символа.';

    const all = accounts();
    if (state.mode === 'register') {
      if (password !== confirm) return error.textContent = 'Пароли не совпадают.';
      if (all[email]) return error.textContent = 'Такой локальный аккаунт уже существует.';
      all[email] = { password, data: freshData() };
      saveAccounts(all);
    } else {
      if (!all[email] || all[email].password !== password) return error.textContent = 'Неверный email или пароль.';
    }

    state.accountEmail = email;
    state.data = all[email].data || freshData();
    localStorage.setItem(SESSION_KEY, email);
    enterApp();
  }

  function enterApp() {
    if (!state.data.welcomeShown) {
      showScreen('welcomeScreen');
      state.data.welcomeShown = true;
      saveData();
      setTimeout(openWorkspace, 1750);
    } else {
      openWorkspace();
    }
  }

  function openWorkspace() {
    showScreen('workspaceScreen');
    renderWorkspace();
    if (!state.data.onboarded && state.data.workspaces.length === 0) {
      setTimeout(() => showModal('onboardingModal'), 280);
    }
  }

  function selectSpaceType(type) {
    $('workspaceTypeInput').value = type;
    $('workspaceFormTitle').textContent = type === 'personal' ? 'Личное пространство' : 'Рабочее пространство';
    $('workspaceNameInput').placeholder = type === 'personal' ? 'Моя жизнь' : 'Работа';
    $('workspaceNameInput').value = '';
    state.selectedIcon = type === 'personal' ? '◉' : '▦';
    document.querySelectorAll('.icon-option').forEach(btn => btn.classList.toggle('selected', btn.dataset.icon === state.selectedIcon));
    hideModal('onboardingModal');
    showModal('createWorkspaceModal');
    setTimeout(() => $('workspaceNameInput').focus(), 200);
  }

  function createWorkspace(event) {
    event.preventDefault();
    const type = $('workspaceTypeInput').value;
    const name = $('workspaceNameInput').value.trim() || (type === 'personal' ? 'Моя жизнь' : 'Работа');
    const workspace = {
      id: uuid('space'), type, name, icon: state.selectedIcon,
      nodes: [], createdAt: new Date().toISOString(), viewport: { x: 0, y: 0, scale: 1 }
    };

    if (type === 'personal') {
      workspace.nodes.push({
        id: uuid('node'), type: 'self', name: 'Я', description: 'Личный центр', status: 'active', priority: 'medium',
        parentId: null, x: 50, y: 43, root: true, createdAt: new Date().toISOString()
      });
    }

    state.data.workspaces.push(workspace);
    state.data.activeWorkspaceId = workspace.id;
    state.data.onboarded = true;
    saveData();
    hideModal('createWorkspaceModal');
    renderWorkspace();

    if (type === 'work') setTimeout(() => showModal('createCoreModal'), 250);
    else setTimeout(() => toast('Личное пространство создано'), 250);
  }

  function openNodeForm(type, parentId = null) {
    state.currentNodeType = type;
    state.pendingParentId = parentId;
    const [label] = nodeLabels[type] || ['Элемент'];
    $('nodeTypeInput').value = type;
    $('nodeFormTitle').textContent = `Создать: ${label.toLowerCase()}`;
    $('nodeEyebrow').textContent = parentId ? 'Связанный элемент' : 'Новое ядро';
    $('nodeNameInput').value = type === 'self' ? 'Я' : '';
    $('nodeDescriptionInput').value = '';
    $('nodeStatusInput').value = 'planning';
    $('nodePriorityInput').value = 'medium';
    hideModal('createCoreModal');
    hideModal('quickAddModal');
    showModal('createNodeModal');
    setTimeout(() => $('nodeNameInput').focus(), 180);
  }

  function createNode(event) {
    event.preventDefault();
    const workspace = currentWorkspace();
    if (!workspace) return;
    const type = $('nodeTypeInput').value;
    const name = $('nodeNameInput').value.trim();
    if (!name) return;

    const root = !state.pendingParentId && ['project', 'goal', 'self'].includes(type);
    const siblingIndex = workspace.nodes.filter(n => n.parentId === state.pendingParentId).length;
    let x = 50, y = 46;
    if (state.pendingParentId) {
      const parent = workspace.nodes.find(n => n.id === state.pendingParentId);
      const angle = (siblingIndex * 1.15) - 1.2;
      x = Math.max(18, Math.min(82, parent.x + Math.cos(angle) * 29));
      y = Math.max(16, Math.min(82, parent.y + Math.sin(angle) * 25));
    } else if (workspace.nodes.length) {
      x = 28 + ((workspace.nodes.length * 19) % 52);
      y = 24 + ((workspace.nodes.length * 17) % 54);
    }

    workspace.nodes.push({
      id: uuid('node'), type, name,
      description: $('nodeDescriptionInput').value.trim(),
      status: $('nodeStatusInput').value,
      priority: $('nodePriorityInput').value,
      parentId: state.pendingParentId,
      x, y, root,
      createdAt: new Date().toISOString()
    });

    saveData();
    hideModal('createNodeModal');
    renderWorkspace();
    toast(`${nodeLabels[type]?.[0] || 'Элемент'} создан`);
    state.pendingParentId = null;
  }

  function renderWorkspace() {
    const workspace = currentWorkspace();
    const empty = $('emptyState');
    const layer = $('nodesLayer');
    layer.innerHTML = '';

    if (!workspace) {
      $('workspaceTypeBadge').textContent = '—';
      $('workspaceKind').textContent = 'Нет пространства';
      $('workspaceTitle').textContent = 'BOONWAVE';
      empty.classList.remove('hidden');
      $('emptyTitle').textContent = 'Создайте первое пространство';
      drawConnections([]);
      return;
    }

    $('workspaceTypeBadge').textContent = workspace.icon;
    $('workspaceKind').textContent = workspace.type === 'personal' ? 'Личное' : 'Работа';
    $('workspaceTitle').textContent = workspace.name;
    empty.classList.toggle('hidden', workspace.nodes.length > 0);
    $('emptyTitle').textContent = workspace.type === 'work' ? 'Создайте проект или рабочую цель' : 'Добавьте первое дело';

    workspace.nodes.forEach(node => layer.appendChild(nodeElement(node, workspace)));
    requestAnimationFrame(() => drawConnections(workspace.nodes));
  }

  function nodeElement(node, workspace) {
    const el = document.createElement('article');
    const [label, icon] = nodeLabels[node.type] || ['Элемент', '•'];
    el.className = `node-card${node.root ? ' root' : ''}${node.type === 'self' ? ' person-root' : ''}`;
    el.dataset.id = node.id;
    el.style.left = `${node.x}%`;
    el.style.top = `${node.y}%`;
    el.innerHTML = `
      <div class="node-head">
        <span class="node-type">${icon} ${label}</span>
        <span class="node-status ${escapeHtml(node.status)}"></span>
      </div>
      <h3>${escapeHtml(node.name)}</h3>
      ${node.description ? `<p>${escapeHtml(node.description)}</p>` : ''}
      ${node.type !== 'self' ? `<div class="node-footer"><span>${priorityLabel(node.priority)}</span><span>${childCount(workspace, node.id)} связ.</span></div>` : ''}
      <button class="node-add" type="button" aria-label="Добавить связанный элемент">+</button>
    `;

    const add = el.querySelector('.node-add');
    add.addEventListener('pointerdown', e => e.stopPropagation());
    add.addEventListener('click', e => {
      e.stopPropagation();
      state.pendingParentId = node.id;
      showQuickAdd(node.id);
    });

    el.addEventListener('pointerdown', startDrag);
    el.addEventListener('dblclick', () => showQuickAdd(node.id));
    return el;
  }

  function startDrag(event) {
    if (event.target.closest('button')) return;
    const el = event.currentTarget;
    const workspace = currentWorkspace();
    const node = workspace.nodes.find(n => n.id === el.dataset.id);
    const canvasRect = $('canvas').getBoundingClientRect();
    state.drag = { el, node, canvasRect, pointerId: event.pointerId, moved: false };
    el.setPointerCapture(event.pointerId);
    el.addEventListener('pointermove', moveDrag);
    el.addEventListener('pointerup', endDrag, { once: true });
    el.addEventListener('pointercancel', endDrag, { once: true });
  }

  function moveDrag(event) {
    if (!state.drag) return;
    const { el, node, canvasRect } = state.drag;
    const x = ((event.clientX - canvasRect.left) / canvasRect.width) * 100;
    const y = ((event.clientY - canvasRect.top) / canvasRect.height) * 100;
    node.x = Math.max(10, Math.min(90, x));
    node.y = Math.max(10, Math.min(90, y));
    el.style.left = `${node.x}%`;
    el.style.top = `${node.y}%`;
    state.drag.moved = true;
    drawConnections(currentWorkspace().nodes);
  }

  function endDrag(event) {
    const drag = state.drag;
    if (!drag) return;
    drag.el.releasePointerCapture?.(drag.pointerId);
    drag.el.removeEventListener('pointermove', moveDrag);
    state.drag = null;
    if (drag.moved) saveData();
  }

  function drawConnections(nodes) {
    const svg = $('connections');
    const canvas = $('canvas').getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`);
    svg.innerHTML = `
      <defs>
        <linearGradient id="waveGradient" x1="0" x2="1">
          <stop offset="0" stop-color="#a993ff" />
          <stop offset=".5" stop-color="#d5ff57" />
          <stop offset="1" stop-color="#77e7e2" />
        </linearGradient>
      </defs>`;

    nodes.filter(n => n.parentId).forEach(node => {
      const parent = nodes.find(n => n.id === node.parentId);
      if (!parent) return;
      const x1 = parent.x / 100 * canvas.width;
      const y1 = parent.y / 100 * canvas.height;
      const x2 = node.x / 100 * canvas.width;
      const y2 = node.y / 100 * canvas.height;
      const dx = x2 - x1;
      const control = Math.max(40, Math.abs(dx) * .46);
      const c1x = x1 + (dx >= 0 ? control : -control);
      const c2x = x2 - (dx >= 0 ? control : -control);
      const wave = Math.sin((x1 + y2) * .015) * 22;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'connection-path');
      path.setAttribute('d', `M ${x1} ${y1} C ${c1x} ${y1 + wave}, ${c2x} ${y2 - wave}, ${x2} ${y2}`);
      svg.appendChild(path);
    });
  }

  function childCount(workspace, nodeId) { return workspace.nodes.filter(n => n.parentId === nodeId).length; }
  function priorityLabel(value) { return value === 'high' ? 'Высокий' : value === 'low' ? 'Низкий' : 'Средний'; }
  function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  function showQuickAdd(parentId = null) {
    const workspace = currentWorkspace();
    if (!workspace) return showModal('onboardingModal');
    state.pendingParentId = parentId;
    const actions = workspace.type === 'personal' ? personalActions : workActions;
    const container = $('quickActions');
    container.innerHTML = '';
    actions.forEach(type => {
      const [label, icon] = nodeLabels[type];
      const btn = document.createElement('button');
      btn.className = 'quick-action';
      btn.type = 'button';
      btn.innerHTML = `<span>${icon}</span><small>${label}</small>`;
      btn.addEventListener('click', () => {
        let effectiveParentId = parentId;
        if (!effectiveParentId && !['project', 'goal'].includes(type)) {
          const roots = workspace.nodes.filter(node => node.root);
          if (roots.length === 1) effectiveParentId = roots[0].id;
        }
        openNodeForm(type, effectiveParentId);
      });
      container.appendChild(btn);
    });
    showModal('quickAddModal');
  }

  function renderWorkspaceList() {
    const list = $('workspaceList');
    list.innerHTML = '';
    state.data.workspaces.forEach(workspace => {
      const btn = document.createElement('button');
      btn.className = `workspace-row${workspace.id === state.data.activeWorkspaceId ? ' active' : ''}`;
      btn.type = 'button';
      btn.innerHTML = `<span class="workspace-row-icon">${escapeHtml(workspace.icon)}</span><span class="workspace-row-text"><strong>${escapeHtml(workspace.name)}</strong><small>${workspace.type === 'personal' ? 'Личное' : 'Работа'} · ${workspace.nodes.length} элементов</small></span>`;
      btn.addEventListener('click', () => {
        state.data.activeWorkspaceId = workspace.id;
        saveData();
        hideModal('switcherModal');
        renderWorkspace();
      });
      list.appendChild(btn);
    });
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boonwave-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed.workspaces)) throw new Error('invalid');
        state.data = parsed;
        saveData();
        hideModal('profileModal');
        renderWorkspace();
        toast('Данные импортированы');
      } catch { toast('Не удалось прочитать файл'); }
    };
    reader.readAsText(file);
  }

  function bind() {
    $('loginTab').addEventListener('click', () => setAuthMode('login'));
    $('registerTab').addEventListener('click', () => setAuthMode('register'));
    $('authForm').addEventListener('submit', handleAuth);
    $('workspaceForm').addEventListener('submit', createWorkspace);
    $('nodeForm').addEventListener('submit', createNode);

    document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => hideModal(btn.dataset.close)));
    document.querySelectorAll('.space-choice').forEach(btn => btn.addEventListener('click', () => selectSpaceType(btn.dataset.spaceType)));
    document.querySelectorAll('.core-choice').forEach(btn => btn.addEventListener('click', () => openNodeForm(btn.dataset.coreType)));
    document.querySelectorAll('.icon-option').forEach(btn => btn.addEventListener('click', () => {
      state.selectedIcon = btn.dataset.icon;
      document.querySelectorAll('.icon-option').forEach(item => item.classList.toggle('selected', item === btn));
    }));

    $('emptyCreateButton').addEventListener('click', () => currentWorkspace() ? (currentWorkspace().type === 'work' ? showModal('createCoreModal') : showQuickAdd()) : showModal('onboardingModal'));
    $('quickAddButton').addEventListener('click', () => showQuickAdd());
    $('spaceSwitcher').addEventListener('click', () => { renderWorkspaceList(); showModal('switcherModal'); });
    $('addWorkspaceButton').addEventListener('click', () => { hideModal('switcherModal'); showModal('onboardingModal'); });
    $('profileButton').addEventListener('click', () => { $('profileEmail').textContent = state.accountEmail || ''; showModal('profileModal'); });
    $('logoutButton').addEventListener('click', () => { localStorage.removeItem(SESSION_KEY); location.reload(); });
    $('exportButton').addEventListener('click', exportData);
    $('importInput').addEventListener('change', e => importData(e.target.files[0]));
    $('todayButton').addEventListener('click', () => toast('Экран «Сегодня» будет следующим модулем'));
    $('searchButton').addEventListener('click', () => toast('Поиск будет добавлен в следующей версии'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item === btn));
      if (btn.dataset.view !== 'tree') toast(`Раздел «${btn.querySelector('small').textContent}» — следующий этап теста`);
    }));

    window.addEventListener('resize', () => drawConnections(currentWorkspace()?.nodes || []));
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', async () => {
      try {
        await navigator.serviceWorker.register('./sw.js');
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
      } catch (error) {
        console.warn('Service worker registration failed:', error);
      }
    });
  }

  bind();
  registerServiceWorker();
  start();
})();
