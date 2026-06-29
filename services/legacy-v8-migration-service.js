import storage from '../storage/index.js';
import { normalizeNode, NODE_TYPES } from '../domain/node.js';
import { normalizeMediaRecord, inferMediaKind } from '../domain/media-record.js';

export const LEGACY_V8_MIGRATION_KEY = 'legacy-v8-migration';
const LEGACY_SESSION_KEY = 'bw8_session';
const LEGACY_DATA_PREFIX = 'bw8_data_';
const LEGACY_MEDIA_DB = 'boonwave-media-v8';
const LEGACY_MEDIA_STORE = 'files';
const LEVEL_SIZES = Object.freeze({
  1: { width: 180, height: 122, mode: 'compact' },
  2: { width: 292, height: 206, mode: 'standard' },
  3: { width: 392, height: 286, mode: 'full' },
});

function toIso(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function safeClone(value) {
  if (value === undefined) return undefined;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function normalizePriority(value) {
  const key = String(value ?? '').trim().toLowerCase();
  if (['high', 'высокий'].includes(key)) return 'high';
  if (['low', 'низкий'].includes(key)) return 'low';
  return 'medium';
}

function normalizeProgress(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, Math.round(number))) : 0;
}

function getLegacyStorageKeys(localStorageLike) {
  const keys = [];
  for (let index = 0; index < Number(localStorageLike?.length ?? 0); index += 1) {
    const key = localStorageLike.key(index);
    if (key?.startsWith(LEGACY_DATA_PREFIX)) keys.push(key);
  }
  return keys;
}

function parseSnapshot(localStorageLike, key) {
  try {
    const value = JSON.parse(localStorageLike.getItem(key) ?? 'null');
    if (!value || !Array.isArray(value.nodes)) return null;
    return { key, userId: key.slice(LEGACY_DATA_PREFIX.length), data: value };
  } catch {
    return null;
  }
}

export function findLegacyV8Snapshot(localStorageLike = globalThis.localStorage) {
  if (!localStorageLike) return null;
  const activeUserId = localStorageLike.getItem(LEGACY_SESSION_KEY);
  if (activeUserId) {
    const active = parseSnapshot(localStorageLike, `${LEGACY_DATA_PREFIX}${activeUserId}`);
    if (active) return active;
  }

  return getLegacyStorageKeys(localStorageLike)
    .map((key) => parseSnapshot(localStorageLike, key))
    .filter(Boolean)
    .sort((first, second) => Number(second.data.updatedAt ?? 0) - Number(first.data.updatedAt ?? 0))[0] ?? null;
}

function getLegacyAssetId(raw) {
  if (typeof raw === 'string') return raw;
  return raw?.id ?? raw?.mediaId ?? raw?.fileId ?? raw?.assetId ?? raw?.key ?? null;
}

function getLegacyAssets(node) {
  const candidates = Array.isArray(node.assets) ? [...node.assets] : [];
  for (const key of ['coverId', 'photoId', 'avatarId', 'imageId']) {
    if (node[key]) candidates.push({ id: node[key], name: `${key}.jpg`, type: 'image/jpeg' });
  }
  return candidates.filter((asset) => getLegacyAssetId(asset));
}

function makeMediaId(legacyId) {
  const safeId = String(legacyId).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `media_v8_${safeId}`;
}

function describeAsset(raw) {
  const legacyId = String(getLegacyAssetId(raw));
  const name = String(
    typeof raw === 'object'
      ? (raw.name ?? raw.fileName ?? raw.title ?? `Файл ${legacyId}`)
      : `Файл ${legacyId}`,
  );
  const mimeType = String(
    typeof raw === 'object'
      ? (raw.mimeType ?? raw.type ?? raw.fileType ?? '')
      : '',
  );
  return {
    legacyId,
    mediaId: makeMediaId(legacyId),
    name,
    mimeType,
    size: Number(typeof raw === 'object' ? raw.size : 0) || 0,
    kind: inferMediaKind(typeof raw === 'object' ? raw.kind : undefined, mimeType),
  };
}

