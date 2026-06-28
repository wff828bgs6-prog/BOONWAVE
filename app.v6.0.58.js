"use strict";

const VERSION = "6.0.58";
const THEME_KEY = "boonwave_theme";
const ACCOUNTS_KEY = "boonwave_v6_accounts";
const SESSION_KEY = "boonwave_v6_session";
const DATA_PREFIX = "boonwave_v6_data_";
const DATA_BACKUP_PREFIX = "boonwave_v6_backup_";
const SCHEMA_VERSION = 7;
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
function externalHref(value, kind = "site") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (kind === "social" && raw.startsWith("@")) return `https://instagram.com/${encodeURIComponent(raw.slice(1))}`;
  if (kind === "telegram") {
    if (raw.startsWith("@")) return `https://t.me/${encodeURIComponent(raw.slice(1))}`;
    if (/^[A-Za-z0-9_]{5,32}$/.test(raw)) return `https://t.me/${encodeURIComponent(raw)}`;
  }
  let candidate = raw;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate)) candidate = `https://${candidate.replace(/^\/\//, "")}`;
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

function bindTactileFeedback(container, selector, options = {}) {
  if (!container || container.dataset.tactileBound === "1") return;
  const pressClass = options.pressClass || "is-pressing";
  const vibrateMs = Number.isFinite(options.vibrate) ? options.vibrate : 8;
  const clear = () => container.querySelectorAll(`.${pressClass}`).forEach(item => item.classList.remove(pressClass));
  container.addEventListener("pointerdown", event => {
    const target = event.target.closest(selector);
    if (!target || target.disabled || target.getAttribute("aria-disabled") === "true") return;
    clear();
    target.classList.add(pressClass);
    try { if (vibrateMs && navigator.vibrate) navigator.vibrate(vibrateMs); } catch (_) {}
  }, { passive: true });
  container.addEventListener("pointerup", clear, { passive: true });
  container.addEventListener("pointercancel", clear, { passive: true });
  container.addEventListener("pointerleave", clear, { passive: true });
  container.dataset.tactileBound = "1";
}

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
    nowMe: `<circle cx="12" cy="7.2" r="2.5"/><path d="M7.7 20v-4.6c0-2.4 1.9-4.3 4.3-4.3s4.3 1.9 4.3 4.3V20"/><path d="M7.8 12.2 4.2 8.7M16.2 12.2l3.6-3.5M4.2 8.7V5.4M19.8 8.7V5.4"/>`,
    results: `<path d="M6 19V9m6 10V5m6 14v-7"/><path d="m5 7 4-3 3 2 6-4"/>`,
    archive: `<path d="M4 7h16v3H4zM6 10v9h12v-9M9 14h6"/>`,
    archiveSend: `<path d="M4 7h16v3H4zM6 10v9h12v-9M9 15h6"/><path d="M12 3v7m0 0-3-3m3 3 3-3"/>`,
    archiveList: `<path d="M4 5h16v4H4zM5.5 9v10h13V9M8 13h8M8 16h5"/>`,
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
    focus: `<path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5"/><path d="M4 4l5 5M20 4l-5 5M4 20l5-5M20 20l-5-5"/>`,
    export: `<path d="M12 3v12m0-12-4 4m4-4 4 4"/><path d="M5 13v7h14v-7"/>`,
    import: `<path d="M12 15V3m0 12-4-4m4 4 4-4"/><path d="M5 13v7h14v-7"/>`,
    logout: `<path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10"/>`,
    trash: `<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>`,
    plus: `<path d="M12 5v14M5 12h14"/>`,
    calendar: `<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>`,
    link: `<path d="M9.5 14.5 8 16a3 3 0 0 1-4-4l3-3a3 3 0 0 1 4 0M14.5 9.5 16 8a3 3 0 1 1 4 4l-3 3a3 3 0 0 1-4 0M9 12h6"/>`,
    telegram: `<path d="m21 3-7.6 18-3.7-6.5L3 11.2 21 3Z"/><path d="m9.7 14.5 4.7-4.1"/>`,
    location: `<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>`,
    restore: `<path d="M4 8v5h5"/><path d="M5.5 13a7 7 0 1 0 2-6"/>`,
    phone: `<path d="M7 3h3l1.2 4-2 1.6a15 15 0 0 0 6.2 6.2l1.6-2L21 14v3c0 2-1 3-3 3C10.3 20 4 13.7 4 6c0-2 1-3 3-3Z"/>`,
    mail: `<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>`,
    edit: `<path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>`,
    lock: `<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8.5a4 4 0 0 1 8 0V11"/>`,
    unlock: `<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M16 11V8.6a4 4 0 0 0-7.5-2"/>`,
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
  actionsOpenId: null,
  camera: { tx: 0, ty: 0, scale: 1 },
  canvasPointers: new Map(),
  canvasGesture: null,
  lastCanvasTap: 0,
  lastCardTap: { id: null, time: 0 },
  eyeTap: { id: null, timer: null, time: 0 },
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
  quickCoverOriginalAssetId: null,
  quickCoverPendingAssetId: null,
  taskArchivePending: null,
  taskArchiveTap: { id: null, time: 0 },
  taskArchiveExpandedId: null,
  expenseSelectionMode: false,
  selectedExpenseIds: new Set(),
  phonebookEditId: null,
  phonebookRelationsContactId: null,
  detailScrollTop: 0,
  lastBudgetTap: 0,
  lastPhonebookTap: 0,
  stageReturnScrollTop: 0,
  selectedLinkId: null,
  linkDrag: null,
  linkCreateSourceId: null,
  linkDropTargetId: null,
  linkFlowGesture: null,
  linkFlow: null,
  linkMenuId: null,
  linkRenderFrame: 0,
  zoomIdleTimer: 0,
  dotRenderFrame: 0,
  linkDirectionModeId: null,
  lastLinkTap: { id: null, time: 0 },
  undoStack: [],
  justCreatedId: null,
  isReloadingForWorker: false,
  focusOverview: false,
  cameraInertiaFrame: 0,
  lastSaveError: null,
  activeInteraction: false,
  interactionWatchdog: 0,
  suppressCanvasTapUntil: 0,
  capturedPointers: new Map()
};

function blankData() {
  return {
    version: VERSION,
    spaces: { personal: { name: "Личное" }, work: { name: "Проекты" } },
    nodes: [],
    links: [],
    settings: { hintDismissed: false, cameras: {}, lastWorkingNode: {} },
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
        title: "Антон", speciality: "3D-печать и прототипы", personStatus: "Работаем", personStatusMode: "Работаем",
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
    settings: { hintDismissed: false, cameras: {}, lastWorkingNode: {} },
    updatedAt: Date.now()
  };
}

function storageKey() { return `${DATA_PREFIX}${state.userId}`; }
function backupKey() { return `${DATA_BACKUP_PREFIX}${state.userId}`; }
function saveData({ silent = false } = {}) {
  if (!state.data || !state.userId) return false;
  try {
    state.data.version = VERSION;
    state.data.schemaVersion = SCHEMA_VERSION;
    state.data.updatedAt = Date.now();
    const next = JSON.stringify(state.data);
    const current = localStorage.getItem(storageKey());
    if (current && current !== next) localStorage.setItem(backupKey(), current);
    localStorage.setItem(storageKey(), next);
    state.lastSaveError = null;
    return true;
  } catch (error) {
    console.error("BOONWAVE save failed", error);
    state.lastSaveError = error;
    if (!silent) setTimeout(() => toast("Не удалось сохранить изменения. Освободите место и повторите."), 0);
    return false;
  }
}
function loadData(userId, useDemo = false) {
  const raw = localStorage.getItem(`${DATA_PREFIX}${userId}`);
  if (raw) {
    try { return normalizeData(JSON.parse(raw)); } catch (error) { console.warn("Invalid saved data", error); }
  }
  const backup = localStorage.getItem(`${DATA_BACKUP_PREFIX}${userId}`);
  if (backup) {
    try {
      const restored = normalizeData(JSON.parse(backup));
      localStorage.setItem(`${DATA_PREFIX}${userId}`, JSON.stringify(restored));
      setTimeout(() => toast("Данные восстановлены из локальной резервной копии"), 500);
      return restored;
    } catch (error) { console.warn("Invalid backup data", error); }
  }
  return useDemo ? demoData() : blankData();
}
function normalizeData(data) {
  const base = blankData();
  const normalized = { ...base, ...data };
  normalized.nodes = Array.isArray(data.nodes) ? data.nodes.map(node => {
    const normalizedNode = { level: 2, assets: [], archived: false, locked: false, status: "active", ...node };
    if (normalizedNode.type === "person") {
      let legacyZone = String(normalizedNode.personStatus || normalizedNode.zone || "").trim();
      if (legacyZone === "В работе") legacyZone = "Работаем";
      const known = ["Неизвестно","Временно","Перспективный","Работаем"];
      normalizedNode.personStatus = known.includes(legacyZone) ? legacyZone : (legacyZone ? legacyZone.slice(0,30) : "Неизвестно");
      normalizedNode.personStatusMode = known.includes(normalizedNode.personStatus) ? normalizedNode.personStatus : "custom";
      normalizedNode.telegram = String(normalizedNode.telegram || "");
      normalizedNode.address = String(normalizedNode.address || "");
    }
    if (Number(normalizedNode.level) === 3) normalizedNode.level = 2;
    if (normalizedNode.type === "process") {
      normalizedNode.stages = Array.isArray(normalizedNode.stages) ? normalizedNode.stages : [];
      normalizedNode.phonebook = Array.isArray(normalizedNode.phonebook) ? normalizedNode.phonebook.map(contact => ({ ...contact, messengers: Array.isArray(contact.messengers) ? contact.messengers : [] })) : [];
      const fallbackStageId = normalizedNode.stages[0]?.id || "";
      normalizedNode.tasks = Array.isArray(normalizedNode.tasks) ? normalizedNode.tasks.map(task => {
        const normalizedTask = { priority: "medium", note: "", contactIds: [], scheduleMode: "date", intervalStart: "", intervalEnd: "", dateTime: "", reminder: "15", notify: false, archived: false, archivedAt: "", archivedStageId: "", archivedStageTitle: "", stageId: task.stageId || fallbackStageId, ...task };
        normalizedTask.note = String(normalizedTask.note || "").slice(0, 400);
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
  normalized.links = Array.isArray(data.links) ? data.links.map(link => ({ flow: "none", highlighted: false, ...link })) : [];
  normalized.settings = { ...base.settings, cameras: {}, lastWorkingNode: {}, ...(data.settings || {}) };
  normalized.schemaVersion = SCHEMA_VERSION;
  normalized.nodes.forEach(node => { if (node.archived && !node.archivedAt) node.archivedAt = new Date(node.updatedAt || normalized.updatedAt || Date.now()).toISOString(); });
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
  if (node.type === "person") return { w: 230, h: 230 };
  if (node.type === "idea") return { w: 238, h: 176 };
  if (node.type === "goal") return { w: 230, h: 176 };
  return { w: 230, h: 154 };
}
function screenToWorld(x, y) {
  return { x: (x - state.camera.tx) / state.camera.scale, y: (y - state.camera.ty) / state.camera.scale };
}
function liveCardDims(node) {
  const el = document.querySelector(`.node-card[data-id="${CSS.escape(String(node.id))}"]`);
  if (!el) return cardDims(node);
  const shell = el.querySelector('.card-shell') || el;
  const w = shell.offsetWidth || el.offsetWidth;
  const h = shell.offsetHeight || el.offsetHeight;
  return w && h ? { w, h } : cardDims(node);
}
function rememberPointerCapture(pointerId, element) {
  if (pointerId == null || !element) return;
  state.capturedPointers.set(pointerId, element);
}
function releaseRememberedPointer(pointerId) {
  const element = state.capturedPointers.get(pointerId);
  if (element) { try { if (element.hasPointerCapture?.(pointerId)) element.releasePointerCapture(pointerId); } catch (_) {} }
  state.capturedPointers.delete(pointerId);
}
function armInteractionWatchdog() {
  clearTimeout(state.interactionWatchdog);
  state.interactionWatchdog = setTimeout(() => {
    if (state.canvasPointers.size || state.linkDrag || state.linkFlowGesture) resetAllTransientGestures();
  }, 5000);
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
const MAX_IMAGE_EDGE = 2048;
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

async function optimizeImageFile(file) {
  if (!file?.type?.startsWith("image/") || file.type === "image/svg+xml") return file;
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("FILE_TOO_LARGE");
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { return file; }
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 2.5 * 1024 * 1024) { bitmap.close?.(); return file; }
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d", { alpha: false });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const mime = file.type === "image/png" && file.size < 1.5 * 1024 * 1024 ? "image/png" : "image/jpeg";
  const quality = mime === "image/jpeg" ? 0.84 : undefined;
  const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, quality));
  return blob || file;
}

function assetMetadata(id, file, blob = file) {
  return {
    id,
    ownerId: state.userId,
    name: file.name,
    type: blob.type || file.type || guessMime(file.name),
    size: blob.size,
    originalSize: file.size,
    createdAt: Date.now()
  };
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
async function clearAssetDB(ownerId = state.userId) {
  const db = await openAssetDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("assets", "readwrite");
    const store = tx.objectStore("assets");
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const recordOwner = cursor.value?.ownerId || GUEST_ID;
      if (!ownerId || recordOwner === ownerId) cursor.delete();
      cursor.continue();
    };
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
  if (window.__boonwaveOnboardingStarted) return;
  window.__boonwaveOnboardingStarted = true;
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
  resetAllTransientGestures();
  render();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (currentNodes().length) fitAll(false);
      else centerCamera();
      scheduleRenderLinks();
      setTimeout(() => { applyCamera(); scheduleRenderLinks(); }, 80);
    });
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
  viewport.addEventListener("lostpointercapture", event => { releaseRememberedPointer(event.pointerId); resetAllTransientGestures(); });
  window.addEventListener("resize", () => { drawDots(); applyCamera(); });

  $$('.space-switch button').forEach(button => button.addEventListener("click", () => switchSpace(button.dataset.space)));
  $("#createButton").addEventListener("click", toggleCreateMenu);
  $("#todayQuickButton")?.addEventListener("click", () => openPanel("today"));
  $("#desktopZoomRange")?.addEventListener("input", handleDesktopZoomInput, { passive: true });
  $("#desktopZoomRange")?.addEventListener("change", handleDesktopZoomInput, { passive: true });
  $("#fitButton").addEventListener("click", smartFocusCurrent);
  $("#resultsQuickButton")?.addEventListener("click", () => openPanel("results"));
  $$("[data-quick-create]").forEach(button => button.addEventListener("click", () => quickCreateFromDock(button.dataset.quickCreate)));
  $("#brandHome").addEventListener("click", () => fitAll(true));
  $("#menuButton").addEventListener("click", () => showOverlay("accountMenu"));
  $("#scrim").addEventListener("click", closeOverlays);
  $$('[data-close-sheet]').forEach(button => button.addEventListener("click", closeOverlays));
  $("#createActions").addEventListener("click", handleCreateAction);
  $("#accountMenu").addEventListener("click", handleMenuAction);
  $("#cardLayer").addEventListener("click", handleCardActionClick);
  $("#linkLayer").addEventListener("pointerdown", handleLinkPointerDown);
  $("#linkHighlightButton")?.addEventListener("click", toggleSelectedLinkHighlight);
  $("#linkDirectionButton")?.addEventListener("click", enableSelectedLinkDirection);
  $("#deleteSelectedLink")?.addEventListener("click", deleteSelectedLink);
  $("#toastAction")?.addEventListener("click", runToastAction);
  window.addEventListener("pointermove", handleLinkPointerMove, { passive: false });
  window.addEventListener("pointerup", finishLinkPointerDrag, { passive: false });
  window.addEventListener("pointercancel", finishLinkPointerDrag, { passive: false });
  window.addEventListener("pointerup", event => {
    if (state.canvasPointers.has(event.pointerId)) onCanvasPointerEnd(event);
  }, { passive: false });
  window.addEventListener("pointercancel", event => {
    if (state.canvasPointers.has(event.pointerId)) onCanvasPointerEnd(event);
    resetAllTransientGestures();
  }, { passive: false });
  window.addEventListener("blur", resetAllTransientGestures);
  window.addEventListener("pageshow", () => {
    resetAllTransientGestures();
    requestAnimationFrame(() => requestAnimationFrame(() => scheduleRenderLinks()));
  });
  window.addEventListener("touchcancel", resetAllTransientGestures, { passive: true });
  window.addEventListener("pointerdown", event => {
    if (event.pointerType === "touch" && (state.linkDrag || state.linkFlowGesture) && event.pointerId !== state.linkDrag?.pointerId && event.pointerId !== state.linkFlowGesture?.pointerId) resetAllTransientGestures();
  }, { capture: true, passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) resetAllTransientGestures();
    else requestAnimationFrame(() => requestAnimationFrame(() => scheduleRenderLinks()));
  });
  $("#detailEditButton").addEventListener("click", () => {
    const node = nodeById(state.activeNodeId); if (node) openEditor(node);
  });
  $("#detailBranchButton").addEventListener("click", () => {
    const node = nodeById(state.activeNodeId); if (node) createBranchFor(node);
  });
  $("#detailTaskArchiveButton")?.addEventListener("click", () => {
    const node = nodeById(state.activeNodeId); if (node?.type === "process") openTaskArchive(node);
  });
  $("#detailNodeArchiveButton")?.addEventListener("click", () => {
    const node = nodeById(state.activeNodeId);
    if (!node || node.type !== "process") return;
    if (!confirm(`Отправить рабочий процесс «${node.title || "Без названия"}» в архив? Его данные и связи сохранятся.`)) return;
    archiveActiveNode();
  });
  $("#editorForm").addEventListener("submit", saveEditor);
  $$('[data-editor-close]').forEach(button => button.addEventListener("click", closeEditor));
  $("#archiveNodeButton").addEventListener("click", archiveActiveNode);
  $("#assetInput").addEventListener("change", handleAssetFiles);
  $("#processCoverInput").addEventListener("change", handleProcessCoverFile);
  $("#processCoverScale").addEventListener("input", updateProcessCoverPreview);
  $$('[data-cover-fit]', $("#processCoverDialog")).forEach(button=>button.addEventListener("click",()=>setProcessCoverFit(button.dataset.coverFit)));
  $("#processCoverReset").addEventListener("click", resetProcessCoverPosition);
  $("#processCoverApply").addEventListener("click", applyProcessCoverPosition);
  $("#detailClose").addEventListener("click", () => { if ($("#detailDialog").open) $("#detailDialog").close(); });
  $("#processCoverClose").addEventListener("click", cancelProcessCoverPosition);
  $("#processCoverDialog").addEventListener("cancel", event => { event.preventDefault(); cancelProcessCoverPosition(); });
  bindProcessCoverPositioning();
  bindProcessActionLock();
  $("#taskEditorForm").addEventListener("submit", saveTaskEditor);
  $("#taskNote").addEventListener("input", updateTaskNoteCounter);
  $("#taskEditorClose").addEventListener("click", closeTaskEditor);
  $("#taskEditorCancel").addEventListener("click", closeTaskEditor);
  $("#taskRoleDialogClose")?.addEventListener("click", closeTaskRoleDialog);
  $("#taskRoleDialogCancel")?.addEventListener("click", closeTaskRoleDialog);
  $("#taskRoleDialogApply")?.addEventListener("click", applyTaskRoleDialog);
  $("#taskScheduleMode").addEventListener("change", updateTaskScheduleFields);
  $("#stageEditorForm").addEventListener("submit", saveStageEditor);
  $("#stageEditorClose").addEventListener("click", closeStageEditor);
  $("#stageEditorDialog").addEventListener("cancel", event => { event.preventDefault(); closeStageEditor(); });
  $("#stageDeleteButton").addEventListener("click", openStageDeleteConfirm);
  $("#stageDeleteClose").addEventListener("click", closeStageDeleteConfirm);
  $("#stageDeleteNo").addEventListener("click", cancelStageDelete);
  $("#stageDeleteYes").addEventListener("click", confirmStageDelete);
  $("#budgetEditorForm").addEventListener("submit", saveBudgetEditor);
  $("#budgetEditorClose").addEventListener("click", closeBudgetEditor);
  $("#coverQuickClose").addEventListener("click", closeCoverQuickMenu);
  $("#coverQuickTitleToggle").addEventListener("click", toggleQuickProcessTitle);
  $("#coverQuickTitleInput").addEventListener("input", updateQuickProcessTitleState);
  $("#coverQuickTitleInput").addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); saveQuickProcessTitle(); } });
  $("#coverQuickTitleCancel").addEventListener("click", cancelQuickProcessTitle);
  $("#coverQuickTitleSave").addEventListener("click", saveQuickProcessTitle);
  $("#coverQuickNew").addEventListener("click", startQuickNewCover);
  $("#coverQuickPosition").addEventListener("click", startQuickPositionCover);
  $("#detailBody").addEventListener("dblclick", event => {
    const target = event.target.closest("[data-budget-edit]");
    const coverShell = event.target.closest("[data-detail-cover-shell]");
    const node = nodeById(state.activeNodeId);
    if (target && node?.type === "process") {
      event.preventDefault();
      event.stopPropagation();
      state.lastBudgetTap = 0;
      openBudgetEditor(node);
      return;
    }
    if (coverShell && node?.type === "process") {
      event.preventDefault();
      event.stopPropagation();
      openCoverQuickMenu(node);
    }
  });
  $("#detailBody").addEventListener("click", handleMessengerBadgeTap);
  $("#detailBody").addEventListener("dblclick", event => { const badge=event.target.closest("[data-messenger-contact][data-messenger-type]"); if(!badge)return; event.preventDefault(); event.stopPropagation(); if(badge.dataset.messengerActive!=="1")return; const node=nodeById(state.activeNodeId); const contact=(node?.phonebook||[]).find(item=>item.id===badge.dataset.messengerContact); if(contact)openMessengerAction(contact,badge.dataset.messengerType); });
  $("#budgetEditValue").addEventListener("input", formatBudgetEditorInput);
  $("#phonebookClose").addEventListener("click", closePhonebook);
  $("#phonebookAdd").addEventListener("click", () => renderPhonebookEditor(null));
  $("#phonebookBody").addEventListener("click", handlePhonebookClick);
  $("#phonebookBody").addEventListener("click", handleMessengerBadgeTap);
  $("#phonebookBody").addEventListener("dblclick", event => {
    const badge = event.target.closest("[data-messenger-contact][data-messenger-type]");
    if (!badge || badge.dataset.messengerActive !== "1") return;
    event.preventDefault();
    event.stopPropagation();
    const node = nodeById(state.activeNodeId);
    const contact = (node?.phonebook || []).find(item => item.id === badge.dataset.messengerContact);
    if (contact) openMessengerAction(contact, badge.dataset.messengerType);
  });
  $("#phonebookEditorForm").addEventListener("submit", savePhonebookContact);
  $("#phonebookEditorCancel").addEventListener("click", closePhonebookEditor);
  $("#phonebookEditorClose").addEventListener("click", closePhonebookEditor);
  $("#phonebookRelationsClose").addEventListener("click", closePhonebookRelations);
  $("#phonebookMessengers").addEventListener("click", handleMessengerPickerClick);
  $("#messengerActionClose").addEventListener("click", closeMessengerAction);
  $("#messengerActionWrite").addEventListener("click", () => runMessengerAction("write"));
  $("#messengerActionCall").addEventListener("click", () => runMessengerAction("call"));
  $("#taskArchiveConfirmClose")?.addEventListener("click", closeTaskArchiveConfirm);
  $("#taskArchiveConfirmNo")?.addEventListener("click", closeTaskArchiveConfirm);
  $("#taskArchiveConfirmYes")?.addEventListener("click", confirmArchiveTask);
  $("#taskArchiveClose")?.addEventListener("click", closeTaskArchive);
  $("#taskArchiveBody")?.addEventListener("click", handleTaskArchiveClick);
  $("#importInput").addEventListener("change", importDataFile);
  $("#assetClose").addEventListener("click", () => $("#assetViewer").close());
  $("#assetPrev").addEventListener("click", () => moveAssetViewer(-1));
  $("#assetNext").addEventListener("click", () => moveAssetViewer(1));
  $("#assetShare").addEventListener("click", shareCurrentAsset);
  $("#assetDownload").addEventListener("click", downloadCurrentAsset);
  $("#assetDelete").addEventListener("click", deleteCurrentAsset);
  $("#detailBody").addEventListener("click", handleDetailClick);
  $("#panelBody").addEventListener("click", handlePanelClick);
  const clearNowTaskPress = () => $$(".now-task.is-pressing", $("#panelBody")).forEach(item => item.classList.remove("is-pressing"));
  $("#panelBody").addEventListener("pointerdown", event => {
    const task = event.target.closest(".now-task");
    if (!task) return;
    clearNowTaskPress();
    task.classList.add("is-pressing");
    try { if (navigator.vibrate) navigator.vibrate(9); } catch (_) {}
  }, { passive: true });
  $("#panelBody").addEventListener("pointerup", clearNowTaskPress, { passive: true });
  $("#panelBody").addEventListener("pointercancel", clearNowTaskPress, { passive: true });
  $("#panelBody").addEventListener("pointerleave", clearNowTaskPress, { passive: true });
  bindTactileFeedback($("#detailBody"), ".person-contact-item, .asset-tile, [data-detail-action], .task-archive-item-main, .process-phonebook-button, .task-contact-number");
  bindTactileFeedback($("#accountMenu"), ".menu-row");
  $$('.bottom-nav button[data-panel]').forEach(button => button.addEventListener("click", () => openPanel(button.dataset.panel)));
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
  state.data.settings ||= {};
  state.data.settings.cameras ||= {};
  state.data.settings.cameras[state.space] = clone(state.camera);
  state.space = space; state.selectedId = null; state.selectedLinkId = null; state.linkMenuId = null;
  const savedCamera = state.data.settings.cameras[space];
  render(); requestAnimationFrame(() => {
    if (savedCamera) { state.camera = clone(savedCamera); applyCamera(); }
    else if (currentNodes().length) fitAll(false); else centerCamera();
  });
  saveData();
}
function cardClass(node) {
  const level = node.level || 2;
  const statusClass = node.status === "paused" ? "status-paused" : node.status === "done" ? "status-done" : node.status === "cancelled" ? "status-cancelled" : "";
  return `node-card ${level === 1 ? "compact" : "medium"} ${statusClass} ${node.locked ? "locked" : ""} ${state.selectedId === node.id ? "selected" : ""} ${state.actionsOpenId === node.id ? "actions-open" : ""} ${state.activeNodeId === node.id ? "opened" : ""}`;
}
function nodeSubtitle(node) {
  if (node.type === "project") return node.client || node.address || "Новый проект";
  if (node.type === "process") return `${(node.stages || []).length} этапа · ${(node.tasks || []).filter(task => !task.done && !task.archived).length} задач`;
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
  if (node.type === "process") return metricHtml("task", (node.tasks || []).filter(task => !task.done && !task.archived).length) + metricHtml("people", (node.peopleIds || []).length) + metricHtml("budget", (node.expenses || []).reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString("ru-RU"));
  if (node.type === "person") return metricHtml("link", (node.tags || "").split(",").filter(Boolean).length) + metricHtml("task", tasksForPerson(node.id).filter(task => !task.done).length);
  if (node.type === "idea") return metricHtml("image", (node.assets || []).length) + metricHtml("link", linkNodesFor(node.id).length);
  return metricHtml("calendar", node.deadline || "без срока") + metricHtml("results", `${node.progress || 0}%`);
}
function syncCardSelectionDOM() {
  $$(".node-card", $("#cardLayer")).forEach(card => {
    const id = card.dataset.id;
    card.classList.toggle("selected", state.selectedId === id);
    card.classList.toggle("actions-open", state.actionsOpenId === id);
    card.classList.toggle("link-create-source", state.linkCreateSourceId === id);
    card.classList.toggle("link-create-candidate", Boolean(state.linkCreateSourceId) && state.linkCreateSourceId !== id);
  });
}

