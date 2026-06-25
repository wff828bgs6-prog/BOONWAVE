"use strict";

const VERSION = "6.0.8";
const THEME_KEY = "boonwave_theme";
const ACCOUNTS_KEY = "boonwave_v6_accounts";
const SESSION_KEY = "boonwave_v6_session";
const DATA_PREFIX = "boonwave_v6_data_";
const GUEST_ID = "visual-demo";
const WORLD_W = 3600;
const WORLD_H = 2600;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const uid = () => crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`;
const clone = value => JSON.parse(JSON.stringify(value));
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const money = value => value === "" || value == null ? "—" : `${Number(value || 0).toLocaleString("ru-RU")} ₽`;
const todayISO = () => new Date().toISOString().slice(0, 10);

const TYPE_LABELS = {
  project: "Проект",
  process: "Рабочий процесс",
  person: "Человек",
  idea: "Идея",
  goal: "Цель"
};

const STATUS_LABELS = {
  preparation: "Подготовка",
  active: "В работе",
  paused: "На паузе",
  done: "Завершён",
  cancelled: "Отменён"
};

function icon(name, className = "") {
  const common = `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="${className}"`;
  const paths = {
    tree: `<path d="M5 5h5v5H5zM14 4h5v5h-5zM9 15h6v5H9z"/><path d="M7.5 10v2.2c0 1 .8 1.8 1.8 1.8H12m4.5-5v3.2c0 1-.8 1.8-1.8 1.8H12"/>`,
    today: `<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5l3.5 2"/>`,
    results: `<path d="M6 19V9m6 10V5m6 14v-7"/><path d="m5 7 4-3 3 2 6-4"/>`,
    archive: `<path d="M4 7h16v3H4zM6 10v9h12v-9M9 14h6"/>`,
    open: `<path d="M2.8 12s3.2-5 9.2-5 9.2 5 9.2 5-3.2 5-9.2 5-9.2-5-9.2-5Z"/><circle cx="12" cy="12" r="2.4"/>`,
    branch: `<circle cx="6" cy="5" r="2"/><circle cx="18" cy="7" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 5h3a4 4 0 0 1 4 4v7M15 9h1"/>`,
    expand: `<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>`,
    project: `<path d="M4 7.5h16v12H4z"/><path d="M8 7.5V5h8v2.5M4 12h16M10 12v2h4v-2"/>`,
    process: `<path d="M5 5h6v5H5zM13 14h6v5h-6z"/><path d="M11 7.5h3a3 3 0 0 1 3 3V14M9 10v4a3 3 0 0 0 3 3h1"/>`,
    person: `<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6"/>`,
    idea: `<path d="M9 17h6M10 20h4"/><path d="M8.2 14.5C6.8 13.4 6 11.7 6 9.8A6 6 0 0 1 18 10c0 1.8-.8 3.4-2.2 4.5-.6.5-.8 1-.8 1.5H9c0-.5-.2-1-.8-1.5Z"/>`,
    goal: `<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="m12 12 6-6"/>`,
    files: `<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/>`,
    image: `<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 2-2 5 5"/>`,
    task: `<circle cx="12" cy="12" r="8.5"/><path d="m8.2 12 2.4 2.4 5.2-5.4"/>`,
    people: `<circle cx="9" cy="8" r="2.5"/><circle cx="16" cy="9" r="2"/><path d="M4 19c.6-3.5 2.2-5.2 5-5.2s4.4 1.7 5 5.2M14 14.5c2.7-.4 4.5 1 5 4.5"/>`,
    budget: `<circle cx="12" cy="12" r="8.5"/><path d="M9 9.2h4.2a2 2 0 0 1 0 4H10m2-6v9.5"/>`,
    focus: `<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/><circle cx="12" cy="12" r="3"/>`,
    export: `<path d="M12 3v12m0-12-4 4m4-4 4 4"/><path d="M5 13v7h14v-7"/>`,
    import: `<path d="M12 15V3m0 12-4-4m4 4 4-4"/><path d="M5 13v7h14v-7"/>`,
    logout: `<path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10"/>`,
    trash: `<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>`,
    plus: `<path d="M12 5v14M5 12h14"/>`,
    calendar: `<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>`,
    link: `<path d="M9.5 14.5 8 16a3 3 0 0 1-4-4l3-3a3 3 0 0 1 4 0M14.5 9.5 16 8a3 3 0 1 1 4 4l-3 3a3 3 0 0 1-4 0M9 12h6"/>`,
    restore: `<path d="M4 8v5h5"/><path d="M5.5 13a7 7 0 1 0 2-6"/>`,
    phone: `<path d="M7 3h3l1.2 4-2 1.6a15 15 0 0 0 6.2 6.2l1.6-2L21 14v3c0 2-1 3-3 3C10.3 20 4 13.7 4 6c0-2 1-3 3-3Z"/>`,
    mail: `<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>`,
    sun: `<circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/>`,
    moon: `<path d="M20.5 14.2A8 8 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/>`
  };
  return `<svg ${common}>${paths[name] || paths.open}</svg>`;
}

function hydrateStaticIcons() {
  $$('[data-icon]').forEach(element => { element.innerHTML = icon(element.dataset.icon); });
}

const state = {
  userId: null,
  data: null,
  space: "work",
  selectedId: null,
  camera: { tx: 0, ty: 0, scale: 1 },
  canvasPointers: new Map(),
  canvasGesture: null,
  lastCanvasTap: 0,
  lastCardTap: { id: null, time: 0 },
  activeNodeId: null,
  assetTargetNodeId: null,
  assetViewerNodeId: null,
  assetViewerIndex: 0,
  objectUrls: new Map(),
  editDraft: null,
  processActionsUnlocked: false,
  coverPositionDraft: null,
  coverPositionMode: "2",
  selectedProcessStageId: null,
  expandedProcessTaskId: null,
  taskDraft: null,
  stageEditDraft: null,
  quickCoverNodeId: null,
  phonebookEditId: null,
  detailScrollTop: 0,
  isReloadingForWorker: false
};

function blankData() {
  return {
    version: VERSION,
    spaces: { personal: { name: "Личное" }, work: { name: "Проекты" } },
    nodes: [],
    links: [],
    settings: { hintDismissed: false },
    updatedAt: Date.now()
  };
}

function demoData() {
  const projectId = uid();
  const processId = uid();
  const personId = uid();
  const ideaId = uid();
  const goalId = uid();
  const due = todayISO();
  return {
    version: VERSION,
    spaces: { personal: { name: "Личное" }, work: { name: "Проекты" } },
    nodes: [
      {
        id: projectId, type: "project", space: "work", x: 1540, y: 990, level: 2,
        title: "Светильники для ресторана", client: "Cihan", address: "Москва",
        status: "active", priority: "high", deadline: due, budget: 1850000, advance: 900000,
        balance: 950000, positions: 12, signDate: "2026-06-18", progress: 38,
        note: "Кинетические световые объекты для основного зала и входной группы.",
        assets: [], archived: false
      },
      {
        id: processId, type: "process", space: "work", x: 1900, y: 1005, level: 2,
        title: "Производство и монтаж", projectId, status: "active", progress: 36,
        stages: [
          { id: uid(), title: "Проектирование", progress: 80, deadline: due },
          { id: uid(), title: "Производство корпусов", progress: 35, deadline: "2026-07-05" },
          { id: uid(), title: "Монтаж", progress: 0, deadline: "2026-07-18" }
        ],
        tasks: [
          { id: uid(), title: "Согласовать финальный свет", due, done: false, personId },
          { id: uid(), title: "Передать DXF на фрезеровку", due: "2026-06-27", done: false, personId },
          { id: uid(), title: "Проверить образец корпуса", due: "2026-06-23", done: true, personId }
        ],
        peopleIds: [personId],
        expenses: [{ id: uid(), title: "Алюминий и фрезеровка", amount: 74000, date: due }],
        assets: [], archived: false
      },
      {
        id: personId, type: "person", space: "work", x: 1830, y: 1290, level: 1,
        title: "Антон", speciality: "3D-печать и прототипы", zone: "В работе",
        phone: "+7 900 000-00-00", email: "anton@example.com", social: "@anton.maker",
        tags: "3D-печать, прототипы, пластик", note: "Быстро собирает сложные тестовые узлы.",
        status: "active", assets: [], archived: false
      },
      {
        id: ideaId, type: "idea", space: "work", x: 1260, y: 1260, level: 1,
        title: "Живая световая волна", source: "Pinterest", url: "", tags: "кинетика, свет, волна",
        note: "Использовать мягкое дыхание света в зоне ожидания.", status: "active", assets: [], archived: false
      },
      {
        id: goalId, type: "goal", space: "personal", x: 1580, y: 1060, level: 2,
        title: "Собрать личную систему", deadline: "2026-07-15", progress: 24,
        metric: "Рабочая неделя без хаоса", note: "Объединить дела, покупки, встречи и документы.",
        status: "active", assets: [], archived: false
      }
    ],
    links: [
      { id: uid(), a: projectId, b: processId, kind: "process" },
      { id: uid(), a: processId, b: personId, kind: "person" },
      { id: uid(), a: projectId, b: ideaId, kind: "idea" }
    ],
    settings: { hintDismissed: false },
    updatedAt: Date.now()
  };
}

function storageKey() { return `${DATA_PREFIX}${state.userId}`; }
function saveData() {
  if (!state.data || !state.userId) return;
  state.data.version = VERSION;
  state.data.updatedAt = Date.now();
  localStorage.setItem(storageKey(), JSON.stringify(state.data));
}
function loadData(userId, useDemo = false) {
  const raw = localStorage.getItem(`${DATA_PREFIX}${userId}`);
  if (raw) {
    try { return normalizeData(JSON.parse(raw)); } catch (error) { console.warn("Invalid saved data", error); }
  }
  return useDemo ? demoData() : blankData();
}
function normalizeData(data) {
  const base = blankData();
  const normalized = { ...base, ...data };
  normalized.nodes = Array.isArray(data.nodes) ? data.nodes.map(node => {
    const normalizedNode = { level: 2, assets: [], archived: false, status: "active", ...node };
    if (normalizedNode.type === "process") {
      normalizedNode.stages = Array.isArray(normalizedNode.stages) ? normalizedNode.stages : [];
      normalizedNode.phonebook = Array.isArray(normalizedNode.phonebook) ? normalizedNode.phonebook : [];
      const fallbackStageId = normalizedNode.stages[0]?.id || "";
      normalizedNode.tasks = Array.isArray(normalizedNode.tasks) ? normalizedNode.tasks.map(task => {
        const normalizedTask = { priority: "medium", note: "", contactIds: [], scheduleMode: "date", intervalStart: "", intervalEnd: "", dateTime: "", reminder: "15", notify: false, stageId: task.stageId || fallbackStageId, ...task };
        if ((!normalizedTask.contactIds || !normalizedTask.contactIds.length) && Array.isArray(task.contacts)) {
          normalizedTask.contactIds = task.contacts.map(contact => {
            const existing = normalizedNode.phonebook.find(item => item.phone === contact.phone && item.name === contact.name);
            if (existing) return existing.id;
            const record = { id: uid(), role: contact.role || "", name: contact.name || "", phone: contact.phone || "", carNumber: task.carNumber || "", address: task.address || "", comment: task.extraComment || "" };
            normalizedNode.phonebook.push(record); return record.id;
          });
        }
        delete normalizedTask.contacts; delete normalizedTask.carNumber; delete normalizedTask.address; delete normalizedTask.extraComment;
        return normalizedTask;
      }) : [];
    }
    return normalizedNode;
  }) : [];
  normalized.links = Array.isArray(data.links) ? data.links : [];
  normalized.settings = { ...base.settings, ...(data.settings || {}) };
  return normalized;
}
function currentNodes(includeArchived = false) {
  return state.data.nodes.filter(node => node.space === state.space && (includeArchived || !node.archived));
}
function nodeById(id) { return state.data.nodes.find(node => node.id === id); }
function linkNodesFor(id) {
  return state.data.links.filter(link => link.a === id || link.b === id).map(link => nodeById(link.a === id ? link.b : link.a)).filter(Boolean);
}
function cardDims(node) {
  if ((node.level || 2) === 1) return { w: 128, h: 128 };
  if ((node.level || 2) === 3) return { w: 310, h: 224 };
  return { w: 230, h: 154 };
}
function screenToWorld(x, y) {
  return { x: (x - state.camera.tx) / state.camera.scale, y: (y - state.camera.ty) / state.camera.scale };
}

