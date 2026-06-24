const VERSION = '5.4.6';
const STORAGE_KEY = 'boonwave_state_' + VERSION;
const AUTH_KEY = 'boonwave_auth_' + VERSION;
const ROOT_TYPES = ['project', 'goal', 'person', 'idea'];
const TYPE_LABELS = { project: 'Проект', goal: 'Цель', person: 'Человек', idea: 'Идея', stage: 'Этап' };
const ZONES = ['В работе', 'Ближнее поле', 'Резерв', 'Дальняя полка', 'Архив'];

const els = {
  splash: document.getElementById('splashScreen'),
  auth: document.getElementById('authScreen'),
  app: document.getElementById('app'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  skipAuth: document.getElementById('skipAuth'),
  authTabs: document.querySelectorAll('[data-auth-tab]'),
  spaceBtns: document.querySelectorAll('[data-space]'),
  settingsBtn: document.getElementById('settingsBtn'),
  brandMark: document.getElementById('brandMark'),
  workspaceShell: document.getElementById('workspaceShell'),
  workspaceViewport: document.getElementById('workspaceViewport'),
  workspaceInner: document.getElementById('workspaceInner'),
  dotCanvas: document.getElementById('dotCanvas'),
  linkLayer: document.getElementById('linkLayer'),
  emptyState: document.getElementById('emptyState'),
  createRootBtn: document.getElementById('createRootBtn'),
  fitBtn: document.getElementById('fitBtn'),
  centerBtn: document.getElementById('centerBtn'),
  zoomInBtn: document.getElementById('zoomInBtn'),
  zoomOutBtn: document.getElementById('zoomOutBtn'),
  bottomNav: document.querySelectorAll('.nav-btn'),
  sheetOverlay: document.getElementById('sheetOverlay'),
  sideSheet: document.getElementById('sideSheet'),
  sheetTitle: document.getElementById('sheetTitle'),
  sheetKicker: document.getElementById('sheetKicker'),
  sheetContent: document.getElementById('sheetContent'),
  sheetClose: document.getElementById('sheetClose'),
  modalOverlay: document.getElementById('modalOverlay'),
  editorModal: document.getElementById('editorModal'),
  editorKicker: document.getElementById('editorKicker'),
  editorTitle: document.getElementById('editorTitle'),
  editorBody: document.getElementById('editorBody'),
  editorClose: document.getElementById('editorClose'),
  editorCancel: document.getElementById('editorCancel'),
  editorSave: document.getElementById('editorSave'),
  editorDelete: document.getElementById('editorDelete'),
  createMenu: document.getElementById('createMenu'),
  cardMenu: document.getElementById('cardMenu'),
  settingsMenu: document.getElementById('settingsMenu'),
  imageInput: document.getElementById('imageInput')
};

const ui = {
  currentSheet: null,
  editor: null,
  imageTarget: null,
  selectedNodeId: null,
  activeView: 'tree',
  dragging: null,
  pinchCard: null,
  workspacePointer: null,
  gestureStartDistance: null,
  menuNodeId: null,
  pendingCreateParent: null,
};

function uid(prefix) { return prefix + '_' + Math.random().toString(36).slice(2, 10); }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function safeVibrate(ms = 8) { if (navigator.vibrate) navigator.vibrate(ms); }
function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }
function todayDate() { return new Date().toISOString().slice(0, 10); }
function formatDate(value) { if (!value) return 'без срока'; try { return new Date(value).toLocaleDateString('ru-RU', { day:'2-digit', month:'short' }); } catch { return value; } }
function escapeHtml(str = '') { return String(str).replace(/[&<>"']/g, s => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[s])); }

function iconSvg(id, size = 24) {
  const gradId = `grad_${id}_${Math.random().toString(36).slice(2,7)}`;
  const s = `stroke="url(#${gradId})" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  let body = '';
  switch (Number(id)) {
    case 1: body = `<path ${s} d="M3.6 12s3.8-6.4 8.4-6.4 8.4 6.4 8.4 6.4-3.8 6.4-8.4 6.4S3.6 12 3.6 12Z"/><circle ${s} cx="12" cy="12" r="3.2"/>`; break;
    case 2: body = `<rect ${s} x="4.2" y="4.2" width="15.6" height="15.6" rx="2.8"/><circle ${s} cx="16.5" cy="7.8" r="1.4"/><path ${s} d="M7.2 15l3.6-4.1 3.2 3 2.3-2.6 3.5 3.7"/>`; break;
    case 3: body = `<rect ${s} x="4.2" y="4.2" width="15.6" height="15.6" rx="2.8"/><circle ${s} cx="16.5" cy="7.8" r="1.4"/><path ${s} d="M7.2 15l3.6-4.1 3.2 3 2.3-2.6 1.5 1.6"/><circle ${s} cx="18.6" cy="18.6" r="3.2"/><path ${s} d="M18.6 16.6v4M16.6 18.6h4"/>`; break;
    case 4: body = `<path ${s} d="M6 7.5h12M7.2 7.5v9.4a2 2 0 0 0 2 2h7.6a2 2 0 0 0 2-2V7.5"/><path ${s} d="M5.4 5.2h13.2a1 1 0 0 1 1 1v1.3H4.4V6.2a1 1 0 0 1 1-1Z"/><path ${s} d="M10.1 12h4.2"/>`; break;
    case 5: body = `<path ${s} d="M7 4.4h7l4 4v11.2a1.6 1.6 0 0 1-1.6 1.6H7a1.6 1.6 0 0 1-1.6-1.6V6a1.6 1.6 0 0 1 1.6-1.6Z"/><path ${s} d="M14 4.4v4h4"/><path ${s} d="M8.2 15.3h7.6"/><path ${s} d="M8.2 12.7h7.6"/><path ${s} d="M8.2 17.9h5.4"/>`; break;
    case 6: body = `<path ${s} d="M7 4.4h7l4 4v11.2a1.6 1.6 0 0 1-1.6 1.6H7a1.6 1.6 0 0 1-1.6-1.6V6a1.6 1.6 0 0 1 1.6-1.6Z"/><path ${s} d="M14 4.4v4h4"/><circle ${s} cx="17.8" cy="17.8" r="3"/><path ${s} d="M17.8 15.9v3.8M15.9 17.8h3.8"/>`; break;
    case 7: body = `<circle ${s} cx="12" cy="7" r="3"/><rect ${s} x="5" y="13.4" width="14" height="6.4" rx="3.2"/>`; break;
    case 8: body = `<rect ${s} x="4.5" y="6" width="15" height="13.5" rx="2.6"/><path ${s} d="M8 3.8v3.4M16 3.8v3.4M4.5 10.2h15"/><circle ${s} cx="8.1" cy="14.2" r=".7"/><circle ${s} cx="12" cy="14.2" r=".7"/><circle ${s} cx="15.9" cy="14.2" r=".7"/><circle ${s} cx="8.1" cy="17.1" r=".7"/><circle ${s} cx="12" cy="17.1" r=".7"/><circle ${s} cx="15.9" cy="17.1" r=".7"/>`; break;
    case 9: body = `<circle ${s} cx="12" cy="12" r="8.5"/><path ${s} d="M12 7.6v4.8h3.8"/>`; break;
    case 10: body = `<path ${s} d="M12 20.2a2.2 2.2 0 0 0 2.1-1.8H9.9A2.2 2.2 0 0 0 12 20.2Zm5-4.1H7.1c.4-1 .9-1.5 1.6-2.1.9-.8 1.1-1.7 1.1-3 0-2.3 1.7-4 4.2-4s4.2 1.7 4.2 4c0 1.3.2 2.2 1.1 3 .7.6 1.2 1.1 1.7 2.1Z"/>`; break;
    case 11: body = `<path ${s} d="M12 4.2v10.6"/><path ${s} d="M8.2 11l3.8 3.8 3.8-3.8"/><path ${s} d="M5 19.2h14"/>`; break;
    case 12: body = `<path ${s} d="M5.2 12.4c2.8-1.7 7-6 13-6-2.2 1.6-2.3 5.7-.1 7.5-6 0-10 4-12.9 5.7.3-2 .3-5.3 0-7.2Z"/>`; break;
    case 13: body = `<path ${s} d="M8 8h8M10 8V6.4h4V8M9 8v10.2a1.6 1.6 0 0 0 1.6 1.6h2.8A1.6 1.6 0 0 0 15 18.2V8"/><path ${s} d="M10.8 11v5.1M13.2 11v5.1"/>`; break;
    case 14: body = `<path ${s} d="M8.4 5.9c.8-.8 2-.7 2.8.1l1.1 1.4c.5.6.5 1.5 0 2.1l-1.3 1.4c1.2 2 2.9 3.7 4.9 4.9l1.4-1.3c.6-.5 1.5-.5 2.1 0l1.4 1.1c.8.8.9 2 .1 2.8l-.8.8c-.9.9-2.2 1.2-3.4.8-6.2-2-10.3-6.1-12.3-12.3-.4-1.2-.1-2.5.8-3.4l.8-.8Z"/>`; break;
    case 15: body = `<path ${s} d="M4.8 12.7 18.6 6.8 13.2 20.6l-2.3-4.5-4.7-3.4Z"/><path ${s} d="M18.6 6.8 10.9 16.1"/>`; break;
    case 16: body = `<circle ${s} cx="6.5" cy="12" r="1.2"/><circle ${s} cx="12" cy="12" r="1.2"/><circle ${s} cx="17.5" cy="12" r="1.2"/>`; break;
    case 17: body = `<circle ${s} cx="12" cy="12" r="8.5"/><path ${s} d="M12 10.5v5.2"/><circle ${s} cx="12" cy="7.5" r=".8"/>`; break;
    case 18: body = `<circle ${s} cx="12" cy="12" r="8.5"/><path ${s} d="M12 7.8v8.4M7.8 12h8.4"/>`; break;
    case 19: body = `<path ${s} d="M12 20c4.2-4.4 6.2-7.2 6.2-10a6.2 6.2 0 1 0-12.4 0c0 2.8 2 5.6 6.2 10Z"/><circle ${s} cx="12" cy="10" r="2.1"/><path ${s} d="M6.2 19.4c1.6-1 3.6-1.6 5.8-1.6 2.2 0 4.2.6 5.8 1.6"/>`; break;
    case 20: body = `<path ${s} d="M9.2 20.5v-1.4c0-1.4-.5-2.2-1.7-3.1A6.8 6.8 0 0 1 11.8 4.7c4.1 0 7.4 3.2 7.4 7.3 0 2.4-1.1 4.3-2.9 5.7"/><path ${s} d="M10.2 20.5h1.7"/><path ${s} d="M13.8 7.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6Z"/><path ${s} d="M13.8 9.2v5.6M11 12h5.6"/>`; break;
    case 21: body = `<path ${s} d="M12 4.6a5.6 5.6 0 0 0-3.6 9.9c.9.8 1.4 1.6 1.4 2.6h4.4c0-1 .5-1.8 1.4-2.6A5.6 5.6 0 0 0 12 4.6Z"/><path ${s} d="M10 18h4"/><path ${s} d="M10.5 20.3h3"/>`; break;
    case 22: body = `<circle ${s} cx="12" cy="12" r="8.5"/><path ${s} d="M10 8.8 15.7 12 10 15.2Z"/>`; break;
    case 23: body = `<circle ${s} cx="12" cy="12" r="8.5"/><path ${s} d="M10.2 8.8v6.4M13.8 8.8v6.4"/>`; break;
    case 24: body = `<path ${s} d="M8 5h8M8 19h8M8.4 5v2.5c0 1.4.6 2.7 1.6 3.6l1.6 1.4-1.6 1.4a5 5 0 0 0-1.6 3.7V19M15.6 5v2.5a5 5 0 0 1-1.6 3.6l-1.6 1.4 1.6 1.4a5 5 0 0 1 1.6 3.7V19"/>`; break;
    case 25: body = `<path ${s} d="M12 5.2v4.1"/><circle ${s} cx="12" cy="10.3" r="2.1"/><path ${s} d="M5.5 18.7v-1.1c0-2 1.5-3.5 3.5-3.5h6c2 0 3.5 1.5 3.5 3.5v1.1"/><path ${s} d="M8.6 14.1 12 17.2l3.4-3.1"/>`; break;
    case 26: body = `<path ${s} d="M6 8.5h12"/><path ${s} d="M14.5 5 18 8.5 14.5 12"/><path ${s} d="M18 15.5H6"/><path ${s} d="M9.5 12 6 15.5 9.5 19"/>`; break;
    case 27: body = `<circle ${s} cx="10.6" cy="10.6" r="6.2"/><path ${s} d="M15.2 15.2 19.2 19.2"/>`; break;
    case 28: body = `<path ${s} d="M12 4.8 13.4 6l1.9-.3.8 1.7 1.8.7-.2 1.9 1.3 1.3-1.3 1.3.2 1.9-1.8.7-.8 1.7-1.9-.3L12 19.2l-1.4-1.2-1.9.3-.8-1.7-1.8-.7.2-1.9L5 12l1.3-1.3-.2-1.9 1.8-.7.8-1.7 1.9.3L12 4.8Z"/><circle ${s} cx="12" cy="12" r="2.6"/>`; break;
    case 29: body = `<path ${s} d="M10.3 13.7 8.1 16a3.1 3.1 0 1 1-4.4-4.4L6 9.3"/><path ${s} d="M13.7 10.3 16 8.1a3.1 3.1 0 1 1 4.4 4.4L18 14.7"/><path ${s} d="M8.8 15.2 15.2 8.8"/>`; break;
    case 30: body = `<rect ${s} x="5.4" y="4.8" width="13.8" height="14.4" rx="2.4"/><path ${s} d="M9 8.6 10.1 9.7l1.7-1.9M13.8 8.8h3.5M9 12.3l1.1 1.1 1.7-1.9M13.8 12.5h3.5M9 16l1.1 1.1 1.7-1.9M13.8 16.2h3.5"/>`; break;
    case 31: body = `<path ${s} d="M6 18.1 17.1 7a1.6 1.6 0 0 1 2.2 0l.7.7a1.6 1.6 0 0 1 0 2.2L8.9 21H6v-2.9Z"/><path ${s} d="M15.8 8.3 18.7 11.2"/>`; break;
    case 32: body = `<rect ${s} x="4.4" y="5" width="15.2" height="14" rx="2.5"/><rect ${s} x="6.8" y="7.4" width="5.2" height="4.2" rx="1.1"/><rect ${s} x="13.8" y="7.4" width="3.8" height="4.2" rx="1.1"/><rect ${s} x="6.8" y="13.6" width="4.2" height="3.2" rx="1.1"/><rect ${s} x="12.2" y="13.6" width="5.4" height="3.2" rx="1.1"/>`; break;
    default: body = `<circle ${s} cx="12" cy="12" r="8.5"/>`;
  }
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><defs><linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#c85cff"/><stop offset="56%" stop-color="#6d67ff"/><stop offset="100%" stop-color="#67e9f8"/></linearGradient></defs>${body}</svg>`;
}

function mountIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    el.innerHTML = iconSvg(el.dataset.icon, 22);
  });
  document.querySelectorAll('.icon-button').forEach(btn => {
    if (btn.id === 'sheetClose' || btn.id === 'editorClose') return;
  });
}