function createLegacyData(node, mediaBySlot) {
  const legacy = {
    source: 'BOONWAVE v8',
    space: node.space ?? 'work',
    archived: Boolean(node.archived),
    locked: Boolean(node.locked),
    level: Number(node.level ?? 2),
  };
  const common = { legacyV8: legacy };

  if (node.type === 'project') {
    return {
      ...common,
      priority: normalizePriority(node.priority),
      status: node.status ?? 'preparation',
      address: node.address ?? '',
      itemCount: node.itemCount ?? null,
      contractDate: node.contractDate ?? node.date ?? null,
      budget: node.budget ?? null,
      expectedProfit: node.expectedProfit ?? node.profit ?? null,
      advance: safeClone(node.advance) ?? { amount: node.advanceAmount ?? null, date: node.advanceDate ?? null },
      balance: safeClone(node.balance) ?? { amount: node.balanceAmount ?? null, date: node.balanceDate ?? null },
      primaryContact: safeClone(node.primaryContact) ?? {
        name: node.contactName ?? '', phone: node.phone ?? '', email: node.email ?? '',
      },
      preliminaryInfo: node.preliminaryInfo ?? node.notes ?? '',
      coverMediaId: mediaBySlot.coverMediaId ?? null,
      images: mediaBySlot.images ?? [],
      documents: mediaBySlot.documents ?? [],
      files: mediaBySlot.files ?? [],
    };
  }

  if (node.type === 'process') {
    return {
      ...common,
      status: node.status ?? 'planned',
      priority: normalizePriority(node.priority),
      progress: normalizeProgress(node.progress),
      startDate: node.startDate ?? null,
      dueDate: node.dueDate ?? node.targetDate ?? null,
      tasks: safeClone(node.tasks) ?? [],
      notes: node.notes ?? '',
      attachments: mediaBySlot.attachments ?? [],
    };
  }

  if (node.type === 'person') {
    return {
      ...common,
      fullName: node.fullName ?? node.name ?? node.title ?? '',
      phone: node.phone ?? '',
      email: node.email ?? '',
      organization: node.organization ?? '',
      role: node.role ?? '',
      notes: node.notes ?? '',
      avatarMediaId: mediaBySlot.avatarMediaId ?? null,
      attachments: mediaBySlot.attachments ?? [],
      messengers: safeClone(node.messengers) ?? [],
      websites: safeClone(node.websites) ?? [],
    };
  }

  if (node.type === 'idea') {
    return {
      ...common,
      status: node.status ?? 'draft',
      category: node.category ?? '',
      impact: node.impact ?? '',
      notes: node.notes ?? '',
      coverMediaId: mediaBySlot.coverMediaId ?? null,
      attachments: mediaBySlot.attachments ?? [],
    };
  }

  return {
    ...common,
    status: node.status ?? 'active',
    priority: normalizePriority(node.priority),
    targetDate: node.targetDate ?? node.dueDate ?? null,
    progress: normalizeProgress(node.progress),
    metric: safeClone(node.metric) ?? { name: '', target: null, current: null, unit: '' },
    notes: node.notes ?? '',
    coverMediaId: mediaBySlot.coverMediaId ?? null,
    attachments: mediaBySlot.attachments ?? [],
  };
}

function assignMediaSlots(node, assets) {
  const result = { images: [], documents: [], files: [], attachments: [] };
  let primaryImageAssigned = false;

  for (const asset of assets) {
    if (asset.kind === 'image' && !primaryImageAssigned && ['project', 'person', 'idea', 'goal'].includes(node.type)) {
      if (node.type === 'person') result.avatarMediaId = asset.mediaId;
      else result.coverMediaId = asset.mediaId;
      primaryImageAssigned = true;
      continue;
    }

    if (node.type === 'project') {
      if (asset.kind === 'image') result.images.push(asset.mediaId);
      else if (asset.kind === 'document') result.documents.push(asset.mediaId);
      else result.files.push(asset.mediaId);
    } else {
      result.attachments.push(asset.mediaId);
    }
  }

  return result;
}

