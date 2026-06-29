import store from './state/store.js';
import { GestureMachine } from './canvas/gesture-machine.js';
import { createLinksRenderer } from './canvas/links.js';

const canvas = document.getElementById('canvas');
const world = document.getElementById('world');

const cards = {
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
    description: 'Выбранная карточка подсвечивает связанные линии.',
    x: 330,
    y: 560,
    width: 230,
    height: 138,
  },
};

const links = [
  { id: 'link_project_process', sourceId: 'project_demo', targetId: 'process_demo' },
  { id: 'link_person_process', sourceId: 'person_demo', targetId: 'process_demo' },
];

function renderCards() {
  const state = store.getState();
  const fragment = document.createDocumentFragment();

  for (const card of Object.values(state.cards)) {
    const element = document.createElement('article');
    element.className = 'card';
    element.dataset.cardId = card.id;
    element.dataset.selected = String(state.selectedCardId === card.id);
    element.style.left = `${card.x}px`;
    element.style.top = `${card.y}px`;
    element.innerHTML = `
      <div class="card-type">${card.type}</div>
      <h2>${card.title}</h2>
      <p>${card.description}</p>
    `;

    element.addEventListener('click', (event) => {
      event.stopPropagation();
      store.setState({ selectedCardId: card.id });
    });

    fragment.append(element);
  }

  const linkLayer = world.querySelector('#boonwave-links-layer');
  world.replaceChildren();
  if (linkLayer) world.append(linkLayer);
  world.append(fragment);
}

function applyCamera() {
  const { camera } = store.getState();
  world.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`;
}

store.setState({
  cards,
  links,
  selectedCardId: 'project_demo',
  camera: { x: 0, y: 0, zoom: 0.82 },
});

renderCards();
applyCamera();

const gestureMachine = new GestureMachine(canvas);
const linksRenderer = createLinksRenderer(world);

const unsubscribe = store.subscribe((next, previous) => {
  if (next.cards !== previous.cards || next.selectedCardId !== previous.selectedCardId) {
    renderCards();
  }

  if (next.camera !== previous.camera) {
    applyCamera();
  }
});

canvas.addEventListener('click', () => {
  store.setState({ selectedCardId: null });
});

window.addEventListener('beforeunload', () => {
  unsubscribe();
  linksRenderer.destroy();
  gestureMachine.destroy();
}, { once: true });
