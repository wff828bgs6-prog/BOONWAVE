import storage from './storage/index.js';
import { createNode } from './domain/node.js';
import { WorkspaceController } from './controllers/workspace-controller.js';
import { LinkController } from './controllers/link-controller.js';
import { NodeController } from './controllers/node-controller.js';
import { ZoomController } from './controllers/zoom-controller.js';

const seedCards = [
  createNode({ type: 'project', title: 'BOONWAVE Core', description: 'Модульное ядро, камера, жесты и SVG-связи.', x: 120, y: 170, data: { status: 'preparation', address: 'Core Stage A/B' } }),
  createNode({ type: 'process', title: 'Рабочий процесс', description: 'Связь берётся из общего store и перерисовывается реактивно.', x: 520, y: 310, data: { status: 'in_progress', progress: 62 } }),
  createNode({ type: 'person', title: 'Человек', description: 'Положение сохраняется после перетаскивания.', x: 330, y: 560, data: { role: 'Арт-инженер', organization: 'BOONWAVE' } }),
  createNode({ type: 'idea', title: 'Живой свет', description: 'Идея будущей кинетической системы.', x: 810, y: 170, data: { status: 'draft', category: 'Kinetic Light' } }),
  createNode({ type: 'goal', title: 'Production build', description: 'Единая архитектура для Web и iOS.', x: 820, y: 560, data: { status: 'active', progress: 35 } }),
];

seedCards[0].id = 'project_demo';
seedCards[1].id = 'process_demo';
seedCards[2].id = 'person_demo';
seedCards[3].id = 'idea_demo';
seedCards[4].id = 'goal_demo';

const seedLinks = [
  { id: 'link_project_process', sourceId: 'project_demo', targetId: 'process_demo' },
  { id: 'link_person_process', sourceId: 'person_demo', targetId: 'process_demo' },
  { id: 'link_idea_project', sourceId: 'idea_demo', targetId: 'project_demo' },
  { id: 'link_project_goal', sourceId: 'project_demo', targetId: 'goal_demo' },
];

async function seedPreview() {
  await Promise.all([
    ...seedCards.map((card) => storage.saveCard(card)),
    ...seedLinks.map((link) => storage.saveLink(link)),
  ]);
}

async function bootstrapPreview() {
  const canvas = document.getElementById('canvas');
  const world = document.getElementById('world');
  const hint = document.getElementById('hint');

  const workspaceController = new WorkspaceController({ canvas, world, initialSelectedCardId: 'project_demo' });
  const linkController = new LinkController({
    linkButton: document.getElementById('linkButton'),
    hint,
    onStateChange: () => workspaceController.renderCards(),
  });

  workspaceController.setLinkSourceProvider(() => linkController.getSourceId());
  workspaceController.setCardTapHandler((card) => linkController.handleCardTap(card));
  workspaceController.setBackgroundTapHandler(() => {
    if (linkController.isActive()) linkController.cancel();
  });

  await workspaceController.init({ onEmpty: seedPreview });

  const nodeController = new NodeController({
    addButton: document.getElementById('addCardButton'),
    editButton: document.getElementById('editButton'),
    deleteButton: document.getElementById('deleteButton'),
    createSheet: document.getElementById('createSheet'),
    closeCreateButton: document.getElementById('closeSheetButton'),
    createForm: document.getElementById('createCardForm'),
    typeGrid: document.getElementById('typeGrid'),
    titleInput: document.getElementById('cardTitle'),
    descriptionInput: document.getElementById('cardDescription'),
    createTypeFields: document.getElementById('createTypeFields'),
    editSheet: document.getElementById('editSheet'),
    closeEditButton: document.getElementById('closeEditSheetButton'),
    editForm: document.getElementById('editCardForm'),
    editTitleInput: document.getElementById('editCardTitle'),
    editDescriptionInput: document.getElementById('editCardDescription'),
    editTypeFields: document.getElementById('editTypeFields'),
    hint,
    getViewportCenter: () => workspaceController.getViewportCenter(),
  });

  const zoomController = new ZoomController({
    range: document.getElementById('zoomRange'),
    zoomOutButton: document.getElementById('zoomOutButton'),
    zoomInButton: document.getElementById('zoomInButton'),
    getCenter: () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }),
  });

  window.addEventListener('beforeunload', () => {
    zoomController.destroy();
    nodeController.destroy();
    linkController.destroy();
    workspaceController.destroy();
  }, { once: true });
}

bootstrapPreview().catch((error) => {
  console.error('BOONWAVE preview bootstrap failed:', error);
  document.getElementById('hint').textContent = 'Ошибка запуска preview — открой консоль браузера';
});