function defaultTask(text, days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return { id: uid('task'), text, done: false, due: d.toISOString().slice(0,10), reminder: true };
}

function createInitialState() {
  const projectId = uid('project');
  const personId = uid('person');
  const ideaId = uid('idea');
  const goalId = uid('goal');
  const stageId = uid('stage');
  const linkId = uid('plink');
  const workNodes = [
    { id: uid('node'), entityType:'project', entityId:projectId, x: 120, y: 140, collapsed: true, selected: false, root: true },
    { id: uid('node'), entityType:'person', entityId:personId, x: 420, y: 160, collapsed: false, selected: false, root: true },
    { id: uid('node'), entityType:'stage', entityId:stageId, x: 410, y: 390, collapsed: false, selected: false, root: false },
    { id: uid('node'), entityType:'idea', entityId:ideaId, x: 720, y: 120, collapsed: false, selected: false, root: true }
  ];
  return {
    currentSpace: 'work',
    transform: { scale: 1, x: 0, y: 0 },
    spaces: {
      work: { name: 'Проекты', nodes: workNodes, links: [ { from: workNodes[0].id, to: workNodes[1].id, type:'project-person' }, { from: workNodes[0].id, to: workNodes[2].id, type:'project-stage' }, { from: workNodes[0].id, to: workNodes[3].id, type:'project-idea' } ] },
      personal: { name: 'Личное', nodes: [ { id: uid('node'), entityType:'goal', entityId: goalId, x: 180, y: 190, collapsed: false, selected:false, root:true } ], links: [] }
    },
    projects: {
      [projectId]: {
        id: projectId,
        title: 'Кинетический светильник',
        subtitle: 'Лобби / латунь и мягкий свет',
        status: 'В работе',
        priority: 'Высокий',
        address: 'Москва, отель / лобби',
        photo: '',
        notes: 'Корневой проект. В свёрнутом состоянии отображается как иконка на основе фото.',
        tasks: [defaultTask('Согласовать концепцию с клиентом', 1), defaultTask('Подготовить тестовый образец', 4)],
        tags: ['свет', 'латунь', 'лобби']
      }
    },
    people: {
      [personId]: {
        id: personId,
        title: 'Антон',
        profession: 'Литьё латуни',
        location: 'Москва',
        phone: '+7 999 000-00-00',
        email: 'anton@example.com',
        website: '',
        instagram: '@anton_cast',
        telegram: '@anton_cast',
        note: 'Компактное визуальное резюме с поисковыми тегами и быстрыми действиями.',
        zone: 'Ближнее поле',
        photo: '',
        works: [],
        tags: ['латунь', 'литьё', 'металл', 'скульптура', 'малый тираж'],
        technologies: 'Литьё, патинирование, шлифовка',
        prices: 'от 25 000 ₽ за серию деталей'
      }
    },
    ideas: {
      [ideaId]: {
        id: ideaId,
        title: 'Тёплый градиент света',
        subtitle: 'Идея для драматичной подсветки',
        note: 'Идея может быть связана с несколькими проектами.',
        tags: ['референс', 'свет', 'атмосфера']
      }
    },
    goals: {
      [goalId]: {
        id: goalId,
        title: 'Здоровье и режим',
        subtitle: 'Личное пространство',
        note: 'Личная цель может жить отдельно от проектов.',
        tags: ['сон', 'спорт', 'режим']
      }
    },
    stages: {
      [stageId]: {
        id: stageId,
        title: 'Тестовый образец',
        subtitle: 'Этап производства',
        tasks: [defaultTask('Подготовить чертёж', 2), defaultTask('Отправить фото образца', 6)],
        status: 'В работе',
        note: 'Этап автоматически связан с проектом.'
      }
    },
    projectPeople: {
      [linkId]: {
        id: linkId,
        projectId,
        personId,
        role: 'Изготовление латунных элементов',
        payment: '50% аванс / 50% после приёмки',
        comment: 'Нужно согласовать образцы патинирования.',
        tasks: [defaultTask('Изготовить тестовый образец', 4), defaultTask('Прислать образцы патинирования', 6), defaultTask('Подготовить заказ к 15 июля', 8)]
      }
    }
  };
}

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return createInitialState();
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function getSpace() { return state.spaces[state.currentSpace]; }
function getNodes() { return getSpace().nodes; }
function getLinks() { return getSpace().links; }
function getNode(id) { return getNodes().find(n => n.id === id); }
function getEntity(node) {
  if (!node) return null;
  return state[node.entityType + 's']?.[node.entityId] || (node.entityType === 'person' ? state.people[node.entityId] : null);
}
function getProjectPersonLink(projectId, personId) {
  return Object.values(state.projectPeople).find(x => x.projectId === projectId && x.personId === personId) || null;
}
function roots() { return getNodes().filter(n => n.root); }