function renderCards() {
  const layer = $("#cardLayer");
  layer.innerHTML = "";
  currentNodes().forEach(node => {
    const article = document.createElement("article");
    article.className = cardClass(node);
    if (state.justCreatedId === node.id) article.classList.add("newly-created");
    else if (state.justCreatedId) article.classList.add("creation-dimmed");
    if (state.linkCreateSourceId === node.id) article.classList.add("link-create-source");
    else if (state.linkCreateSourceId) article.classList.add("link-create-candidate");
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
          ${node.locked ? `<span class="card-lock-badge" aria-label="Карточка зафиксирована">${icon("lock")}</span>` : ""}
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
        <button class="card-action primary-action" data-card-action="connect" aria-label="Создать связь">${icon("link")}</button>
        <button class="card-action" data-card-action="toggleLock" aria-label="${node.locked ? "Снять фиксацию" : "Зафиксировать карточку"}" title="${node.locked ? "Снять фиксацию" : "Зафиксировать карточку"}">${icon(node.locked ? "lock" : "unlock")}</button>
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
      if (node) {
        const position = processCoverPosition(node, String(node.level || 2));
        visual.style.backgroundPosition = `calc(50% + ${Number(position.x || 0)}%) calc(50% + ${Number(position.y || 0)}%)`;
        const base = position.fit === "contain" ? 100 : 100;
        const forceCompactPersonCover = node.type === "person" && Number(node.level || 2) === 1;
        visual.style.backgroundSize = forceCompactPersonCover ? `${Math.max(112, Number(position.scale || 1) * 100)}%` : (position.fit === "contain" ? `contain` : `${Math.max(base, Number(position.scale || 1) * 100)}%`);
        visual.style.backgroundRepeat = "no-repeat";
        if (forceCompactPersonCover && !Number(position.y || 0)) visual.style.backgroundPosition = `calc(50% + ${Number(position.x || 0)}%) 38%`;
      }
      visual.querySelector(".card-visual-placeholder")?.remove();
    }
  }
}
function scheduleRenderLinks() {
  if (state.linkRenderFrame) return;
  state.linkRenderFrame = requestAnimationFrame(() => {
    state.linkRenderFrame = 0;
    renderLinks();
  });
}
function setZoomInteraction(active = true) {
  const viewport = $("#canvasViewport");
  if (!viewport) return;
  viewport.classList.toggle("is-zooming", active);
  clearTimeout(state.zoomIdleTimer);
  if (active) state.zoomIdleTimer = setTimeout(() => viewport.classList.remove("is-zooming"), 180);
}
function renderLinks() {
  const svg = $("#linkLayer");
  const fragment = document.createDocumentFragment();
  const viewport = $("#canvasViewport");
  const lightweight = Boolean(viewport?.classList.contains("is-panning") || viewport?.classList.contains("is-zooming") || $(".node-card.dragging"));
  const rect = viewport?.getBoundingClientRect();
  const margin = 220 / Math.max(state.camera.scale, .2);
  const viewBounds = rect ? {
    left: (-state.camera.tx) / state.camera.scale - margin,
    top: (-state.camera.ty) / state.camera.scale - margin,
    right: (rect.width - state.camera.tx) / state.camera.scale + margin,
    bottom: (rect.height - state.camera.ty) / state.camera.scale + margin
  } : null;
  svg.classList.toggle("link-editing", Boolean(state.selectedLinkId));
  svg.innerHTML = `<defs>
    <linearGradient id="linkGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a14eff"/><stop offset=".55" stop-color="#6177ff"/><stop offset="1" stop-color="#55dcec"/></linearGradient>
    <linearGradient id="linkPulseGradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9c55ff" stop-opacity="0"/><stop offset=".42" stop-color="#8a68ff" stop-opacity=".5"/><stop offset=".66" stop-color="#6fa7ff" stop-opacity="1"/><stop offset="1" stop-color="#62e2ef" stop-opacity="0"/></linearGradient>
  </defs>`;
  state.data.links.forEach(link => {
    const a = nodeById(link.a), b = nodeById(link.b);
    if (!a || !b || a.space !== state.space || b.space !== state.space || a.archived || b.archived) return;
    const aDims = liveCardDims(a), bDims = liveCardDims(b);
    if (viewBounds) {
      const minX = Math.min(a.x, b.x), minY = Math.min(a.y, b.y);
      const maxX = Math.max(a.x + aDims.w, b.x + bDims.w), maxY = Math.max(a.y + aDims.h, b.y + bDims.h);
      if (maxX < viewBounds.left || minX > viewBounds.right || maxY < viewBounds.top || minY > viewBounds.bottom) return;
    }
    const geometry = linkGeometry(a, b);
    let pathData = geometry.d;
    let startPoint = geometry.start;
    let endPoint = geometry.end;
    if (state.linkDrag?.linkId === link.id && state.linkDrag.point) {
      if (state.linkDrag.end === "a") startPoint = state.linkDrag.point;
      else endPoint = state.linkDrag.point;
      pathData = curveBetweenPoints(startPoint, endPoint);
    }
    const selected = state.selectedLinkId === link.id;
    const related = state.selectedId === a.id || state.selectedId === b.id;
    const hit = document.createElementNS("http://www.w3.org/2000/svg", "path");
    hit.setAttribute("d", pathData);
    hit.setAttribute("class", "link-hit");
    hit.dataset.linkId = link.id;
    fragment.appendChild(hit);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("pathLength", "1000");
    const muted = state.selectedLinkId ? !selected : (state.selectedId ? !related : false);
    path.setAttribute("class", `link-path ${related ? "active" : ""} ${selected ? "selected" : ""} ${muted ? "muted" : ""} ${link.highlighted ? "highlighted" : ""}`);
    path.dataset.linkId = link.id;
    fragment.appendChild(path);

    if (!lightweight && link.flow && link.flow !== "none") {
      const cometSegments = [
        { cls: "comet-tail-near", lag: 118 },
        { cls: "comet-body", lag: 48 },
        { cls: "comet-head", lag: 0 }
      ];
      const addPulse = reverse => {
        cometSegments.forEach(segment => {
          const pulse = document.createElementNS("http://www.w3.org/2000/svg", "path");
          pulse.setAttribute("d", pathData);
          pulse.setAttribute("pathLength", "1000");
          pulse.setAttribute("class", `link-flow-overlay ${segment.cls} ${reverse ? "reverse" : "forward"}`);
          pulse.style.setProperty("--comet-lag", String(segment.lag));
          fragment.appendChild(pulse);
        });
      };
      if (link.flow === "forward") addPulse(false);
      if (link.flow === "reverse") addPulse(true);
      if (link.flow === "bidirectional") { addPulse(false); addPulse(true); }
    }

    [startPoint, endPoint].forEach((point, index) => {
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", point.x); dot.setAttribute("cy", point.y); dot.setAttribute("r", selected ? "5" : "3");
      dot.setAttribute("class", `link-dot ${selected ? "selected" : ""}`);
      fragment.appendChild(dot);
      if (selected) {
        const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        handle.setAttribute("cx", point.x); handle.setAttribute("cy", point.y); handle.setAttribute("r", "14");
        handle.setAttribute("class", "link-end-handle");
        handle.dataset.linkId = link.id;
        handle.dataset.linkEnd = index === 0 ? "a" : "b";
        fragment.appendChild(handle);
      }
    });
  });
  svg.appendChild(fragment);
  updateLinkToolbar();
  updateLinkDropHighlight();
}
function curveBetweenPoints(start, end) {
  const dx = end.x - start.x, dy = end.y - start.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const curve = clamp(Math.abs(dx) * .42, 70, 230) * (dx >= 0 ? 1 : -1);
    return `M ${start.x} ${start.y} C ${start.x + curve} ${start.y}, ${end.x - curve} ${end.y}, ${end.x} ${end.y}`;
  }
  const curve = clamp(Math.abs(dy) * .42, 60, 200) * (dy >= 0 ? 1 : -1);
  return `M ${start.x} ${start.y} C ${start.x} ${start.y + curve}, ${end.x} ${end.y - curve}, ${end.x} ${end.y}`;
}
function resetCanvasGestureState() {
  cancelAnimationFrame(state.cameraInertiaFrame);
  state.cameraInertiaFrame = 0;
  [...state.canvasPointers.keys()].forEach(releaseRememberedPointer);
  state.canvasPointers.clear();
  state.canvasGesture = null;
  const viewport = $("#canvasViewport");
  viewport?.classList.remove("is-panning", "is-zooming");
  setZoomInteraction(false);
}
function resetLinkGestureState() {
  if (state.linkFlowGesture?.pointerId != null) releaseRememberedPointer(state.linkFlowGesture.pointerId);
  if (state.linkDrag?.pointerId != null) releaseRememberedPointer(state.linkDrag.pointerId);
  state.linkFlowGesture = null;
  state.linkDrag = null;
  state.linkDropTargetId = null;
  const viewport = $("#canvasViewport");
  viewport?.classList.remove("is-panning", "is-zooming");
  setZoomInteraction(false);
}
function resetAllTransientGestures() {
  clearTimeout(state.interactionWatchdog);
  state.interactionWatchdog = 0;
  resetCanvasGestureState();
  resetLinkGestureState();
  state.capturedPointers.forEach((_, id) => releaseRememberedPointer(id));
  document.documentElement.classList.remove("interaction-locked");
}