export function convertLegacyV8Snapshot(snapshot, resolvedAssets = new Map()) {
  const sourceNodes = Array.isArray(snapshot?.data?.nodes) ? snapshot.data.nodes : [];
  const validNodes = sourceNodes.filter((node) => NODE_TYPES.includes(node?.type) && node?.id);
  const validIds = new Set(validNodes.map((node) => String(node.id)));
  const assetOwners = new Map();

  for (const node of validNodes) {
    for (const rawAsset of getLegacyAssets(node)) {
      const asset = describeAsset(rawAsset);
      if (!resolvedAssets.has(asset.legacyId)) continue;
      const owners = assetOwners.get(asset.legacyId) ?? new Set();
      owners.add(String(node.id));
      assetOwners.set(asset.legacyId, owners);
    }
  }

  const cards = [];
  const mediaEntriesById = new Map();

  for (const source of validNodes) {
    const level = LEVEL_SIZES[source.level] ?? LEVEL_SIZES[2];
    const assets = getLegacyAssets(source)
      .map(describeAsset)
      .filter((asset) => resolvedAssets.has(asset.legacyId));
    const mediaBySlot = assignMediaSlots(source, assets);
    const card = normalizeNode({
      id: String(source.id),
      type: source.type,
      title: source.title ?? source.name ?? '',
      description: source.description ?? source.preliminaryInfo ?? '',
      x: source.x ?? 0,
      y: source.y ?? 0,
      width: source.width ?? source.w ?? level.width,
      height: source.height ?? source.h ?? level.height,
      data: createLegacyData(source, mediaBySlot),
      view: { mode: level.mode, compactLabel: source.compactLabel ?? '' },
      createdAt: toIso(source.createdAt),
      updatedAt: toIso(source.updatedAt),
    });
    cards.push(card);

    for (const asset of assets) {
      if (mediaEntriesById.has(asset.mediaId)) continue;
      const blob = resolvedAssets.get(asset.legacyId);
      const record = normalizeMediaRecord({
        id: asset.mediaId,
        name: asset.name,
        mimeType: asset.mimeType || blob?.type || '',
        size: asset.size || blob?.size || 0,
        kind: asset.kind,
        ownerIds: [...(assetOwners.get(asset.legacyId) ?? [])],
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        legacyV8Id: asset.legacyId,
      });
      mediaEntriesById.set(asset.mediaId, { record, blob });
    }
  }

  const links = (Array.isArray(snapshot?.data?.links) ? snapshot.data.links : [])
    .map((link, index) => {
      const sourceId = String(link.sourceId ?? link.from ?? '');
      const targetId = String(link.targetId ?? link.to ?? '');
      if (!validIds.has(sourceId) || !validIds.has(targetId) || sourceId === targetId) return null;
      return {
        id: String(link.id ?? `link_v8_${index}_${sourceId}_${targetId}`),
        sourceId,
        targetId,
        createdAt: toIso(link.createdAt) ?? new Date().toISOString(),
      };
    })
    .filter(Boolean);

  return { cards, links, mediaEntries: [...mediaEntriesById.values()] };
}

async function openLegacyMediaDatabase(indexedDBFactory = globalThis.indexedDB) {
  if (!indexedDBFactory) return null;
  return new Promise((resolve) => {
    const request = indexedDBFactory.open(LEGACY_MEDIA_DB);
    request.onupgradeneeded = () => request.transaction?.abort();
    request.onsuccess = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(LEGACY_MEDIA_STORE)) {
        database.close();
        resolve(null);
        return;
      }
      resolve(database);
    };
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

async function loadLegacyBlobs(snapshot, indexedDBFactory) {
  const ids = [...new Set(
    (snapshot?.data?.nodes ?? []).flatMap((node) => getLegacyAssets(node).map((asset) => String(getLegacyAssetId(asset)))),
  )];
  if (ids.length === 0) return new Map();
  const database = await openLegacyMediaDatabase(indexedDBFactory);
  if (!database) return new Map();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(LEGACY_MEDIA_STORE, 'readonly');
    const objectStore = transaction.objectStore(LEGACY_MEDIA_STORE);
    const blobs = new Map();
    for (const id of ids) {
      const request = objectStore.get(id);
      request.onsuccess = () => {
        if (request.result instanceof Blob) blobs.set(id, request.result);
      };
    }
    transaction.oncomplete = () => {
      database.close();
      resolve(blobs);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error('Legacy media read transaction aborted.'));
    };
  });
}

export async function migrateLegacyV8Workspace(options = {}) {
  const storageAdapter = options.storageAdapter ?? storage;
  const localStorageLike = options.localStorageLike ?? globalThis.localStorage;
  const indexedDBFactory = options.indexedDBFactory ?? globalThis.indexedDB;
  const current = await storageAdapter.loadWorkspace();
  if (Object.keys(current.cards ?? {}).length > 0) return { status: 'skipped-non-empty' };
  if (await storageAdapter.loadSetting(LEGACY_V8_MIGRATION_KEY)) return { status: 'already-migrated' };

  const snapshot = findLegacyV8Snapshot(localStorageLike);
  if (!snapshot || snapshot.data.nodes.length === 0) return { status: 'no-legacy-data' };

  const resolvedAssets = options.resolvedAssets ?? await loadLegacyBlobs(snapshot, indexedDBFactory);
  const bundle = convertLegacyV8Snapshot(snapshot, resolvedAssets);
  if (bundle.cards.length === 0) return { status: 'no-compatible-cards' };

  const migration = {
    source: 'BOONWAVE v8',
    sourceKey: snapshot.key,
    sourceUserId: snapshot.userId,
    cards: bundle.cards.length,
    links: bundle.links.length,
    media: bundle.mediaEntries.length,
    migratedAt: new Date().toISOString(),
  };

  await storageAdapter.importWorkspaceBundle({
    ...bundle,
    marker: { key: LEGACY_V8_MIGRATION_KEY, value: migration },
  });

  return { status: 'migrated', ...migration };
}

export default migrateLegacyV8Workspace;
