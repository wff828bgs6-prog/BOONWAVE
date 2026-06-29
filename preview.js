import store from './state/store.js';
import db from './storage/database.js';
import { createNode } from './domain/node.js';
import { GestureMachine } from './canvas/gesture-machine.js';
import { CardController } from './canvas/card-controller.js';
import { createLinksRenderer } from './canvas/links.js';

const canvas = document.getElementById('canvas');
const world = document.getElementById('world');
const addCardButton = document.getElementById('addCardButton');
const editButton = document.getElementById('editButton');
const deleteButton = document.getElementById('deleteButton');
const connectButton = document.getElementById('connectButton');
const disconnectButton = document.getElementById('disconnectButton');
const hint = document.getElementById('hint');
const createSheet = document.getElementById('createSheet');
const closeSheetButton = document.getElementById('closeSheetButton');
const createCardForm = document.getElementById('createCardForm');
const typeGrid = document.getElementById('typeGrid');
const cardTitle = document.getElementById('cardTitle');
const cardDescription = document.getElementById('cardDescription');
const editSheet = document.getElementById('editSheet');
const editCardForm = document.getElementById('editCardForm');
const closeEditSheetButton = document.getElementById('closeEditSheetButton');
const editCardTitle = document.getElementById('editCardTitle');
const editCardDescription = document.getElementById('editCardDescription');

let selectedNodeType = 'project';
let cameraSaveTimer = null;
let linkMode = null;
let linkSourceId = null;
let editingCardId = null;

const seedCards = {
  project_demo: { id: 'project_demo', type: 'project', title: 'BOONWAVE Core', description: 'Модульное ядро, камера, жесты и SVG-связи.', x: 120, y: 170, width: 230, height: 138 },
  process_demo: { id: 'process_demo', type: 'process', title: 'Рабочий процесс', description: 'Связь берётся из общего store и перерисовывается реактивно.', x: 520, y: 310, width: 230, height: 138 },
  person_demo: { id: 'person_demo', type: 'person', title: 'Человек', description: 'Положение сохраняется после перетаскивания.', x: 330, y: 560, width: 230, height: 138 },
};

const seedLinks = [
  { id: 'link_project_process', sourceId: 'project_demo', targetId: 'process_demo' },
  { id: 'link_person_process', sourceId: 'person_demo', targetId: 'process_demo' },
];

function createCardElement(card) {
  const element = document.createElement('article');
  element.className = 'card';
  element.dataset.cardId = card.id;
  element.innerHTML = '<div class="card-type"></div><h2></h2><p></p>';
  return element;
}

function reconcileCards() {
  const state = store.getState();
  const existing = new Map([...world.querySelectorAll('[data-card-id]')].map((element) => [element.dataset.cardId, element]));

  for (const card of Object.values(state.cards)) {
    let element = existing.get(card.id);
    if (!element) {
      element = createCardElement(card);
      world.append(element);
    }
    existing.delete(card.id);
    element.dataset.selected = String(state.selectedCardId === card.id);
    element.dataset.linkSource = String(linkSourceId === card.id);
    element.style.transform = `translate3d(${card.x}px, ${card.y}px, 0)`;
    element.querySelector('.card-type').textContent = card.type;
    element.querySelector('h2').textContent = card.title;
    element.querySelector('p').textContent = card.description;
  }

  for (const element of existing.values()) element.remove();
}

function applyCamera() {
  const { camera } = store.getState();
  world.style.transform = `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.zoom})`;
}

function isValidCamera(camera) {
  return camera
    && Number.isFinite(camera.x)
    && Number.isFinite(camera.y)
    && Number.isFinite(camera.zoom)
    && camera.zoom > 0;
}

function scheduleCameraSave(camera) {
  clearTimeout(cameraSaveTimer);
  cameraSaveTimer = setTimeout(() => {
    db.saveSetting('camera', camera).catch((error) => {
      console.error('Camera save failed:', error);
    });
  }, 180);
}

function viewportCenterInWorld() {
  const { camera } = store.getState();
  return {
    x: (window.innerWidth / 2 - camera.x) / camera.zoom - 115,
    y: (window.innerHeight / 2 - camera.y) / camera.zoom - 69,
  };
}

function openCreateSheet() {
  createSheet.hidden = false;
  cardTitle.focus();
}

function closeCreateSheet() {
  createSheet.hidden = true;
  createCardForm.reset();
}