function handleLinkPointerDown(event) {
  const handle = event.target.closest?.(".link-end-handle");
  const hit = event.target.closest?.(".link-hit,.link-path");
  if (!handle && !hit) return;
  event.preventDefault(); event.stopPropagation();
  state.suppressCanvasTapUntil = performance.now() + 700;
  resetCanvasGestureState();
  try { (handle || hit).setPointerCapture?.(event.pointerId); rememberPointerCapture(event.pointerId, handle || hit); } catch (_) {}
  armInteractionWatchdog();
  document.documentElement.classList.add("interaction-locked");
  const linkId = (handle || hit).dataset.linkId;
  if (!linkId) return;
  const linkRecord = state.data.links.find(item => item.id === linkId);
  const endpointA = nodeById(linkRecord?.a), endpointB = nodeById(linkRecord?.b);
  if (endpointA?.locked && endpointB?.locked) return;
  state.selectedLinkId = linkId;
  state.selectedId = null;
  state.linkMenuId = null;
  if (handle) {
    const link = state.data.links.find(item => item.id === linkId); if (!link) return;
    const movingEnd = handle.dataset.linkEnd;
    const fixedId = movingEnd === "a" ? link.b : link.a;
    state.linkDrag = { linkId, end: movingEnd, pointerId: event.pointerId, fixedId, originalId: movingEnd === "a" ? link.a : link.b, point: screenToWorld(event.clientX, event.clientY), before: clone(state.data) };
    state.linkDropTargetId = null;
    state.linkFlowGesture = null;
  } else {
    const directionMode = state.linkDirectionModeId === linkId;
    state.linkFlowGesture = { linkId, pointerId: event.pointerId, start: screenToWorld(event.clientX, event.clientY), last: screenToWorld(event.clientX, event.clientY), points: [], moved: false, directionMode };
  }
  renderCards(); renderLinks();
}
function handleLinkPointerMove(event) {
  const drag = state.linkDrag;
  if (drag && drag.pointerId === event.pointerId) {
    event.preventDefault();
    drag.point = screenToWorld(event.clientX, event.clientY);
    const target = findLinkDropTarget(drag.point, drag.fixedId);
    state.linkDropTargetId = target?.id || null;
    scheduleRenderLinks();
    return;
  }
  const flow = state.linkFlowGesture;
  if (!flow || flow.pointerId !== event.pointerId) return;
  const point = screenToWorld(event.clientX, event.clientY);
  flow.last = point;
  flow.points.push(point);
  if (Math.hypot(point.x - flow.start.x, point.y - flow.start.y) > 30 / Math.max(.28, state.camera.scale)) flow.moved = true;
}
function finishLinkPointerDrag(event) {
  state.suppressCanvasTapUntil = performance.now() + 700;
  releaseRememberedPointer(event.pointerId);
  clearTimeout(state.interactionWatchdog); state.interactionWatchdog = 0;
  document.documentElement.classList.remove("interaction-locked");
  const flow = state.linkFlowGesture;
  if (flow && flow.pointerId === event.pointerId && !state.linkDrag) {
    state.linkFlowGesture = null;
    setZoomInteraction(false);
    $("#canvasViewport")?.classList.remove("is-panning", "is-zooming");
    const link = state.data.links.find(item => item.id === flow.linkId);
    if (!link) return;
    const lockedA = nodeById(link.a)?.locked, lockedB = nodeById(link.b)?.locked;
    if (lockedA && lockedB) return;
    if (!flow.moved) {
      const now = performance.now();
      if (state.lastLinkTap.id === link.id && now - state.lastLinkTap.time < 340) {
        state.lastLinkTap = { id: null, time: 0 };
        state.linkMenuId = link.id;
      } else {
        state.lastLinkTap = { id: link.id, time: now };
      }
      renderLinks();
      return;
    }
    if (flow.directionMode) {
      const a = nodeById(link.a), b = nodeById(link.b);
      if (a && b) {
        const geometry = linkGeometry(a, b);
        const vx = geometry.end.x - geometry.start.x, vy = geometry.end.y - geometry.start.y;
        const denom = Math.max(1, vx * vx + vy * vy);
        const projections = [flow.start, ...flow.points, flow.last].map(p => ((p.x - geometry.start.x) * vx + (p.y - geometry.start.y) * vy) / denom);
        let reversals = 0, lastSign = 0;
        for (let i = 1; i < projections.length; i++) {
          const delta = projections[i] - projections[i-1];
          const sign = Math.abs(delta) < .008 ? 0 : Math.sign(delta);
          if (sign && lastSign && sign !== lastSign) reversals++;
          if (sign) lastSign = sign;
        }
        pushUndo("Направление связи");
        if (reversals > 0) link.flow = "bidirectional";
        else link.flow = projections.at(-1) >= projections[0] ? "forward" : "reverse";
        state.linkDirectionModeId = null;
        saveData(); renderLinks();
        toast(link.flow === "bidirectional" ? "Двустороннее направление сохранено" : "Направление связи сохранено", "Отменить", undoLast);
        navigator.vibrate?.(8);
      }
    }
    state.canvasPointers.clear();
    state.canvasGesture = null;
    return;
  }
  const drag = state.linkDrag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  event.preventDefault();
  const link = state.data.links.find(item => item.id === drag.linkId);
  const targetId = state.linkDropTargetId;
  if (link && targetId && targetId !== drag.fixedId) {
    const duplicate = state.data.links.some(item => item.id !== link.id && ((item.a === targetId && item.b === drag.fixedId) || (item.b === targetId && item.a === drag.fixedId)));
    if (duplicate) toast("Такая связь уже существует");
    else {
      pushUndoSnapshot("Переназначение связи", drag.before);
      if (drag.end === "a") link.a = targetId; else link.b = targetId;
      saveData(); toast("Связь переназначена", "Отменить", undoLast);
    }
  } else if (link) toast("Связь оставлена без изменений");
  state.linkDrag = null; state.linkDropTargetId = null;
  state.canvasPointers.clear(); state.canvasGesture = null;
  setZoomInteraction(false);
  $("#canvasViewport")?.classList.remove("is-panning", "is-zooming");
  renderCards(); renderLinks();
}
function findLinkDropTarget(point, fixedId) {
  let best = null, bestDistance = Infinity;
  currentNodes().forEach(node => {
    if (node.id === fixedId) return;
    const dim = liveCardDims(node);
    const pad = 28;
    if (point.x < node.x - pad || point.x > node.x + dim.w + pad || point.y < node.y - pad || point.y > node.y + dim.h + pad) return;
    const cx = node.x + dim.w / 2, cy = node.y + dim.h / 2;
    const distanceValue = Math.hypot(point.x - cx, point.y - cy);
    if (distanceValue < bestDistance) { best = node; bestDistance = distanceValue; }
  });
  return best;
}
function updateLinkDropHighlight() {
  $$(".node-card", $("#cardLayer")).forEach(card => card.classList.toggle("link-drop-target", card.dataset.id === state.linkDropTargetId));
}
function updateLinkToolbar() {
  const toolbar = $("#linkToolbar"); if (!toolbar) return;
  const link = state.data.links.find(item => item.id === state.linkMenuId);
  const a = nodeById(link?.a), b = nodeById(link?.b);
  if (!link || !a || !b || a.archived || b.archived || state.linkDrag) { toolbar.classList.add("hidden"); return; }
  const geometry = linkGeometry(a,b);
  const mx = (geometry.start.x + geometry.end.x) / 2;
  const my = (geometry.start.y + geometry.end.y) / 2;
  toolbar.style.left = `${mx}px`;
  toolbar.style.top = `${my}px`;
  toolbar.classList.remove("hidden");
  $("#linkHighlightButton").classList.toggle("active", Boolean(link.highlighted));
  $("#linkHighlightButton").innerHTML = `${icon("link")}<span>${link.highlighted ? "Снять выделение" : "Выделить связь"}</span>`;
  $("#linkDirectionButton").innerHTML = `${icon("branch")}<span>Задать направление</span>`;
  $("#deleteSelectedLink").innerHTML = `${icon("trash")}<span>Удалить связь</span>`;
}
function toggleSelectedLinkHighlight() {
  const link = state.data.links.find(item => item.id === state.linkMenuId); if (!link) return;
  pushUndo("Выделение связи");
  link.highlighted = !link.highlighted;
  state.linkMenuId = null;
  saveData(); renderLinks();
  toast(link.highlighted ? "Связь выделена" : "Выделение снято", "Отменить", undoLast);
}
function enableSelectedLinkDirection() {
  const link = state.data.links.find(item => item.id === state.linkMenuId); if (!link) return;
  state.linkDirectionModeId = link.id;
  state.selectedLinkId = link.id;
  state.linkMenuId = null;
  renderLinks();
  toast("Проведите по линии. Движение туда-обратно задаст двусторонний поток");
}
function deleteSelectedLink() {
  const id = state.linkMenuId || state.selectedLinkId;
  const link = state.data.links.find(item => item.id === id); if (!link) return;
  if (!confirm("Удалить выбранную связь?")) return;
  pushUndo("Удаление связи");
  state.data.links = state.data.links.filter(item => item.id !== link.id);
  state.selectedLinkId = null; state.linkMenuId = null; state.linkDirectionModeId = null; state.linkDrag = null; state.linkDropTargetId = null;
  saveData(); renderLinks(); toast("Связь удалена", "Отменить", undoLast);
}
function linkGeometry(a, b) {
  const ad = liveCardDims(a), bd = liveCardDims(b);
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
  syncDesktopZoomSlider();
  if (!state.dotRenderFrame) state.dotRenderFrame = requestAnimationFrame(() => { state.dotRenderFrame = 0; drawDots(); });
  // Links share the camera transform but their visibility culling depends on the current camera.
  // Always schedule one rAF-limited pass after any camera change, including the first fitAll.
  scheduleRenderLinks();
}
function activeBounds() {
  const nodes = currentNodes();
  if (!nodes.length) return null;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  nodes.forEach(node=>{const d=cardDims(node);minX=Math.min(minX,node.x);minY=Math.min(minY,node.y);maxX=Math.max(maxX,node.x+d.w);maxY=Math.max(maxY,node.y+d.h);});
  return {minX,minY,maxX,maxY,width:maxX-minX,height:maxY-minY};
}
function overviewScale() {
  const bounds=activeBounds();
  const rect=$("#canvasViewport").getBoundingClientRect();
  if(!bounds) return .5;
  const usableH=Math.max(260,rect.height-210);
  return clamp(Math.min((rect.width-44)/(bounds.width+180),usableH/(bounds.height+180)),.24,.82);
}
function semanticValueToScale(value) {
  const v=clamp(Number(value||0),-50,50);
  const overview=overviewScale();
  const working=.88;
  const close=1.8;
  if(v<=0){const t=(v+50)/50;return overview+(working-overview)*t;}
  return working+(close-working)*(v/50);
}
function scaleToSemanticValue(scale) {
  const overview=overviewScale(), working=.88, close=1.8, s=Number(scale||working);
  if(s<=working) return clamp(-50+50*((s-overview)/Math.max(.001,working-overview)),-50,0);
  return clamp(50*((s-working)/Math.max(.001,close-working)),0,50);
}
function syncDesktopZoomSlider() {
  const slider=$("#desktopZoomRange"); if(!slider)return;
  const value=scaleToSemanticValue(state.camera.scale);
  slider.value=String(Math.round(value));
  slider.style.setProperty("--zoom-progress",`${((value+50)/100)*100}%`);
  slider.setAttribute("aria-valuetext",value<=-45?"Вся картина":value>=45?"Крупный режим":Math.abs(value)<=4?"Рабочий режим":value<0?"Обзор":"Увеличение");
}
function handleDesktopZoomInput(event) {
  setZoomInteraction(true);
  const semantic=clamp(Number(event.currentTarget.value||0),-50,50);
  if(semantic<=-49){fitAll(false);return;}
  const nextScale=semanticValueToScale(semantic);
  const viewport=$("#canvasViewport"), rect=viewport.getBoundingClientRect();
  const anchorX=rect.width/2, anchorY=Math.max(92,(rect.height-190)/2);
  const worldAnchorX=(anchorX-state.camera.tx)/Math.max(.001,state.camera.scale);
  const worldAnchorY=(anchorY-state.camera.ty)/Math.max(.001,state.camera.scale);
  state.camera.scale=nextScale;
  state.camera.tx=anchorX-worldAnchorX*nextScale;
  state.camera.ty=anchorY-worldAnchorY*nextScale;
  keepCameraNumericallySafe();applyCamera();
}
function rememberWorkingNode(node) {
  if (!node || node.archived) return;
  state.data.settings ||= {};
  state.data.settings.lastWorkingNode ||= {};
  state.data.settings.lastWorkingNode[state.space] = node.id;
  saveData();
}
function smartFocusCurrent() {
  if (state.focusOverview) {
    state.focusOverview = false;
    return fitAll(true);
  }
  const nodes = currentNodes();
  if (!nodes.length) return centerCamera();
  if (state.selectedLinkId) {
    const link = state.data.links.find(item => item.id === state.selectedLinkId);
    const a = nodeById(link?.a), b = nodeById(link?.b);
    if (a && b && !a.archived && !b.archived) { state.focusOverview = true; return focusNodes([a,b]); }
  }
  let node = nodeById(state.selectedId);
  if (!node || node.archived || node.space !== state.space) {
    const lastId = state.data.settings?.lastWorkingNode?.[state.space];
    node = nodeById(lastId);
  }
  if (!node || node.archived || node.space !== state.space) {
    const rect = $("#canvasViewport").getBoundingClientRect();
    const center = screenToWorld(rect.width / 2, Math.max(80, (rect.height - 170) / 2));
    node = nodes.reduce((best, item) => {
      const dim = cardDims(item);
      const dx = item.x + dim.w / 2 - center.x;
      const dy = item.y + dim.h / 2 - center.y;
      const score = dx * dx + dy * dy;
      return !best || score < best.score ? { item, score } : best;
    }, null)?.item || null;
  }
  if (node) { state.focusOverview = true; rememberWorkingNode(node); focusNode(node); }
  else fitAll(true);
}
function focusNodes(nodes) {
  if (!nodes?.length) return;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  nodes.forEach(node => { const d=cardDims(node); minX=Math.min(minX,node.x); minY=Math.min(minY,node.y); maxX=Math.max(maxX,node.x+d.w); maxY=Math.max(maxY,node.y+d.h); });
  const rect=$("#canvasViewport").getBoundingClientRect();
  const usableH=Math.max(240,rect.height-190);
  const scale=clamp(Math.min((rect.width-56)/(maxX-minX+80),usableH/(maxY-minY+80)),.42,1.08);
  state.camera.scale=scale;
  state.camera.tx=rect.width/2-(minX+maxX)/2*scale;
  state.camera.ty=Math.max(82,usableH/2)-(minY+maxY)/2*scale;
  applyCamera();
}
function centerCamera() {
  const rect = $("#canvasViewport").getBoundingClientRect();
  state.camera.scale = .88;
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
  const topInset = 82;
  const bottomInset = 190;
  const availableH = Math.max(260, rect.height - topInset - bottomInset);
  const pad = 90;
  const scale = clamp(Math.min((rect.width - 44) / (maxX - minX + pad * 2), availableH / (maxY - minY + pad * 2)), .24, 1.12);
  if (animate) $("#world").style.transition = "transform .45s cubic-bezier(.2,.78,.2,1)";
  state.camera.scale = scale;
  state.camera.tx = rect.width / 2 - ((minX + maxX) / 2) * scale;
  state.camera.ty = 82 + availableH / 2 - ((minY + maxY) / 2) * scale;
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
  const offsetX = ((state.camera.tx * .18) % spacing + spacing) % spacing;
  const offsetY = ((state.camera.ty * .18) % spacing + spacing) % spacing;
  for (let y = 12 + offsetY - spacing; y < rect.height + spacing; y += spacing) {
    for (let x = 12 + offsetX - spacing; x < rect.width + spacing; x += spacing) {
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

function cameraSafetyLimits(scale = state.camera.scale) {
  const rect = $("#canvasViewport").getBoundingClientRect();
  // The desktop is intentionally almost free-moving. These limits exist only
  // as a distant numerical safety net and never depend on the visible cards.
  // This prevents the "invisible wall" effect, especially at small zoom.
  const spanX = Math.max(24000, WORLD_W * Math.max(.4, scale) + rect.width * 12);
  const spanY = Math.max(20000, WORLD_H * Math.max(.4, scale) + rect.height * 12);
  return { minTx: -spanX, maxTx: spanX, minTy: -spanY, maxTy: spanY };
}
function keepCameraNumericallySafe() {
  const l = cameraSafetyLimits();
  state.camera.tx = clamp(state.camera.tx, l.minTx, l.maxTx);
  state.camera.ty = clamp(state.camera.ty, l.minTy, l.maxTy);
}
function settleCameraBounds() {
  keepCameraNumericallySafe();
  applyCamera();
}
function startCameraInertia(vx,vy) {
  cancelAnimationFrame(state.cameraInertiaFrame);
  const maxSpeed=.48;
  const speed=Math.hypot(vx,vy);
  if(speed<.035){ settleCameraBounds(); return; }
  if(speed>maxSpeed){ const k=maxSpeed/speed; vx*=k; vy*=k; }
  let last=performance.now();
  const step=now=>{
    const dt=Math.min(22,now-last); last=now;
    state.camera.tx += vx * dt;
    state.camera.ty += vy * dt;
    keepCameraNumericallySafe();
    applyCamera();
    const friction=Math.pow(.89,dt/16.7); vx*=friction; vy*=friction;
    if(Math.hypot(vx,vy)<.012){
      state.cameraInertiaFrame=0;
      state.data.settings.cameras ||= {};
      state.data.settings.cameras[state.space]=clone(state.camera);
      saveData();
      return;
    }
    state.cameraInertiaFrame=requestAnimationFrame(step);
  };
  state.cameraInertiaFrame=requestAnimationFrame(step);
}

/* Gestures */
function onCanvasPointerDown(event) {
  cancelAnimationFrame(state.cameraInertiaFrame); state.cameraInertiaFrame=0;
  if (!event.isPrimary && state.canvasPointers.size > 2) resetCanvasGestureState();
  if (state.linkFlowGesture || state.linkDrag) resetLinkGestureState();
  if (event.target.closest(".node-card,.canvas-utility,.gesture-hint,.link-hit,.link-end-handle,.link-toolbar")) return;
  event.preventDefault();
  event.currentTarget.setPointerCapture?.(event.pointerId); rememberPointerCapture(event.pointerId, event.currentTarget);
  armInteractionWatchdog();
  state.canvasPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (state.canvasPointers.size === 1) {
    state.canvasGesture = { type: "pan", startX: event.clientX, startY: event.clientY, tx: state.camera.tx, ty: state.camera.ty, moved: false, time: performance.now(), lastX:event.clientX,lastY:event.clientY,lastT:performance.now(),vx:0,vy:0,samples:[] };
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
    if (Math.hypot(dx, dy) > 4) { gesture.moved = true; $("#canvasViewport").classList.add("is-panning"); }
    const now=performance.now(), dt=Math.max(1,now-gesture.lastT);
    const sx=(event.clientX-gesture.lastX)/dt, sy=(event.clientY-gesture.lastY)/dt;
    gesture.samples.push({vx:sx,vy:sy,t:now}); gesture.samples=gesture.samples.filter(sample=>now-sample.t<110).slice(-6);
    const weight=gesture.samples.reduce((sum,_,i)=>sum+i+1,0)||1;
    gesture.vx=gesture.samples.reduce((sum,s,i)=>sum+s.vx*(i+1),0)/weight;
    gesture.vy=gesture.samples.reduce((sum,s,i)=>sum+s.vy*(i+1),0)/weight;
    gesture.lastX=event.clientX; gesture.lastY=event.clientY; gesture.lastT=now;
    state.camera.tx = gesture.tx + dx; state.camera.ty = gesture.ty + dy; keepCameraNumericallySafe(); applyCamera();
  } else if (state.canvasPointers.size >= 2) {
    const points = [...state.canvasPointers.values()].slice(0, 2);
    const center = midpoint(points[0], points[1]); const ratio = distance(points[0], points[1]) / Math.max(1, gesture.distance);
    setZoomInteraction(true);
    state.camera.scale = clamp(gesture.scale * ratio, .28, 1.8);
    state.camera.tx = center.x - gesture.worldCenter.x * state.camera.scale;
    state.camera.ty = center.y - gesture.worldCenter.y * state.camera.scale;
    applyCamera();
  }
}
function onCanvasPointerEnd(event) {
  releaseRememberedPointer(event.pointerId);
  if (!state.canvasPointers.has(event.pointerId)) {
    if (state.canvasPointers.size === 0) resetCanvasGestureState();
    return;
  }
  const gesture = state.canvasGesture;
  state.canvasPointers.delete(event.pointerId);
  if (state.canvasPointers.size === 0) {
    $("#canvasViewport").classList.remove("is-panning");
    if (gesture?.type === "pan" && !gesture.moved && performance.now() - gesture.time < 350) {
      const now = performance.now();
      if (now >= state.suppressCanvasTapUntil) {
        if (now - state.lastCanvasTap < 320) fitAll(true);
        state.lastCanvasTap = now;
        state.selectedId = null; state.actionsOpenId = null; state.selectedLinkId = null;
        if (state.linkCreateSourceId) { state.linkCreateSourceId = null; toast("Создание связи отменено"); }
        syncCardSelectionDOM(); renderLinks();
      } else {
        state.lastCanvasTap = 0;
      }
    }
    setZoomInteraction(false);
    $("#canvasViewport")?.classList.remove("is-zooming");
    if (gesture?.type === "pan" && gesture.moved) startCameraInertia(gesture.vx || 0, gesture.vy || 0);
    else settleCameraBounds();
    state.canvasGesture = null;
    clearTimeout(state.interactionWatchdog); state.interactionWatchdog = 0;
  } else if (state.canvasPointers.size === 1) {
    const point = [...state.canvasPointers.values()][0];
    state.canvasGesture = { type: "pan", startX: point.x, startY: point.y, tx: state.camera.tx, ty: state.camera.ty, moved: false, time: performance.now(), lastX:point.x,lastY:point.y,lastT:performance.now(),vx:0,vy:0,samples:[] };
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
    cancelAnimationFrame(state.cameraInertiaFrame); state.cameraInertiaFrame=0;
    if (event.target.closest("button,input,a")) return;
    event.stopPropagation();
    element.setPointerCapture?.(event.pointerId); rememberPointerCapture(event.pointerId, element); armInteractionWatchdog();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, t: performance.now() });
    if (pointers.size === 2) {
      cancelLong();
      if (node.locked) { gesture = { type: "locked" }; return; }
      const points = [...pointers.values()];
      gesture = { type: "pinch", startDistance: distance(points[0], points[1]), baseLevel: node.level || 2, lastDistance: distance(points[0], points[1]), lastTime: performance.now(), visualScale: 1, before: clone(state.data) };
      element.style.zIndex = "40";
      return;
    }
    longTriggered = false;
    gesture = { type: "pending", startX: event.clientX, startY: event.clientY, nodeX: node.x, nodeY: node.y, started: performance.now(), moved: false, before: clone(state.data) };
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
      gesture.moved = true; cancelLong();
      if (!node.locked) { gesture.type = "drag"; state.actionsOpenId = null; element.classList.add("dragging"); }
    }
    if (gesture.type === "drag") {
      node.x = clamp(gesture.nodeX + dx, -12000, WORLD_W + 12000);
      node.y = clamp(gesture.nodeY + dy, -12000, WORLD_H + 12000);
      element.style.left = `${node.x}px`; element.style.top = `${node.y}px`; scheduleRenderLinks();
    }
  });

  const finish = event => {
    releaseRememberedPointer(event.pointerId);
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId); cancelLong();
    if (gesture?.type === "pinch") {
      if (pointers.size < 2) {
        const baseNumeric = (gesture.baseLevel || 2) === 1 ? .78 : 1;
        const final = baseNumeric * gesture.visualScale;
        node.level = final < .89 ? 1 : 2;
        element.style.transform = ""; element.style.zIndex = ""; saveData(); render();
        gesture = null;
      }
      return;
    }
    element.classList.remove("dragging");
    if (gesture?.type === "drag") {
      pushUndoSnapshot("Перемещение карточки", gesture.before || clone(state.data));
      saveData(); renderLinks();
    } else if (gesture && !gesture.moved && !longTriggered) {
      if (state.linkCreateSourceId) {
        completeLinkCreation(node);
        gesture = null;
        return;
      }
      const now = performance.now();
      if (state.lastCardTap.id === node.id && now - state.lastCardTap.time < 430) {
        state.lastCardTap = { id: null, time: 0 };
        state.selectedId = node.id;
        state.actionsOpenId = null;
        syncCardSelectionDOM();
        openDetail(node);
      } else {
        state.lastCardTap = { id: node.id, time: now };
        state.selectedId = node.id;
        state.actionsOpenId = state.actionsOpenId === node.id ? null : node.id;
        state.selectedLinkId = null;
        state.focusOverview = false;
        rememberWorkingNode(node);
        syncCardSelectionDOM();
        renderLinks();
      }
    }
    gesture = null;
    if (!pointers.size) { clearTimeout(state.interactionWatchdog); state.interactionWatchdog = 0; }
  };
  element.addEventListener("pointerup", finish);
  element.addEventListener("pointercancel", finish);
  element.addEventListener("lostpointercapture", event => { releaseRememberedPointer(event.pointerId); pointers.delete(event.pointerId); cancelLong(); element.classList.remove("dragging"); element.style.transform=""; element.style.zIndex=""; gesture=null; resetAllTransientGestures(); });
}

