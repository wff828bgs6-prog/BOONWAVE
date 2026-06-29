import storage from './storage/index.js';
import { WorkspaceController } from './controllers/workspace-controller.js';
import { LinkController } from './controllers/link-controller.js';
import { NodeController } from './controllers/node-controller.js';

const seedCards = {
  project_demo: { id: 'project_demo', type: 'project', title: 'BOONWAVE Core', description: 'Модульное ядро, камера, жесты и SVG-связи.', x: 120, y: 170, width: 230, height: 138 },
  process_demo: { id: 'process_demo', type: 'process', title: 'Рабочий процесс', description: 'Связь берётся из общего store и перерисовывается реактивно.', x: 520, y: 310, width: 230, height: 138 },
  person_demo: { id: 'person_demo', type: 'person', title: 'Человек', description: 'Положение сохраняется после перетаскивания.', x: 330, y: 560, width: 230, height: 138 },
};

const seedLinks = [
  { id: 'link_project_process', sourceId: 'project_demo', targetId: 'process_demo' },
  { id: 'link_person_process', sourceId: 'person_demo', targetId: 'process_demo' },
];

async function seedPreview() {
  await Promise.all([
    ...Object.values(seedCards).map((card) => storage.saveCard(card)),
    ...seedLinks.map((link) => storage.saveLink(link)),
  ]);
}

async function bootstrapPreview() {
  const canvas = document.getElementById('canvas');
  const world = document.getElementById('world');
  const hint = document.getElementById('hint');

  const workspaceController = new WorkspaceController({
    canvas,
    world,
    initialSelectedCardId: 'project_demo',
  });

  const linkController = new LinkController({
    connectButton: document.getElementById('connectButton'),
    disconnectButton: document.getElementById('disconnectButton'),
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
    editSheet: document.getElementById('editSheet'),
    closeEditButton: document.getElementById('closeEditSheetButton'),
    editForm: document.getElementById('editCardForm'),
    editTitleInput: document.getElementById('editCardTitle'),
    editDescriptionInput: document.getElementById('editCardDescription'),
    hint,
    getViewportCenter: () => workspaceController.getViewportCenter(),
  });

  window.addEventListener('beforeunload', () => {
    nodeController.destroy();
    linkController.destroy();
    workspaceController.destroy();
  }, { once: true });
}

bootstrapPreview().catch((error) => {
  console.error('BOONWAVE preview bootstrap failed:', error);
  document.getElementById('hint').textContent = 'Ошибка запуска preview — открой консоль браузера';
});