/* IndexedDB asset storage */
let dbPromise;
function openAssetDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open("boonwave-v6-assets", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("assets")) db.createObjectStore("assets", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}
async function putAsset(record) {
  const db = await openAssetDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("assets", "readwrite");
    tx.objectStore("assets").put(record);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
async function getAsset(id) {
  const db = await openAssetDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction("assets", "readonly").objectStore("assets").get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}
async function deleteAssetRecord(id) {
  const db = await openAssetDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("assets", "readwrite");
    tx.objectStore("assets").delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
async function clearAssetDB() {
  const db = await openAssetDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("assets", "readwrite");
    tx.objectStore("assets").clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
async function assetUrl(assetId) {
  if (state.objectUrls.has(assetId)) return state.objectUrls.get(assetId);
  const record = await getAsset(assetId);
  if (!record?.blob) return null;
  const url = URL.createObjectURL(record.blob);
  state.objectUrls.set(assetId, url);
  return url;
}
function releaseObjectUrl(assetId) {
  const url = state.objectUrls.get(assetId);
  if (url) URL.revokeObjectURL(url);
  state.objectUrls.delete(assetId);
}

/* Theme */
function getTheme() { return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"; }
function applyTheme(theme, persist = true) {
  const value = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = value;
  document.documentElement.style.colorScheme = value;
  if (persist) localStorage.setItem(THEME_KEY, value);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", value === "light" ? "#f5f7fb" : "#06070c");
  const status = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (status) status.setAttribute("content", value === "light" ? "default" : "black-translucent");
  updateThemeControl();
  requestAnimationFrame(drawDots);
}
function updateThemeControl() {
  const isLight = document.documentElement.dataset.theme === "light";
  const row = document.querySelector('[data-menu-action="theme"]');
  if (!row) return;
  const iconSlot = row.querySelector('[data-icon]');
  if (iconSlot) { iconSlot.dataset.icon = isLight ? "moon" : "sun"; iconSlot.innerHTML = icon(isLight ? "moon" : "sun"); }
  const title = document.getElementById("themeMenuTitle");
  const hint = document.getElementById("themeMenuHint");
  if (title) title.textContent = isLight ? "Тёмная тема" : "Светлая тема";
  if (hint) hint.textContent = isLight ? "Переключить на тёмное оформление" : "Переключить на светлое оформление";
  row.classList.toggle("is-light", isLight);
}
function toggleTheme() {
  applyTheme(getTheme() === "light" ? "dark" : "light");
  navigator.vibrate?.(10);
  toast(document.documentElement.dataset.theme === "light" ? "Светлая тема включена" : "Тёмная тема включена");
}
applyTheme(getTheme(), false);

/* Onboarding */
function accounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || []; } catch { return []; }
}
function setAccounts(list) { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list)); }
function session() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function setSession(record) { localStorage.setItem(SESSION_KEY, JSON.stringify(record)); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

function initializeOnboarding() {
  hydrateStaticIcons();
  updateThemeControl();
  const debugDemo = new URLSearchParams(location.search).get("demo") === "1";
  const existing = session();
  const delay = debugDemo ? 10 : 1900;
  setTimeout(() => {
    $("#splashScreen").classList.add("leaving");
    setTimeout(() => {
      $("#splashScreen").classList.add("hidden");
      if (debugDemo) enterApp({ id: GUEST_ID, name: "Визуальное знакомство", mode: "guest" }, true);
      else if (existing?.id) enterApp(existing, existing.id === GUEST_ID);
      else $("#authScreen").classList.remove("hidden");
    }, debugDemo ? 10 : 420);
  }, delay);

  $$('[data-auth-tab]').forEach(button => button.addEventListener("click", () => {
    $$('[data-auth-tab]').forEach(item => item.classList.toggle("active", item === button));
    const login = button.dataset.authTab === "login";
    $("#loginForm").classList.toggle("hidden", !login);
    $("#registerForm").classList.toggle("hidden", login);
  }));

  $("#registerForm").addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim().toLowerCase();
    const list = accounts();
    if (list.some(item => item.email === email)) return toast("Аккаунт с таким email уже существует");
    const account = { id: uid(), name: String(form.get("name")).trim(), email, password: String(form.get("password")) };
    list.push(account); setAccounts(list);
    const user = { id: account.id, name: account.name, email: account.email, mode: "registered" };
    setSession(user); enterApp(user, false);
  });

  $("#loginForm").addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim().toLowerCase();
    const password = String(form.get("password"));
    const account = accounts().find(item => item.email === email && item.password === password);
    if (!account) return toast("Email или пароль не совпадают");
    const user = { id: account.id, name: account.name, email: account.email, mode: "registered" };
    setSession(user); enterApp(user, false);
  });

  $("#skipAuth").addEventListener("click", () => {
    const user = { id: GUEST_ID, name: "Визуальное знакомство", mode: "guest" };
    setSession(user); enterApp(user, true);
  });
}

function enterApp(user, useDemo) {
  state.userId = user.id;
  state.data = loadData(user.id, useDemo);
  state.space = "work";
  state.selectedId = null;
  $("#authScreen").classList.add("hidden");
  $("#app").setAttribute("aria-hidden", "false");
  $("#app").classList.remove("app-hidden");
  requestAnimationFrame(() => $("#app").classList.add("app-ready"));
  $("#accountLabel").textContent = user.name || user.email || "Локальный аккаунт";
  bindWorkspaceOnce();
  render();
  requestAnimationFrame(() => {
    if (currentNodes().length) fitAll(false);
    else centerCamera();
    if (!state.data.settings.hintDismissed) $("#gestureHint").classList.remove("hidden");
  });
}

let workspaceBound = false;
function bindWorkspaceOnce() {
  if (workspaceBound) return;
  workspaceBound = true;
  const viewport = $("#canvasViewport");
  viewport.addEventListener("pointerdown", onCanvasPointerDown);
  viewport.addEventListener("pointermove", onCanvasPointerMove);
  viewport.addEventListener("pointerup", onCanvasPointerEnd);
  viewport.addEventListener("pointercancel", onCanvasPointerEnd);
  window.addEventListener("resize", () => { drawDots(); applyCamera(); });

  $$('.space-switch button').forEach(button => button.addEventListener("click", () => switchSpace(button.dataset.space)));
  $("#createButton").addEventListener("click", toggleCreateMenu);
  $("#fitButton").addEventListener("click", () => fitAll(true));
  $("#brandHome").addEventListener("click", () => fitAll(true));
  $("#menuButton").addEventListener("click", () => showOverlay("accountMenu"));
  $("#scrim").addEventListener("click", closeOverlays);
  $$('[data-close-sheet]').forEach(button => button.addEventListener("click", closeOverlays));
  $("#createActions").addEventListener("click", handleCreateAction);
  $("#accountMenu").addEventListener("click", handleMenuAction);
  $("#cardLayer").addEventListener("click", handleCardActionClick);
  $("#detailEditButton").addEventListener("click", () => {
    const node = nodeById(state.activeNodeId); if (node) openEditor(node);
  });
  $("#detailBranchButton").addEventListener("click", () => {
    const node = nodeById(state.activeNodeId); if (node) createBranchFor(node);
  });
  $("#editorForm").addEventListener("submit", saveEditor);
  $$('[data-editor-close]').forEach(button => button.addEventListener("click", closeEditor));
  $("#archiveNodeButton").addEventListener("click", archiveActiveNode);
  $("#assetInput").addEventListener("change", handleAssetFiles);
  $("#processCoverInput").addEventListener("change", handleProcessCoverFile);
  $("#processCoverScale").addEventListener("input", updateProcessCoverPreview);
  $("#processCoverReset").addEventListener("click", resetProcessCoverPosition);
  $("#processCoverApply").addEventListener("click", applyProcessCoverPosition);
  bindProcessCoverPositioning();
  bindProcessActionLock();
  $("#taskEditorForm").addEventListener("submit", saveTaskEditor);
  $("#taskEditorClose").addEventListener("click", closeTaskEditor);
  $("#taskEditorCancel").addEventListener("click", closeTaskEditor);
  $("#taskScheduleMode").addEventListener("change", updateTaskScheduleFields);
  $("#stageEditorForm").addEventListener("submit", saveStageEditor);
  $("#stageEditorClose").addEventListener("click", closeStageEditor);
  $("#stageDeleteButton").addEventListener("click", openStageDeleteConfirm);
  $("#stageDeleteClose").addEventListener("click", closeStageDeleteConfirm);
  $("#stageDeleteNo").addEventListener("click", cancelStageDelete);
  $("#stageDeleteYes").addEventListener("click", confirmStageDelete);
  $("#budgetEditorForm").addEventListener("submit", saveBudgetEditor);
  $("#budgetEditorClose").addEventListener("click", closeBudgetEditor);
  $("#coverQuickClose").addEventListener("click", closeCoverQuickMenu);
  $("#coverQuickNew").addEventListener("click", startQuickNewCover);
  $("#coverQuickPosition").addEventListener("click", startQuickPositionCover);
  $("#detailBody").addEventListener("dblclick", event => { const target=event.target.closest("[data-budget-edit]"); const node=nodeById(state.activeNodeId); if(target && node?.type==="process"){event.preventDefault();openBudgetEditor(node);} });
  $("#phonebookClose").addEventListener("click", closePhonebook);
  $("#phonebookAdd").addEventListener("click", () => renderPhonebookEditor(null));
  $("#phonebookBody").addEventListener("click", handlePhonebookClick);
  $("#phonebookEditorForm").addEventListener("submit", savePhonebookContact);
  $("#phonebookEditorCancel").addEventListener("click", () => renderPhonebookList(nodeById(state.activeNodeId)));
  $("#importInput").addEventListener("change", importDataFile);
  $("#assetClose").addEventListener("click", () => $("#assetViewer").close());
  $("#assetPrev").addEventListener("click", () => moveAssetViewer(-1));
  $("#assetNext").addEventListener("click", () => moveAssetViewer(1));
  $("#assetShare").addEventListener("click", shareCurrentAsset);
  $("#assetDownload").addEventListener("click", downloadCurrentAsset);
  $("#assetDelete").addEventListener("click", deleteCurrentAsset);
  $("#detailBody").addEventListener("click", handleDetailClick);
  $("#panelBody").addEventListener("click", handlePanelClick);
  $$('.bottom-nav button').forEach(button => button.addEventListener("click", () => openPanel(button.dataset.panel)));
  $('[data-action="dismissHint"]').addEventListener("click", () => {
    state.data.settings.hintDismissed = true; saveData(); $("#gestureHint").classList.add("hidden");
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) saveData(); });
  window.addEventListener("beforeunload", saveData);
}