function startApp() {
  els.splash.classList.add('hidden');
  const auth = localStorage.getItem(AUTH_KEY);
  if (auth === 'ok') showApp(); else els.auth.classList.remove('hidden');
}

function showApp() {
  els.auth.classList.add('hidden');
  els.app.classList.remove('hidden');
  if (!state.transform) state.transform = { scale: 1, x: 0, y: 0 };
  renderAll();
}

function loginSuccess() {
  localStorage.setItem(AUTH_KEY, 'ok');
  showApp();
}

function renderAll() {
  mountIcons(document);
  renderTopbar();
  renderWorkspace();
  renderCurrentSheet();
}

function renderTopbar() {
  els.spaceBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.space === state.currentSpace));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === ui.activeView));
}

function renderWorkspace() {
  const space = getSpace();
  els.workspaceInner.innerHTML = '';
  els.linkLayer.innerHTML = '';
  if (!space.nodes.length) els.emptyState.classList.remove('hidden'); else els.emptyState.classList.add('hidden');
  space.nodes.forEach(node => {
    const entity = getEntity(node);
    const card = document.createElement('article');
    card.className = 'node touchable' + (node.collapsed ? ' collapsed' : '') + (ui.selectedNodeId === node.id ? ' selected' : '');
    card.dataset.nodeId = node.id;
    card.style.left = node.x + 'px';
    card.style.top = node.y + 'px';
    card.innerHTML = node.collapsed ? renderCollapsedNode(node, entity) : renderExpandedNode(node, entity);
    attachNodeEvents(card, node);
    mountIcons(card);
    els.workspaceInner.appendChild(card);
  });
  applyTransform();
  requestAnimationFrame(() => {
    drawLinks();
    drawDots();
  });
}

function statusPill(text) { return `<span class="status-pill">${escapeHtml(text || '')}</span>`; }

function renderCollapsedNode(node, entity) {
  const photo = entity?.photo;
  const placeholderIcon = node.entityType === 'person' ? 7 : node.entityType === 'idea' ? 21 : node.entityType === 'goal' ? 21 : 32;
  return `
    <div class="collapsed-wrap">
      <div class="node-collapsed-photo ${photo ? 'has-image' : ''}">
        ${photo ? `<img src="${photo}" alt="">` : `<div class="placeholder-icon" data-icon="${placeholderIcon}"></div>`}
      </div>
      <div class="collapsed-label">${escapeHtml(entity?.title || TYPE_LABELS[node.entityType])}</div>
    </div>
  `;
}