/* Create and card actions */
function handleCardActionClick(event) {
  const button = event.target.closest("[data-card-action]"); if (!button) return;
  event.stopPropagation();
  const card = button.closest(".node-card"); const node = nodeById(card?.dataset.id); if (!node) return;
  const action = button.dataset.cardAction;
  state.actionsOpenId = null;
  if (action === "open") {
    // The eye is a deterministic “view” action. Card scale is controlled only by semantic zoom / pinch.
    state.eyeTap = { id: null, timer: null, time: 0 };
    openDetail(node);
    return;
  }
  if (action === "connect") startLinkCreation(node);
  if (action === "focus") {
    state.selectedId = node.id; state.selectedLinkId = null; state.focusOverview = false;
    rememberWorkingNode(node); renderCards(); renderLinks(); focusNode(node);
  }
  if (action === "toggleLock") {
    pushUndo(node.locked ? "Снятие фиксации" : "Фиксация карточки");
    node.locked = !node.locked;
    saveData(); renderCards(); renderLinks();
    toast(node.locked ? "Карточка зафиксирована" : "Фиксация снята", "Отменить", undoLast);
  }
  if (action === "quickExpense") {
    const title = $("[data-expense-title]", card)?.value.trim();
    const amount = Number(String($("[data-expense-amount]", card)?.value || "").replace(",", "."));
    if (!title || !amount) return toast("Введите название и сумму затраты");
    node.expenses ||= []; node.expenses.push({ id: uid(), title, amount, date: todayISO() }); saveData(); render(); toast("Добавлено в затраты");
  }
}
function startLinkCreation(node) {
  if (!node || node.archived) return;
  state.linkCreateSourceId = node.id;
  state.selectedId = node.id;
  state.actionsOpenId = null;
  state.selectedLinkId = null;
  renderCards(); renderLinks();
  toast("Выберите карточку для новой связи");
}
function completeLinkCreation(target) {
  const source = nodeById(state.linkCreateSourceId);
  if (!source || !target || target.archived) { state.linkCreateSourceId = null; renderCards(); return; }
  if (source.id === target.id) {
    state.linkCreateSourceId = null; renderCards();
    return toast("Создание связи отменено");
  }
  const duplicate = state.data.links.some(link => (link.a === source.id && link.b === target.id) || (link.a === target.id && link.b === source.id));
  if (duplicate) {
    state.linkCreateSourceId = null; renderCards(); renderLinks();
    return toast("Такая связь уже существует");
  }
  pushUndo("Создание связи");
  state.data.links.push({ id: uid(), a: source.id, b: target.id, kind: "manual", flow: "none", highlighted: false, createdAt: new Date().toISOString() });
  state.linkCreateSourceId = null;
  state.selectedId = target.id;
  saveData(); renderCards(); renderLinks();
  toast("Связь создана");
}
function quickCreateFromDock(type) {
  closeOverlays();
  if (["person","idea","goal"].includes(type)) return createNode(type, null, false, true);
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
function findFreePosition(type, preferred) {
  const dims = type === "process" ? { w: 250, h: 165 } : { w: 220, h: 145 };
  const candidates = [{x:preferred.x-dims.w/2,y:preferred.y-dims.h/2}];
  for (let ring=1; ring<=8; ring++) {
    const radius = ring * 150;
    for (let i=0; i<12; i++) {
      const angle = i / 12 * Math.PI * 2;
      candidates.push({ x: preferred.x + Math.cos(angle)*radius - dims.w/2, y: preferred.y + Math.sin(angle)*radius - dims.h/2 });
    }
  }
  const nodes = currentNodes();
  const viewport = $("#canvasViewport").getBoundingClientRect();
  const safeOnScreen = pos => {
    const left=pos.x*state.camera.scale+state.camera.tx, top=pos.y*state.camera.scale+state.camera.ty;
    const right=left+dims.w*state.camera.scale, bottom=top+dims.h*state.camera.scale;
    return left>18 && right<viewport.width-92 && top>178 && bottom<viewport.height-230;
  };
  const clear = pos => safeOnScreen(pos) && nodes.every(n => {
    const d=cardDims(n), gap=34;
    return pos.x+dims.w+gap < n.x || pos.x > n.x+d.w+gap || pos.y+dims.h+gap < n.y || pos.y > n.y+d.h+gap;
  });
  const found = candidates.find(clear) || candidates[0];
  return { x: clamp(found.x, -12000, WORLD_W + 12000), y: clamp(found.y, -12000, WORLD_H + 12000) };
}
function offerNewCardSetup(node) {
  setTimeout(() => {
    if (!nodeById(node.id) || node.archived || document.querySelector("dialog[open]")) return;
    toast(`${TYPE_LABELS[node.type]} создан${node.type === "idea" || node.type === "goal" ? "а" : ""}`, "Настроить", () => openEditor(node));
  }, 1900);
}

function createNode(type, parent = null, openEditorNow = true, delayedEditor = false) {
  const preferred = parent ? branchPosition(parent) : screenToWorld(innerWidth / 2, Math.max(170, (innerHeight - 210) / 2));
  const point = findFreePosition(type, preferred);
  const defaults = {
    project: { title: "Новый проект", status: "preparation", progress: 0, client: "", address: "", budget: "", assets: [] },
    goal: { title: "Новая цель", status: "active", progress: 0, deadline: "", metric: "", assets: [] },
    person: { title: "Новый человек", status: "active", speciality: "", personStatus: "Неизвестно", personStatusMode: "Неизвестно", phone: "", telegram: "", address: "", email: "", site: "", social: "", tags: "", assets: [] },
    idea: { title: "Новая идея", status: "active", source: "", tags: "", assets: [] }
  };
  pushUndo("Создание карточки");
  const node = { id: uid(), type, space: state.space, x: point.x, y: point.y, level: 2, note: "", archived: false, locked: false, ...defaults[type] };
  state.data.nodes.push(node);
  if (parent) state.data.links.push({ id: uid(), a: parent.id, b: node.id, kind: type, flow: "none", highlighted: false });
  state.selectedId = node.id; state.justCreatedId = node.id; saveData(); render(); focusNode(node);
  setTimeout(() => { if (state.justCreatedId === node.id) { state.justCreatedId = null; renderCards(); } }, 900);
  offerNewCardSetup(node);
  return node;
}
function createStandaloneProcess() {
  const preferred = screenToWorld(innerWidth / 2, Math.max(170, (innerHeight - 210) / 2));
  const point = findFreePosition("process", preferred);
  const process = {
    id: uid(), type: "process", space: state.space, projectId: null,
    x: point.x, y: point.y, level: 2,
    title: "Новый рабочий процесс", status: "active", progress: 0, stages: [], tasks: [], phonebook: [], peopleIds: [], expenses: [], assets: [], archived: false, locked: false
  };
  pushUndo("Создание рабочего процесса");
  state.data.nodes.push(process);
  state.selectedId = process.id; state.justCreatedId = process.id;
  saveData(); render(); focusNode(process);
  setTimeout(() => { if (state.justCreatedId === process.id) { state.justCreatedId = null; renderCards(); } }, 900);
  offerNewCardSetup(process);
  return process;
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
  const point = findFreePosition("process", branchPosition(project));
  const process = {
    id: uid(), type: "process", space: project.space, projectId: project.id,
    x: point.x, y: point.y, level: 2, title: `Рабочий процесс · ${project.title}`,
    status: "active", progress: 0, stages: [], tasks: [], phonebook: [], peopleIds: [], expenses: [], assets: [], archived: false, locked: false
  };
  pushUndo("Создание рабочего процесса");
  state.data.nodes.push(process); state.data.links.push({ id: uid(), a: project.id, b: process.id, kind: "process", flow: "none", highlighted: false });
  state.selectedId = process.id; state.justCreatedId = process.id; saveData(); render(); focusNode(process);
  setTimeout(() => { if (state.justCreatedId === process.id) { state.justCreatedId = null; renderCards(); } }, 900);
  offerNewCardSetup(process);
}
function createBranchFor(node) {
  state.selectedId = node.id;
  const dialog=$("#detailDialog");
  if(dialog?.open) dialog.close();
  state.activeNodeId=null;
  renderCards();
  requestAnimationFrame(()=>{
    if(node.type==="project") createProcessForProject(node);
    else { renderCreateActions(); showOverlay("createMenu"); }
  });
}

/* Details */
function openDetail(node) {
  state.activeNodeId = node.id;
  rememberWorkingNode(node);
  renderCards();
  state.processActionsUnlocked = node.type !== "process";
  $("#detailType").textContent = TYPE_LABELS[node.type].toUpperCase();
  $("#detailTitle").textContent = node.title || TYPE_LABELS[node.type];
  state.expenseSelectionMode=false; state.selectedExpenseIds.clear();
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
  const defaultFit = source?.type === "person" ? "contain" : "cover";
  const legacy = { x: 0, y: 0, scale: 1, fit: defaultFit, ...(source?.coverPosition || {}) };
  const positions = source?.coverPositions || {};
  return {
    "1": { ...legacy, ...(positions["1"] || {}) },
    "2": { ...legacy, ...(positions["2"] || {}) },
    "3": { ...legacy, ...(positions["3"] || {}) }
  };
}
function processCoverPosition(node, mode = "2") {
  return normalizedProcessCoverPositions(node)[String(mode)] || { x: 0, y: 0, scale: 1, fit: node?.type === "person" ? "contain" : "cover" };
}
function processCoverStyle(position) {
  const fit = position?.fit === "contain" ? "contain" : "cover";
  const scale = Math.max(.65, Number(position?.scale || 1));
  const x = clamp(Number(position?.x || 0), -50, 50);
  const y = clamp(Number(position?.y || 0), -50, 50);
  const objectX = clamp(50 + x, 0, 100);
  const objectY = clamp(50 + y, 0, 100);
  return `object-fit:${fit} !important;object-position:${objectX}% ${objectY}% !important;transform:scale(${scale});transform-origin:center center`;
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
  const openTasks = (node.tasks || []).filter(task => !task.done && !task.archived).length;
  if (!stages.some(stage => stage.id === state.selectedProcessStageId)) state.selectedProcessStageId = stages[0]?.id || null;
  return `<div class="detail-hero process-detail-hero" data-detail-cover-shell="1" title="Двойное нажатие для настройки обложки">${processCoverMediaHtml(node)}<div class="detail-hero-content"><p>${esc(project ? `Проект: ${project.title}` : "Связанный рабочий модуль")}</p></div></div>
    <div class="process-metrics-bar">
      <button type="button" class="process-metric budget-metric" data-budget-edit="1" aria-label="Планируемый бюджет. Двойное нажатие для редактирования" title="Двойное нажатие для редактирования"><small>БЮДЖЕТ</small><b>${money(node.budget)}</b></button>
      <div class="process-metric"><small>РАСХОДЫ</small><b>${money(total)}</b></div>
      <div class="process-metric count-metric"><small>ЭТАПЫ</small><b>${stages.length}</b></div>
      <div class="process-metric count-metric"><small>ЗАДАЧИ</small><b>${openTasks}</b></div>
      <button type="button" class="process-phonebook-button interactive-metric" data-detail-action="phonebook" aria-label="Роли. Открыть телефонную книгу"><small>РОЛИ</small><b>${(node.phonebook||[]).length}</b></button>
    </div>
    <div class="process-progress-row"><div><small>ПРОГРЕСС</small><b>${node.progress || 0}%</b></div><i><span style="width:${clamp(node.progress||0,0,100)}%"></span></i></div>
    <div class="detail-section"><div class="detail-section-head"><h3>Этапы</h3><div class="stage-heading-actions"><button class="delicate-plus" data-detail-action="addStage" aria-label="Создать новый этап">＋</button></div></div><div class="stage-list process-stage-selector">${stages.length ? stages.map(stage => stageSelectorHtml(stage)).join("") : `<div class="note-block">Этапы ещё не добавлены.</div>`}</div></div>
    ${selectedStageTasksHtml(node)}
    <div class="detail-section expense-panel"><div class="detail-section-head"><div><small>ФИНАНСЫ РАБОЧЕГО ПРОЦЕССА</small><h3>Затраты</h3></div><div class="expense-heading-actions"><button class="expense-action-button" data-detail-action="quickExpense" aria-label="Добавить затрату">＋</button><button class="expense-action-button expense-delete-button ${state.expenseSelectionMode ? "active" : ""}" data-detail-action="toggleExpenseDelete" aria-label="Удалить выбранные затраты">${icon("trash")}</button></div></div><div class="expense-entry-row"><input id="detailExpenseTitle" placeholder="Описание"><input id="detailExpenseAmount" inputmode="decimal" placeholder="Сумма"></div><div class="expense-list">${expenseListHtml(node)}</div></div>`;
}
function stageSelectorHtml(stage) {
  const selected = stage.id === state.selectedProcessStageId;
  return `<button class="stage-item selectable-stage ${selected ? "selected" : ""}" data-stage-select="${esc(stage.id)}"><div><b>${esc(stage.title)}</b><small>${esc(stage.deadline || "Без срока")}</small></div><div class="stage-progress"><span style="width:${clamp(stage.progress || 0,0,100)}%"></span></div></button>`;
}
function selectedStageTasksHtml(node) {
  const stage = (node.stages || []).find(item => item.id === state.selectedProcessStageId);
  if (!stage) return "";
  const firstStageId=(node.stages||[])[0]?.id; const tasks = (node.tasks || []).filter(task => !task.archived && (task.stageId === stage.id || (!task.stageId && stage.id===firstStageId)));
  return `<div class="detail-section stage-tasks-panel"><div class="detail-section-head"><div><small>ЗАДАЧИ КОНКРЕТНОГО ЭТАПА</small><h3>${esc(stage.title)}</h3></div><button class="stage-task-add" data-task-action="add" aria-label="Создать задачу">＋</button></div><div class="stage-task-list">${tasks.length ? tasks.map(task => stageTaskHtml(node,task)).join("") : `<div class="note-block">В этом этапе пока нет задач.</div>`}</div></div>`;
}
function priorityLabel(priority) { return priority === "high" ? "Высокий" : priority === "low" ? "Низкий" : "Средний"; }
function formatTaskDateTime(value){if(!value)return "—";const date=new Date(value);if(Number.isNaN(date.getTime()))return String(value).replace("T"," ");return new Intl.DateTimeFormat("ru-RU",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"long",year:"numeric"}).format(date).replace(",","");}
function messengerLabel(type){return type==="telegram"?"Telegram":type==="whatsapp"?"WhatsApp":"MAX";}
function messengerIcon(type){
  const common='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  if(type==="telegram")return `<svg ${common}><path d="M4.5 11.5 19.2 5.2c.8-.3 1.4.3 1.2 1.1l-2.5 12c-.2.9-.9 1.2-1.6.7l-4.1-3.1-2 2c-.3.3-.7.1-.8-.3l.2-4.2 7.4-6.5-9 5.5-3.5-1.1Z"/></svg>`;
  if(type==="whatsapp")return `<svg ${common}><path d="M20 11.8a8 8 0 0 1-11.9 7L4 20l1.3-4A8 8 0 1 1 20 11.8Z"/><path d="M9.1 8.5c.2-.4.5-.5.9-.4l.8.2.9 2.1c.1.3 0 .6-.2.8l-.8.8c.8 1.4 1.9 2.5 3.4 3.2l.9-.9c.2-.2.5-.3.8-.1l2 .9c.3.1.4.4.4.7-.1.9-.6 1.7-1.4 2.1-1 .5-2.4.2-3.6-.4-1.6-.8-3.1-2.1-4.2-3.6-1-1.4-1.7-3.2-1.2-4.5.2-.4.6-.7 1.3-.9Z"/></svg>`;
  return `<svg ${common}><path d="M20 11.8a8 8 0 0 1-11.9 7L4 20l1.3-4A8 8 0 1 1 20 11.8Z"/><path d="M8.5 15.5V9l3.5 4 3.5-4v6.5"/></svg>`;
}
function messengerBadgeButton(contact,type,selected){const active=selected.includes(type);return `<button type="button" class="messenger-badge ${active?"selected":"muted"}" data-messenger-contact="${esc(contact.id)}" data-messenger-type="${type}" data-messenger-active="${active?"1":"0"}" aria-label="${messengerLabel(type)}${active?", активен":", не активен"}" aria-disabled="${active?"false":"true"}">${messengerIcon(type)}</button>`;}
function messengerBadges(contact){const selected=Array.isArray(contact?.messengers)?contact.messengers:[];return `<span class="messenger-badges">${["telegram","whatsapp","max"].map(type=>messengerBadgeButton(contact,type,selected)).join("")}</span>`;}
function stageTaskHtml(node, task) {
  const expanded = task.id === state.expandedProcessTaskId;
  const contacts = (task.contactIds || []).map(id => (node.phonebook || []).find(contact => contact.id === id)).filter(Boolean);
  const timeText = task.scheduleMode === "interval" ? `${formatTaskDateTime(task.intervalStart)} — ${formatTaskDateTime(task.intervalEnd)}` : formatTaskDateTime(task.dateTime);
  return `<article class="stage-task-card ${expanded ? "expanded selected" : ""}" data-stage-task-id="${esc(task.id)}">
    <div class="stage-task-head"><label class="stage-task-check"><input type="checkbox" data-task-toggle="${esc(task.id)}" ${task.done ? "checked" : ""}><span></span></label><div class="stage-task-title"><b>${esc(task.title)}</b><small>${esc(priorityLabel(task.priority))}${task.dateTime ? ` · ${esc(formatTaskDateTime(task.dateTime))}` : ""}</small></div><div class="stage-task-actions"><button data-task-action="view" title="Открыть">${icon("open")}</button><button class="priority-orb priority-${esc(task.priority || "medium")} ${task.done ? "is-done" : ""}" data-task-action="priority" title="Изменить приоритет" aria-label="Приоритет: ${esc(priorityLabel(task.priority))}"><span></span></button></div></div>
    ${expanded ? `<div class="stage-task-expanded">${task.note ? `<div class="task-note"><small>ЗАМЕТКА</small><p>${esc(String(task.note).slice(0,400))}</p></div>` : ""}<div class="task-contact-view"><small>НАЗНАЧЕННЫЕ КОНТАКТЫ</small>${contacts.length ? contacts.map(contact => `<article class="task-contact-card"><div class="task-contact-copy"><span class="task-contact-role">${esc(contact.role || "Контакт")}</span><b>${esc(contact.name || "Без имени")}</b>${contact.phone ? `<a class="task-contact-number" href="tel:${esc(contact.phone)}">${esc(contact.phone)}</a>` : ""}</div><div class="task-contact-messengers">${messengerBadges(contact)}</div></article>`).join("") : `<p>Контакты не назначены</p>`}</div><div class="task-time-view"><small>ВЫПОЛНЕНИЕ</small><b>${esc(timeText)}</b><span>${task.notify ? `<i class="task-bell-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 18h7"/><path d="M10 21h4"/><path d="M6.7 16.5h10.6c-.8-.9-1.3-2.1-1.3-3.6V11a4.7 4.7 0 1 0-9.4 0v1.9c0 1.5-.5 2.7-1.3 3.6Z"/></svg></i>Напомнить за ${esc(task.reminder || "15")} мин.` : "Уведомление выключено"}</span></div><div class="task-expanded-actions"><div class="task-expanded-action-group"><button type="button" class="task-archive-action" data-task-action="archive" aria-label="Отправить задачу в общий архив" title="Нажмите дважды, чтобы архивировать">${icon("archiveSend")}</button><button type="button" data-task-action="edit" aria-label="Редактировать задачу">${icon("edit")}</button></div></div></div>` : ""}
  </article>`;
}