function openEditSheet() {
  const { selectedCardId, cards } = store.getState();
  const card = selectedCardId ? cards[selectedCardId] : null;
  if (!card) {
    hint.textContent = 'Сначала выбери карточку';
    return;
  }

  editingCardId = card.id;
  editCardTitle.value = card.title ?? '';
  editCardDescription.value = card.description ?? '';
  editSheet.hidden = false;
  editCardTitle.focus();
}

function closeEditSheet() {
  editSheet.hidden = true;
  editingCardId = null;
  editCardForm.reset();
}

function setLinkMode(mode) {
  linkMode = linkMode === mode ? null : mode;
  linkSourceId = null;
  connectButton.setAttribute('aria-pressed', String(linkMode === 'connect'));
  disconnectButton.setAttribute('aria-pressed', String(linkMode === 'disconnect'));

  if (linkMode === 'connect') {
    hint.textContent = 'Связь: выбери исходную карточку';
  } else if (linkMode === 'disconnect') {
    hint.textContent = 'Удаление связи: выбери первую карточку';
  } else {
    hint.textContent = 'Выбери карточку • ✎ редактировать • ⌫ удалить';
  }

  reconcileCards();
}

function createLinkId(sourceId, targetId) {
  return `link_${sourceId}_${targetId}_${crypto.randomUUID?.() ?? Date.now()}`;
}

async function handleCardTap(card) {
  store.setState({ selectedCardId: card.id });

  if (!linkMode) return;

  if (!linkSourceId) {
    linkSourceId = card.id;
    hint.textContent = linkMode === 'connect'
      ? 'Теперь выбери карточку, к которой идёт связь'
      : 'Теперь выбери вторую карточку связи';
    reconcileCards();
    return;
  }

  if (linkSourceId === card.id) {
    hint.textContent = 'Нужно выбрать другую карточку';
    return;
  }

  const state = store.getState();

  if (linkMode === 'connect') {
    const duplicate = state.links.some((link) => link.sourceId === linkSourceId && link.targetId === card.id);
    if (!duplicate) {
      const link = {
        id: createLinkId(linkSourceId, card.id),
        sourceId: linkSourceId,
        targetId: card.id,
        createdAt: new Date().toISOString(),
      };
      await db.saveLink(link);
      store.setState({ links: [...state.links, link], selectedCardId: card.id });
      hint.textContent = 'Связь создана';
    } else {
      hint.textContent = 'Такая связь уже существует';
    }
  }

  if (linkMode === 'disconnect') {
    const matches = state.links.filter((link) =>
      (link.sourceId === linkSourceId && link.targetId === card.id)
      || (link.sourceId === card.id && link.targetId === linkSourceId));

    if (matches.length > 0) {
      await Promise.all(matches.map((link) => db.deleteLink(link.id)));
      const deletedIds = new Set(matches.map((link) => link.id));
      store.setState({ links: state.links.filter((link) => !deletedIds.has(link.id)), selectedCardId: card.id });
      hint.textContent = 'Связь удалена';
    } else {
      hint.textContent = 'Между этими карточками связи нет';
    }
  }

  linkMode = null;
  linkSourceId = null;
  connectButton.setAttribute('aria-pressed', 'false');
  disconnectButton.setAttribute('aria-pressed', 'false');
  reconcileCards();

  setTimeout(() => {
    if (!linkMode) hint.textContent = 'Выбери карточку • ✎ редактировать • ⌫ удалить';
  }, 1200);
}

async function deleteSelectedCard() {
  const state = store.getState();
  const cardId = state.selectedCardId;
  const card = cardId ? state.cards[cardId] : null;

  if (!card) {
    hint.textContent = 'Сначала выбери карточку';
    return;
  }

  const confirmed = window.confirm(`Удалить карточку «${card.title}» и все её связи?`);
  if (!confirmed) return;

  const relatedLinks = state.links.filter((link) => link.sourceId === cardId || link.targetId === cardId);
  await Promise.all([
    db.deleteCard(cardId),
    ...relatedLinks.map((link) => db.deleteLink(link.id)),
  ]);

  const nextCards = { ...state.cards };
  delete nextCards[cardId];
  const relatedIds = new Set(relatedLinks.map((link) => link.id));

  store.setState({
    cards: nextCards,
    links: state.links.filter((link) => !relatedIds.has(link.id)),
    selectedCardId: null,
  });

  hint.textContent = 'Карточка и её связи удалены';
  setTimeout(() => {
    hint.textContent = 'Выбери карточку • ✎ редактировать • ⌫ удалить';
  }, 1200);
}