/* Rendering */
function render() {
  renderCards();
  renderLinks();
  renderEmptyState();
  updateSpaceSwitch();
  applyCamera();
}
function updateSpaceSwitch() {
  $$('.space-switch button').forEach(button => button.classList.toggle("active", button.dataset.space === state.space));
}
function renderEmptyState() {
  $("#emptyState").classList.toggle("hidden", currentNodes().length > 0);
}
function switchSpace(space) {
  if (space === state.space) return;
  state.space = space; state.selectedId = null;
  render(); requestAnimationFrame(() => currentNodes().length ? fitAll(false) : centerCamera());
}
function cardClass(node) {
  const level = node.level || 2;
  const statusClass = node.status === "paused" ? "status-paused" : node.status === "done" ? "status-done" : node.status === "cancelled" ? "status-cancelled" : "";
  return `node-card ${level === 1 ? "compact" : level === 3 ? "expanded" : "medium"} ${statusClass} ${state.selectedId === node.id ? "selected" : ""}`;
}
function nodeSubtitle(node) {
  if (node.type === "project") return node.client || node.address || "Новый проект";
  if (node.type === "process") return `${(node.stages || []).length} этапа · ${(node.tasks || []).filter(task => !task.done).length} задач`;
  if (node.type === "person") return node.speciality || "Специалист";
  if (node.type === "idea") return node.source || "Сохранённая идея";
  return node.metric || (node.deadline ? `до ${node.deadline}` : "Личная цель");
}
function visualIcon(node) { return icon(node.type === "process" ? "process" : node.type); }
function metricHtml(iconName, value) { return `<span class="metric">${icon(iconName)}<span>${esc(value)}</span></span>`; }
function nodeMetrics(node) {
  if (node.type === "project") {
    const files = (node.assets || []).length;
    const process = state.data.nodes.find(item => item.type === "process" && item.projectId === node.id && !item.archived);
    return metricHtml("files", files) + metricHtml("task", process ? (process.tasks || []).filter(task => !task.done).length : 0) + metricHtml("budget", node.budget ? money(node.budget) : "—");
  }
  if (node.type === "process") return metricHtml("task", (node.tasks || []).filter(task => !task.done).length) + metricHtml("people", (node.peopleIds || []).length) + metricHtml("budget", (node.expenses || []).reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString("ru-RU"));
  if (node.type === "person") return metricHtml("link", (node.tags || "").split(",").filter(Boolean).length) + metricHtml("task", tasksForPerson(node.id).filter(task => !task.done).length);
  if (node.type === "idea") return metricHtml("image", (node.assets || []).length) + metricHtml("link", linkNodesFor(node.id).length);
  return metricHtml("calendar", node.deadline || "без срока") + metricHtml("results", `${node.progress || 0}%`);
}
function renderCards() {
  const layer = $("#cardLayer");
  layer.innerHTML = "";
  currentNodes().forEach(node => {
    const article = document.createElement("article");
    article.className = cardClass(node);
    article.dataset.id = node.id;
    article.dataset.type = node.type;
    article.style.left = `${node.x}px`;
    article.style.top = `${node.y}px`;
    const cover = node.coverAssetId ? `data-cover-id="${esc(node.coverAssetId)}" data-cover-node="${esc(node.id)}"` : "";
    const progress = Number(node.progress || (node.type === "project" ? 0 : 0));
    article.innerHTML = `
      <div class="card-shell">
        <div class="card-visual" ${cover}>
          <div class="card-visual-placeholder">${visualIcon(node)}</div>
          <span class="card-type-pill">${esc(TYPE_LABELS[node.type].toUpperCase())}</span>
          <span class="card-status-dot"></span>
        </div>
        <div class="card-content">
          <div class="card-title-row"><h3 class="card-title">${esc(node.title || TYPE_LABELS[node.type])}</h3></div>
          <p class="card-subtitle">${esc(nodeSubtitle(node))}</p>
          <div class="card-metrics">${nodeMetrics(node)}</div>
          <div class="card-progress"><span style="width:${clamp(progress, 0, 100)}%"></span></div>
          ${node.type === "process" ? `<div class="process-quick"><input data-expense-title placeholder="Затрата"><input data-expense-amount inputmode="decimal" placeholder="Сумма"><button data-card-action="quickExpense">+</button></div>` : ""}
        </div>
      </div>
      <div class="card-actions">
        <button class="card-action" data-card-action="open" aria-label="Открыть">${icon("open")}</button>
        <button class="card-action primary-action" data-card-action="branch" aria-label="Создать ветвь">${icon("branch")}</button>
        <button class="card-action" data-card-action="expand" aria-label="Изменить размер">${icon("expand")}</button>
      </div>`;
    attachCardGestures(article, node);
    layer.appendChild(article);
  });
  hydrateCardCovers();
}
async function hydrateCardCovers() {
  for (const visual of $$('[data-cover-id]', $("#cardLayer"))) {
    const id = visual.dataset.coverId;
    const url = await assetUrl(id).catch(() => null);
    if (url && visual.isConnected) {
      visual.style.backgroundImage = `url("${url}")`;
      const node = nodeById(visual.dataset.coverNode);
      if (node?.type === "process") {
        const position = processCoverPosition(node, String(node.level || 2));
        visual.style.backgroundPosition = `calc(50% + ${Number(position.x || 0)}%) calc(50% + ${Number(position.y || 0)}%)`;
        visual.style.backgroundSize = `${Math.max(100, Number(position.scale || 1) * 100)}%`;
      }
      visual.querySelector(".card-visual-placeholder")?.remove();
    }
  }
}
function renderLinks() {
  const svg = $("#linkLayer");
  svg.innerHTML = `<defs><linearGradient id="linkGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a14eff"/><stop offset=".55" stop-color="#6177ff"/><stop offset="1" stop-color="#55dcec"/></linearGradient></defs>`;
  state.data.links.forEach(link => {
    const a = nodeById(link.a), b = nodeById(link.b);
    if (!a || !b || a.space !== state.space || b.space !== state.space || a.archived || b.archived) return;
    const geometry = linkGeometry(a, b);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", geometry.d);
    path.setAttribute("class", `link-path ${(state.selectedId === a.id || state.selectedId === b.id) ? "active" : ""}`);
    svg.appendChild(path);
    [geometry.start, geometry.end].forEach(point => {
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", point.x); dot.setAttribute("cy", point.y); dot.setAttribute("r", "3"); dot.setAttribute("class", "link-dot");
      svg.appendChild(dot);
    });
  });
}
function linkGeometry(a, b) {
  const ad = cardDims(a), bd = cardDims(b);
  const ac = { x: a.x + ad.w / 2, y: a.y + ad.h / 2 };
  const bc = { x: b.x + bd.w / 2, y: b.y + bd.h / 2 };
  const dx = bc.x - ac.x, dy = bc.y - ac.y;
  let start, end, c1, c2;
  if (Math.abs(dx) >= Math.abs(dy)) {
    start = { x: dx >= 0 ? a.x + ad.w : a.x, y: ac.y };
    end = { x: dx >= 0 ? b.x : b.x + bd.w, y: bc.y };
    const curve = clamp(Math.abs(dx) * .42, 70, 230) * (dx >= 0 ? 1 : -1);
    c1 = { x: start.x + curve, y: start.y };
    c2 = { x: end.x - curve, y: end.y };
  } else {
    start = { x: ac.x, y: dy >= 0 ? a.y + ad.h : a.y };
    end = { x: bc.x, y: dy >= 0 ? b.y : b.y + bd.h };
    const curve = clamp(Math.abs(dy) * .42, 60, 200) * (dy >= 0 ? 1 : -1);
    c1 = { x: start.x, y: start.y + curve };
    c2 = { x: end.x, y: end.y - curve };
  }
  return { start, end, d: `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}` };
}
function applyCamera() {
  const world = $("#world");
  world.style.transform = `translate3d(${state.camera.tx}px,${state.camera.ty}px,0) scale(${state.camera.scale})`;
  drawDots();
}
function centerCamera() {
  const rect = $("#canvasViewport").getBoundingClientRect();
  state.camera.scale = .85;
  state.camera.tx = rect.width / 2 - WORLD_W / 2 * state.camera.scale;
  state.camera.ty = rect.height / 2 - WORLD_H / 2 * state.camera.scale;
  applyCamera();
}
function fitAll(animate = true) {
  const nodes = currentNodes();
  if (!nodes.length) return centerCamera();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(node => {
    const dim = cardDims(node);
    minX = Math.min(minX, node.x); minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + dim.w); maxY = Math.max(maxY, node.y + dim.h);
  });
  const rect = $("#canvasViewport").getBoundingClientRect();
  const availableH = rect.height - 150;
  const pad = 100;
  const scale = clamp(Math.min((rect.width - 30) / (maxX - minX + pad * 2), availableH / (maxY - minY + pad * 2)), .34, 1.25);
  if (animate) $("#world").style.transition = "transform .45s cubic-bezier(.2,.78,.2,1)";
  state.camera.scale = scale;
  state.camera.tx = rect.width / 2 - ((minX + maxX) / 2) * scale;
  state.camera.ty = (rect.height - 20) / 2 - ((minY + maxY) / 2) * scale;
  applyCamera();
  if (animate) setTimeout(() => $("#world").style.transition = "", 480);
}
function focusNode(node) {
  const dim = cardDims(node); const rect = $("#canvasViewport").getBoundingClientRect();
  const scale = clamp(Math.min((rect.width - 42) / (dim.w + 80), (rect.height - 190) / (dim.h + 90)), .72, 1.28);
  $("#world").style.transition = "transform .4s cubic-bezier(.2,.78,.2,1)";
  state.camera.scale = scale;
  state.camera.tx = rect.width / 2 - (node.x + dim.w / 2) * scale;
  state.camera.ty = (rect.height - 20) / 2 - (node.y + dim.h / 2) * scale;
  applyCamera(); setTimeout(() => $("#world").style.transition = "", 430);
}
function drawDots() {
  const canvas = $("#dotCanvas"); if (!canvas) return;
  const rect = canvas.getBoundingClientRect(); const dpr = devicePixelRatio || 1;
  if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
  }
  const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, rect.width, rect.height);
  const spacing = 25;
  for (let y = 12; y < rect.height; y += spacing) {
    for (let x = 12; x < rect.width; x += spacing) {
      const world = screenToWorld(x, y);
      const pulse = Math.sin((world.x + world.y) * .012) * .025;
      const alpha = .09 + pulse + Math.max(0, state.camera.scale - .8) * .025;
      const light = document.documentElement.dataset.theme === "light";
      const dotAlpha = light ? Math.min(.16, alpha + .015) : alpha;
      ctx.beginPath(); ctx.fillStyle = ((x + y) / spacing) % 2 > 1 ? `rgba(50,164,190,${dotAlpha})` : `rgba(91,76,196,${dotAlpha})`;
      ctx.arc(x, y, 1.05, 0, Math.PI * 2); ctx.fill();
    }
  }
}

/* Gestures */
function onCanvasPointerDown(event) {
  if (event.target.closest(".node-card,.canvas-utility,.gesture-hint")) return;
  event.preventDefault();
  event.currentTarget.setPointerCapture?.(event.pointerId);
  state.canvasPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (state.canvasPointers.size === 1) {
    state.canvasGesture = { type: "pan", startX: event.clientX, startY: event.clientY, tx: state.camera.tx, ty: state.camera.ty, moved: false, time: performance.now() };
  } else if (state.canvasPointers.size === 2) {
    const points = [...state.canvasPointers.values()];
    const center = midpoint(points[0], points[1]);
    const worldCenter = screenToWorld(center.x, center.y);
    state.canvasGesture = { type: "pinch", distance: distance(points[0], points[1]), scale: state.camera.scale, worldCenter, center };
  }
}
function onCanvasPointerMove(event) {
  if (!state.canvasPointers.has(event.pointerId)) return;
  state.canvasPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  const gesture = state.canvasGesture; if (!gesture) return;
  if (gesture.type === "pan" && state.canvasPointers.size === 1) {
    const dx = event.clientX - gesture.startX, dy = event.clientY - gesture.startY;
    if (Math.hypot(dx, dy) > 4) gesture.moved = true;
    state.camera.tx = gesture.tx + dx; state.camera.ty = gesture.ty + dy; applyCamera();
  } else if (state.canvasPointers.size >= 2) {
    const points = [...state.canvasPointers.values()].slice(0, 2);
    const center = midpoint(points[0], points[1]); const ratio = distance(points[0], points[1]) / Math.max(1, gesture.distance);
    state.camera.scale = clamp(gesture.scale * ratio, .28, 1.8);
    state.camera.tx = center.x - gesture.worldCenter.x * state.camera.scale;
    state.camera.ty = center.y - gesture.worldCenter.y * state.camera.scale;
    applyCamera();
  }
}
function onCanvasPointerEnd(event) {
  if (!state.canvasPointers.has(event.pointerId)) return;
  const gesture = state.canvasGesture;
  state.canvasPointers.delete(event.pointerId);
  if (state.canvasPointers.size === 0) {
    if (gesture?.type === "pan" && !gesture.moved && performance.now() - gesture.time < 350) {
      const now = performance.now();
      if (now - state.lastCanvasTap < 320) fitAll(true);
      state.lastCanvasTap = now;
      state.selectedId = null; renderCards(); renderLinks();
    }
    state.canvasGesture = null;
  } else if (state.canvasPointers.size === 1) {
    const point = [...state.canvasPointers.values()][0];
    state.canvasGesture = { type: "pan", startX: point.x, startY: point.y, tx: state.camera.tx, ty: state.camera.ty, moved: false, time: performance.now() };
  }
}
function distance(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }
function midpoint(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

function attachCardGestures(element, node) {
  const pointers = new Map();
  let gesture = null;
  let longTimer = null;
  let longTriggered = false;
  const cancelLong = () => { if (longTimer) clearTimeout(longTimer); longTimer = null; element.classList.remove("longpress"); };

  element.addEventListener("pointerdown", event => {
    if (event.target.closest("button,input")) return;
    event.preventDefault(); event.stopPropagation(); element.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, t: performance.now() });
    if (pointers.size === 2) {
      cancelLong();
      const points = [...pointers.values()];
      gesture = { type: "pinch", startDistance: distance(points[0], points[1]), baseLevel: node.level || 2, lastDistance: distance(points[0], points[1]), lastTime: performance.now(), visualScale: 1 };
      element.style.zIndex = "40";
      return;
    }
    longTriggered = false;
    gesture = { type: "pending", startX: event.clientX, startY: event.clientY, nodeX: node.x, nodeY: node.y, started: performance.now(), moved: false };
    element.classList.add("longpress");
    longTimer = setTimeout(() => {
      longTriggered = true; cancelLong(); navigator.vibrate?.(18); openEditor(node);
    }, 2000);
  });

  element.addEventListener("pointermove", event => {
    if (!pointers.has(event.pointerId)) return;
    const previous = pointers.get(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, t: performance.now() });
    if (gesture?.type === "pinch" && pointers.size >= 2) {
      const points = [...pointers.values()].slice(0, 2);
      const currentDistance = distance(points[0], points[1]);
      const now = performance.now();
      const velocity = Math.abs(currentDistance - gesture.lastDistance) / Math.max(1, now - gesture.lastTime);
      const rawRatio = currentDistance / Math.max(1, gesture.startDistance);
      const sensitivity = 1 + clamp(velocity * .65, 0, .5);
      const ratio = 1 + (rawRatio - 1) * sensitivity;
      gesture.visualScale = clamp(ratio, .67, 1.48);
      element.style.transform = `scale(${gesture.visualScale})`;
      gesture.lastDistance = currentDistance; gesture.lastTime = now;
      return;
    }
    if (!gesture || pointers.size !== 1) return;
    const dx = (event.clientX - gesture.startX) / state.camera.scale;
    const dy = (event.clientY - gesture.startY) / state.camera.scale;
    if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 8) {
      gesture.moved = true; gesture.type = "drag"; cancelLong(); element.classList.add("dragging");
    }
    if (gesture.type === "drag") {
      node.x = clamp(gesture.nodeX + dx, 0, WORLD_W - cardDims(node).w);
      node.y = clamp(gesture.nodeY + dy, 0, WORLD_H - cardDims(node).h);
      element.style.left = `${node.x}px`; element.style.top = `${node.y}px`; renderLinks();
    }
  });

  const finish = event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId); cancelLong();
    if (gesture?.type === "pinch") {
      if (pointers.size < 2) {
        const baseNumeric = [0, .76, 1, 1.28][gesture.baseLevel] || 1;
        const final = baseNumeric * gesture.visualScale;
        node.level = final < .89 ? 1 : final > 1.16 ? 3 : 2;
        element.style.transform = ""; element.style.zIndex = ""; saveData(); render();
        gesture = null;
      }
      return;
    }
    element.classList.remove("dragging");
    if (gesture?.type === "drag") {
      saveData(); renderLinks();
    } else if (gesture && !gesture.moved && !longTriggered) {
      const now = performance.now();
      if (state.lastCardTap.id === node.id && now - state.lastCardTap.time < 320) {
        state.lastCardTap = { id: null, time: 0 }; openDetail(node);
      } else {
        state.lastCardTap = { id: node.id, time: now };
        state.selectedId = node.id; renderCards(); renderLinks();
      }
    }
    gesture = null;
  };
  element.addEventListener("pointerup", finish);
  element.addEventListener("pointercancel", finish);
}