function renderExpandedNode(node, entity) {
  const photo = entity?.photo;
  const photoRound = node.entityType === 'person';
  const tagHtml = (entity?.tags || []).slice(0, 5).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const projectLink = node.entityType === 'person' ? findFirstProjectLinkForPerson(entity?.id) : null;
  const quickProjectPanel = node.entityType === 'person' && projectLink ? renderProjectPanel(projectLink) : '';
  const taskPanel = node.entityType === 'project' ? renderTaskPanel(entity?.tasks || [], 'Задачи проекта') : node.entityType === 'stage' ? renderTaskPanel(entity?.tasks || [], 'Задачи этапа') : '';
  const works = node.entityType === 'person' && entity?.works?.length ? `
    <div class="photo-strip">${entity.works.slice(0,3).map(src => `<div class="photo-thumb"><img src="${src}" alt=""></div>`).join('')}</div>` : '';
  const note = entity?.note || entity?.notes || '';

  return `
    <div class="node-head">
      <div class="node-photo ${photoRound ? 'round' : ''} ${photo ? 'has-image' : ''}">
        ${photo ? `<img src="${photo}" alt="">` : `<div class="placeholder-icon" data-icon="${node.entityType === 'person' ? 7 : node.entityType === 'idea' ? 21 : node.entityType === 'goal' ? 21 : 32}"></div>`}
      </div>
      <div class="node-meta">
        <div class="node-kicker">${TYPE_LABELS[node.entityType]}</div>
        <h3 class="node-title">${escapeHtml(entity?.title || 'Без названия')}</h3>
        <div class="node-subtitle">${escapeHtml(entity?.subtitle || entity?.profession || entity?.location || '')}</div>
        <div class="node-tags">${tagHtml}</div>
      </div>
    </div>
    ${node.entityType === 'person' ? `<div class="node-actions" style="margin-top:12px"><span class="person-zone">${escapeHtml(entity?.zone || 'Ближнее поле')}</span>${entity?.phone ? '<span class="inline-pill">'+escapeHtml(entity.phone)+'</span>' : ''}</div>` : ''}
    ${node.entityType === 'project' ? `<div class="node-actions" style="margin-top:12px">${statusPill(entity?.status || 'В работе')}${statusPill(entity?.priority || 'Средний')}</div>` : ''}
    ${node.entityType === 'project' ? `<div class="node-stats"><div class="stat-box"><small>Адрес</small><b>${escapeHtml(entity?.address || 'не указан')}</b></div><div class="stat-box"><small>Связи</small><b>${countConnections(node.id)}</b></div></div>` : ''}
    ${node.entityType === 'person' ? `<div class="node-actions" style="margin-top:12px"><span class="inline-pill">${escapeHtml(entity?.location || '')}</span><span class="inline-pill">${escapeHtml(entity?.prices || '')}</span></div>` : ''}
    ${works}
    ${note ? `<div class="note-box">${escapeHtml(note)}</div>` : ''}
    ${quickProjectPanel}
    ${taskPanel}
    <div class="node-actions">
      <button class="node-mini-btn touchable" data-node-action="view" title="Посмотреть"><span class="action-icon" data-icon="1"></span></button>
      <button class="node-mini-btn touchable" data-node-action="edit" title="Редактировать"><span class="action-icon" data-icon="31"></span></button>
      ${node.entityType === 'project' ? `<button class="node-mini-btn touchable" data-node-action="photo" title="Добавить фото"><span class="action-icon" data-icon="3"></span></button>` : ''}
      ${node.entityType === 'person' ? `<button class="node-mini-btn touchable" data-node-action="linkProject" title="Привязать к проекту"><span class="action-icon" data-icon="29"></span></button>` : ''}
      ${node.entityType === 'project' ? `<button class="node-mini-btn touchable" data-node-action="addStage" title="Добавить этап"><span class="action-icon" data-icon="18"></span></button>` : ''}
      <button class="node-mini-btn touchable" data-node-action="collapse" title="Свернуть"><span class="action-icon" data-icon="23"></span></button>
      <button class="node-mini-btn touchable" data-node-action="menu" title="Ещё"><span class="action-icon" data-icon="16"></span></button>
    </div>
    <div class="helper-hint">Жест: двумя пальцами на карточке разведите в стороны — откроется полный режим.</div>
  `;
}

function renderTaskPanel(tasks, title) {
  if (!tasks?.length) return '';
  return `<div class="project-task-list"><div class="panel-title"><b>${title}</b><span class="inline-pill">${tasks.filter(t => t.done).length}/${tasks.length}</span></div>${tasks.slice(0,4).map(t => `<div class="task-row ${t.done ? 'done':''}" data-toggle-task="${t.id}"><div class="task-check"></div><div class="task-main"><div class="task-text">${escapeHtml(t.text)}</div><div class="task-meta"><span>${formatDate(t.due)}</span>${t.reminder ? '<span>напомнить</span>':''}</div></div></div>`).join('')}</div>`;
}

function renderProjectPanel(link) {
  const tasks = link.tasks || [];
  return `<div class="linked-project-panel"><div class="panel-title"><b>Задачи в проекте</b><span class="inline-pill">${escapeHtml(link.role || '')}</span></div>${tasks.slice(0,4).map(t => `<div class="task-row ${t.done ? 'done':''}"><div class="task-check"></div><div class="task-main"><div class="task-text">${escapeHtml(t.text)}</div><div class="task-meta"><span>${formatDate(t.due)}</span></div></div></div>`).join('')}<div class="note-box" style="margin-top:8px">Оплата: ${escapeHtml(link.payment || 'не указана')}</div></div>`;
}

function findFirstProjectLinkForPerson(personId) {
  return Object.values(state.projectPeople).find(l => l.personId === personId) || null;
}
function countConnections(nodeId) { return getLinks().filter(l => l.from === nodeId || l.to === nodeId).length; }

function attachNodeEvents(card, node) {
  let startX = 0, startY = 0, nodeStartX = 0, nodeStartY = 0, dragging = false;
  card.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    ui.selectedNodeId = node.id;
    renderWorkspace();
    startX = e.clientX; startY = e.clientY; nodeStartX = node.x; nodeStartY = node.y; dragging = true;
    card.setPointerCapture(e.pointerId);
    safeVibrate(6);
  });
  card.addEventListener('pointermove', e => {
    if (!dragging) return;
    node.x = nodeStartX + (e.clientX - startX) / state.transform.scale;
    node.y = nodeStartY + (e.clientY - startY) / state.transform.scale;
    card.style.left = node.x + 'px';
    card.style.top = node.y + 'px';
    drawLinks();
  });
  const endDrag = () => { if (dragging) saveState(); dragging = false; };
  card.addEventListener('pointerup', endDrag); card.addEventListener('pointercancel', endDrag);

  card.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      const [a,b] = e.touches;
      ui.pinchCard = node.id;
      ui.gestureStartDistance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }
  }, { passive: true });
  card.addEventListener('touchmove', e => {
    if (ui.pinchCard !== node.id || e.touches.length !== 2 || !ui.gestureStartDistance) return;
    const [a,b] = e.touches;
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (dist - ui.gestureStartDistance > 36) {
      if (node.collapsed) node.collapsed = false; else openEditor(node.id, 'detail');
      ui.pinchCard = null; ui.gestureStartDistance = null;
      safeVibrate(12); saveState(); renderWorkspace();
    }
  }, { passive: true });
  card.addEventListener('touchend', () => { ui.pinchCard = null; ui.gestureStartDistance = null; }, { passive: true });

  card.addEventListener('click', e => {
    const btn = e.target.closest('[data-node-action]');
    if (!btn) {
      ui.selectedNodeId = node.id;
      return;
    }
    safeVibrate(8);
    const action = btn.dataset.nodeAction;
    if (action === 'edit') openEditor(node.id, 'edit');
    if (action === 'view') openEditor(node.id, 'detail');
    if (action === 'collapse') { node.collapsed = true; saveState(); renderWorkspace(); }
    if (action === 'photo') { pickImage({ scope:'node', nodeId: node.id }); }
    if (action === 'menu') openCardMenu(node.id, btn);
    if (action === 'addStage') createStageLinked(node.id);
    if (action === 'linkProject') openLinkPersonMenu(node.id, btn);
  });

  card.querySelectorAll('[data-toggle-task]').forEach(row => {
    row.addEventListener('click', e => {
      const taskId = row.dataset.toggleTask;
      toggleTaskByNode(node, taskId);
      e.stopPropagation();
    });
  });
}

