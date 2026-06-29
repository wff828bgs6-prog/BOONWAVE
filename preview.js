import store from './state/store.js';
import db from './storage/database.js';
import { GestureMachine } from './canvas/gesture-machine.js';
import { CardController } from './canvas/card-controller.js';
import { createLinksRenderer } from './canvas/links.js';

const canvas = document.getElementById('canvas');
const world = document.getElementById('world');

const seedCards = {
  project_demo: {
    id: 'project_demo',
    type: 'project',
    title: 'BOONWAVE Core',
    description: 'Модульное ядро, камера, жесты и SVG-связи.',
    x: 120,
    y: 170,
    width: 230,
    height: 138,
  },
  process_demo: {
    id: 'process_demo',
    type: 'process',
    title: 'Рабочий процесс',
    description: 'Связь берётся из общего store и перерисовывается реактивно.',
    x: 520,
    y: 310,
    width: 230,
    height: 138,
  },
  person_demo: {
    id: 'person_demo',
    type: 'person',
    title: 'Человек',
    description: 'Положение сохраняется после перетаскивания.',
    x: 330,
    y: 560,
    width: 230,
    height: 138,
  },
};

const seedLinks = [
  { id: 'link_project_process', sourceId: 'project_demo', targetId: 'process_demo' },
  { id: 'link_person_process', sourceId: 'person_demo', targetId: 'process_demo' },
];

function createCardElement(card) {
  const element = document.createElement('article');
  element.className = 'card';
  element.dataset.cardId = card.id;
  element.innerHTML = `
    <div class="card-type"></div>
    <h2></h2>
    <p></p>
  `;
  return element;
}

function reconcileCards() {
  const state = store.getState();
  const existing = new Map(
    [...world.querySelectorAll('[data-card-id]')].map((element) => [element.dataset.cardId, element]),
  );

  for (const card of Object.values(state.cards)) {
    let element = existing.get(card.id);
    if (!element) {
      element = createCardElement(card);
      world.append(element);
    }

    existing.delete(card.id);
    element.dataset.selected = String(state.selectedCardId === card.id);
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

async function seedDatabase() {
  await Promise.all([
    ...Object.values(seedCards).map((card) => db.saveCard(card)),
    ...seedLinks.map((link) => db.saveLink(link)),
  ]);
}

async function bootstrap() {
  await db.initDB();
  await db.loadAllData();

  if (Object.keys(store.getState().cards).length === 0) {
    await seedDatabase();
    await db.loadAllData();
  }

  store.setState({
    selectedCardId: 'project_demo',
    camera: { x: 0, y: 0, zoom: 0.82 },
  });

  reconcileCards();
  applyCamera();

  const gestureMachine = new GestureMachine(canvas);
  const cardController = new CardController(world, { onCommit: (card) => db.saveCard(card) });
  const linksRenderer = createLinksRenderer(world);

  const unsubscribe = store.subscribe((next, previous) => {
    if (next.cards !== previous.cards || next.selectedCardId !== previous.selectedCardId) {
      reconcileCards();
    }

    if (next.camera !== previous.camera) {
      applyCamera();
    }
  });

  canvas.addEventListener('click', (event) => {
    if (!event.target.closest('[data-card-id]')) {
      store.setState({ selectedCardId: null });
    }
  });

  window.addEventListener('beforeunload', () => {
    unsubscribe();
    linksRenderer.destroy();
    cardController.destroy();
    gestureMachine.destroy();
  }, { once: true });
}

bootstrap().catch((error) => {
  console.error('BOONWAVE preview bootstrap failed:', error);
  document.querySelector('.hint').textContent = 'Ошибка запуска preview — открой консоль браузера';
});