/* Create and card actions */
function handleCardActionClick(event) {
  const button = event.target.closest("[data-card-action]"); if (!button) return;
  event.stopPropagation();
  const card = button.closest(".node-card"); const node = nodeById(card?.dataset.id); if (!node) return;
  const action = button.dataset.cardAction;
  if (action === "open") openDetail(node);
  if (action === "branch") createBranchFor(node);
  if (action === "expand") {
    node.level = (node.level || 2) === 1 ? 2 : (node.level || 2) === 2 ? 3 : 1;
    saveData(); render();
  }
  if (action === "quickExpense") {
    const title = $("[data-expense-title]", card)?.value.trim();
    const amount = Number(String($("[data-expense-amount]", card)?.value || "").replace(",", "."));
    if (!title || !amount) return toast("Введите название и сумму затраты");
    node.expenses ||= []; node.expenses.push({ id: uid(), title, amount, date: todayISO() }); saveData(); render(); toast("Добавлено в затраты");
  }
}
function toggleCreateMenu() {
  if (!$("#createMenu").classList.contains("hidden")) return closeOverlays();
  renderCreateActions(); showOverlay("createMenu");
}
function renderCreateActions() {
  const selected = nodeById(state.selectedId);
  const actions = [];
  if (selected) {
    if (selected.type === "project") actions.push({ action: "process", icon: "process", title: "Рабочий процесс", text: "Этапы, задачи, люди и затраты" });
    actions.push({ action: "branch-person", icon: "person", title: "Ветвь человека", text: "Создать или связать исполнителя" });
    actions.push({ action: "branch-idea", icon: "idea", title: "Ветвь идеи", text: "Добавить референс или решение" });
    actions.push({ action: "branch-goal", icon: "goal", title: "Связанная цель", text: "Добавить ориентир результата" });
    $("#createMenuTitle").textContent = `Ветвь от «${selected.title}»`;
  } else {
    actions.push(
      { action: "root-project", icon: "project", title: "Проект", text: "Клиент, бюджет и материалы" },
      { action: "root-goal", icon: "goal", title: "Цель", text: "Результат, срок и прогресс" },
      { action: "root-person", icon: "person", title: "Человек", text: "Контакты, навыки и роль" },
      { action: "root-idea", icon: "idea", title: "Идея", text: "Референс, источник и заметка" }
    );
    $("#createMenuTitle").textContent = "Создать ядро";
  }
  $("#createActions").innerHTML = actions.map(item => `<button class="creation-item" data-create-action="${item.action}"><span class="creation-icon">${icon(item.icon)}</span><span><b>${item.title}</b><small>${item.text}</small></span></button>`).join("");
}
function handleCreateAction(event) {
  const button = event.target.closest("[data-create-action]"); if (!button) return;
  const action = button.dataset.createAction;
  closeOverlays();
  if (action.startsWith("root-")) return createNode(action.replace("root-", ""), null, true);
  const parent = nodeById(state.selectedId); if (!parent) return;
  if (action === "process") return createProcessForProject(parent);
  if (action === "branch-person") return createNode("person", parent, true);
  if (action === "branch-idea") return createNode("idea", parent, true);
  if (action === "branch-goal") return createNode("goal", parent, true);
}
function createNode(type, parent = null, openEditorNow = true) {
  const point = parent ? branchPosition(parent) : screenToWorld(innerWidth / 2, innerHeight / 2);
  const defaults = {
    project: { title: "Новый проект", status: "preparation", progress: 0, client: "", address: "", budget: "", assets: [] },
    goal: { title: "Новая цель", status: "active", progress: 0, deadline: "", metric: "", assets: [] },
    person: { title: "Новый человек", status: "active", speciality: "", zone: "Ближнее поле", tags: "", assets: [] },
    idea: { title: "Новая идея", status: "active", source: "", tags: "", assets: [] }
  };
  const node = { id: uid(), type, space: state.space, x: clamp(point.x, 50, WORLD_W - 350), y: clamp(point.y, 80, WORLD_H - 300), level: 2, note: "", archived: false, ...defaults[type] };
  state.data.nodes.push(node);
  if (parent) state.data.links.push({ id: uid(), a: parent.id, b: node.id, kind: type });
  state.selectedId = node.id; saveData(); render(); focusNode(node);
  if (openEditorNow) setTimeout(() => openEditor(node), 220);
  return node;
}
function branchPosition(parent) {
  const connected = linkNodesFor(parent.id).length;
  const angle = ((connected % 5) - 2) * .55;
  const distanceValue = 360;
  return { x: parent.x + Math.cos(angle) * distanceValue, y: parent.y + Math.sin(angle) * distanceValue + connected * 22 };
}
function createProcessForProject(project) {
  if (project.type !== "project") return;
  const existing = state.data.nodes.find(node => node.type === "process" && node.projectId === project.id && !node.archived);
  if (existing) { state.selectedId = existing.id; render(); focusNode(existing); return toast("Рабочий процесс уже создан"); }
  const point = branchPosition(project);
  const process = {
    id: uid(), type: "process", space: project.space, projectId: project.id,
    x: point.x, y: point.y, level: 2, title: `Рабочий процесс · ${project.title}`,
    status: "active", progress: 0, stages: [], tasks: [], phonebook: [], peopleIds: [], expenses: [], assets: [], archived: false
  };
  state.data.nodes.push(process); state.data.links.push({ id: uid(), a: project.id, b: process.id, kind: "process" });
  state.selectedId = process.id; saveData(); render(); focusNode(process); setTimeout(() => openEditor(process), 220);
}
function createBranchFor(node) {
  state.selectedId = node.id;
  if (node.type === "project") return createProcessForProject(node);
  renderCreateActions(); showOverlay("createMenu");
}