function personPhotoMediaHtml(node) {
  if (!node.coverAssetId) return `<div class="person-photo-placeholder">${icon("person")}</div>`;
  const position = processCoverPosition(node, "2");
  return `<img class="person-photo-media" data-detail-cover="${esc(node.coverAssetId)}" style="${processCoverStyle(position)}" alt="">`;
}
function personDetailHtml(node) {
  const telegramHref = normalizeTelegram(node.telegram);
  const addressHref = mapsHref(node.address);
  const siteHref = normalizeExternalUrl(node.site);
  const socialHref = normalizeExternalUrl(node.social);
  const contactItems = [
    node.phone ? `<a class="person-contact-item" href="tel:${esc(node.phone)}"><span>${icon("phone")}</span><div><b>Позвонить</b><small>${esc(node.phone)}</small></div><i>›</i></a>` : "",
    node.telegram ? `${telegramHref ? `<a class="person-contact-item" href="${esc(telegramHref)}" target="_blank" rel="noopener noreferrer">` : `<div class="person-contact-item">`}<span>${icon("telegram")}</span><div><b>Telegram</b><small>${esc(node.telegram)}</small></div><i>›</i>${telegramHref ? `</a>` : `</div>`}` : "",
    node.email ? `<a class="person-contact-item" href="mailto:${esc(node.email)}"><span>${icon("mail")}</span><div><b>Email</b><small>${esc(node.email)}</small></div><i>›</i></a>` : "",
    addressHref ? `<a class="person-contact-item" href="${esc(addressHref)}" target="_blank" rel="noopener noreferrer"><span>${icon("location")}</span><div><b>Адрес</b><small>${esc(node.address)}</small></div><i>›</i></a>` : "",
    siteHref ? `<a class="person-contact-item" href="${esc(siteHref)}" target="_blank" rel="noopener noreferrer"><span>${icon("link")}</span><div><b>Сайт</b><small>${esc(node.site)}</small></div><i>›</i></a>` : "",
    socialHref ? `<a class="person-contact-item" href="${esc(socialHref)}" target="_blank" rel="noopener noreferrer"><span>${icon("link")}</span><div><b>Соцсеть</b><small>${esc(node.social)}</small></div><i>›</i></a>` : (node.social ? `<div class="person-contact-item"><span>${icon("link")}</span><div><b>Соцсеть</b><small>${esc(node.social)}</small></div></div>` : "")
  ].filter(Boolean).join("");
  const activeTasks = tasksForPerson(node.id).filter(task => !task.done && !task.archived);
  const taskRows = activeTasks.slice(0,6).map(task => {
    const process = state.data.nodes.find(item => item.type === "process" && (item.tasks || []).some(t => t.id === task.id));
    return `<button class="person-task-row" data-person-task-process="${esc(process?.id || "")}" data-person-task-id="${esc(task.id)}"><span>${icon("task")}</span><div><b>${esc(task.title || "Без названия")}</b><small>${esc(process?.title || "Рабочий процесс")} · ${esc(task.deadline || "Без срока")}</small></div><i>›</i></button>`;
  }).join("");
  const related = linkNodesFor(node.id).filter(item => !item.archived);
  const relatedRows = related.slice(0,8).map(item => `<button class="person-relation-row" data-person-relation-id="${esc(item.id)}"><span>${icon(item.type === "process" ? "process" : item.type)}</span><div><b>${esc(item.title)}</b><small>${esc(TYPE_LABELS[item.type] || item.type)}</small></div><i>›</i></button>`).join("");
  return `<div class="detail-hero person-detail-hero">${personPhotoMediaHtml(node)}<div class="detail-hero-content"><p>${esc(node.speciality || "Специалист")}</p></div></div>
    <div class="detail-grid"><div class="detail-stat"><small>СТАТУС</small><b>${esc(node.personStatus || "Новый контакт")}</b></div><button class="detail-stat detail-stat-button" data-person-active-tasks="1"><small>АКТИВНЫЕ ЗАДАЧИ</small><b>${activeTasks.length}</b></button></div>
    ${contactItems ? `<div class="detail-section person-contact-section"><div class="detail-section-head"><h3>Контакты</h3></div><div class="person-contact-grid">${contactItems}</div></div>` : ""}
    ${taskRows ? `<div class="detail-section"><div class="detail-section-head"><h3>Активные задачи</h3></div><div class="person-task-list">${taskRows}</div></div>` : ""}
    ${relatedRows ? `<div class="detail-section"><div class="detail-section-head"><h3>Связан с</h3></div><div class="person-relation-list">${relatedRows}</div></div>` : ""}
    ${node.tags ? `<div class="detail-section"><div class="detail-section-head"><h3>Ключевые слова</h3></div><div class="chips">${node.tags.split(",").filter(Boolean).map(tag => `<span class="chip">${esc(tag.trim())}</span>`).join("")}</div></div>` : ""}
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
    if (url && detailCover.isConnected) {
      if (detailCover.tagName === "IMG") detailCover.src = url;
      else detailCover.style.backgroundImage = `url("${url}")`;
    }
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
  return people.map(person => `<div class="person-item"><div><b>${esc(person.title)}</b><small>${esc(person.speciality || "Специалист")}</small></div><span class="panel-chip">${esc(person.personStatus || "Неизвестно")}</span></div>`).join("");
}
function expenseListHtml(node) {
  const expenses = node.expenses || [];
  if (!expenses.length) return `<div class="note-block">Затраты ещё не добавлены.</div>`;
  return expenses.slice().reverse().map(expense => {
    const selected = state.selectedExpenseIds.has(expense.id);
    return `<label class="expense-item ${state.expenseSelectionMode ? "selecting" : ""} ${selected ? "selected" : ""}" data-expense-id="${esc(expense.id)}">${state.expenseSelectionMode ? `<input type="checkbox" data-expense-select="${esc(expense.id)}" ${selected ? "checked" : ""}>` : ""}<div><b>${esc(expense.title)}</b><small>${esc(expense.date || "")}</small></div><strong>${money(expense.amount)}</strong></label>`;
  }).join("");
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
  if (budgetButton && node.type === "process") {
    event.preventDefault();
    event.stopPropagation();
    const now = performance.now();
    if (state.lastBudgetTap && now - state.lastBudgetTap < 620) {
      state.lastBudgetTap = 0;
      openBudgetEditor(node);
    } else {
      state.lastBudgetTap = now;
    }
    return;
  }
  const phonebookButton = event.target.closest('[data-detail-action="phonebook"]');
  if (phonebookButton && node.type === "process") {
    event.preventDefault();
    event.stopPropagation();
    const now = performance.now();
    if (state.lastPhonebookTap && now - state.lastPhonebookTap < 620) {
      state.lastPhonebookTap = 0;
      openPhonebook(node);
    } else {
      state.lastPhonebookTap = now;
    }
    return;
  }
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
  const expenseSelect = event.target.closest("[data-expense-select]");
  if (expenseSelect && node.type === "process") {
    const id=expenseSelect.dataset.expenseSelect;
    if(expenseSelect.checked) state.selectedExpenseIds.add(id); else state.selectedExpenseIds.delete(id);
    expenseSelect.closest('.expense-item')?.classList.toggle('selected', expenseSelect.checked);
    return;
  }
  const personTask = event.target.closest("[data-person-task-process]");
  if (personTask) {
    const process = nodeById(personTask.dataset.personTaskProcess);
    if (process) { closeDetail(); state.selectedId = process.id; state.actionsOpenId = null; render(); focusNode(process); openDetail(process); requestAnimationFrame(() => { const row = document.querySelector(`[data-stage-task-id="${CSS.escape(personTask.dataset.personTaskId)}"]`); row?.classList.add("focus-flash"); setTimeout(() => row?.classList.remove("focus-flash"), 950); }); }
    return;
  }
  const relation = event.target.closest("[data-person-relation-id]");
  if (relation) { const target = nodeById(relation.dataset.personRelationId); if (target) { closeDetail(); state.selectedId = target.id; state.actionsOpenId = null; render(); focusNode(target); openDetail(target); } return; }
  const actionButton = event.target.closest("[data-detail-action]"); if (!actionButton) return;
  const action = actionButton.dataset.detailAction;
  if (action === "addAssets") {
    state.assetTargetNodeId = node.id;
    document.body.classList.add("asset-picker-pending");
    toast("Выберите изображения или файлы");
    $("#assetInput").click();
    setTimeout(() => document.body.classList.remove("asset-picker-pending"), 1200);
  }
  if (action === "openProcess") { const existing=state.data.nodes.find(item=>item.type==="process"&&item.projectId===node.id&&!item.archived); if(existing){state.selectedId=existing.id;render();focusNode(existing);openDetail(existing);}else createProcessForProject(node); }
  if (action === "editNode") openEditor(node);
  if (action === "editBudget") openBudgetEditor(node);
  if (action === "phonebook") return;
  if (action === "taskArchive" && node.type === "process") { openTaskArchive(node); return; }
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
  if (action === "quickExpense") { const title=$("#detailExpenseTitle")?.value.trim(); const amount=Number(String($("#detailExpenseAmount")?.value||"").replace(",",".")); if(!title||!amount)return toast("Введите описание и сумму"); node.expenses||=[];node.expenses.push({id:uid(),title,amount,date:todayISO()});state.expenseSelectionMode=false;state.selectedExpenseIds.clear();saveData();renderDetailBody(node);render();toast("Добавлено в затраты"); return; }
  if (action === "toggleExpenseDelete") {
    if (!state.expenseSelectionMode) { state.expenseSelectionMode=true; state.selectedExpenseIds.clear(); renderDetailBody(node); toast("Выберите одну или несколько затрат"); return; }
    if (!state.selectedExpenseIds.size) { state.expenseSelectionMode=false; renderDetailBody(node); return; }
    if (confirm(`Удалить выбранные затраты: ${state.selectedExpenseIds.size}?`)) { node.expenses=(node.expenses||[]).filter(item=>!state.selectedExpenseIds.has(item.id)); state.selectedExpenseIds.clear(); state.expenseSelectionMode=false; saveData(); renderDetailBody(node); render(); toast("Затраты удалены"); }
    return;
  }
}
function handleStageTaskAction(node, button) {
  const action=button.dataset.taskAction; const card=button.closest("[data-stage-task-id]"); const taskId=card?.dataset.stageTaskId; const tasks=node.tasks||[]; const task=tasks.find(item=>item.id===taskId);
  if(action==="add") return openTaskEditor(node, null);
  if(!task) return;
  if(action==="view"){state.expandedProcessTaskId=state.expandedProcessTaskId===task.id?null:task.id;renderDetailBody(node);return;}
  if(action==="priority"){task.priority=task.priority==="low"?"medium":task.priority==="medium"?"high":"low";saveData();renderDetailBody(node);return;}
  if(action==="menu"){card.querySelector(".task-context-menu")?.classList.toggle("hidden");return;}
  if(action==="edit") return openTaskEditor(node,task);
  if(action==="archive"){const now=performance.now();if(state.taskArchiveTap.id===task.id&&now-state.taskArchiveTap.time<1800){state.taskArchiveTap={id:null,time:0};openTaskArchiveConfirm(node,task);}else{state.taskArchiveTap={id:task.id,time:now};button.classList.add("armed");setTimeout(()=>button.classList.remove("armed"),1800);toast("Нажмите ещё раз, чтобы отправить задачу в архив");}return;}
  if(action==="delete"){if(confirm(`Удалить задачу «${task.title}»?`)){node.tasks=tasks.filter(item=>item.id!==task.id);if(state.expandedProcessTaskId===task.id)state.expandedProcessTaskId=null;updateProcessProgress(node);saveData();renderDetailBody(node);render();}return;}
  const sameStage=tasks.filter(item=>item.stageId===task.stageId); const localIndex=sameStage.findIndex(item=>item.id===task.id); const target=action==="moveUp"?sameStage[localIndex-1]:sameStage[localIndex+1]; if(!target)return;
  const a=tasks.indexOf(task),b=tasks.indexOf(target); [tasks[a],tasks[b]]=[tasks[b],tasks[a]]; saveData();renderDetailBody(node);
}
function openTaskArchiveConfirm(node,task){state.taskArchivePending={nodeId:node.id,taskId:task.id};$("#taskArchiveConfirmText").textContent=`Вы точно хотите отправить задачу «${task.title||"Без названия"}» в общий архив?`;const d=$("#taskArchiveConfirmDialog");if(!d.open)d.showModal();}
function closeTaskArchiveConfirm(){const d=$("#taskArchiveConfirmDialog");if(d?.open)d.close();state.taskArchivePending=null;}
function confirmArchiveTask(){const p=state.taskArchivePending,node=nodeById(p?.nodeId),task=(node?.tasks||[]).find(x=>x.id===p?.taskId);if(!node||!task)return closeTaskArchiveConfirm();const stage=(node.stages||[]).find(x=>x.id===task.stageId);task.archived=true;task.archivedAt=new Date().toISOString();task.archivedStageId=task.stageId||"";task.archivedStageTitle=stage?.title||"Без этапа";if(state.expandedProcessTaskId===task.id)state.expandedProcessTaskId=null;updateProcessProgress(node);saveData();closeTaskArchiveConfirm();renderDetailBody(node);render();toast("Задача отправлена в общий архив");}
function taskArchiveGroups(node){const archived=(node.tasks||[]).filter(t=>t.archived),order=new Map((node.stages||[]).map((s,i)=>[s.id,i])),groups=new Map();archived.forEach(task=>{const id=task.archivedStageId||task.stageId||"none",title=task.archivedStageTitle||(node.stages||[]).find(s=>s.id===id)?.title||"Без этапа";if(!groups.has(id))groups.set(id,{id,title,tasks:[]});groups.get(id).tasks.push(task)});return[...groups.values()].sort((a,b)=>(order.get(a.id)??999)-(order.get(b.id)??999));}
function taskArchiveHtml(node){const groups=taskArchiveGroups(node);if(!groups.length)return`<div class="task-archive-empty">Архив задач пока пуст.</div>`;return groups.map(group=>`<section class="task-archive-group"><header><div><small>ЭТАП</small><h3>${esc(group.title)}</h3></div><span>${group.tasks.length}</span></header><div class="task-archive-list">${group.tasks.sort((a,b)=>String(b.archivedAt||"").localeCompare(String(a.archivedAt||""))).map(task=>{const expanded=state.taskArchiveExpandedId===task.id;return`<article class="task-archive-item ${expanded?"expanded":""}" data-archive-task-id="${esc(task.id)}"><button type="button" class="task-archive-item-main" data-archive-action="toggle"><div><b>${esc(task.title||"Задача без названия")}</b><small>${esc(priorityLabel(task.priority))}${task.archivedAt?` · ${esc(new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(task.archivedAt)))}`:""}</small></div>${icon("open")}</button>${expanded?`<div class="task-archive-item-detail">${task.note?`<p>${esc(String(task.note).slice(0,400))}</p>`:""}<div class="task-archive-item-actions"><button type="button" class="ghost" data-archive-action="restore">${icon("restore")}<span>Восстановить</span></button><button type="button" class="ghost danger-text" data-archive-action="delete">${icon("trash")}<span>Удалить навсегда</span></button></div></div>`:""}</article>`}).join("")}</div></section>`).join("")}
function openTaskArchive(node){state.taskArchiveExpandedId=null;$("#taskArchiveBody").innerHTML=taskArchiveHtml(node);const d=$("#taskArchiveDialog");if(!d.open)d.showModal();}
function closeTaskArchive(){const d=$("#taskArchiveDialog");if(d?.open)d.close();state.taskArchiveExpandedId=null;}
function handleTaskArchiveClick(event){const item=event.target.closest("[data-archive-task-id]"),button=event.target.closest("[data-archive-action]");if(!item||!button)return;const node=nodeById(state.activeNodeId),task=(node?.tasks||[]).find(x=>x.id===item.dataset.archiveTaskId);if(!node||!task)return;const action=button.dataset.archiveAction;if(action==="toggle"){state.taskArchiveExpandedId=state.taskArchiveExpandedId===task.id?null:task.id;$("#taskArchiveBody").innerHTML=taskArchiveHtml(node);return}if(action==="restore"){task.archived=false;task.archivedAt="";task.stageId=task.archivedStageId||task.stageId;task.archivedStageId="";task.archivedStageTitle="";state.taskArchiveExpandedId=null;updateProcessProgress(node);saveData();$("#taskArchiveBody").innerHTML=taskArchiveHtml(node);renderDetailBody(node);render();toast("Задача восстановлена");return}if(action==="delete"&&confirm(`Удалить задачу «${task.title||"Без названия"}» навсегда?`)){node.tasks=(node.tasks||[]).filter(x=>x.id!==task.id);state.taskArchiveExpandedId=null;updateProcessProgress(node);saveData();$("#taskArchiveBody").innerHTML=taskArchiveHtml(node);renderDetailBody(node);render();toast("Задача удалена навсегда")}}

function openTaskEditor(node, task) {
  const base=task?clone(task):{id:uid(),stageId:state.selectedProcessStageId,title:"Новая задача",priority:"medium",note:"",contactIds:[],scheduleMode:"date",intervalStart:"",intervalEnd:"",dateTime:"",reminder:"15",notify:false,done:false,archived:false,archivedAt:"",archivedStageId:"",archivedStageTitle:""};
  state.taskDraft=base;
  $("#taskEditorTitle").textContent=task?"Редактировать задачу":"Новая задача";
  $("#taskTitle").value=base.title||""; $("#taskNote").value=String(base.note||"").slice(0,400); updateTaskNoteCounter(); $("#taskPriority").value=base.priority||"medium"; $("#taskScheduleMode").value=base.scheduleMode||"date"; $("#taskIntervalStart").value=base.intervalStart||""; $("#taskIntervalEnd").value=base.intervalEnd||""; $("#taskDateTime").value=base.dateTime||""; $("#taskReminder").value=base.reminder||"15"; $("#taskNotify").checked=Boolean(base.notify);
  renderTaskContactPicker(node, base.contactIds||[]); updateTaskScheduleFields(); const dialog=$("#taskEditorDialog"); if(!dialog.open)dialog.showModal();
}
function closeTaskEditor(){if($("#taskEditorDialog").open)$("#taskEditorDialog").close();closeTaskRoleDialog();state.taskDraft=null;}
function renderTaskContactPicker(node, selectedIds){
  const contacts=node.phonebook||[];
  const selected=selectedIds.map(id=>contacts.find(c=>c.id===id)).filter(Boolean);
  const summary=selected.length?selected.map(contact=>`<article class="task-role-card"><div class="task-role-card-copy"><small>${esc(contact.role||"Роль")}</small><b>${esc(contact.name||"Без имени")}</b>${contact.phone?`<span>${esc(contact.phone)}</span>`:""}</div></article>`).join(""):`<div class="note-block">Роли пока не назначены.</div>`;
  $("#taskContactPicker").innerHTML=`<div class="task-role-toolbar"><button type="button" class="ghost task-role-icon-button" id="taskRoleAdd" aria-label="Добавить роль">${icon("plus")}</button><button type="button" class="ghost task-role-icon-button" id="taskRoleRemove" aria-label="Удалить роль" ${selected.length?"":"disabled"}>${icon("trash")}</button></div><div class="task-role-summary">${summary}</div>`;
  $("#taskRoleAdd")?.addEventListener("click",()=>openTaskRoleDialog(node));
  $("#taskRoleRemove")?.addEventListener("click",()=>{if(!state.taskDraft)return;state.taskDraft.contactIds=[];renderTaskContactPicker(node,[]);});
}
function readTaskContactIds(){return [...new Set((state.taskDraft?.contactIds||[]).map(String))];}
function openTaskRoleDialog(node){
  const dialog=$("#taskRoleDialog");
  const contacts=node?.phonebook||[];
  $("#taskRoleDialogList").innerHTML=contacts.length?contacts.map(c=>`<label class="task-contact-choice"><input type="checkbox" value="${esc(c.id)}" ${(state.taskDraft?.contactIds||[]).includes(c.id)?"checked":""}><span><b>${esc(c.role||"Роль")}</b><small>${esc(c.name||"Без имени")}${c.phone?` · ${esc(c.phone)}`:""}</small></span></label>`).join(""):`<div class="note-block">Сначала добавьте контакт в телефонную книгу рабочего процесса.</div>`;
  if(!dialog.open) dialog.showModal();
}
function closeTaskRoleDialog(){const dialog=$("#taskRoleDialog"); if(dialog?.open) dialog.close();}
function applyTaskRoleDialog(){
  if(!state.taskDraft) return closeTaskRoleDialog();
  state.taskDraft.contactIds=$$('#taskRoleDialogList input:checked').map(input=>input.value);
  const node=nodeById(state.activeNodeId);
  if(node?.type==='process') renderTaskContactPicker(node,state.taskDraft.contactIds);
  closeTaskRoleDialog();
}
function updateTaskScheduleFields(){const interval=$("#taskScheduleMode").value==="interval";$("#taskIntervalFields").classList.toggle("hidden",!interval);$("#taskDateField").classList.toggle("hidden",interval);}
function updateTaskNoteCounter(){const input=$("#taskNote"),counter=$("#taskNoteCounter");if(!input||!counter)return;if(input.value.length>400)input.value=input.value.slice(0,400);counter.textContent=`${input.value.length} / 400`;}
function saveTaskEditor(event){event.preventDefault();const node=nodeById(state.activeNodeId);if(!node||node.type!=="process"||!state.taskDraft)return;const d=state.taskDraft;d.title=$("#taskTitle").value.trim()||"Новая задача";d.note=$("#taskNote").value.slice(0,400).trim();d.priority=$("#taskPriority").value;d.contactIds=readTaskContactIds();d.scheduleMode=$("#taskScheduleMode").value;d.intervalStart=$("#taskIntervalStart").value;d.intervalEnd=$("#taskIntervalEnd").value;d.dateTime=$("#taskDateTime").value;d.reminder=$("#taskReminder").value;d.notify=$("#taskNotify").checked;d.stageId=d.stageId||state.selectedProcessStageId;node.tasks||=[];const idx=node.tasks.findIndex(t=>t.id===d.id);if(idx>=0)node.tasks[idx]=d;else node.tasks.push(d);state.expandedProcessTaskId=d.id;updateProcessProgress(node);saveData();closeTaskEditor();renderDetailBody(node);render();toast("Задача сохранена");}

function openStageEditor(node, stageId){const stage=(node.stages||[]).find(item=>item.id===stageId);if(!stage)return;state.stageEditDraft={nodeId:node.id,stageId};state.stageReturnScrollTop=$("#detailBody")?.scrollTop||0;$("#stageEditTitle").value=stage.title||"";$("#stageEditDate").value=stage.deadline||"";const d=$("#stageEditorDialog");if(!d.open)d.showModal();}
function restoreProcessDetailAfterStageEditor(nodeId){const node=nodeById(nodeId||state.activeNodeId);if(!node||node.type!=="process")return;setTimeout(()=>{const detail=$("#detailDialog");if(!detail.open){openDetail(node);}else{renderDetailBody(node);}requestAnimationFrame(()=>{const body=$("#detailBody");if(body)body.scrollTop=state.stageReturnScrollTop||0;});},30);}
function closeStageEditor(){const nodeId=state.stageEditDraft?.nodeId||state.activeNodeId;if($("#stageEditorDialog").open)$("#stageEditorDialog").close();state.stageEditDraft=null;restoreProcessDetailAfterStageEditor(nodeId);}
function saveStageEditor(event){event.preventDefault();event.stopPropagation();const draft=state.stageEditDraft,node=nodeById(draft?.nodeId),stage=(node?.stages||[]).find(item=>item.id===draft?.stageId);if(!stage)return;stage.title=$("#stageEditTitle").value.trim()||"Новый этап";stage.deadline=$("#stageEditDate").value;saveData();closeStageEditor();renderCards();renderLinks();toast("Этап сохранён");}
function openStageDeleteConfirm(){const d=$("#stageDeleteDialog");if(!d.open)d.showModal();}
function closeStageDeleteConfirm(){if($("#stageDeleteDialog").open)$("#stageDeleteDialog").close();}
function cancelStageDelete(){closeStageDeleteConfirm();closeStageEditor();const node=nodeById(state.activeNodeId);if(node)renderDetailBody(node);}
function confirmStageDelete(){const draft=state.stageEditDraft,node=nodeById(draft?.nodeId);if(!node)return;node.stages=(node.stages||[]).filter(stage=>stage.id!==draft.stageId);node.tasks=(node.tasks||[]).filter(task=>task.stageId!==draft.stageId);if(state.selectedProcessStageId===draft.stageId)state.selectedProcessStageId=node.stages[0]?.id||null;state.expandedProcessTaskId=null;updateProcessProgress(node);saveData();closeStageDeleteConfirm();closeStageEditor();renderDetailBody(node);render();toast("Этап и связанные задачи удалены");}
function budgetDigits(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 8);
}
function formatBudgetNumber(value) {
  return String(clamp(Number(value || 0), 0, 99000000)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
function formatBudgetEditorInput() {
  const input = $("#budgetEditValue");
  const digits = budgetDigits(input.value);
  input.value = digits ? formatBudgetNumber(digits) : "";
}
function openBudgetEditor(node) {
  const input = $("#budgetEditValue");
  input.value = node.budget ? formatBudgetNumber(node.budget) : "";
  const dialog = $("#budgetEditorDialog");
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => { input.focus({ preventScroll: true }); input.select(); });
}
function closeBudgetEditor() {
  if ($("#budgetEditorDialog").open) $("#budgetEditorDialog").close();
}
function saveBudgetEditor(event) {
  event.preventDefault();
  event.stopPropagation();
  const node = nodeById(state.activeNodeId);
  if (!node || node.type !== "process") return;
  const digits = budgetDigits($("#budgetEditValue").value);
  node.budget = clamp(Number(digits || 0), 0, 99000000);
  saveData();
  closeBudgetEditor();
  renderDetailBody(node);
  render();
  toast("Бюджет сохранён");
}
function phonebookActionIcon(action){
  if(action==="edit")return icon("edit");
  if(action==="delete")return icon("trash");
  return icon("branch");
}
function contactTaskRelations(node,contactId){
  const stages=node?.stages||[];
  return (node?.tasks||[]).filter(task=>(task.contactIds||[]).includes(contactId)).map(task=>({task,stage:stages.find(stage=>stage.id===task.stageId)||null}));
}
function openPhonebook(node){renderPhonebookList(node);const d=$("#phonebookDialog");if(!d.open)d.showModal();}
function closePhonebook(){closePhonebookEditor();if($("#phonebookDialog").open)$("#phonebookDialog").close();state.phonebookEditId=null;}
function closePhonebookEditor(){const d=$("#phonebookEditorDialog");if(d?.open)d.close();state.phonebookEditId=null;}
function renderPhonebookList(node){state.phonebookEditId=null;const contacts=node?.phonebook||[];$("#phonebookBody").innerHTML=contacts.length?contacts.map(c=>`<article class="phonebook-card" data-phonebook-id="${esc(c.id)}"><div class="phonebook-card-main"><b>${esc(c.name||"Без имени")}</b><small>${esc(c.role||"Контакт")}</small>${c.phone?`<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>`:""}${messengerBadges(c)}${c.website?`<a class="phonebook-site" href="${esc(c.website)}" target="_blank" rel="noopener">${esc(c.website)}</a>`:""}</div><div class="phonebook-card-actions"><button type="button" data-phonebook-action="edit" aria-label="Редактировать контакт" title="Редактировать">${phonebookActionIcon("edit")}</button><button type="button" data-phonebook-action="relations" aria-label="Показать связи с этапами и задачами" title="Связи">${phonebookActionIcon("relations")}</button><button type="button" class="danger-text" data-phonebook-action="delete" aria-label="Удалить контакт" title="Удалить">${phonebookActionIcon("delete")}</button></div></article>`).join(""):`<div class="note-block">Телефонная книга пока пуста.</div>`;}
function renderPhonebookEditor(contact){state.phonebookEditId=contact?.id||null;$("#phonebookEditorTitle").textContent=contact?"Редактировать контакт":"Новый контакт";$("#phonebookName").value=contact?.name||"";$("#phonebookRole").value=contact?.role||"";$("#phonebookPhone").value=contact?.phone||"";$("#phonebookWebsite").value=contact?.website||"";$("#phonebookCar").value=contact?.carNumber||"";$("#phonebookAddress").value=contact?.address||"";$("#phonebookComment").value=contact?.comment||"";const selected=Array.isArray(contact?.messengers)?contact.messengers:[];$$('[data-messenger-toggle]',$("#phonebookMessengers")).forEach(button=>{const active=selected.includes(button.dataset.messengerToggle);button.classList.toggle("selected",active);button.setAttribute("aria-pressed",String(active));});const d=$("#phonebookEditorDialog");if(!d.open)d.showModal();setTimeout(()=>$("#phonebookName")?.focus(),80);}
function handlePhonebookClick(event){const card=event.target.closest('[data-phonebook-id]'),button=event.target.closest('[data-phonebook-action]');if(!card||!button)return;const node=nodeById(state.activeNodeId),contact=(node?.phonebook||[]).find(c=>c.id===card.dataset.phonebookId);if(!contact)return;const action=button.dataset.phonebookAction;if(action==='edit')renderPhonebookEditor(contact);if(action==='relations')openPhonebookRelations(node,contact);if(action==='delete'&&confirm(`Удалить контакт «${contact.name||'Без имени'}»?`)){node.phonebook=(node.phonebook||[]).filter(c=>c.id!==contact.id);(node.tasks||[]).forEach(t=>t.contactIds=(t.contactIds||[]).filter(id=>id!==contact.id));saveData();renderPhonebookList(node);renderDetailBody(node);}}

function openPhonebookRelations(node,contact){
  state.phonebookRelationsContactId=contact.id;
  $("#phonebookRelationsTitle").textContent=contact.name||"Без имени";
  const relations=contactTaskRelations(node,contact.id);
  $("#phonebookRelationsBody").innerHTML=relations.length?relations.map(({task,stage})=>`<article class="phonebook-relation-item"><small>${stage?"ЭТАП":"БЕЗ ЭТАПА"}</small><b>${esc(stage?.title||"Не назначен")}</b><span>${esc(task.title||"Задача без названия")}</span></article>`).join(""):`<div class="phonebook-relations-empty">Контакт пока не связан с этапами и задачами.</div>`;
  const d=$("#phonebookRelationsDialog");if(!d.open)d.showModal();
}
function closePhonebookRelations(){const d=$("#phonebookRelationsDialog");if(d?.open)d.close();state.phonebookRelationsContactId=null;}

function savePhonebookContact(event){event.preventDefault();const node=nodeById(state.activeNodeId);if(!node)return;node.phonebook||=[];let c=node.phonebook.find(x=>x.id===state.phonebookEditId);if(!c){c={id:uid()};node.phonebook.push(c)}const messengers=$$('[data-messenger-toggle].selected',$("#phonebookMessengers")).map(button=>button.dataset.messengerToggle);Object.assign(c,{name:$("#phonebookName").value.trim(),role:$("#phonebookRole").value.trim(),phone:$("#phonebookPhone").value.trim(),messengers,carNumber:$("#phonebookCar").value.trim(),address:$("#phonebookAddress").value.trim(),website:$("#phonebookWebsite").value.trim(),comment:$("#phonebookComment").value.trim()});saveData();closePhonebookEditor();renderPhonebookList(node);renderDetailBody(node);toast("Контакт сохранён");}
function handleMessengerPickerClick(event){const button=event.target.closest("[data-messenger-toggle]");if(!button)return;const active=!button.classList.contains("selected");button.classList.toggle("selected",active);button.setAttribute("aria-pressed",String(active));}
function handleMessengerBadgeTap(event){const badge=event.target.closest('[data-messenger-contact][data-messenger-type]');if(!badge||badge.dataset.messengerActive!=="1")return;badge.classList.remove('tap-active');void badge.offsetWidth;badge.classList.add('tap-active');clearTimeout(badge._tapActiveTimer);badge._tapActiveTimer=setTimeout(()=>badge.classList.remove('tap-active'),180);}
function openMessengerAction(contact,type){if(!contact?.phone)return toast("У контакта не указан номер телефона");state.messengerAction={contactId:contact.id,type,phone:contact.phone};$("#messengerActionLabel").textContent=messengerLabel(type).toUpperCase();$("#messengerActionTitle").textContent=contact.name||"Связаться";const d=$("#messengerActionDialog");if(!d.open)d.showModal();}
function closeMessengerAction(){if($("#messengerActionDialog").open)$("#messengerActionDialog").close();state.messengerAction=null;}
function runMessengerAction(kind){const action=state.messengerAction;if(!action)return;const digits=String(action.phone||"").replace(/\D/g,"");if(kind==="call"){location.href=`tel:${action.phone}`;closeMessengerAction();return;}let url="";if(action.type==="telegram")url=`https://t.me/+${digits}`;else if(action.type==="whatsapp")url=`https://wa.me/${digits}`;else url=`https://max.ru/u/${digits}`;window.open(url,"_blank","noopener");closeMessengerAction();}

