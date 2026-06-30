import { TypedWorkspaceController as WorkspaceController } from '../controllers/typed-workspace-controller.js';
import { LinkController } from '../controllers/link-controller.js';
import { TransactionalNodeController as NodeController } from '../controllers/transactional-node-controller.js';
import { ZoomController } from '../controllers/zoom-controller.js';
import { storagePlatform } from '../storage/index.js';

function getRequiredElement(root, id) {
  const element = root.getElementById(id);
  if (!element) throw new Error(`BOONWAVE bootstrap element is missing: #${id}`);
  return element;
}

export async function bootstrapBoonwave({
  canvas,
  world,
  root = document,
  initialSelectedCardId = null,
  onEmpty,
} = {}) {
  if (!(canvas instanceof Element) || !(world instanceof Element)) {
    throw new TypeError('bootstrapBoonwave expects canvas and world elements.');
  }

  const hint = getRequiredElement(root, 'hint');
  const workspace = new WorkspaceController({
    canvas,
    world,
    initialSelectedCardId,
  });
  const linkController = new LinkController({
    linkButton: getRequiredElement(root, 'linkButton'),
    hint,
    onStateChange: () => workspace.renderCards(),
  });

  workspace.setLinkSourceProvider(() => linkController.getSourceId());
  workspace.setCardTapHandler((card) => linkController.handleCardTap(card));
  workspace.setBackgroundTapHandler(() => {
    if (linkController.isActive()) linkController.cancel();
  });

  await workspace.init({ onEmpty });

  const nodeController = new NodeController({
    addButton: getRequiredElement(root, 'addCardButton'),
    editButton: getRequiredElement(root, 'editButton'),
    deleteButton: getRequiredElement(root, 'deleteButton'),
    createSheet: getRequiredElement(root, 'createSheet'),
    closeCreateButton: getRequiredElement(root, 'closeSheetButton'),
    createForm: getRequiredElement(root, 'createCardForm'),
    typeGrid: getRequiredElement(root, 'typeGrid'),
    titleInput: getRequiredElement(root, 'cardTitle'),
    descriptionInput: getRequiredElement(root, 'cardDescription'),
    createTypeFields: getRequiredElement(root, 'createTypeFields'),
    editSheet: getRequiredElement(root, 'editSheet'),
    closeEditButton: getRequiredElement(root, 'closeEditSheetButton'),
    editForm: getRequiredElement(root, 'editCardForm'),
    editTitleInput: getRequiredElement(root, 'editCardTitle'),
    editDescriptionInput: getRequiredElement(root, 'editCardDescription'),
    editTypeFields: getRequiredElement(root, 'editTypeFields'),
    hint,
    getViewportCenter: () => workspace.getViewportCenter(),
  });

  const zoomController = new ZoomController({
    range: getRequiredElement(root, 'zoomRange'),
    zoomOutButton: getRequiredElement(root, 'zoomOutButton'),
    zoomInButton: getRequiredElement(root, 'zoomInButton'),
    getCenter: () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }),
  });

  return {
    workspace,
    linkController,
    nodeController,
    zoomController,
    storagePlatform,
    destroy() {
      zoomController.destroy();
      nodeController.destroy();
      linkController.destroy();
      workspace.destroy();
    },
  };
}

export default bootstrapBoonwave;