/* Details */
function openDetail(node) {
  state.activeNodeId = node.id;
  state.processActionsUnlocked = node.type !== "process";
  $("#detailType").textContent = TYPE_LABELS[node.type].toUpperCase();
  $("#detailTitle").textContent = node.title || TYPE_LABELS[node.type];
  $("#detailBranchButton").textContent = node.type === "project" ? "Рабочий процесс" : "Создать ветвь";
  updateProcessActionLock(node);
  renderDetailBody(node);
  const dialog = $("#detailDialog"); if (!dialog.open) dialog.showModal();
}
function renderDetailBody(node) {
  const body = $("#detailBody");
  if (node.type === "project") body.innerHTML = projectDetailHtml(node);
  else if (node.type === "process") body.innerHTML = processDetailHtml(node);
  else if (node.type === "person") body.innerHTML = personDetailHtml(node);
  else if (node.type === "idea") body.innerHTML = ideaDetailHtml(node);
  else body.innerHTML = goalDetailHtml(node);
  hydrateDetailAssets(node);
}
function heroHtml(node, subtitle) {
  return `<div class="detail-hero" ${node.coverAssetId ? `data-detail-cover="${esc(node.coverAssetId)}"` : ""}><div class="detail-hero-content"><h3>${esc(node.title)}</h3><p>${esc(subtitle || nodeSubtitle(node))}</p></div></div>`;
}
function projectDetailHtml(node) {
  const process = state.data.nodes.find(item => item.type === "process" && item.projectId === node.id && !item.archived);
  const expenseTotal = process ? (process.expenses || []).reduce((sum, item) => sum + Number(item.amount || 0), 0) : 0;
  return `${heroHtml(node, [node.client, node.address].filter(Boolean).join(" · "))}
    <div class="detail-grid">
      <div class="detail-stat"><small>СТАТУС</small><b>${esc(STATUS_LABELS[node.status] || node.status || "—")}</b></div>
      <div class="detail-stat"><small>БЛИЖАЙШИЙ СРОК</small><b>${esc(node.deadline || "—")}</b></div>
      <div class="detail-stat"><small>БЮДЖЕТ</small><b>${money(node.budget)}</b></div>
      <div class="detail-stat"><small>АВАНС / ОСТАТОК</small><b>${money(node.advance)} / ${money(node.balance)}</b></div>
      <div class="detail-stat"><small>ПОЗИЦИИ</small><b>${esc(node.positions || "—")}</b></div>
      <div class="detail-stat"><small>ЗАТРАТЫ</small><b>${money(expenseTotal)}</b></div>
    </div>
    ${node.note ? `<div class="detail-section"><div class="detail-section-head"><h3>О проекте</h3></div><div class="note-block">${esc(node.note)}</div></div>` : ""}
    <div class="detail-section"><div class="detail-section-head"><h3>Основные материалы · ${(node.assets || []).length}</h3><button data-detail-action="addAssets">＋ Добавить</button></div><div class="micro-gallery" id="detailGallery">${assetTilesHtml(node)}</div></div>
    <div class="detail-section"><div class="detail-section-head"><h3>Рабочий процесс</h3><button data-detail-action="openProcess">${process ? "Открыть" : "Создать"}</button></div>
      <div class="note-block">${process ? `${(process.stages || []).length} этапов · ${(process.tasks || []).filter(task => !task.done).length} открытых задач · ${(process.peopleIds || []).length} человек` : "Этапы, задачи, связанные люди и затраты вынесены в отдельную карточку."}</div>
    </div>`;
}
function normalizedProcessCoverPositions(source) {
  const legacy = source?.coverPosition || { x: 0, y: 0, scale: 1 };
  const positions = source?.coverPositions || {};
  return {
    "1": { ...legacy, ...(positions["1"] || {}) },
    "2": { ...legacy, ...(positions["2"] || {}) },
    "3": { ...legacy, ...(positions["3"] || {}) }
  };
}
function processCoverPosition(node, mode = "2") {
  return normalizedProcessCoverPositions(node)[String(mode)] || { x: 0, y: 0, scale: 1 };
}
function processCoverStyle(position) {
  const x = clamp(50 + Number(position?.x || 0), 0, 100);
  const y = clamp(50 + Number(position?.y || 0), 0, 100);
  const scale = Math.max(1, Number(position?.scale || 1));
  return `object-position:${x}% ${y}%;transform:scale(${scale})`;
}
function processCoverMediaHtml(node) {
  if (!node.coverAssetId) return "";
  const position = processCoverPosition(node, "2");
  return `<img class="process-cover-media" data-process-cover="${esc(node.coverAssetId)}" style="${processCoverStyle(position)}" alt="">`;
}
function processDetailHtml(node) {
  const project = nodeById(node.projectId);
  const total = (node.expenses || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const stages = node.stages || [];
  const openTasks = (node.tasks || []).filter(task => !task.done).length;
  if (!stages.some(stage => stage.id === state.selectedProcessStageId)) state.selectedProcessStageId = stages[0]?.id || null;
  return `<div class="detail-hero process-detail-hero">${processCoverMediaHtml(node)}<button class="process-cover-menu-button" data-detail-action="coverMenu" aria-label="Управление обложкой">•••</button><div class="detail-hero-content"><p>${esc(project ? `Проект: ${project.title}` : "Связанный рабочий модуль")}</p></div></div>
    <div class="process-metrics-bar">
      <button class="process-metric budget-metric" data-budget-edit="1" title="Двойное нажатие для редактирования"><small>БЮДЖЕТ</small><b>${money(node.budget)}</b></button>
      <div class="process-metric"><small>РАСХОДЫ</small><b>${money(total)}</b></div>
      <div class="process-metric count-metric"><small>ЭТАПЫ</small><b>${stages.length}</b></div>
      <div class="process-metric count-metric"><small>ЗАДАЧИ</small><b>${openTasks}</b></div>
      <button class="process-phonebook-button" data-detail-action="phonebook" aria-label="Телефонная книга">${icon("people")}<small>${(node.phonebook||[]).length}</small></button>
    </div>
    <div class="process-progress-row"><div><small>ПРОГРЕСС</small><b>${node.progress || 0}%</b></div><i><span style="width:${clamp(node.progress||0,0,100)}%"></span></i></div>
    <div class="detail-section"><div class="detail-section-head"><h3>Этапы</h3><button class="delicate-plus" data-detail-action="addStage" aria-label="Создать новый этап">＋</button></div><div class="stage-list process-stage-selector">${stages.length ? stages.map(stage => stageSelectorHtml(stage)).join("") : `<div class="note-block">Этапы ещё не добавлены.</div>`}</div></div>
    ${selectedStageTasksHtml(node)}
    <div class="detail-section"><div class="detail-section-head"><h3>Затраты</h3><button data-detail-action="editNode">Таблица</button></div><div class="inline-add"><input id="detailExpenseTitle" placeholder="Описание"><input id="detailExpenseAmount" inputmode="decimal" placeholder="Сумма"><button data-detail-action="quickExpense">+</button></div><div class="expense-list" style="margin-top:9px">${expenseListHtml(node)}</div></div>`;
}
function stageSelectorHtml(stage) {
  const selected = stage.id === state.selectedProcessStageId;
  return `<button class="stage-item selectable-stage ${selected ? "selected" : ""}" data-stage-select="${esc(stage.id)}"><div><b>${esc(stage.title)}</b><small>${esc(stage.deadline || "Без срока")}</small></div><div class="stage-progress"><span style="width:${clamp(stage.progress || 0,0,100)}%"></span></div></button>`;
}
function selectedStageTasksHtml(node) {
  const stage = (node.stages || []).find(item => item.id === state.selectedProcessStageId);
  if (!stage) return "";
  const firstStageId=(node.stages||[])[0]?.id; const tasks = (node.tasks || []).filter(task => task.stageId === stage.id || (!task.stageId && stage.id===firstStageId));
  return `<div class="detail-section stage-tasks-panel"><div class="detail-section-head"><div><small>ЗАДАЧИ КОНКРЕТНОГО ЭТАПА</small><h3>${esc(stage.title)}</h3></div><button class="stage-task-add" data-task-action="add" aria-label="Создать задачу">＋</button></div><div class="stage-task-list">${tasks.length ? tasks.map(task => stageTaskHtml(node,task)).join("") : `<div class="note-block">В этом этапе пока нет задач.</div>`}</div></div>`;
}
function priorityLabel(priority) { return priority === "high" ? "Высокий" : priority === "low" ? "Низкий" : "Средний"; }
function stageTaskHtml(node, task) {
  const expanded = task.id === state.expandedProcessTaskId;
  const contacts = (task.contactIds || []).map(id => (node.phonebook || []).find(contact => contact.id === id)).filter(Boolean);
  return `<article class="stage-task-card ${expanded ? "expanded selected" : ""}" data-stage-task-id="${esc(task.id)}">
    <div class="stage-task-head"><label class="stage-task-check"><input type="checkbox" data-task-toggle="${esc(task.id)}" ${task.done ? "checked" : ""}><span></span></label><div class="stage-task-title"><b>${esc(task.title)}</b><small>${esc(priorityLabel(task.priority))}${task.dateTime ? ` · ${esc(task.dateTime.replace("T"," "))}` : ""}</small></div><div class="stage-task-actions"><button data-task-action="view" title="Открыть">${icon("open")}</button><button class="priority-${esc(task.priority || "medium")}" data-task-action="priority" title="Приоритет">!</button><button data-task-action="menu" title="Действия">•••</button></div></div>
    <div class="task-context-menu hidden"><button data-task-action="moveUp">↑ Вверх</button><button data-task-action="moveDown">↓ Вниз</button><button data-task-action="edit">Редактировать</button><button class="danger-text" data-task-action="delete">Удалить</button></div>
    ${expanded ? `<div class="stage-task-expanded">${task.note ? `<div class="task-note"><small>ЗАМЕТКА</small><p>${esc(task.note)}</p></div>` : ""}<div class="task-contact-view"><small>НАЗНАЧЕННЫЕ КОНТАКТЫ</small>${contacts.length ? contacts.map(contact => `<div><span>${esc(contact.role || "Контакт")}</span><b>${esc(contact.name || "Без имени")}</b>${contact.phone ? `<a href="tel:${esc(contact.phone)}">${esc(contact.phone)}</a>` : ""}</div>`).join("") : `<p>Контакты не назначены</p>`}</div><div class="task-time-view"><small>ВЫПОЛНЕНИЕ</small><b>${task.scheduleMode === "interval" ? `${esc(task.intervalStart || "—")} — ${esc(task.intervalEnd || "—")}` : esc(task.dateTime?.replace("T"," ") || "Дата не выбрана")}</b><span>${task.notify ? `🔔 Напомнить за ${esc(task.reminder || "15")} мин.` : "Уведомление выключено"}</span></div></div>` : ""}
  </article>`;
}
function personDetailHtml(node) {
  return `${heroHtml(node, node.speciality || "Специалист")}
    <div class="detail-grid"><div class="detail-stat"><small>ЗОНА ВНИМАНИЯ</small><b>${esc(node.zone || "—")}</b></div><div class="detail-stat"><small>АКТИВНЫЕ ЗАДАЧИ</small><b>${tasksForPerson(node.id).filter(task => !task.done).length}</b></div></div>
    <div class="detail-section"><div class="detail-section-head"><h3>Контакты</h3></div><div class="chips">${node.phone ? `<a class="chip" href="tel:${esc(node.phone)}">${icon("phone")} ${esc(node.phone)}</a>` : ""}${node.email ? `<a class="chip" href="mailto:${esc(node.email)}">${icon("mail")} ${esc(node.email)}</a>` : ""}${node.social ? `<span class="chip">${esc(node.social)}</span>` : ""}</div></div>
    ${node.tags ? `<div class="detail-section"><div class="detail-section-head"><h3>Навыки и материалы</h3></div><div class="chips">${node.tags.split(",").filter(Boolean).map(tag => `<span class="chip">${esc(tag.trim())}</span>`).join("")}</div></div>` : ""}
    ${node.note ? `<div class="detail-section"><div class="detail-section-head"><h3>Заметка</h3></div><div class="note-block">${esc(node.note)}</div></div>` : ""}`;
}
function ideaDetailHtml(node) {
  return `${heroHtml(node, node.source || "Идея")}
    ${node.note ? `<div class="detail-section"><div class="detail-section-head"><h3>Смысл идеи</h3></div><div class="note-block">${esc(node.note)}</div></div>` : ""}
    ${node.tags ? `<div class="detail-section"><div class="detail-section-head"><h3>Теги</h3></div><div class="chips">${node.tags.split(",").filter(Boolean).map(tag => `<span class="chip">${esc(tag.trim())}</span>`).join("")}</div></div>` : ""}
    <div class="detail-section"><div class="detail-section-head"><h3>Референсы · ${(node.assets || []).length}</h3><button data-detail-action="addAssets">＋ Добавить</button></div><div class="micro-gallery" id="detailGallery">${assetTilesHtml(node)}</div></div>`;
}
function goalDetailHtml(node) {
  return `${heroHtml(node, node.metric || "Цель")}
    <div class="detail-grid"><div class="detail-stat"><small>ПРОГРЕСС</small><b>${node.progress || 0}%</b></div><div class="detail-stat"><small>СРОК</small><b>${esc(node.deadline || "—")}</b></div></div>
    ${node.note ? `<div class="detail-section"><div class="detail-section-head"><h3>Контекст</h3></div><div class="note-block">${esc(node.note)}</div></div>` : ""}`;
}
function assetKind(asset) {
  const ext = (asset.name.split(".").pop() || "FILE").toUpperCase();
  if (asset.type?.startsWith("image/")) return ext === "SVG" ? "SVG" : "IMAGE";
  if (asset.type === "application/pdf" || ext === "PDF") return "PDF";
  return ext;
}
function assetTilesHtml(node) {
  const assets = node.assets || [];
  if (!assets.length) return `<button class="asset-tile" data-detail-action="addAssets"><div class="asset-placeholder"><strong>＋</strong><small>Добавить материал</small></div></button>`;
  return assets.map((asset, index) => `<button class="asset-tile" data-asset-index="${index}" data-asset-id="${asset.id}"><span class="asset-kind">${esc(assetKind(asset))}</span><div class="asset-placeholder">${icon(asset.type?.startsWith("image/") ? "image" : "files")}<small>${esc(asset.name)}</small></div><span class="asset-tile-overlay">${esc(asset.name)}</span></button>`).join("");
}
async function hydrateDetailAssets(node) {
  const processCover = $('[data-process-cover]', $("#detailBody"));
  if (processCover) { const url = await assetUrl(processCover.dataset.processCover).catch(() => null); if (url && processCover.isConnected) processCover.src = url; }
  const detailCover = $('[data-detail-cover]', $("#detailBody"));
  if (detailCover) {
    const url = await assetUrl(detailCover.dataset.detailCover).catch(() => null);
    if (url && detailCover.isConnected) detailCover.style.backgroundImage = `url("${url}")`;
  }
  for (const tile of $$('[data-asset-id]', $("#detailBody"))) {
    const asset = (node.assets || []).find(item => item.id === tile.dataset.assetId);
    if (!asset || !asset.type?.startsWith("image/")) continue;
    const url = await assetUrl(asset.id).catch(() => null);
    if (url && tile.isConnected) {
      const placeholder = $(".asset-placeholder", tile); if (placeholder) placeholder.outerHTML = `<img src="${url}" alt="">`;
    }
  }
}
function taskListHtml(node) {
  const tasks = node.tasks || [];
  if (!tasks.length) return `<div class="note-block">Задачи ещё не добавлены.</div>`;
  return tasks.map(task => `<label class="task-item"><input type="checkbox" data-task-toggle="${task.id}" ${task.done ? "checked" : ""}><div><b>${esc(task.title)}</b><small>${esc(personName(task.personId) || "Без исполнителя")}</small></div><time>${esc(task.due || "")}</time></label>`).join("");
}
function peopleListHtml(node) {
  const people = (node.peopleIds || []).map(nodeById).filter(Boolean);
  if (!people.length) return `<div class="note-block">Исполнители ещё не связаны.</div>`;
  return people.map(person => `<div class="person-item"><div><b>${esc(person.title)}</b><small>${esc(person.speciality || "Специалист")}</small></div><span class="panel-chip">${esc(person.zone || "")}</span></div>`).join("");
}
function expenseListHtml(node) {
  const expenses = node.expenses || [];
  if (!expenses.length) return `<div class="note-block">Затраты ещё не добавлены.</div>`;
  return expenses.slice().reverse().map(expense => `<div class="expense-item"><div><b>${esc(expense.title)}</b><small>${esc(expense.date || "")}</small></div><strong>${money(expense.amount)}</strong></div>`).join("");
}
function personName(id) { return id ? nodeById(id)?.title : ""; }
function tasksForPerson(personId) {
  return state.data.nodes.filter(node => node.type === "process" && !node.archived).flatMap(node => (node.tasks || []).filter(task => task.personId === personId).map(task => ({ ...task, processId: node.id })));
}
function handleDetailClick(event) {
  const assetButton = event.target.closest("[data-asset-index]");
  if (assetButton) return openAssetViewer(nodeById(state.activeNodeId), Number(assetButton.dataset.assetIndex));
  const node = nodeById(state.activeNodeId); if (!node) return;
  const budgetButton = event.target.closest("[data-budget-edit]");
  if (budgetButton && node.type === "process") { const now=performance.now(); if (state.lastBudgetTap && now-state.lastBudgetTap<620) { state.lastBudgetTap=0; openBudgetEditor(node); } else state.lastBudgetTap=now; return; }
  const stageButton = event.target.closest("[data-stage-select]");
  if (stageButton && node.type === "process") {
    const stageId = stageButton.dataset.stageSelect; const now = performance.now();
    if (state.lastStageTap?.id === stageId && now - state.lastStageTap.time < 340) { state.lastStageTap={id:null,time:0}; openStageEditor(node, stageId); return; }
    state.lastStageTap={id:stageId,time:now}; state.selectedProcessStageId = stageId; state.expandedProcessTaskId = null; renderDetailBody(node); return;
  }
  const taskToggle = event.target.closest("[data-task-toggle]");
  if (taskToggle) { const record=(node.tasks||[]).find(item=>item.id===taskToggle.dataset.taskToggle); if(record){record.done=taskToggle.checked;updateProcessProgress(node);saveData();renderDetailBody(node);render();} return; }
  const taskAction = event.target.closest("[data-task-action]");
  if (taskAction && node.type === "process") { handleStageTaskAction(node, taskAction); return; }
  const actionButton = event.target.closest("[data-detail-action]"); if (!actionButton) return;
  const action = actionButton.dataset.detailAction;
  if (action === "addAssets") { state.assetTargetNodeId = node.id; $("#assetInput").click(); }
  if (action === "openProcess") { const existing=state.data.nodes.find(item=>item.type==="process"&&item.projectId===node.id&&!item.archived); if(existing){state.selectedId=existing.id;render();focusNode(existing);openDetail(existing);}else createProcessForProject(node); }
  if (action === "editNode") openEditor(node);
  if (action === "editBudget") openBudgetEditor(node);
  if (action === "phonebook") openPhonebook(node);
  if (action === "coverMenu" && node.type === "process") openCoverQuickMenu(node);
  if (action === "addStage" && node.type === "process") {
    node.stages ||= [];
    const stage = { id: uid(), title: `Новый этап ${node.stages.length + 1}`, deadline: "", progress: 0 };
    node.stages.push(stage);
    state.selectedProcessStageId = stage.id;
    state.expandedProcessTaskId = null;
    updateProcessProgress(node);
    saveData();
    renderDetailBody(node);
    render();
    toast("Новый этап создан");
  }
  if (action === "quickExpense") { const title=$("#detailExpenseTitle")?.value.trim(); const amount=Number(String($("#detailExpenseAmount")?.value||"").replace(",",".")); if(!title||!amount)return toast("Введите описание и сумму"); node.expenses||=[];node.expenses.push({id:uid(),title,amount,date:todayISO()});saveData();renderDetailBody(node);render();toast("Добавлено в затраты"); }
}
function handleStageTaskAction(node, button) {
  const action=button.dataset.taskAction; const card=button.closest("[data-stage-task-id]"); const taskId=card?.dataset.stageTaskId; const tasks=node.tasks||[]; const task=tasks.find(item=>item.id===taskId);
  if(action==="add") return openTaskEditor(node, null);
  if(!task) return;
  if(action==="view"){state.expandedProcessTaskId=state.expandedProcessTaskId===task.id?null:task.id;renderDetailBody(node);return;}
  if(action==="priority"){task.priority=task.priority==="low"?"medium":task.priority==="medium"?"high":"low";saveData();renderDetailBody(node);return;}
  if(action==="menu"){card.querySelector(".task-context-menu")?.classList.toggle("hidden");return;}
  if(action==="edit") return openTaskEditor(node,task);
  if(action==="delete"){if(confirm(`Удалить задачу «${task.title}»?`)){node.tasks=tasks.filter(item=>item.id!==task.id);if(state.expandedProcessTaskId===task.id)state.expandedProcessTaskId=null;updateProcessProgress(node);saveData();renderDetailBody(node);render();}return;}
  const sameStage=tasks.filter(item=>item.stageId===task.stageId); const localIndex=sameStage.findIndex(item=>item.id===task.id); const target=action==="moveUp"?sameStage[localIndex-1]:sameStage[localIndex+1]; if(!target)return;
  const a=tasks.indexOf(task),b=tasks.indexOf(target); [tasks[a],tasks[b]]=[tasks[b],tasks[a]]; saveData();renderDetailBody(node);
}
function openTaskEditor(node, task) {
  const base=task?clone(task):{id:uid(),stageId:state.selectedProcessStageId,title:"Новая задача",priority:"medium",note:"",contactIds:[],scheduleMode:"date",intervalStart:"",intervalEnd:"",dateTime:"",reminder:"15",notify:false,done:false};
  state.taskDraft=base;
  $("#taskEditorTitle").textContent=task?"Редактировать задачу":"Новая задача";
  $("#taskTitle").value=base.title||""; $("#taskNote").value=base.note||""; $("#taskPriority").value=base.priority||"medium"; $("#taskScheduleMode").value=base.scheduleMode||"date"; $("#taskIntervalStart").value=base.intervalStart||""; $("#taskIntervalEnd").value=base.intervalEnd||""; $("#taskDateTime").value=base.dateTime||""; $("#taskReminder").value=base.reminder||"15"; $("#taskNotify").checked=Boolean(base.notify);
  renderTaskContactPicker(node, base.contactIds||[]); updateTaskScheduleFields(); const dialog=$("#taskEditorDialog"); if(!dialog.open)dialog.showModal();
}
function closeTaskEditor(){if($("#taskEditorDialog").open)$("#taskEditorDialog").close();state.taskDraft=null;}
function renderTaskContactPicker(node, selectedIds){
  const contacts=node.phonebook||[];
  $("#taskContactPicker").innerHTML=contacts.length?contacts.map(c=>`<label class="task-contact-choice"><input type="checkbox" value="${esc(c.id)}" ${selectedIds.includes(c.id)?"checked":""}><span><b>${esc(c.name||"Без имени")}</b><small>${esc(c.role||"Контакт")}${c.phone?` · ${esc(c.phone)}`:""}</small></span></label>`).join(""):`<div class="note-block">Сначала добавьте контакт в телефонную книгу рабочего процесса.</div>`;
}
function readTaskContactIds(){return $$('#taskContactPicker input:checked').map(input=>input.value);}
function updateTaskScheduleFields(){const interval=$("#taskScheduleMode").value==="interval";$("#taskIntervalFields").classList.toggle("hidden",!interval);$("#taskDateField").classList.toggle("hidden",interval);}
function saveTaskEditor(event){event.preventDefault();const node=nodeById(state.activeNodeId);if(!node||node.type!=="process"||!state.taskDraft)return;const d=state.taskDraft;d.title=$("#taskTitle").value.trim()||"Новая задача";d.note=$("#taskNote").value.trim();d.priority=$("#taskPriority").value;d.contactIds=readTaskContactIds();d.scheduleMode=$("#taskScheduleMode").value;d.intervalStart=$("#taskIntervalStart").value;d.intervalEnd=$("#taskIntervalEnd").value;d.dateTime=$("#taskDateTime").value;d.reminder=$("#taskReminder").value;d.notify=$("#taskNotify").checked;d.stageId=d.stageId||state.selectedProcessStageId;node.tasks||=[];const idx=node.tasks.findIndex(t=>t.id===d.id);if(idx>=0)node.tasks[idx]=d;else node.tasks.push(d);state.expandedProcessTaskId=d.id;updateProcessProgress(node);saveData();closeTaskEditor();renderDetailBody(node);render();toast("Задача сохранена");}

function openStageEditor(node, stageId){const stage=(node.stages||[]).find(item=>item.id===stageId);if(!stage)return;state.stageEditDraft={nodeId:node.id,stageId};$("#stageEditTitle").value=stage.title||"";$("#stageEditDate").value=stage.deadline||"";const d=$("#stageEditorDialog");if(!d.open)d.showModal();}
function closeStageEditor(){if($("#stageEditorDialog").open)$("#stageEditorDialog").close();state.stageEditDraft=null;}
function saveStageEditor(event){event.preventDefault();const draft=state.stageEditDraft,node=nodeById(draft?.nodeId),stage=(node?.stages||[]).find(item=>item.id===draft?.stageId);if(!stage)return;stage.title=$("#stageEditTitle").value.trim()||"Новый этап";stage.deadline=$("#stageEditDate").value;saveData();closeStageEditor();renderDetailBody(node);render();toast("Этап сохранён");}
function openStageDeleteConfirm(){const d=$("#stageDeleteDialog");if(!d.open)d.showModal();}
function closeStageDeleteConfirm(){if($("#stageDeleteDialog").open)$("#stageDeleteDialog").close();}
function cancelStageDelete(){closeStageDeleteConfirm();closeStageEditor();const node=nodeById(state.activeNodeId);if(node)renderDetailBody(node);}
function confirmStageDelete(){const draft=state.stageEditDraft,node=nodeById(draft?.nodeId);if(!node)return;node.stages=(node.stages||[]).filter(stage=>stage.id!==draft.stageId);node.tasks=(node.tasks||[]).filter(task=>task.stageId!==draft.stageId);if(state.selectedProcessStageId===draft.stageId)state.selectedProcessStageId=node.stages[0]?.id||null;state.expandedProcessTaskId=null;updateProcessProgress(node);saveData();closeStageDeleteConfirm();closeStageEditor();renderDetailBody(node);render();toast("Этап и связанные задачи удалены");}
function openBudgetEditor(node){$("#budgetEditValue").value=node.budget||"";const d=$("#budgetEditorDialog");if(!d.open)d.showModal();}
function closeBudgetEditor(){if($("#budgetEditorDialog").open)$("#budgetEditorDialog").close();}
function saveBudgetEditor(event){event.preventDefault();const node=nodeById(state.activeNodeId);if(!node)return;node.budget=Number(String($("#budgetEditValue").value||0).replace(",","."));saveData();closeBudgetEditor();renderDetailBody(node);render();toast("Бюджет сохранён");}
function openPhonebook(node){renderPhonebookList(node);const d=$("#phonebookDialog");if(!d.open)d.showModal();}
function closePhonebook(){if($("#phonebookDialog").open)$("#phonebookDialog").close();state.phonebookEditId=null;}
function renderPhonebookList(node){state.phonebookEditId=null;const contacts=node?.phonebook||[];$("#phonebookBody").innerHTML=contacts.length?contacts.map(c=>`<article class="phonebook-card" data-phonebook-id="${esc(c.id)}"><div><b>${esc(c.name||"Без имени")}</b><small>${esc(c.role||"Контакт")}</small>${c.phone?`<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>`:""}</div><button data-phonebook-action="edit">Редактировать</button><button class="danger-text" data-phonebook-action="delete">Удалить</button></article>`).join(""):`<div class="note-block">Телефонная книга пока пуста.</div>`;$("#phonebookEditorWrap").classList.add("hidden");}
function renderPhonebookEditor(contact){state.phonebookEditId=contact?.id||null;$("#phonebookEditorWrap").classList.remove("hidden");$("#phonebookName").value=contact?.name||"";$("#phonebookRole").value=contact?.role||"";$("#phonebookPhone").value=contact?.phone||"";$("#phonebookCar").value=contact?.carNumber||"";$("#phonebookAddress").value=contact?.address||"";$("#phonebookComment").value=contact?.comment||"";}
function handlePhonebookClick(event){const card=event.target.closest('[data-phonebook-id]'),button=event.target.closest('[data-phonebook-action]');if(!card||!button)return;const node=nodeById(state.activeNodeId),contact=(node.phonebook||[]).find(c=>c.id===card.dataset.phonebookId);if(button.dataset.phonebookAction==='edit')renderPhonebookEditor(contact);if(button.dataset.phonebookAction==='delete'&&confirm(`Удалить контакт «${contact?.name||'Без имени'}»?`)){node.phonebook=(node.phonebook||[]).filter(c=>c.id!==contact.id);(node.tasks||[]).forEach(t=>t.contactIds=(t.contactIds||[]).filter(id=>id!==contact.id));saveData();renderPhonebookList(node);renderDetailBody(node);}}
function savePhonebookContact(event){event.preventDefault();const node=nodeById(state.activeNodeId);if(!node)return;node.phonebook||=[];let c=node.phonebook.find(x=>x.id===state.phonebookEditId);if(!c){c={id:uid()};node.phonebook.push(c)}Object.assign(c,{name:$("#phonebookName").value.trim(),role:$("#phonebookRole").value.trim(),phone:$("#phonebookPhone").value.trim(),carNumber:$("#phonebookCar").value.trim(),address:$("#phonebookAddress").value.trim(),comment:$("#phonebookComment").value.trim()});saveData();renderPhonebookList(node);renderDetailBody(node);toast("Контакт сохранён");}

function updateProcessProgress(node) {
  if (node.type !== "process") return;
  const tasks = node.tasks || [];
  node.progress = tasks.length ? Math.round(tasks.filter(task => task.done).length / tasks.length * 100) : Math.round((node.stages || []).reduce((sum, stage) => sum + Number(stage.progress || 0), 0) / Math.max(1, (node.stages || []).length));
  const project = nodeById(node.projectId); if (project) project.progress = node.progress;
}

/* Editor */
function openEditor(node) {
  state.detailScrollTop = $("#detailBody")?.scrollTop || 0;
  state.activeNodeId = node.id; state.editDraft = clone(node);
  $("#detailDialog").open && $("#detailDialog").close();
  $("#editorType").textContent = `${TYPE_LABELS[node.type].toUpperCase()} · РЕДАКТИРОВАНИЕ`;
  $("#editorTitle").textContent = node.title || TYPE_LABELS[node.type];
  renderEditorBody();
  const dialog = $("#editorDialog"); if (!dialog.open) dialog.showModal();
}
function closeEditor() { if ($("#editorDialog").open) $("#editorDialog").close(); state.editDraft = null; }
function commonFields(draft) {
  const processCover = draft.type === "process" ? processCoverEditorHtml(draft) : "";
  return `<div class="field"><label>Название</label><input name="title" value="${esc(draft.title)}" required></div>${processCover}<div class="field"><label>Заметка</label><textarea name="note">${esc(draft.note || "")}</textarea></div>`;
}
function processCoverEditorHtml(draft) {
  const hasCover = Boolean(draft.coverAssetId);
  const position = processCoverPosition(draft, "2");
  return `<div class="field process-cover-field"><label>Обложка</label><div class="process-cover-editor">${hasCover ? `<div class="process-cover-thumb"><img data-editor-process-cover="${esc(draft.coverAssetId)}" style="${processCoverStyle(position)}" alt=""></div>` : `<div class="process-cover-empty">Обложка не добавлена</div>`}<div class="process-cover-buttons"><button type="button" class="ghost" data-editor-action="newProcessCover">Новая обложка</button><button type="button" class="ghost" data-editor-action="positionProcessCover" ${hasCover ? "" : "disabled"}>Настроить существующую</button></div></div></div>`;
}
function statusOptions(value) {
  return Object.entries(STATUS_LABELS).map(([key, label]) => `<option value="${key}" ${value === key ? "selected" : ""}>${label}</option>`).join("");
}
function renderEditorBody() {
  const d = state.editDraft; if (!d) return;
  let html = commonFields(d);
  if (d.type === "project") html += `
    <div class="field-grid"><div class="field"><label>Клиент</label><input name="client" value="${esc(d.client || "")}"></div><div class="field"><label>Адрес объекта</label><input name="address" value="${esc(d.address || "")}"></div></div>
    <div class="field-grid"><div class="field"><label>Статус</label><select name="status">${statusOptions(d.status)}</select></div><div class="field"><label>Приоритет</label><select name="priority"><option value="high" ${d.priority === "high" ? "selected" : ""}>Высокий</option><option value="medium" ${d.priority === "medium" ? "selected" : ""}>Средний</option><option value="low" ${d.priority === "low" ? "selected" : ""}>Низкий</option></select></div></div>
    <div class="field-grid"><div class="field"><label>Количество позиций</label><input name="positions" inputmode="numeric" value="${esc(d.positions || "")}"></div><div class="field"><label>Дата подписания</label><input name="signDate" type="date" value="${esc(d.signDate || "")}"></div></div>
    <div class="field-grid"><div class="field"><label>Бюджет</label><input name="budget" inputmode="decimal" value="${esc(d.budget || "")}"></div><div class="field"><label>Срок</label><input name="deadline" type="date" value="${esc(d.deadline || "")}"></div></div>
    <div class="field-grid"><div class="field"><label>Аванс</label><input name="advance" inputmode="decimal" value="${esc(d.advance || "")}"></div><div class="field"><label>Остаток</label><input name="balance" inputmode="decimal" value="${esc(d.balance || "")}"></div></div>
    <div class="editor-group"><h3>Основные материалы</h3><button type="button" class="ghost" data-editor-action="addAssets">＋ Изображения, PDF и векторные файлы</button></div>`;
  if (d.type === "person") html += `
    <div class="field"><label>Специализация</label><input name="speciality" value="${esc(d.speciality || "")}"></div>
    <div class="field"><label>Навыки, материалы, ключевые слова</label><input name="tags" value="${esc(d.tags || "")}"></div>
    <div class="field-grid"><div class="field"><label>Телефон</label><input name="phone" value="${esc(d.phone || "")}"></div><div class="field"><label>Email</label><input name="email" type="email" value="${esc(d.email || "")}"></div></div>
    <div class="field-grid"><div class="field"><label>Сайт</label><input name="site" value="${esc(d.site || "")}"></div><div class="field"><label>Соцсеть</label><input name="social" value="${esc(d.social || "")}"></div></div>
    <div class="field"><label>Зона внимания</label><select name="zone">${["В работе","Ближнее поле","Резерв","Дальняя полка","Архив"].map(value => `<option ${d.zone === value ? "selected" : ""}>${value}</option>`).join("")}</select></div>`;
  if (d.type === "idea") html += `
    <div class="field-grid"><div class="field"><label>Источник</label><select name="source">${["Pinterest","Instagram","YouTube","Сайт","Собственная идея"].map(value => `<option ${d.source === value ? "selected" : ""}>${value}</option>`).join("")}</select></div><div class="field"><label>Ссылка</label><input name="url" value="${esc(d.url || "")}"></div></div>
    <div class="field"><label>Теги, материалы и технологии</label><input name="tags" value="${esc(d.tags || "")}"></div>
    <div class="editor-group"><h3>Референсы</h3><button type="button" class="ghost" data-editor-action="addAssets">＋ Добавить изображения или файлы</button></div>`;
  if (d.type === "goal") html += `
    <div class="field-grid"><div class="field"><label>Срок</label><input name="deadline" type="date" value="${esc(d.deadline || "")}"></div><div class="field"><label>Прогресс, %</label><input name="progress" type="number" min="0" max="100" value="${d.progress || 0}"></div></div><div class="field"><label>Измеримый результат</label><input name="metric" value="${esc(d.metric || "")}"></div>`;
  if (d.type === "process") html += processEditorHtml(d);
  $("#editorBody").innerHTML = html;
  bindEditorDynamicActions();
  hydrateProcessCoverEditor();
}
function processEditorHtml(d) {
  const people = state.data.nodes.filter(node => node.type === "person" && node.space === d.space && !node.archived);
  return `
    <div class="field-grid"><div class="field"><label>Статус</label><select name="status">${statusOptions(d.status)}</select></div><div class="field"><label>Прогресс, %</label><input name="progress" type="number" min="0" max="100" value="${d.progress || 0}"></div></div>
    <div class="editor-group"><h3>Этапы</h3><div id="draftStages">${(d.stages || []).map(stage => `<div class="repeat-row" data-stage-id="${stage.id}"><input data-stage-title value="${esc(stage.title)}"><input data-stage-progress type="number" min="0" max="100" value="${stage.progress || 0}" style="width:70px"><button type="button" data-remove-stage="${stage.id}">×</button></div>`).join("")}</div><button type="button" class="ghost" data-editor-action="addStage">＋ Этап</button></div>
    <div class="editor-group"><h3>Задачи</h3><div id="draftTasks">${(d.tasks || []).map(task => `<div class="repeat-row" data-task-id="${task.id}"><input data-task-title value="${esc(task.title)}"><input data-task-due type="date" value="${esc(task.due || "")}" style="width:126px"><button type="button" data-remove-task="${task.id}">×</button></div>`).join("")}</div><button type="button" class="ghost" data-editor-action="addTask">＋ Задача</button></div>
    <div class="editor-group"><h3>Связанные люди</h3><div class="field"><select id="draftPeople" multiple size="${Math.min(5, Math.max(2, people.length))}">${people.map(person => `<option value="${person.id}" ${(d.peopleIds || []).includes(person.id) ? "selected" : ""}>${esc(person.title)} · ${esc(person.speciality || "")}</option>`).join("")}</select></div></div>
    <div class="editor-group"><h3>Таблица затрат</h3><div id="draftExpenses">${(d.expenses || []).map(expense => `<div class="repeat-row" data-expense-id="${expense.id}"><input data-expense-title value="${esc(expense.title)}"><input data-expense-amount inputmode="decimal" value="${expense.amount || ""}" style="width:90px"><button type="button" data-remove-expense="${expense.id}">×</button></div>`).join("")}</div><button type="button" class="ghost" data-editor-action="addExpense">＋ Затрата</button></div>`;
}
function bindEditorDynamicActions() {
  $("#editorBody").onclick = event => {
    const action = event.target.closest("[data-editor-action]")?.dataset.editorAction;
    if (action === "addAssets") { state.assetTargetNodeId = state.activeNodeId; $("#assetInput").click(); }
    if (action === "newProcessCover") $("#processCoverInput").click();
    if (action === "positionProcessCover" && state.editDraft?.coverAssetId) openProcessCoverPositionDialog(state.editDraft.coverAssetId);
    if (action === "addStage") { state.editDraft.stages ||= []; state.editDraft.stages.push({ id: uid(), title: "Новый этап", progress: 0, deadline: "" }); renderEditorBody(); }
    if (action === "addTask") { state.editDraft.tasks ||= []; state.editDraft.tasks.push({ id: uid(), title: "Новая задача", due: "", done: false, personId: "" }); renderEditorBody(); }
    if (action === "addExpense") { state.editDraft.expenses ||= []; state.editDraft.expenses.push({ id: uid(), title: "Новая затрата", amount: "", date: todayISO() }); renderEditorBody(); }
    const stageId = event.target.closest("[data-remove-stage]")?.dataset.removeStage;
    const taskId = event.target.closest("[data-remove-task]")?.dataset.removeTask;
    const expenseId = event.target.closest("[data-remove-expense]")?.dataset.removeExpense;
    if (stageId) { state.editDraft.stages = state.editDraft.stages.filter(item => item.id !== stageId); renderEditorBody(); }
    if (taskId) { state.editDraft.tasks = state.editDraft.tasks.filter(item => item.id !== taskId); renderEditorBody(); }
    if (expenseId) { state.editDraft.expenses = state.editDraft.expenses.filter(item => item.id !== expenseId); renderEditorBody(); }
  };
}
async function hydrateProcessCoverEditor() {
  const img = $('[data-editor-process-cover]', $("#editorBody")); if (!img) return;
  const url = await assetUrl(img.dataset.editorProcessCover).catch(() => null); if (url && img.isConnected) img.src = url;
}
function removeProcessCoverFromDraft() {
  if (!state.editDraft || state.editDraft.type !== "process") return;
  state.editDraft.coverAssetId = ""; state.editDraft.coverPosition = { x: 0, y: 0, scale: 1 }; state.editDraft.coverPositions = normalizedProcessCoverPositions({}); renderEditorBody();
}
function openCoverQuickMenu(node){state.quickCoverNodeId=node.id;const btn=$("#coverQuickPosition");btn.disabled=!node.coverAssetId;const d=$("#coverQuickMenu");if(!d.open)d.showModal();}
function closeCoverQuickMenu(){if($("#coverQuickMenu").open)$("#coverQuickMenu").close();}
function prepareQuickCoverDraft(){const node=nodeById(state.quickCoverNodeId);if(!node)return null;state.editDraft=clone(node);return node;}
function startQuickNewCover(){const node=prepareQuickCoverDraft();if(!node)return;closeCoverQuickMenu();$("#processCoverInput").click();}
function startQuickPositionCover(){const node=prepareQuickCoverDraft();if(!node?.coverAssetId)return;closeCoverQuickMenu();openProcessCoverPositionDialog(node.coverAssetId);}
async function handleProcessCoverFile(event) {
  const file = event.target.files?.[0]; event.target.value = "";
  if (!file || !state.editDraft || state.editDraft.type !== "process") return;
  const previousId = state.editDraft.coverAssetId;
  const id = uid();
  const metadata = { id, name: file.name, type: file.type || "image/jpeg", size: file.size, createdAt: Date.now() };
  await putAsset({ ...metadata, blob: file });
  state.editDraft.assets ||= [];
  if (previousId) {
    state.editDraft.assets = state.editDraft.assets.filter(asset => asset.id !== previousId);
    releaseObjectUrl(previousId);
    await deleteAssetRecord(previousId).catch(() => {});
  }
  state.editDraft.assets.push(metadata);
  state.editDraft.coverAssetId = id;
  state.editDraft.coverPosition = { x: 0, y: 0, scale: 1 };
  state.editDraft.coverPositions = normalizedProcessCoverPositions({});
  if (state.quickCoverNodeId) openProcessCoverPositionDialog(id);
  else { renderEditorBody(); openProcessCoverPositionDialog(id); }
}
async function openProcessCoverPositionDialog(assetId) {
  const url = await assetUrl(assetId).catch(() => null); if (!url) return;
  state.coverPositionDraft = normalizedProcessCoverPositions(state.editDraft || {});
  state.coverPositionMode = "2";
  $("#processCoverPreview").src = url;
  setProcessCoverMode("2");
  const dialog = $("#processCoverDialog"); if (!dialog.open) dialog.showModal();
}
function currentProcessCoverPosition() {
  if (!state.coverPositionDraft) return null;
  return state.coverPositionDraft[state.coverPositionMode] || (state.coverPositionDraft[state.coverPositionMode] = { x: 0, y: 0, scale: 1 });
}
function setProcessCoverMode(mode) {
  if (!state.coverPositionDraft) return;
  state.coverPositionMode = String(mode);
  $$("[data-cover-mode]", $("#processCoverDialog")).forEach(button => button.classList.toggle("active", button.dataset.coverMode === state.coverPositionMode));
  const frame = $("#processCoverFrame"); frame.className = `cover-position-frame mode-${state.coverPositionMode}`;
  const position = currentProcessCoverPosition();
  $("#processCoverScale").value = position.scale || 1;
  updateProcessCoverPreview();
}
function updateProcessCoverPreview() {
  const position = currentProcessCoverPosition(); if (!position) return;
  position.scale = Math.max(1, Number($("#processCoverScale").value || 1));
  const preview = $("#processCoverPreview");
  preview.style.objectPosition = `${clamp(50 + Number(position.x || 0), 0, 100)}% ${clamp(50 + Number(position.y || 0), 0, 100)}%`;
  preview.style.transform = `scale(${position.scale})`;
}
function resetProcessCoverPosition() {
  if (!state.coverPositionDraft) return;
  state.coverPositionDraft[state.coverPositionMode] = { x: 0, y: 0, scale: 1 };
  $("#processCoverScale").value = 1; updateProcessCoverPreview();
}
function applyProcessCoverPosition() {
  if (!state.editDraft || !state.coverPositionDraft) return;
  state.editDraft.coverPositions = clone(state.coverPositionDraft);
  state.editDraft.coverPosition = { ...state.coverPositionDraft["2"] };
  $("#processCoverDialog").close();
  if (state.quickCoverNodeId) {
    const node=nodeById(state.quickCoverNodeId);
    if(node){node.coverAssetId=state.editDraft.coverAssetId;node.coverPosition=clone(state.editDraft.coverPosition);node.coverPositions=clone(state.editDraft.coverPositions);node.assets=clone(state.editDraft.assets||node.assets||[]);saveData();renderDetailBody(node);render();toast("Обложка сохранена");}
    state.quickCoverNodeId=null;state.editDraft=null;
  } else renderEditorBody();
}
function bindProcessCoverPositioning() {
  const frame = $("#processCoverFrame"); let drag = null;
  $$("[data-cover-mode]", $("#processCoverDialog")).forEach(button => button.addEventListener("click", () => setProcessCoverMode(button.dataset.coverMode)));
  frame.addEventListener("pointerdown", event => {
    const position = currentProcessCoverPosition(); if (!position) return;
    drag = { x:event.clientX, y:event.clientY, ox:position.x || 0, oy:position.y || 0 };
    frame.setPointerCapture?.(event.pointerId);
  });
  frame.addEventListener("pointermove", event => {
    const position = currentProcessCoverPosition(); if (!drag || !position) return;
    const rect=frame.getBoundingClientRect();
    position.x=clamp(drag.ox+(event.clientX-drag.x)/rect.width*100,-50,50);
    position.y=clamp(drag.oy+(event.clientY-drag.y)/rect.height*100,-50,50);
    updateProcessCoverPreview();
  });
  const end=()=>{drag=null}; frame.addEventListener("pointerup",end); frame.addEventListener("pointercancel",end);
}
function positionProcessLockThumb(unlocked) {
  const control = $("#processActionLock");
  const track = $(".process-lock-track", control);
  const thumb = $(".process-lock-thumb", control);
  if (!track || !thumb) return;
  const max = Math.max(0, track.clientWidth - thumb.offsetWidth - 4);
  thumb.style.transform = `translateX(${unlocked ? max : 0}px)`;
}
function updateProcessActionLock(node) {
  const isProcess = node?.type === "process";
  $("#detailFooter").classList.toggle("process-detail-footer", isProcess);
  $("#processActionLock").classList.toggle("hidden", !isProcess);
  $("#detailBranchButton").disabled = isProcess && !state.processActionsUnlocked;
  $("#detailEditButton").disabled = isProcess && !state.processActionsUnlocked;
  $("#processActionLock").classList.toggle("unlocked", isProcess && state.processActionsUnlocked);
  requestAnimationFrame(() => positionProcessLockThumb(isProcess && state.processActionsUnlocked));
}
function bindProcessActionLock() {
  const control = $("#processActionLock");
  const track = $(".process-lock-track", control);
  const thumb = $(".process-lock-thumb", control);
  let drag = null;
  const setPos = ratio => {
    const max = Math.max(0, track.clientWidth - thumb.offsetWidth - 4);
    const normalized = clamp(ratio, 0, 1);
    thumb.style.transform = `translateX(${normalized * max}px)`;
    if (drag) drag.ratio = normalized;
  };
  control.addEventListener("pointerdown", event => {
    if (state.processActionsUnlocked) return;
    event.preventDefault();
    const rect = track.getBoundingClientRect();
    drag = { left: rect.left, travel: Math.max(1, rect.width - thumb.offsetWidth - 4), ratio: 0 };
    control.setPointerCapture?.(event.pointerId);
    setPos((event.clientX - rect.left - thumb.offsetWidth / 2) / drag.travel);
  });
  control.addEventListener("pointermove", event => {
    if (!drag) return;
    event.preventDefault();
    setPos((event.clientX - drag.left - thumb.offsetWidth / 2) / drag.travel);
  });
  const finish = event => {
    if (!drag) return;
    event?.preventDefault?.();
    const ratio = drag.ratio;
    drag = null;
    if (ratio >= .82) {
      state.processActionsUnlocked = true;
      navigator.vibrate?.(16);
      updateProcessActionLock(nodeById(state.activeNodeId));
    } else {
      positionProcessLockThumb(false);
    }
  };
  control.addEventListener("pointerup", finish);
  control.addEventListener("pointercancel", () => { drag = null; positionProcessLockThumb(false); });
}

function syncDraftDynamicFields() {
  const d = state.editDraft; if (!d || d.type !== "process") return;
  d.stages = $$('[data-stage-id]', $("#editorBody")).map(row => {
    const old = (d.stages || []).find(item => item.id === row.dataset.stageId) || {};
    return { ...old, id: row.dataset.stageId, title: $('[data-stage-title]', row).value.trim(), progress: Number($('[data-stage-progress]', row).value || 0) };
  });
  d.tasks = $$('[data-task-id]', $("#editorBody")).map(row => {
    const old = (d.tasks || []).find(item => item.id === row.dataset.taskId) || {};
    return { ...old, id: row.dataset.taskId, title: $('[data-task-title]', row).value.trim(), due: $('[data-task-due]', row).value };
  });
  d.expenses = $$('[data-expense-id]', $("#editorBody")).map(row => ({ id: row.dataset.expenseId, title: $('[data-expense-title]', row).value.trim(), amount: Number(String($('[data-expense-amount]', row).value || "0").replace(",", ".")), date: (d.expenses || []).find(item => item.id === row.dataset.expenseId)?.date || todayISO() }));
  d.peopleIds = [...($("#draftPeople")?.selectedOptions || [])].map(option => option.value);
}
function saveEditor(event) {
  event.preventDefault();
  syncDraftDynamicFields();
  const d = state.editDraft; const form = new FormData(event.currentTarget);
  if (!d) return;
  for (const [key, value] of form.entries()) {
    if (["budget","advance","balance","positions","progress"].includes(key)) d[key] = value === "" ? "" : Number(String(value).replace(",", "."));
    else d[key] = String(value).trim();
  }
  if (d.type === "process") updateProcessProgress(d);
  const index = state.data.nodes.findIndex(node => node.id === d.id);
  if (index >= 0) state.data.nodes[index] = d;
  const savedId=d.id; state.editDraft = null; saveData(); closeEditor(); render(); const saved=nodeById(savedId); if(saved){openDetail(saved); requestAnimationFrame(()=>{$("#detailBody").scrollTop=state.detailScrollTop||0;});} toast("Карточка сохранена");
}
function archiveActiveNode() {
  const node = nodeById(state.activeNodeId); if (!node) return;
  node.archived = true; state.selectedId = null; saveData(); closeEditor(); render(); toast("Перемещено в архив");
}

/* Assets */
async function handleAssetFiles(event) {
  const node = nodeById(state.assetTargetNodeId); const files = [...event.target.files]; event.target.value = "";
  if (!node || !files.length) return;
  node.assets ||= [];
  for (const file of files) {
    const id = uid();
    const metadata = { id, name: file.name, type: file.type || guessMime(file.name), size: file.size, createdAt: Date.now() };
    await putAsset({ ...metadata, blob: file });
    node.assets.push(metadata);
    if (!node.coverAssetId && metadata.type.startsWith("image/")) node.coverAssetId = id;
  }
  saveData(); render();
  if ($("#detailDialog").open && state.activeNodeId === node.id) renderDetailBody(node);
  if ($("#editorDialog").open && state.activeNodeId === node.id) { state.editDraft.assets = clone(node.assets); state.editDraft.coverAssetId = node.coverAssetId; }
  toast(`Добавлено файлов: ${files.length}`);
}
function guessMime(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "svg") return "image/svg+xml";
  if (["jpg","jpeg"].includes(ext)) return "image/jpeg";
  if (ext === "png") return "image/png";
  return "application/octet-stream";
}
async function openAssetViewer(node, index) {
  if (!node?.assets?.length) return;
  state.assetViewerNodeId = node.id; state.assetViewerIndex = clamp(index, 0, node.assets.length - 1);
  await renderAssetViewer();
  const dialog = $("#assetViewer"); if (!dialog.open) dialog.showModal();
}
async function renderAssetViewer() {
  const node = nodeById(state.assetViewerNodeId); const asset = node?.assets?.[state.assetViewerIndex]; if (!asset) return;
  $("#assetTitle").textContent = asset.name; $("#assetTypeLabel").textContent = assetKind(asset);
  const url = await assetUrl(asset.id).catch(() => null); const stage = $("#assetStage");
  if (!url) stage.innerHTML = `<div class="panel-empty">Файл недоступен на этом устройстве.</div>`;
  else if (asset.type.startsWith("image/")) stage.innerHTML = `<img src="${url}" alt="${esc(asset.name)}">`;
  else if (asset.type === "application/pdf" || asset.name.toLowerCase().endsWith(".pdf")) stage.innerHTML = `<iframe src="${url}#toolbar=0&navpanes=0" title="${esc(asset.name)}"></iframe>`;
  else stage.innerHTML = `<div class="panel-empty">${icon("files")}<p>${esc(asset.name)}</p><small>Используйте «Скачать» или «Поделиться».</small></div>`;
  $("#assetPrev").disabled = state.assetViewerIndex <= 0; $("#assetNext").disabled = state.assetViewerIndex >= node.assets.length - 1;
}
function moveAssetViewer(direction) {
  const node = nodeById(state.assetViewerNodeId); if (!node) return;
  state.assetViewerIndex = clamp(state.assetViewerIndex + direction, 0, node.assets.length - 1); renderAssetViewer();
}
async function currentAssetRecord() {
  const node = nodeById(state.assetViewerNodeId); const asset = node?.assets?.[state.assetViewerIndex];
  if (!asset) return null; const record = await getAsset(asset.id); return { node, asset, record };
}
async function downloadCurrentAsset() {
  const current = await currentAssetRecord(); if (!current?.record?.blob) return toast("Файл недоступен");
  const url = URL.createObjectURL(current.record.blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = current.asset.name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function shareCurrentAsset() {
  const current = await currentAssetRecord(); if (!current?.record?.blob) return toast("Файл недоступен");
  const file = new File([current.record.blob], current.asset.name, { type: current.asset.type });
  if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: current.asset.name }).catch(() => {});
  else downloadCurrentAsset();
}
async function deleteCurrentAsset() {
  const current = await currentAssetRecord(); if (!current) return;
  if (!confirm(`Удалить «${current.asset.name}»?`)) return;
  await deleteAssetRecord(current.asset.id); releaseObjectUrl(current.asset.id);
  current.node.assets.splice(state.assetViewerIndex, 1);
  if (current.node.coverAssetId === current.asset.id) current.node.coverAssetId = current.node.assets.find(item => item.type.startsWith("image/"))?.id || "";
  saveData(); render();
  if (!current.node.assets.length) $("#assetViewer").close();
  else { state.assetViewerIndex = clamp(state.assetViewerIndex, 0, current.node.assets.length - 1); renderAssetViewer(); }
  if ($("#detailDialog").open) renderDetailBody(current.node);
}