async function seedDatabase() {
  await Promise.all([...Object.values(seedCards).map((card) => db.saveCard(card)), ...seedLinks.map((link) => db.saveLink(link))]);
}

async function bootstrap() {
  await db.initDB();
  await db.loadAllData();

  if (Object.keys(store.getState().cards).length === 0) {
    await seedDatabase();
    await db.loadAllData();
  }

  const savedCamera = await db.loadSetting('camera');
  const initialCamera = isValidCamera(savedCamera)
    ? savedCamera
    : { x: 0, y: 0, zoom: 0.82 };

  store.setState({ selectedCardId: 'project_demo', camera: initialCamera });
  reconcileCards();
  applyCamera();

  const gestureMachine = new GestureMachine(canvas);
  const cardController = new CardController(world, {
    onCommit: (card) => db.saveCard({ ...card, updatedAt: new Date().toISOString() }),
    onTap: handleCardTap,
  });
  const linksRenderer = createLinksRenderer(world);

  const unsubscribe = store.subscribe((next, previous) => {
    if (next.cards !== previous.cards || next.selectedCardId !== previous.selectedCardId) reconcileCards();
    if (next.camera !== previous.camera) {
      applyCamera();
      scheduleCameraSave(next.camera);
    }
  });

  canvas.addEventListener('click', (event) => {
    if (!event.target.closest('[data-card-id]')) {
      store.setState({ selectedCardId: null });
      if (linkMode) setLinkMode(null);
    }
  });

  addCardButton.addEventListener('click', openCreateSheet);
  editButton.addEventListener('click', openEditSheet);
  deleteButton.addEventListener('click', deleteSelectedCard);
  connectButton.addEventListener('click', () => setLinkMode('connect'));
  disconnectButton.addEventListener('click', () => setLinkMode('disconnect'));
  closeSheetButton.addEventListener('click', closeCreateSheet);
  closeEditSheetButton.addEventListener('click', closeEditSheet);

  createSheet.addEventListener('click', (event) => {
    if (event.target === createSheet) closeCreateSheet();
  });

  editSheet.addEventListener('click', (event) => {
    if (event.target === editSheet) closeEditSheet();
  });

  typeGrid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-node-type]');
    if (!button) return;
    selectedNodeType = button.dataset.nodeType;
    for (const item of typeGrid.querySelectorAll('[data-node-type]')) {
      item.setAttribute('aria-pressed', String(item === button));
    }
  });

  createCardForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const position = viewportCenterInWorld();
    const node = createNode({
      type: selectedNodeType,
      title: cardTitle.value,
      description: cardDescription.value,
      x: position.x,
      y: position.y,
    });

    await db.saveCard(node);
    const state = store.getState();
    store.setState({ cards: { ...state.cards, [node.id]: node }, selectedCardId: node.id });
    closeCreateSheet();
  });

  editCardForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!editingCardId) return;

    const state = store.getState();
    const card = state.cards[editingCardId];
    if (!card) {
      closeEditSheet();
      return;
    }

    const updatedCard = {
      ...card,
      title: editCardTitle.value.trim() || card.title,
      description: editCardDescription.value.trim(),
      updatedAt: new Date().toISOString(),
    };

    await db.saveCard(updatedCard);
    store.setState({
      cards: { ...state.cards, [updatedCard.id]: updatedCard },
      selectedCardId: updatedCard.id,
    });

    closeEditSheet();
    hint.textContent = 'Изменения сохранены';
    setTimeout(() => {
      hint.textContent = 'Выбери карточку • ✎ редактировать • ⌫ удалить';
    }, 1200);
  });

  window.addEventListener('beforeunload', () => {
    clearTimeout(cameraSaveTimer);
    db.saveSetting('camera', store.getState().camera).catch(() => {});
    unsubscribe();
    linksRenderer.destroy();
    cardController.destroy();
    gestureMachine.destroy();
  }, { once: true });
}

bootstrap().catch((error) => {
  console.error('BOONWAVE preview bootstrap failed:', error);
  hint.textContent = 'Ошибка запуска preview — открой консоль браузера';
});