function toggleTaskByNode(node, taskId) {
  const entity = getEntity(node);
  let task = entity?.tasks?.find(t => t.id === taskId);
  if (!task && node.entityType === 'person') {
    const link = findFirstProjectLinkForPerson(entity.id);
    task = link?.tasks?.find(t => t.id === taskId);
  }
  if (task) { task.done = !task.done; saveState(); renderAll(); safeVibrate(10); }
}

function drawLinks() {
  const space = getSpace();
  const rect = els.workspaceShell.getBoundingClientRect();
  els.linkLayer.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
  els.linkLayer.innerHTML = '';
  space.links.forEach(link => {
    const a = getNode(link.from); const b = getNode(link.to);
    if (!a || !b) return;
    const ap = getAnchorPoint(a); const bp = getAnchorPoint(b);
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const dx = Math.abs(bp.x - ap.x);
    const curve = Math.max(40, dx * .35);
    p.setAttribute('d', `M ${ap.x} ${ap.y} C ${ap.x + curve} ${ap.y}, ${bp.x - curve} ${bp.y}, ${bp.x} ${bp.y}`);
    if (link.type.includes('idea')) p.classList.add('secondary');
    els.linkLayer.appendChild(p);
  });
}

function getAnchorPoint(node) {
  const el = els.workspaceInner.querySelector(`[data-node-id="${node.id}"]`);
  if (!el) return { x: node.x, y: node.y };
  const rect = el.getBoundingClientRect();
  const shell = els.workspaceShell.getBoundingClientRect();
  return { x: rect.left - shell.left + rect.width/2, y: rect.top - shell.top + rect.height/2 };
}