/* Panels */
function openPanel(panel) {
  $$('.bottom-nav button').forEach(button => button.classList.toggle("active", button.dataset.panel === panel));
  if (panel === "tree") { closeOverlays(); return; }
  const titles = { today: "Сегодня", results: "Результаты", archive: "Архив" };
  $("#panelTitle").textContent = titles[panel]; $("#panelEyebrow").textContent = state.space === "work" ? "ПРОЕКТЫ" : "ЛИЧНОЕ";
  $("#panelBody").innerHTML = panel === "today" ? todayPanelHtml() : panel === "results" ? resultsPanelHtml() : archivePanelHtml();
  showOverlay("sidePanel");
}
function todayPanelHtml() {
  const today = todayISO(); const entries = [];
  state.data.nodes.filter(node => node.space === state.space && !node.archived).forEach(node => {
    if (node.type === "process") (node.tasks || []).filter(task => !task.done && task.due === today).forEach(task => entries.push({ node, task }));
    if (node.type === "goal" && node.deadline === today) entries.push({ node, task: { title: node.title, due: today } });
    if (node.type === "project" && node.deadline === today) entries.push({ node, task: { title: `Срок проекта: ${node.title}`, due: today } });
  });
  if (!entries.length) return `<div class="panel-empty">На сегодня нет обязательных действий.</div>`;
  return entries.map(({ node, task }) => `<button class="panel-card" data-panel-open-node="${node.id}"><div class="panel-card-head"><b>${esc(task.title)}</b><span class="panel-chip">${esc(TYPE_LABELS[node.type])}</span></div><p>${esc(node.title)}</p></button>`).join("");
}
function resultsPanelHtml() {
  const entries = [];
  state.data.nodes.filter(node => node.space === state.space && !node.archived).forEach(node => {
    if (node.type === "process") (node.tasks || []).filter(task => task.done).forEach(task => entries.push({ node, title: task.title, detail: "Задача выполнена" }));
    if (node.status === "done") entries.push({ node, title: node.title, detail: `${TYPE_LABELS[node.type]} завершён` });
  });
  if (!entries.length) return `<div class="panel-empty">Завершённые результаты появятся здесь.</div>`;
  return entries.map(entry => `<button class="panel-card" data-panel-open-node="${entry.node.id}"><div class="panel-card-head"><b>${esc(entry.title)}</b><span class="panel-chip">✓</span></div><p>${esc(entry.detail)}</p></button>`).join("");
}
function archivePanelHtml() {
  const entries = state.data.nodes.filter(node => node.space === state.space && node.archived);
  if (!entries.length) return `<div class="panel-empty">Архив пуст.</div>`;
  return entries.map(node => `<div class="panel-card"><div class="panel-card-head"><b>${esc(node.title)}</b><button class="panel-chip" data-restore-node="${node.id}">Восстановить</button></div><p>${esc(TYPE_LABELS[node.type])}</p></div>`).join("");
}
function handlePanelClick(event) {
  const open = event.target.closest("[data-panel-open-node]"); if (open) { const node = nodeById(open.dataset.panelOpenNode); closeOverlays(); if (node) { state.selectedId = node.id; render(); focusNode(node); setTimeout(() => openDetail(node), 350); } }
  const restore = event.target.closest("[data-restore-node]"); if (restore) { const node = nodeById(restore.dataset.restoreNode); if (node) { node.archived = false; saveData(); $("#panelBody").innerHTML = archivePanelHtml(); render(); toast("Карточка восстановлена"); } }
}