function updateProcessProgress(node) {
  if (node.type !== "process") return;
  const tasks = (node.tasks || []).filter(task => !task.archived);
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
  requestAnimationFrame(() => { const body = $("#editorBody"); if (body) body.scrollTop = 0; });
}
function closeEditor() { if ($("#editorDialog").open) $("#editorDialog").close(); state.editDraft = null; }
function commonFields(draft) {
  const processCover = (["process","person","goal"].includes(draft.type)) ? processCoverEditorHtml(draft) : "";
  return `<div class="field"><label>Название</label><input name="title" value="${esc(draft.title)}" required></div>${processCover}<div class="field"><label>Заметка</label><textarea name="note">${esc(draft.note || "")}</textarea></div>`;
}
function processCoverEditorHtml(draft) {
  const hasCover = Boolean(draft.coverAssetId);
  const position = processCoverPosition(draft, "2");
  const isPerson = draft.type === "person";
  const isGoal = draft.type === "goal";
  const label = isPerson ? "Фото" : isGoal ? "Фото цели" : "Обложка";
  const emptyText = isPerson ? "Фото не добавлено" : isGoal ? "Фото цели не добавлено" : "Обложка не добавлена";
  const buttonText = isPerson || isGoal ? "Добавить / заменить фото" : "Новая обложка";
  return `<div class="field process-cover-field"><label>${label}</label><div class="process-cover-editor">${hasCover ? `<div class="process-cover-thumb ${isPerson ? "person-photo-thumb" : isGoal ? "goal-photo-thumb" : ""}"><img data-editor-process-cover="${esc(draft.coverAssetId)}" style="${processCoverStyle(position)}" alt=""></div>` : `<div class="process-cover-empty">${emptyText}</div>`}<div class="process-cover-buttons"><button type="button" class="ghost" data-editor-action="newProcessCover">${buttonText}</button><button type="button" class="ghost" data-editor-action="positionProcessCover" ${hasCover ? "" : "disabled"}>Настроить положение</button>${hasCover ? `<button type="button" class="ghost danger-text" data-editor-action="removeProcessCover">Удалить</button>` : ""}</div></div></div>`;
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
    <div class="editor-group"><h3>Основные материалы</h3><button type="button" class="ghost" data-editor-action="addAssets">＋ Добавить изображения, PDF или векторные файлы</button></div>`;
  if (d.type === "person") {
    const knownStatuses = ["Новый контакт","На связи","Перспективный","Работаем","Пауза","Важный человек"];
    const mode = knownStatuses.includes(d.personStatusMode) ? d.personStatusMode : (knownStatuses.includes(d.personStatus) ? d.personStatus : "custom");
    html += `
    <div class="field"><label>Специализация</label><input name="speciality" value="${esc(d.speciality || "")}"></div>
    <div class="field"><label>Ключевые слова</label><input name="tags" value="${esc(d.tags || "")}"></div>
    <div class="field"><label>Телефон</label><input name="phone" inputmode="tel" value="${esc(d.phone || "")}"></div>
    <div class="field"><label>Telegram</label><input name="telegram" value="${esc(d.telegram || "")}" placeholder="@username или t.me/username"></div>
    <div class="field"><label>Адрес</label><input name="address" value="${esc(d.address || "")}" placeholder="Город, улица, дом"></div>
    <div class="field-grid"><div class="field"><label>Email</label><input name="email" type="email" value="${esc(d.email || "")}"></div><div class="field"><label>Сайт</label><input name="site" value="${esc(d.site || "")}"></div></div>
    <div class="field"><label>Соцсеть</label><input name="social" value="${esc(d.social || "")}"></div>
    <div class="field person-status-field"><label>Статус человека</label><select name="personStatusMode" id="personStatusMode">${knownStatuses.map(value => `<option value="${value}" ${mode === value ? "selected" : ""}>${value}</option>`).join("")}<option value="custom" ${mode === "custom" ? "selected" : ""}>Свой вариант</option></select><div id="personCustomStatusWrap" class="person-custom-status ${mode === "custom" ? "" : "hidden"}"><div class="input-counter-wrap"><input id="personCustomStatus" maxlength="30" value="${esc(mode === "custom" ? (d.personStatus || "") : "")}" placeholder="До 30 символов"><span id="personCustomStatusCounter">${String(mode === "custom" ? (d.personStatus || "") : "").length} / 30</span></div></div></div>`;
  }
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
    if (action === "addAssets") {
      state.assetTargetNodeId = state.activeNodeId;
      document.body.classList.add("asset-picker-pending");
      toast("Выберите изображения или файлы");
      $("#assetInput").click();
      setTimeout(() => document.body.classList.remove("asset-picker-pending"), 1200);
    }
    if (action === "newProcessCover") $("#processCoverInput").click();
    if (action === "positionProcessCover" && state.editDraft?.coverAssetId) openProcessCoverPositionDialog(state.editDraft.coverAssetId);
    if (action === "removeProcessCover") removeProcessCoverFromDraft();
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
  const statusSelect = $("#personStatusMode", $("#editorBody"));
  const customWrap = $("#personCustomStatusWrap", $("#editorBody"));
  const customInput = $("#personCustomStatus", $("#editorBody"));
  const customCounter = $("#personCustomStatusCounter", $("#editorBody"));
  const updateCustom = () => {
    if (!statusSelect || !customWrap) return;
    const custom = statusSelect.value === "custom";
    customWrap.classList.toggle("hidden", !custom);
    if (customInput) { if (customInput.value.length > 30) customInput.value = customInput.value.slice(0,30); if (customCounter) customCounter.textContent = `${customInput.value.length} / 30`; }
  };
  statusSelect?.addEventListener("change", updateCustom);
  customInput?.addEventListener("input", updateCustom);
  updateCustom();
}
async function hydrateProcessCoverEditor() {
  const img = $('[data-editor-process-cover]', $("#editorBody")); if (!img) return;
  const url = await assetUrl(img.dataset.editorProcessCover).catch(() => null); if (url && img.isConnected) img.src = url;
}
function removeProcessCoverFromDraft() {
  if (!state.editDraft || !["process","person","goal"].includes(state.editDraft.type)) return;
  const oldId = state.editDraft.coverAssetId;
  if (oldId) { state.editDraft._removedCoverId = oldId; state.editDraft.assets = (state.editDraft.assets || []).filter(asset => asset.id !== oldId); }
  state.editDraft.coverAssetId = ""; state.editDraft.coverPosition = { x: 0, y: 0, scale: 1 }; state.editDraft.coverPositions = normalizedProcessCoverPositions({}); renderEditorBody();
}
function openCoverQuickMenu(node){
  state.quickCoverNodeId=node.id;
  state.quickCoverOriginalAssetId=node.coverAssetId||null;
  state.quickCoverPendingAssetId=null;
  state.quickCoverReturnScrollTop=$("#detailBody")?.scrollTop||0;
  const btn=$("#coverQuickPosition"); btn.disabled=!node.coverAssetId;
  const input=$("#coverQuickTitleInput");
  input.value=String(node.title||"").slice(0,26);
  $("#coverQuickTitlePanel").classList.add("hidden");
  $("#coverQuickTitleToggle").setAttribute("aria-expanded","false");
  updateQuickProcessTitleState();
  const d=$("#coverQuickMenu");
  d.classList.remove("is-leaving");
  if(!d.open)d.showModal();
}
function normalizeQuickProcessTitle(value){return String(value||"").replace(/\s+/g," ").trim().slice(0,26);}
function updateQuickProcessTitleState(){
  const input=$("#coverQuickTitleInput"),counter=$("#coverQuickTitleCounter"),save=$("#coverQuickTitleSave");
  if(!input||!counter||!save)return;
  if(input.value.length>26)input.value=input.value.slice(0,26);
  counter.textContent=`${input.value.length} / 26`;
  const valid=normalizeQuickProcessTitle(input.value).length>0;
  save.disabled=!valid;
}
function toggleQuickProcessTitle(){
  const panel=$("#coverQuickTitlePanel"),toggle=$("#coverQuickTitleToggle");
  const opening=panel.classList.contains("hidden");
  panel.classList.toggle("hidden",!opening);
  toggle.setAttribute("aria-expanded",String(opening));
  if(opening)requestAnimationFrame(()=>{const input=$("#coverQuickTitleInput");input.focus();input.setSelectionRange(input.value.length,input.value.length);});
}
function cancelQuickProcessTitle(){
  const node=nodeById(state.quickCoverNodeId||state.activeNodeId);
  if(node)$("#coverQuickTitleInput").value=String(node.title||"").slice(0,26);
  updateQuickProcessTitleState();
  $("#coverQuickTitlePanel").classList.add("hidden");
  $("#coverQuickTitleToggle").setAttribute("aria-expanded","false");
}
function saveQuickProcessTitle(){
  const node=nodeById(state.quickCoverNodeId||state.activeNodeId),input=$("#coverQuickTitleInput");
  if(!node||node.type!=="process"||!input)return;
  const title=normalizeQuickProcessTitle(input.value);
  if(!title)return;
  node.title=title;
  input.value=title;
  saveData();
  $("#detailTitle").textContent=title;
  renderDetailBody(node);
  render();
  updateQuickProcessTitleState();
  $("#coverQuickTitlePanel").classList.add("hidden");
  $("#coverQuickTitleToggle").setAttribute("aria-expanded","false");
  toast("Название рабочего процесса сохранено");
}
function closeCoverQuickMenu({restore=true}={}){
  const d=$("#coverQuickMenu");
  if(d.open){d.classList.add("is-leaving");setTimeout(()=>{if(d.open)d.close();d.classList.remove("is-leaving");},140);}
  if(!restore)return;
  const node=nodeById(state.quickCoverNodeId||state.activeNodeId);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const detail=$("#detailDialog");
    if(node&&node.type==="process"){if(!detail.open)openDetail(node);else renderDetailBody(node);requestAnimationFrame(()=>{const body=$("#detailBody");if(body)body.scrollTop=state.quickCoverReturnScrollTop||0;});}
  }));
}
function prepareQuickCoverDraft(){const node=nodeById(state.quickCoverNodeId);if(!node)return null;state.editDraft=clone(node);return node;}
function startQuickNewCover(){
  const node=prepareQuickCoverDraft();if(!node)return;
  // Keep this modal open while iOS shows Media Library / Camera / Files.
  // Closing it before input.click() makes Safari reveal the workspace behind the process.
  $("#processCoverInput").click();
}
function startQuickPositionCover(){
  const node=prepareQuickCoverDraft();if(!node?.coverAssetId)return;
  closeCoverQuickMenu({restore:false});
  requestAnimationFrame(()=>requestAnimationFrame(()=>openProcessCoverPositionDialog(node.coverAssetId)));
}
async function handleProcessCoverFile(event) {
  const file = event.target.files?.[0]; event.target.value = "";
  if (!file || !state.editDraft || !["process","person","goal"].includes(state.editDraft.type)) return;
  if (state.quickCoverNodeId) {
    const quickDialog = $("#coverQuickMenu");
    quickDialog.classList.remove("is-leaving");
    if (quickDialog.open) quickDialog.close();
  }
  const previousId = state.editDraft.coverAssetId;
  const id = uid();
  let blob;
  try { blob = await optimizeImageFile(file); }
  catch (error) { return toast(error.message === "FILE_TOO_LARGE" ? "Изображение слишком большое. Максимум 30 МБ." : "Не удалось обработать изображение"); }
  const metadata = assetMetadata(id, file, blob);
  await putAsset({ ...metadata, blob });
  state.editDraft.assets ||= [];
  if (previousId && !state.quickCoverNodeId) {
    state.editDraft.assets = state.editDraft.assets.filter(asset => asset.id !== previousId);
    releaseObjectUrl(previousId);
    await deleteAssetRecord(previousId).catch(() => {});
  }
  state.editDraft.assets.push(metadata);
  if (state.quickCoverNodeId) state.quickCoverPendingAssetId = id;
  state.editDraft.coverAssetId = id;
  const defaultFit = state.editDraft.type === "person" ? "contain" : "cover";
  state.editDraft.coverPosition = { x: 0, y: 0, scale: 1, fit: defaultFit };
  state.editDraft.coverPositions = normalizedProcessCoverPositions({ type: state.editDraft.type, coverPosition: state.editDraft.coverPosition });
  if (state.quickCoverNodeId) openProcessCoverPositionDialog(id);
  else { renderEditorBody(); openProcessCoverPositionDialog(id); }
}
async function openProcessCoverPositionDialog(assetId) {
  const url = await assetUrl(assetId).catch(() => null); if (!url) return;
  state.coverPositionDraft = normalizedProcessCoverPositions(state.editDraft || {});
  state.coverPositionMode = "2";
  const title = $("#processCoverDialog h2"); if (title) title.textContent = state.editDraft?.type === "person" ? "Настроить фото" : state.editDraft?.type === "goal" ? "Настроить фото цели" : "Настроить обложку";
  $("#processCoverPreview").src = url;
  setProcessCoverMode("2");
  const dialog = $("#processCoverDialog"); if (!dialog.open) { dialog.showModal(); requestAnimationFrame(()=>dialog.classList.add("is-visible")); }
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
  $$('[data-cover-fit]', $("#processCoverDialog")).forEach(button=>button.classList.toggle("active",button.dataset.coverFit===(position.fit||"cover")));
  updateProcessCoverPreview();
}
function updateProcessCoverPreview() {
  const position = currentProcessCoverPosition(); if (!position) return;
  position.scale = Math.max(.65, Number($("#processCoverScale").value || 1));
  position.x = clamp(Number(position.x || 0), -50, 50);
  position.y = clamp(Number(position.y || 0), -50, 50);
  const preview = $("#processCoverPreview");
  preview.style.cssText = processCoverStyle(position);
}
function setProcessCoverFit(fit) {
  const position=currentProcessCoverPosition(); if(!position)return;
  position.fit=fit==="contain"?"contain":"cover";
  $$('[data-cover-fit]', $("#processCoverDialog")).forEach(button=>button.classList.toggle("active",button.dataset.coverFit===position.fit));
  updateProcessCoverPreview();
}
function resetProcessCoverPosition() {
  if (!state.coverPositionDraft) return;
  const fit = state.editDraft?.type === "person" ? "contain" : "cover";
  state.coverPositionDraft[state.coverPositionMode] = { x: 0, y: 0, scale: 1, fit };
  $("#processCoverScale").value = 1; setProcessCoverFit(fit); updateProcessCoverPreview();
}
function finishCoverDialogClose(){
  const dialog=$("#processCoverDialog");
  dialog.classList.remove("is-visible");
  setTimeout(()=>{if(dialog.open)dialog.close();},150);
}
async function cancelProcessCoverPosition(){
  finishCoverDialogClose();
  if(state.quickCoverNodeId && state.quickCoverPendingAssetId && state.quickCoverPendingAssetId!==state.quickCoverOriginalAssetId){
    releaseObjectUrl(state.quickCoverPendingAssetId);
    await deleteAssetRecord(state.quickCoverPendingAssetId).catch(()=>{});
  }
  const node=nodeById(state.quickCoverNodeId||state.activeNodeId);
  state.coverPositionDraft=null;state.editDraft=null;state.quickCoverPendingAssetId=null;state.quickCoverOriginalAssetId=null;state.quickCoverNodeId=null;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{if(node?.type==="process"){renderDetailBody(node);const body=$("#detailBody");if(body)body.scrollTop=state.quickCoverReturnScrollTop||0;}}));
}
async function applyProcessCoverPosition() {
  if (!state.editDraft || !state.coverPositionDraft) return;
  state.editDraft.coverPositions = clone(state.coverPositionDraft);
  state.editDraft.coverPosition = { ...state.coverPositionDraft["2"] };
  finishCoverDialogClose();
  if (state.quickCoverNodeId) {
    const node=nodeById(state.quickCoverNodeId);
    if(node){
      const oldId=state.quickCoverOriginalAssetId;
      node.coverAssetId=state.editDraft.coverAssetId;
      node.coverPosition=clone(state.editDraft.coverPosition);
      node.coverPositions=clone(state.editDraft.coverPositions);
      node.assets=clone(state.editDraft.assets||node.assets||[]).filter((asset,index,array)=>array.findIndex(item=>item.id===asset.id)===index);
      if(oldId && oldId!==node.coverAssetId){node.assets=node.assets.filter(asset=>asset.id!==oldId);releaseObjectUrl(oldId);await deleteAssetRecord(oldId).catch(()=>{});}
      saveData();renderDetailBody(node);render();requestAnimationFrame(()=>{const body=$("#detailBody");if(body)body.scrollTop=state.quickCoverReturnScrollTop||0;});toast("Обложка и миниатюры сохранены");
    }
    state.quickCoverNodeId=null;state.quickCoverOriginalAssetId=null;state.quickCoverPendingAssetId=null;state.editDraft=null;state.coverPositionDraft=null;
  } else renderEditorBody();
}
function bindProcessCoverPositioning() {
  const frame = $("#processCoverFrame"); let drag = null;
  $$('[data-cover-mode]', $("#processCoverDialog")).forEach(button => button.addEventListener("click", () => setProcessCoverMode(button.dataset.coverMode)));
  frame.addEventListener("pointerdown", event => {
    const position = currentProcessCoverPosition(); if (!position) return;
    event.preventDefault();
    drag = { id:event.pointerId, x:event.clientX, y:event.clientY, ox:Number(position.x || 0), oy:Number(position.y || 0) };
    frame.setPointerCapture?.(event.pointerId);
  }, { passive:false });
  frame.addEventListener("pointermove", event => {
    const position = currentProcessCoverPosition();
    if (!drag || drag.id !== event.pointerId || !position) return;
    event.preventDefault();
    const rect = frame.getBoundingClientRect();
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    position.x = clamp(drag.ox + (dx / Math.max(1, rect.width * .5)) * 50, -50, 50);
    position.y = clamp(drag.oy + (dy / Math.max(1, rect.height * .5)) * 50, -50, 50);
    updateProcessCoverPreview();
  }, { passive:false });
  const end = event => { if (drag && (!event || drag.id === event.pointerId)) drag = null; };
  frame.addEventListener("pointerup", end);
  frame.addEventListener("pointercancel", end);
  frame.addEventListener("lostpointercapture", end);
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
  const isPerson = node?.type === "person";
  const footer=$("#detailFooter"), branch=$("#detailBranchButton"), edit=$("#detailEditButton"), lock=$("#processActionLock"), archive=$("#detailTaskArchiveButton"), nodeArchive=$("#detailNodeArchiveButton");
  footer.classList.toggle("process-detail-footer", isProcess);
  footer.classList.toggle("person-detail-footer", isPerson);
  archive?.classList.toggle("hidden", !isProcess);
  nodeArchive?.classList.toggle("hidden", !isProcess);
  branch.classList.toggle("hidden", isPerson);
  edit.classList.toggle("hidden", isProcess);
  lock.classList.add("hidden");
  branch.disabled=false;
  edit.disabled=false;
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
async function saveEditor(event) {
  event.preventDefault();
  syncDraftDynamicFields();
  const d = state.editDraft; const form = new FormData(event.currentTarget);
  if (!d) return;
  for (const [key, value] of form.entries()) {
    if (["budget","advance","balance","positions","progress"].includes(key)) d[key] = value === "" ? "" : Number(String(value).replace(",", "."));
    else d[key] = String(value).trim();
  }
  if (d.type === "person") {
    const mode = $("#personStatusMode", event.currentTarget)?.value || "Новый контакт";
    if (mode === "custom") {
      const custom = String($("#personCustomStatus", event.currentTarget)?.value || "").trim().slice(0,30);
      if (!custom) return toast("Введите свой статус");
      d.personStatusMode = "custom"; d.personStatus = custom;
    } else { d.personStatusMode = mode; d.personStatus = mode; }
    delete d.zone;
  }
  if (d.type === "process") updateProcessProgress(d);
  const removedCoverId = d._removedCoverId || ""; delete d._removedCoverId;
  const index = state.data.nodes.findIndex(node => node.id === d.id);
  if (index >= 0) state.data.nodes[index] = d;
  if (removedCoverId) { releaseObjectUrl(removedCoverId); await deleteAssetRecord(removedCoverId).catch(()=>{}); }
  const savedId=d.id; state.editDraft = null; saveData(); closeEditor(); render(); const saved=nodeById(savedId); if(saved){openDetail(saved); requestAnimationFrame(()=>{$("#detailBody").scrollTop=state.detailScrollTop||0;});} toast("Карточка сохранена");
}
function archiveActiveNode() {
  const node = nodeById(state.activeNodeId); if (!node) return;
  pushUndo("Архивация карточки");
  node.archived = true; node.archivedAt = new Date().toISOString();
  if (state.selectedLinkId) { const selectedLink = state.data.links.find(link => link.id === state.selectedLinkId); if (selectedLink && (selectedLink.a === node.id || selectedLink.b === node.id)) state.selectedLinkId = null; }
  state.selectedId = null; saveData(); closeEditor(); render(); toast("Перемещено в архив", "Отменить", undoLast);
}

/* Assets */
async function handleAssetFiles(event) {
  document.body.classList.remove("asset-picker-pending");
  const node = nodeById(state.assetTargetNodeId); const files = [...event.target.files]; event.target.value = "";
  if (!node || !files.length) return;
  node.assets ||= [];
  let added = 0;
  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) { toast(`Файл «${file.name}» больше 30 МБ и пропущен`); continue; }
    const id = uid();
    let blob = file;
    try { if (file.type.startsWith("image/")) blob = await optimizeImageFile(file); }
    catch { toast(`Не удалось обработать «${file.name}»`); continue; }
    const metadata = assetMetadata(id, file, blob);
    await putAsset({ ...metadata, blob });
    node.assets.push(metadata);
    added += 1;
    if (!node.coverAssetId && metadata.type.startsWith("image/")) node.coverAssetId = id;
  }
  saveData(); render();
  if ($("#detailDialog").open && state.activeNodeId === node.id) renderDetailBody(node);
  if ($("#editorDialog").open && state.activeNodeId === node.id) { state.editDraft.assets = clone(node.assets); state.editDraft.coverAssetId = node.coverAssetId; }
  toast(`Добавлено файлов: ${added}`);
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
  const titles = { today: "Я сейчас", results: "Результаты", archive: "Архив" };
  $("#panelTitle").textContent = titles[panel];
  $("#panelEyebrow").textContent = panel === "today" ? "МОЙ ТЕКУЩИЙ ФОКУС" : (state.space === "work" ? "ПРОЕКТЫ" : "ЛИЧНОЕ");
  $("#panelBody").innerHTML = panel === "today" ? todayPanelHtml() : panel === "results" ? resultsPanelHtml() : archivePanelHtml();
  $("#sidePanel").classList.toggle("now-panel", panel === "today");
  showOverlay("sidePanel");
}
function taskFocusDate(task) {
  const raw = task.dateTime || task.due || task.intervalStart || "";
  if (!raw) return null;
  const date = new Date(raw.length === 10 ? `${raw}T23:59:00` : raw);
  return Number.isNaN(date.getTime()) ? null : date;
}
function taskFocusBucket(task, now = new Date()) {
  const date = taskFocusDate(task);
  if (!date) return 3;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const nearEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  if (date < now) return 0;
  if (date < tomorrowStart) return 1;
  if (date <= nearEnd) return 2;
  return 3;
}
function taskFocusDateLabel(task) {
  const date = taskFocusDate(task);
  if (!date) return "Без срока";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((target - today) / 86400000);
  const time = task.dateTime ? new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(date) : "";
  if (days < 0) return `Просрочено${time ? ` · ${time}` : ""}`;
  if (days === 0) return `Сегодня${time ? ` · ${time}` : ""}`;
  if (days === 1) return `Завтра${time ? ` · ${time}` : ""}`;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(date);
}
function todayPanelHtml() {
  const entries = [];
  const priorityRank = { high: 0, medium: 1, low: 2 };
  state.data.nodes.filter(node => node.space === state.space && !node.archived && node.type === "process").forEach(node => {
    const project = node.projectId ? nodeById(node.projectId) : null;
    (node.tasks || []).filter(task => !task.archived && !task.done).forEach(task => {
      entries.push({ node, project, task, bucket: taskFocusBucket(task), date: taskFocusDate(task) });
    });
  });
  entries.sort((a, b) => a.bucket - b.bucket || (priorityRank[a.task.priority] ?? 1) - (priorityRank[b.task.priority] ?? 1) || (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));
  if (!entries.length) return `<div class="now-empty"><span>${icon("nowMe")}</span><b>Сейчас всё выполнено</b><p>Новые приоритетные задачи появятся здесь автоматически.</p></div>`;
  const labels = ["Сейчас", "Сегодня", "Ближайшее", "Дальше"];
  return `<div class="now-summary"><span>${entries.length}</span><div><b>Что делать сейчас</b><small>Задачи из всех рабочих процессов в порядке приоритета</small></div></div>` + labels.map((label, bucket) => {
    const group = entries.filter(entry => entry.bucket === bucket);
    if (!group.length) return "";
    return `<section class="now-group"><h3>${label}<span>${group.length}</span></h3><div class="now-list">${group.map(({node, project, task}) => `<article class="now-task priority-${esc(task.priority || "medium")}">
      <button type="button" class="now-check" data-now-toggle="${esc(task.id)}" data-now-node="${esc(node.id)}" aria-label="Отметить выполненной"><span>${icon("task")}</span></button>
      <button type="button" class="now-task-main" data-panel-open-node="${esc(node.id)}" data-panel-open-task="${esc(task.id)}">
        <b>${esc(task.title || "Задача без названия")}</b>
        <small>${esc(project?.title || node.title)} · ${esc(taskFocusDateLabel(task))}</small>
      </button>
      <i class="now-priority" aria-label="${esc(priorityLabel(task.priority))}"></i>
    </article>`).join("")}</div></section>`;
  }).join("");
}
function resultsPanelHtml() {
  const entries = [];
  state.data.nodes.filter(node => node.space === state.space && !node.archived).forEach(node => {
    if (node.type === "process") (node.tasks || []).filter(task => !task.archived && task.done).forEach(task => entries.push({ node, title: task.title, detail: "Задача выполнена" }));
    if (node.status === "done") entries.push({ node, title: node.title, detail: `${TYPE_LABELS[node.type]} завершён` });
  });
  if (!entries.length) return `<div class="panel-empty">Завершённые результаты появятся здесь.</div>`;
  return entries.map(entry => `<button class="panel-card" data-panel-open-node="${entry.node.id}"><div class="panel-card-head"><b>${esc(entry.title)}</b><span class="panel-chip">✓</span></div><p>${esc(entry.detail)}</p></button>`).join("");
}
function archivePanelHtml() {
  const entries = state.data.nodes.filter(node => node.space === state.space && node.archived);
  if (!entries.length) return `<div class="panel-empty">Архив пуст.</div>`;
  const order=["process","project","person","idea","goal"];
  return order.map(type => {
    const group=entries.filter(node=>node.type===type);
    if(!group.length)return "";
    const cards=group.map(node => {
      const linkCount=state.data.links.filter(link=>link.a===node.id||link.b===node.id).length;
      return `<div class="panel-card archive-node-card"><div class="panel-card-head"><div><b>${esc(node.title)}</b><p>${esc(TYPE_LABELS[node.type])} · ${node.archivedAt ? new Date(node.archivedAt).toLocaleDateString("ru-RU") + " · " : ""}связей: ${linkCount}</p></div><div class="archive-node-actions"><button class="panel-chip" data-restore-node="${node.id}">${icon("restore")}<span>Восстановить</span></button><button class="panel-chip danger" data-delete-node="${node.id}" aria-label="Удалить навсегда">${icon("trash")}</button></div></div></div>`;
    }).join("");
    return `<section class="archive-group"><h3>${esc(TYPE_LABELS[type])} <span>${group.length}</span></h3>${cards}</section>`;
  }).join("");
}
function handlePanelClick(event) {
  const toggleNow = event.target.closest("[data-now-toggle]");
  if (toggleNow) {
    const node = nodeById(toggleNow.dataset.nowNode);
    const task = node?.type === "process" ? (node.tasks || []).find(item => item.id === toggleNow.dataset.nowToggle) : null;
    if (!task) return;
    task.done = true;
    task.completedAt = new Date().toISOString();
    updateProcessProgress(node);
    saveData();
    $("#panelBody").innerHTML = todayPanelHtml();
    render();
    navigator.vibrate?.(12);
    toast("Задача выполнена", "Отменить", () => {
      task.done = false;
      task.completedAt = "";
      updateProcessProgress(node);
      saveData();
      if (!$("#sidePanel").classList.contains("hidden")) $("#panelBody").innerHTML = todayPanelHtml();
      render();
    });
    return;
  }
  const open = event.target.closest("[data-panel-open-node]");
  if (open) {
    const node = nodeById(open.dataset.panelOpenNode);
    const taskId = open.dataset.panelOpenTask || "";
    const task = node?.type === "process" ? (node.tasks || []).find(item => item.id === taskId) : null;
    closeOverlays();
    if (node) {
      if (task?.stageId) state.selectedProcessStageId = task.stageId;
      state.selectedId = node.id;
      state.selectedLinkId = null;
      render();
      focusNode(node);
      setTimeout(() => {
        openDetail(node);
        if (taskId) setTimeout(() => highlightProcessTask(taskId), 120);
      }, 350);
    }
  }
  const restore = event.target.closest("[data-restore-node]"); if (restore) { const node = nodeById(restore.dataset.restoreNode); if (node) { pushUndo("Восстановление карточки"); node.archived = false; node.archivedAt = ""; saveData(); $("#panelBody").innerHTML = archivePanelHtml(); render(); toast("Карточка восстановлена", "Отменить", undoLast); } }
  const remove = event.target.closest("[data-delete-node]"); if (remove) { const node = nodeById(remove.dataset.deleteNode); if (node && confirm(`Удалить карточку «${node.title || "Без названия"}» навсегда? Все её связи будут удалены.`)) { permanentlyDeleteNode(node); $("#panelBody").innerHTML = archivePanelHtml(); render(); toast("Карточка удалена навсегда"); } }
}
function highlightProcessTask(taskId) {
  const input = document.querySelector(`[data-task-toggle="${CSS.escape(taskId)}"]`);
  const card = input?.closest(".stage-task-card");
  if (!card) return;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  card.classList.remove("task-focus-flash");
  void card.offsetWidth;
  card.classList.add("task-focus-flash");
  setTimeout(() => card.classList.remove("task-focus-flash"), 1500);
}

function permanentlyDeleteNode(node) {
  if (!node) return;
  const ids = new Set([node.id]);
  if (node.type === "project") state.data.nodes.filter(item => item.type === "process" && item.projectId === node.id).forEach(item => ids.add(item.id));
  const removed = state.data.nodes.filter(item => ids.has(item.id));
  state.data.nodes = state.data.nodes.filter(item => !ids.has(item.id));
  state.data.links = state.data.links.filter(link => !ids.has(link.a) && !ids.has(link.b));
  removed.forEach(item => (item.assets || []).forEach(asset => { releaseObjectUrl(asset.id); deleteAssetRecord(asset.id).catch(() => {}); }));
  if (state.selectedId && ids.has(state.selectedId)) state.selectedId = null;
  if (state.activeNodeId && ids.has(state.activeNodeId)) state.activeNodeId = null;
  state.selectedLinkId = null;
  saveData();
}

/* Overlay and menu */
function showOverlay(id) {
  ["scrim","createMenu","accountMenu","sidePanel"].forEach(name => {
    const el = $("#" + name);
    if (el && el.parentElement !== document.body) document.body.appendChild(el);
  });
  ["createMenu","accountMenu","sidePanel"].forEach(name => {
    const el = $("#" + name);
    el.classList.toggle("hidden", name !== id);
    el.setAttribute("aria-hidden", name === id ? "false" : "true");
  });
  $("#scrim").classList.remove("hidden");
  $("#scrim").setAttribute("aria-hidden", "false");
  $("#createButton").classList.toggle("active", id === "createMenu");
}
function closeOverlays() {
  ["createMenu","accountMenu","sidePanel"].forEach(name => $("#" + name).classList.add("hidden"));
  $("#scrim").classList.add("hidden"); $("#scrim").setAttribute("aria-hidden", "true"); $("#createButton").classList.remove("active");
  $$('.bottom-nav button').forEach(button => button.classList.remove("active"));
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
async function getAllAssetRecords(ownerId = state.userId) {
  const db=await openAssetDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction("assets","readonly").objectStore("assets").getAll();
    req.onsuccess=()=>resolve((req.result||[]).filter(record => !ownerId || (record.ownerId || GUEST_ID) === ownerId));
    req.onerror=()=>reject(req.error);
  });
}
function blobToDataURL(blob) { return new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(reader.error); reader.readAsDataURL(blob); }); }
function dataURLToBlob(dataURL) { const [head,body]=dataURL.split(","); const mime=(head.match(/data:([^;]+)/)||[])[1]||"application/octet-stream"; const bytes=atob(body); const arr=new Uint8Array(bytes.length); for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i); return new Blob([arr],{type:mime}); }
async function exportData() {
  toast("Подготавливаю полную резервную копию…");
  const records=await getAllAssetRecords();
  const assets=[];
  for(const record of records){ assets.push({ ...record, blob: undefined, dataURL: record.blob ? await blobToDataURL(record.blob) : null }); }
  const payload = { app: "BOONWAVE", version: VERSION, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: state.data, assets };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `BOONWAVE_${new Date().toISOString().slice(0,10)}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); closeOverlays(); toast("Резервная копия сохранена");
}
async function importDataFile(event) {
  const file = event.target.files[0]; event.target.value = ""; if (!file) return;
  try {
    if (file.size > 150 * 1024 * 1024) throw new Error("BACKUP_TOO_LARGE");
    const parsed = JSON.parse(await file.text());
    if (parsed.app && parsed.app !== "BOONWAVE") throw new Error("WRONG_APP");
    if (parsed.schemaVersion && Number(parsed.schemaVersion) > SCHEMA_VERSION) throw new Error("NEWER_SCHEMA");
    const data = normalizeData(parsed.data || parsed);
    if (!Array.isArray(data.nodes) || !Array.isArray(data.links)) throw new Error("INVALID_STRUCTURE");
    if (!confirm("Заменить текущую структуру импортированной копией? Текущая версия будет сохранена как локальная резервная копия.")) return;
    saveData({ silent: true });
    state.data = data;
    if (Array.isArray(parsed.assets)) {
      await clearAssetDB(state.userId);
      for (const asset of parsed.assets) {
        if (!asset?.id || !asset.dataURL) continue;
        const { dataURL, ...meta } = asset;
        await putAsset({ ...meta, ownerId: state.userId, blob: dataURLToBlob(dataURL) });
      }
    }
    saveData(); closeOverlays(); render(); fitAll(true); toast(parsed.assets ? "Полная резервная копия восстановлена" : "Структура импортирована без вложений");
  } catch (error) {
    const messages = { BACKUP_TOO_LARGE: "Резервная копия слишком большая", WRONG_APP: "Это не резервная копия BOONWAVE", NEWER_SCHEMA: "Копия создана в более новой версии BOONWAVE", INVALID_STRUCTURE: "Повреждена структура резервной копии" };
    toast(messages[error.message] || "Не удалось прочитать резервную копию");
  }
}
function logout() {
  saveData(); clearSession(); location.reload();
}
async function resetAll() {
  if (!confirm("Удалить все карточки, вложения и локальные настройки?")) return;
  localStorage.removeItem(storageKey()); localStorage.removeItem(backupKey()); await clearAssetDB(); clearSession();
  if ("caches" in window) { const keys = await caches.keys(); await Promise.all(keys.map(key => caches.delete(key))); }
  const registrations = await navigator.serviceWorker?.getRegistrations?.() || []; await Promise.all(registrations.map(registration => registration.unregister()));
  location.href = location.pathname + `?reset=${Date.now()}`;
}