function drawDots() {
  const canvas = els.dotCanvas;
  const rect = els.workspaceShell.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,rect.width,rect.height);
  const step = 24;
  ctx.fillStyle = 'rgba(115, 147, 255, .14)';
  for (let x = step; x < rect.width; x += step) {
    for (let y = step; y < rect.height; y += step) {
      ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function applyTransform() {
  const t = state.transform;
  els.workspaceInner.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
}

function fitNodes(nodes) {
  if (!nodes.length) return;
  const bounds = calcBounds(nodes);
  const shell = els.workspaceShell.getBoundingClientRect();
  const padding = 50;
  const scale = clamp(Math.min((shell.width - padding*2) / Math.max(bounds.w, 180), (shell.height - padding*2) / Math.max(bounds.h, 180)), .55, 1.35);
  state.transform.scale = scale;
  state.transform.x = (shell.width - bounds.w * scale) / 2 - bounds.minX * scale;
  state.transform.y = (shell.height - bounds.h * scale) / 2 - bounds.minY * scale;
  saveState(); renderWorkspace();
}

function calcBounds(nodes) {
  const margins = nodes.map(n => ({ x1: n.x, y1: n.y, x2: n.x + (n.collapsed ? 120 : 280), y2: n.y + (n.collapsed ? 140 : 240) }));
  return {
    minX: Math.min(...margins.map(m => m.x1)), minY: Math.min(...margins.map(m => m.y1)),
    maxX: Math.max(...margins.map(m => m.x2)), maxY: Math.max(...margins.map(m => m.y2)),
    get w() { return this.maxX - this.minX; }, get h() { return this.maxY - this.minY; }
  };
}

function focusRootGraph() {
  const root = roots()[0];
  if (!root) return fitNodes(getNodes());
  const connected = new Set([root.id]);
  let changed = true;
  while (changed) {
    changed = false;
    getLinks().forEach(l => {
      if (connected.has(l.from) && !connected.has(l.to)) { connected.add(l.to); changed = true; }
      if (connected.has(l.to) && !connected.has(l.from)) { connected.add(l.from); changed = true; }
    });
  }
  fitNodes(getNodes().filter(n => connected.has(n.id)));
}

function zoomBy(delta) {
  state.transform.scale = clamp(state.transform.scale + delta, .45, 1.6);
  saveState(); renderWorkspace();
}

function renderCurrentSheet() {
  if (!ui.currentSheet) return closeSheet();
  const sheet = ui.currentSheet;
  els.sheetOverlay.classList.remove('hidden');
  els.sideSheet.classList.remove('hidden');
  if (sheet === 'today') {
    els.sheetKicker.textContent = 'Актуально'; els.sheetTitle.textContent = 'Сегодня';
    els.sheetContent.innerHTML = renderTodayList();
  } else if (sheet === 'results') {
    els.sheetKicker.textContent = 'Завершения'; els.sheetTitle.textContent = 'Результаты';
    els.sheetContent.innerHTML = renderResultsList();
  } else if (sheet === 'archive') {
    els.sheetKicker.textContent = 'Система'; els.sheetTitle.textContent = 'Архив';
    els.sheetContent.innerHTML = renderArchiveList();
  }
}

function closeSheet() {
  ui.currentSheet = null;
  els.sheetOverlay.classList.add('hidden');
  els.sideSheet.classList.add('hidden');
}

function renderTodayList() {
  const items = collectAllTasks().filter(t => !t.done).sort((a,b) => (a.due || '').localeCompare(b.due || ''));
  if (!items.length) return `<div class="list-card"><h3>Сегодня пусто</h3><p>Нет активных задач с напоминаниями. Создайте их внутри проекта, этапа или проектной связи человека.</p></div>`;
  return items.map(t => `<div class="list-card"><h3>${escapeHtml(t.title)}</h3><p>${escapeHtml(t.context)}</p><div class="task-meta" style="margin-top:8px"><span>${formatDate(t.due)}</span>${t.reminder ? '<span>есть напоминание</span>':''}</div></div>`).join('');
}
function renderResultsList() {
  const items = collectAllTasks().filter(t => t.done);
  if (!items.length) return `<div class="list-card"><h3>Пока ничего не завершено</h3><p>Отмеченные задачи появятся здесь.</p></div>`;
  return items.map(t => `<div class="list-card"><h3>${escapeHtml(t.title)}</h3><p>${escapeHtml(t.context)}</p></div>`).join('');
}
function renderArchiveList() {
  const people = Object.values(state.people).filter(p => p.zone === 'Архив' || p.zone === 'Дальняя полка');
  if (!people.length) return `<div class="list-card"><h3>Архив пока пуст</h3><p>Сюда можно отправлять неактуальные связи, людей и проекты.</p></div>`;
  return people.map(p => `<div class="list-card"><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.profession || '')} · ${escapeHtml(p.zone)}</p></div>`).join('');
}

function collectAllTasks() {
  const out = [];
  Object.values(state.projects).forEach(p => (p.tasks || []).forEach(task => out.push({ ...task, title: task.text, context: `Проект · ${p.title}` })));
  Object.values(state.stages).forEach(s => (s.tasks || []).forEach(task => out.push({ ...task, title: task.text, context: `Этап · ${s.title}` })));
  Object.values(state.projectPeople).forEach(l => {
    const project = state.projects[l.projectId], person = state.people[l.personId];
    (l.tasks || []).forEach(task => out.push({ ...task, title: task.text, context: `Связь · ${person?.title || 'Человек'} → ${project?.title || 'Проект'}` }));
  });
  return out;
}

function openEditor(nodeId, mode = 'edit') {
  const node = getNode(nodeId); const entity = getEntity(node); if (!node || !entity) return;
  ui.editor = { nodeId, mode, entityType: node.entityType };
  els.modalOverlay.classList.remove('hidden');
  els.editorModal.classList.remove('hidden');
  els.editorKicker.textContent = mode === 'detail' ? 'Просмотр' : 'Редактирование';
  els.editorTitle.textContent = TYPE_LABELS[node.entityType] + ' · ' + (entity.title || '');
  els.editorDelete.classList.toggle('hidden', mode === 'detail');
  els.editorSave.classList.toggle('hidden', mode === 'detail');
  buildEditorForm(node, entity, mode);
}

function closeEditor() { ui.editor = null; els.modalOverlay.classList.add('hidden'); els.editorModal.classList.add('hidden'); }

function buildEditorForm(node, entity, mode) {
  const disabled = mode === 'detail' ? 'disabled' : '';
  const commonPhoto = node.entityType === 'project' || node.entityType === 'person';
  const isPerson = node.entityType === 'person';
  const isProject = node.entityType === 'project';
  const isStage = node.entityType === 'stage';
  const isIdea = node.entityType === 'idea';
  const isGoal = node.entityType === 'goal';
  const photoCircle = isPerson ? ' circle' : '';
  let html = `<div class="field-grid ${isPerson || isProject ? 'cols-2' : ''}">`;
  html += `<div class="field"><label>Название</label><input class="input" data-field="title" value="${escapeHtml(entity.title || '')}" ${disabled}></div>`;
  html += `<div class="field"><label>${isPerson ? 'Профессия / специализация' : 'Подзаголовок'}</label><input class="input" data-field="${isPerson ? 'profession' : 'subtitle'}" value="${escapeHtml(isPerson ? (entity.profession || '') : (entity.subtitle || ''))}" ${disabled}></div>`;
  if (isProject) {
    html += `<div class="field"><label>Статус</label><select class="select" data-field="status" ${disabled}>${['В работе','На паузе','Ожидание','Выполнено'].map(s => `<option ${entity.status===s?'selected':''}>${s}</option>`).join('')}</select></div>`;
    html += `<div class="field"><label>Приоритет</label><select class="select" data-field="priority" ${disabled}>${['Высокий','Средний','Низкий'].map(s => `<option ${entity.priority===s?'selected':''}>${s}</option>`).join('')}</select></div>`;
    html += `<div class="field"><label>Адрес объекта</label><input class="input" data-field="address" value="${escapeHtml(entity.address || '')}" ${disabled}></div>`;
  }
  if (isPerson) {
    html += `<div class="field"><label>Город / география</label><input class="input" data-field="location" value="${escapeHtml(entity.location || '')}" ${disabled}></div>`;
    html += `<div class="field"><label>Телефон</label><input class="input" data-field="phone" value="${escapeHtml(entity.phone || '')}" ${disabled}></div>`;
    html += `<div class="field"><label>Email</label><input class="input" data-field="email" value="${escapeHtml(entity.email || '')}" ${disabled}></div>`;
    html += `<div class="field"><label>Сайт</label><input class="input" data-field="website" value="${escapeHtml(entity.website || '')}" ${disabled}></div>`;
    html += `<div class="field"><label>Instagram</label><input class="input" data-field="instagram" value="${escapeHtml(entity.instagram || '')}" ${disabled}></div>`;
    html += `<div class="field"><label>Telegram</label><input class="input" data-field="telegram" value="${escapeHtml(entity.telegram || '')}" ${disabled}></div>`;
    html += `<div class="field"><label>Зона внимания</label><select class="select" data-field="zone" ${disabled}>${ZONES.map(s => `<option ${entity.zone===s?'selected':''}>${s}</option>`).join('')}</select></div>`;
    html += `<div class="field"><label>Ориентировочные цены</label><input class="input" data-field="prices" value="${escapeHtml(entity.prices || '')}" ${disabled}></div>`;
    html += `<div class="field"><label>Материалы / технологии</label><input class="input" data-field="technologies" value="${escapeHtml(entity.technologies || '')}" ${disabled}></div>`;
  }
  html += `</div>`;
  if (commonPhoto) {
    html += `<div class="media-picker"><div class="media-preview${photoCircle}">${entity.photo ? `<img src="${entity.photo}" alt="">` : `<div class="placeholder-icon" data-icon="${isPerson ? 7 : 32}"></div>`}</div><div><label>${isProject ? 'Фото карточки проекта' : 'Фото человека'}</label><div class="media-actions">${mode === 'detail' ? '' : `<button type="button" class="mini-action touchable" data-editor-action="photo">Добавить фото</button><button type="button" class="mini-action touchable" data-editor-action="clearPhoto">Убрать</button>`}</div></div></div>`;
  }
  if (isPerson) html += `<div class="field"><label>Теги (через запятую)</label><input class="input" data-field="tagsCsv" value="${escapeHtml((entity.tags || []).join(', '))}" ${disabled}></div>`;
  if (isProject || isGoal || isIdea || isStage) html += `<div class="field"><label>${isProject ? 'Заметка проекта' : 'Заметка'}</label><textarea class="textarea" data-field="${isProject ? 'notes' : 'note'}" ${disabled}>${escapeHtml(isProject ? (entity.notes || '') : (entity.note || ''))}</textarea></div>`;
  if (isPerson) html += `<div class="field"><label>Короткая заметка</label><textarea class="textarea" data-field="note" ${disabled}>${escapeHtml(entity.note || '')}</textarea></div>`;
  if (isProject || isStage) html += renderTaskEditor(entity.tasks || [], mode === 'detail');
  if (isPerson) html += renderProjectLinksEditor(entity.id, mode === 'detail');
  els.editorBody.innerHTML = html;
  mountIcons(els.editorBody);
  bindEditorActions(node, entity, mode);
}

function renderTaskEditor(tasks, readonly) {
  return `<div class="field-stack"><label>Задачи</label><div class="task-list-editor">${tasks.map(task => `<div class="task-editor-row" data-task-row="${task.id}"><input type="checkbox" ${task.done ? 'checked' : ''} ${readonly ? 'disabled' : ''}><input class="task-input" value="${escapeHtml(task.text)}" ${readonly ? 'disabled' : ''}><input type="date" value="${task.due || ''}" ${readonly ? 'disabled' : ''}><button type="button" class="mini-action touchable ${readonly ? 'hidden' : ''}" data-remove-task="${task.id}">×</button></div>`).join('')}</div>${readonly ? '' : '<button type="button" class="mini-action touchable" data-editor-action="addTask">+ Задача</button>'}</div>`;
}

function renderProjectLinksEditor(personId, readonly) {
  const links = Object.values(state.projectPeople).filter(l => l.personId === personId);
  if (!links.length) return `<div class="field-stack"><label>Проектные связи</label><div class="note-box">Этот человек пока не привязан ни к одному проекту.</div></div>`;
  return `<div class="field-stack"><label>Проектные связи</label>${links.map(link => {
    const project = state.projects[link.projectId];
    return `<div class="linked-project-panel"><div class="panel-title"><b>${escapeHtml(project?.title || 'Проект')}</b><span class="inline-pill">${escapeHtml(link.role || '')}</span></div><div class="note-box" style="margin:0 0 10px 0">Оплата: ${escapeHtml(link.payment || 'не указана')}</div><div class="task-list-editor">${(link.tasks || []).map(task => `<div class="task-editor-row" data-link-task-row="${link.id}:${task.id}"><input type="checkbox" ${task.done ? 'checked' : ''} ${readonly ? 'disabled' : ''}><input class="task-input" value="${escapeHtml(task.text)}" ${readonly ? 'disabled' : ''}><input type="date" value="${task.due || ''}" ${readonly ? 'disabled' : ''}></div>`).join('')}</div></div>`;
  }).join('')}</div>`;
}

function bindEditorActions(node, entity, mode) {
  if (mode === 'detail') return;
  els.editorBody.querySelectorAll('[data-editor-action="photo"]').forEach(btn => btn.onclick = () => pickImage({ scope:'node', nodeId: node.id, inEditor:true }));
  els.editorBody.querySelectorAll('[data-editor-action="clearPhoto"]').forEach(btn => btn.onclick = () => { entity.photo = ''; saveState(); buildEditorForm(node, entity, mode); renderWorkspace(); });
  els.editorBody.querySelectorAll('[data-editor-action="addTask"]').forEach(btn => btn.onclick = () => {
    if (!entity.tasks) entity.tasks = [];
    entity.tasks.push(defaultTask('Новая задача', 1));
    buildEditorForm(node, entity, mode);
  });
  els.editorBody.querySelectorAll('[data-remove-task]').forEach(btn => btn.onclick = () => {
    entity.tasks = (entity.tasks || []).filter(t => t.id !== btn.dataset.removeTask);
    buildEditorForm(node, entity, mode);
  });
}

function saveEditor() {
  if (!ui.editor) return;
  const { nodeId, entityType } = ui.editor;
  const node = getNode(nodeId); const entity = getEntity(node);
  els.editorBody.querySelectorAll('[data-field]').forEach(field => {
    const name = field.dataset.field;
    if (name === 'tagsCsv') entity.tags = field.value.split(',').map(s => s.trim()).filter(Boolean);
    else entity[name] = field.value;
  });
  if (entity.tasks) {
    els.editorBody.querySelectorAll('[data-task-row]').forEach(row => {
      const id = row.dataset.taskRow;
      const task = entity.tasks.find(t => t.id === id);
      if (!task) return;
      const inputs = row.querySelectorAll('input');
      task.done = inputs[0].checked;
      task.text = inputs[1].value;
      task.due = inputs[2].value;
    });
  }
  if (entityType === 'person') {
    els.editorBody.querySelectorAll('[data-link-task-row]').forEach(row => {
      const [linkId, taskId] = row.dataset.linkTaskRow.split(':');
      const link = state.projectPeople[linkId]; const task = link?.tasks?.find(t => t.id === taskId);
      if (!task) return;
      const inputs = row.querySelectorAll('input');
      task.done = inputs[0].checked; task.text = inputs[1].value; task.due = inputs[2].value;
    });
  }
  saveState(); closeEditor(); renderAll(); safeVibrate(12);
}

function deleteCurrentNode() {
  if (!ui.editor) return;
  const nodeId = ui.editor.nodeId;
  const space = getSpace();
  space.nodes = space.nodes.filter(n => n.id !== nodeId);
  space.links = space.links.filter(l => l.from !== nodeId && l.to !== nodeId);
  closeEditor(); saveState(); renderAll();
}

function openCardMenu(nodeId, btnEl) {
  const node = getNode(nodeId); const entity = getEntity(node);
  ui.menuNodeId = nodeId;
  els.cardMenu.innerHTML = `
    <button class="menu-item touchable" data-card-menu="toggle">${node.collapsed ? '<span class="menu-item-icon" data-icon="22"></span><span>Развернуть</span>' : '<span class="menu-item-icon" data-icon="23"></span><span>Свернуть</span>'}</button>
    <button class="menu-item touchable" data-card-menu="center"><span class="menu-item-icon" data-icon="19"></span><span>В центр</span></button>
    ${node.entityType === 'person' ? `<button class="menu-item touchable" data-card-menu="remind"><span class="menu-item-icon" data-icon="10"></span><span>Напоминание</span></button>` : ''}
    <button class="menu-item touchable" data-card-menu="archive"><span class="menu-item-icon" data-icon="4"></span><span>${node.entityType === 'person' ? 'В дальнюю полку' : 'В архив'}</span></button>
    <button class="menu-item touchable danger" data-card-menu="delete"><span class="menu-item-icon" data-icon="13"></span><span>Удалить</span></button>
  `;
  mountIcons(els.cardMenu);
  positionMenu(els.cardMenu, btnEl.getBoundingClientRect());
  els.cardMenu.classList.remove('hidden');
  els.cardMenu.querySelectorAll('[data-card-menu]').forEach(btn => btn.onclick = () => {
    const act = btn.dataset.cardMenu;
    if (act === 'toggle') { node.collapsed = !node.collapsed; }
    if (act === 'center') focusNodes([node]);
    if (act === 'archive' && node.entityType === 'person') entity.zone = entity.zone === 'Дальняя полка' ? 'Ближнее поле' : 'Дальняя полка';
    if (act === 'archive' && node.entityType !== 'person') node.archived = !node.archived;
    if (act === 'delete') { getSpace().nodes = getSpace().nodes.filter(n => n.id !== nodeId); getSpace().links = getSpace().links.filter(l => l.from !== nodeId && l.to !== nodeId); }
    if (act === 'remind') alert('Напоминание будет добавлено в следующем шаге. Сейчас логика проектных задач уже работает.');
    closeFloatingMenus(); saveState(); renderAll();
  });
}

function openLinkPersonMenu(nodeId, btnEl) {
  const personNode = getNode(nodeId); const person = getEntity(personNode);
  const projectNodes = getNodes().filter(n => n.entityType === 'project');
  els.cardMenu.innerHTML = projectNodes.length ? projectNodes.map(n => {
    const project = getEntity(n);
    return `<button class="menu-item touchable" data-link-project="${n.entityId}"><span class="menu-item-icon" data-icon="29"></span><span>${escapeHtml(project.title)}</span></button>`;
  }).join('') : `<div class="menu-version">Сначала создайте проект</div>`;
  mountIcons(els.cardMenu);
  positionMenu(els.cardMenu, btnEl.getBoundingClientRect());
  els.cardMenu.classList.remove('hidden');
  els.cardMenu.querySelectorAll('[data-link-project]').forEach(btn => btn.onclick = () => {
    const projectId = btn.dataset.linkProject;
    const existing = getProjectPersonLink(projectId, person.id);
    if (!existing) {
      const linkId = uid('plink');
      state.projectPeople[linkId] = { id: linkId, projectId, personId: person.id, role: 'Новая роль', payment: '', comment: '', tasks: [defaultTask('Новая задача', 3)] };
      const projectNode = getNodes().find(n => n.entityType === 'project' && n.entityId === projectId);
      if (projectNode) getLinks().push({ from: projectNode.id, to: personNode.id, type:'project-person' });
    }
    closeFloatingMenus(); saveState(); renderAll();
  });
}

function positionMenu(menu, triggerRect) {
  menu.style.left = 'auto'; menu.style.right = '16px'; menu.style.top = 'auto';
  const vw = window.innerWidth, vh = window.innerHeight;
  requestAnimationFrame(() => {
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    let left = clamp(triggerRect.right - mw, 12, vw - mw - 12);
    let top = clamp(triggerRect.bottom + 8, 12, vh - mh - 12);
    menu.style.left = left + 'px'; menu.style.top = top + 'px';
  });
}

function focusNodes(nodes) {
  if (!nodes.length) return;
  fitNodes(nodes);
}

function closeFloatingMenus() {
  els.createMenu.classList.add('hidden');
  els.cardMenu.classList.add('hidden');
  els.settingsMenu.classList.add('hidden');
}

function createRoot(type) {
  const entityId = uid(type);
  const nodeId = uid('node');
  const base = { title: TYPE_LABELS[type], tags: [] };
  if (type === 'project') state.projects[entityId] = { id: entityId, title: 'Новый проект', subtitle: 'Опишите задачу', status: 'В работе', priority: 'Средний', address: '', notes: '', photo: '', tasks: [defaultTask('Первая задача', 2)], tags: ['проект'] };
  if (type === 'person') state.people[entityId] = { id: entityId, title: 'Новый человек', profession: 'Специализация', location: '', phone: '', email: '', website: '', instagram: '', telegram: '', note: '', zone: 'Ближнее поле', photo: '', works: [], tags: ['контакт'], technologies: '', prices: '' };
  if (type === 'goal') state.goals[entityId] = { id: entityId, title: 'Новая цель', subtitle: 'Сформулируйте результат', note: '', tags: ['цель'] };
  if (type === 'idea') state.ideas[entityId] = { id: entityId, title: 'Новая идея', subtitle: 'Сохранённая идея', note: '', tags: ['идея'] };
  getNodes().push({ id: nodeId, entityType: type, entityId, x: 120 + getNodes().length * 70, y: 130 + getNodes().length * 50, collapsed: type === 'project', root: true });
  saveState(); closeFloatingMenus(); renderAll();
  openEditor(nodeId, 'edit');
}

function createStageLinked(projectNodeId) {
  const projectNode = getNode(projectNodeId);
  if (!projectNode || projectNode.entityType !== 'project') return;
  const stageId = uid('stage');
  state.stages[stageId] = { id: stageId, title: 'Новый этап', subtitle: 'Этап проекта', tasks: [defaultTask('Задача этапа', 3)], status: 'В работе', note: '' };
  const nodeId = uid('node');
  getNodes().push({ id: nodeId, entityType:'stage', entityId: stageId, x: projectNode.x + 300, y: projectNode.y + 180, collapsed: false, root: false });
  getLinks().push({ from: projectNodeId, to: nodeId, type: 'project-stage' });
  saveState(); renderAll(); openEditor(nodeId, 'edit');
}

function pickImage(target) { ui.imageTarget = target; els.imageInput.value = ''; els.imageInput.click(); }
function handleImagePick(file) {
  if (!file || !ui.imageTarget) return;
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const target = ui.imageTarget;
    if (target.scope === 'node') {
      const node = getNode(target.nodeId); const entity = getEntity(node);
      entity.photo = dataUrl;
      if (node.entityType === 'person') entity.works = [dataUrl].concat((entity.works || []).slice(0,2));
      saveState(); renderAll();
      if (target.inEditor && ui.editor?.nodeId === target.nodeId) buildEditorForm(node, entity, ui.editor.mode);
    }
    ui.imageTarget = null;
  };
  reader.readAsDataURL(file);
}

function fullReset() {
  if (!confirm('Удалить все локальные данные BOONWAVE на этом устройстве?')) return;
  localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(AUTH_KEY);
  state = createInitialState(); closeFloatingMenus(); closeEditor(); closeSheet(); showApp(); saveState();
}

function initEvents() {
  setTimeout(startApp, 1500);
  mountIcons(document);
  els.authTabs.forEach(btn => btn.addEventListener('click', () => {
    els.authTabs.forEach(b => b.classList.toggle('active', b === btn));
    const isLogin = btn.dataset.authTab === 'login';
    els.loginForm.classList.toggle('hidden', !isLogin);
    els.registerForm.classList.toggle('hidden', isLogin);
  }));
  els.loginForm.addEventListener('submit', e => { e.preventDefault(); loginSuccess(); });
  els.registerForm.addEventListener('submit', e => { e.preventDefault(); loginSuccess(); });
  els.skipAuth.addEventListener('click', () => { loginSuccess(); });
  els.spaceBtns.forEach(btn => btn.addEventListener('click', () => { state.currentSpace = btn.dataset.space; closeSheet(); closeFloatingMenus(); renderAll(); focusRootGraph(); saveState(); }));
  els.createRootBtn.addEventListener('click', e => { closeFloatingMenus(); positionMenu(els.createMenu, e.currentTarget.getBoundingClientRect()); els.createMenu.classList.toggle('hidden'); });
  els.createMenu.querySelectorAll('[data-create-type]').forEach(btn => btn.addEventListener('click', () => createRoot(btn.dataset.createType)));
  els.settingsBtn.addEventListener('click', e => { closeFloatingMenus(); positionMenu(els.settingsMenu, e.currentTarget.getBoundingClientRect()); els.settingsMenu.classList.toggle('hidden'); });
  els.brandMark.addEventListener('click', () => focusRootGraph());
  els.settingsMenu.querySelectorAll('[data-settings-action]').forEach(btn => btn.addEventListener('click', () => { const a = btn.dataset.settingsAction; if (a === 'logout') { localStorage.removeItem(AUTH_KEY); location.reload(); } if (a === 'reset') fullReset(); closeFloatingMenus(); }));
  els.fitBtn.addEventListener('click', () => fitNodes(getNodes()));
  els.centerBtn.addEventListener('click', () => focusRootGraph());
  els.zoomInBtn.addEventListener('click', () => zoomBy(.12));
  els.zoomOutBtn.addEventListener('click', () => zoomBy(-.12));
  let panStart = null;
  els.workspaceViewport.addEventListener('pointerdown', e => {
    if (e.target.closest('.node')) return;
    panStart = { x: e.clientX, y: e.clientY, tx: state.transform.x, ty: state.transform.y };
  });
  els.workspaceViewport.addEventListener('pointermove', e => {
    if (!panStart) return;
    state.transform.x = panStart.tx + (e.clientX - panStart.x);
    state.transform.y = panStart.ty + (e.clientY - panStart.y);
    applyTransform();
    drawLinks();
  });
  const stopPan = () => { if (panStart) { saveState(); renderWorkspace(); } panStart = null; };
  els.workspaceViewport.addEventListener('pointerup', stopPan);
  els.workspaceViewport.addEventListener('pointercancel', stopPan);
  els.bottomNav.forEach(btn => btn.addEventListener('click', () => {
    ui.activeView = btn.dataset.view;
    if (ui.activeView === 'tree') closeSheet(); else { ui.currentSheet = ui.activeView; renderCurrentSheet(); }
    renderTopbar();
  }));
  els.sheetOverlay.addEventListener('click', () => closeSheet());
  els.sheetClose.addEventListener('click', () => closeSheet());
  els.modalOverlay.addEventListener('click', () => closeEditor());
  els.editorClose.addEventListener('click', () => closeEditor());
  els.editorCancel.addEventListener('click', () => closeEditor());
  els.editorSave.addEventListener('click', () => saveEditor());
  els.editorDelete.addEventListener('click', () => deleteCurrentNode());
  els.imageInput.addEventListener('change', e => handleImagePick(e.target.files?.[0]));
  window.addEventListener('resize', () => { renderWorkspace(); });
  document.addEventListener('click', e => {
    if (!e.target.closest('.floating-menu') && !e.target.closest('#createRootBtn') && !e.target.closest('#settingsBtn') && !e.target.closest('[data-node-action="menu"]')) closeFloatingMenus();
  });
  document.querySelectorAll('.touchable').forEach(el => {
    el.addEventListener('pointerdown', () => el.classList.add('pressed'));
    el.addEventListener('pointerup', () => el.classList.remove('pressed'));
    el.addEventListener('pointercancel', () => el.classList.remove('pressed'));
  });
}

initEvents();