/* Overlay and menu */
function showOverlay(id) {
  ["createMenu","accountMenu","sidePanel"].forEach(name => $("#" + name).classList.toggle("hidden", name !== id));
  $("#scrim").classList.remove("hidden"); $("#createButton").classList.toggle("active", id === "createMenu");
}
function closeOverlays() {
  ["createMenu","accountMenu","sidePanel"].forEach(name => $("#" + name).classList.add("hidden"));
  $("#scrim").classList.add("hidden"); $("#createButton").classList.remove("active");
  $$('.bottom-nav button').forEach(button => button.classList.toggle("active", button.dataset.panel === "tree"));
}
function handleMenuAction(event) {
  const button = event.target.closest("[data-menu-action]"); if (!button) return;
  const action = button.dataset.menuAction;
  if (action === "export") exportData();
  if (action === "import") $("#importInput").click();
  if (action === "theme") { toggleTheme(); return; }
  if (action === "fit") { closeOverlays(); fitAll(true); }
  if (action === "logout") logout();
  if (action === "reset") resetAll();
}
function exportData() {
  const payload = { app: "BOONWAVE", version: VERSION, exportedAt: new Date().toISOString(), data: state.data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `BOONWAVE_${new Date().toISOString().slice(0,10)}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); closeOverlays(); toast("Резервная копия сохранена");
}
async function importDataFile(event) {
  const file = event.target.files[0]; event.target.value = ""; if (!file) return;
  try {
    const parsed = JSON.parse(await file.text()); const data = normalizeData(parsed.data || parsed);
    if (!confirm("Заменить текущую структуру импортированной копией?")) return;
    state.data = data; saveData(); closeOverlays(); render(); fitAll(true); toast("Данные импортированы");
  } catch { toast("Не удалось прочитать JSON"); }
}
function logout() {
  saveData(); clearSession(); location.reload();
}
async function resetAll() {
  if (!confirm("Удалить все карточки, вложения и локальные настройки?")) return;
  localStorage.removeItem(storageKey()); await clearAssetDB(); clearSession();
  if ("caches" in window) { const keys = await caches.keys(); await Promise.all(keys.map(key => caches.delete(key))); }
  const registrations = await navigator.serviceWorker?.getRegistrations?.() || []; await Promise.all(registrations.map(registration => registration.unregister()));
  location.href = location.pathname + `?reset=${Date.now()}`;
}

function toast(message) {
  const element = $("#toast"); element.textContent = message; element.classList.remove("hidden"); clearTimeout(toast.timer); toast.timer = setTimeout(() => element.classList.add("hidden"), 2200);
}

/* Service worker */
function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (state.isReloadingForWorker) return; state.isReloadingForWorker = true; location.reload();
  });
  navigator.serviceWorker.register(`sw.js?v=${VERSION}`).then(registration => registration.update()).catch(error => console.warn("SW", error));
}

document.addEventListener("DOMContentLoaded", () => {
  initializeOnboarding(); registerServiceWorker();
});