function pushUndo(label) { pushUndoSnapshot(label, clone(state.data), clone(state.camera)); }
function pushUndoSnapshot(label, dataSnapshot, cameraSnapshot = clone(state.camera)) {
  state.undoStack.push({ label, data: clone(dataSnapshot), camera: clone(cameraSnapshot), space: state.space });
  if (state.undoStack.length > 20) state.undoStack.shift();
}
function undoLast() {
  const item = state.undoStack.pop();
  if (!item) return toast("Нет действий для отмены");
  state.data = normalizeData(item.data);
  state.space = item.space || state.space;
  state.camera = clone(item.camera || state.camera);
  state.selectedId = null; state.selectedLinkId = null; state.linkMenuId = null; state.linkDirectionModeId = null;
  saveData(); render(); applyCamera();
  toast(`${item.label}: отменено`);
}
function runToastAction() {
  const action = toast.action;
  toast.action = null;
  if (typeof action === "function") action();
}

function toast(message, actionLabel = "", action = null) {
  const element = $("#toast");
  $("#toastMessage").textContent = message;
  const button = $("#toastAction");
  toast.action = action;
  button.textContent = actionLabel;
  button.classList.toggle("hidden", !actionLabel || typeof action !== "function");
  element.classList.remove("hidden");
  element.classList.remove("attention");
  void element.offsetWidth;
  if (actionLabel && typeof action === "function") element.classList.add("attention");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { element.classList.add("hidden"); element.classList.remove("attention"); toast.action = null; }, action ? 5200 : 2400);
}

function updateBuildInfo() {
  const footer = document.getElementById("buildInfo");
  if (!footer) return;
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
  const mode = standalone ? "PWA" : "Safari";
  const path = location.pathname.replace(/\/$/, "") || "/";
  footer.textContent = `BOONWAVE ${VERSION} · ${mode} · ${location.host}${path}`;
}

/* Service worker */
function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (state.isReloadingForWorker) return;
    if (!$("#app")?.classList.contains("app-ready")) return;
    const reloadKey = `boonwave_sw_reloaded_${VERSION}`;
    if (sessionStorage.getItem(reloadKey)) return;
    sessionStorage.setItem(reloadKey, "1");
    state.isReloadingForWorker = true;
    location.reload();
  });
  navigator.serviceWorker.register(`sw.js?v=${VERSION}`).then(registration => registration.update()).catch(error => console.warn("SW", error));
}

document.addEventListener("DOMContentLoaded", () => {
  updateBuildInfo(); initializeOnboarding(); registerServiceWorker();
});
