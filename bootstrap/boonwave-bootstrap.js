import store from '../state/store.js';
import { TypedWorkspaceController as WorkspaceController } from '../controllers/typed-workspace-controller.js';
import { LinkController } from '../controllers/link-controller.js';
import { TransactionalNodeController as NodeController } from '../controllers/transactional-node-controller.js';
import { CardDisplayController } from '../controllers/card-display-controller.js';
import { ZoomController } from '../controllers/zoom-controller.js';
import { UtilityRailController } from '../controllers/utility-rail-controller.js';
import { OneHandPanelController } from '../controllers/one-hand-panel-controller.js';
import { storagePlatform } from '../storage/index.js';

function getRequiredElement(root, id) {
  const element = root.getElementById(id);
  if (!element) throw new Error(`BOONWAVE bootstrap element is missing: #${id}`);
  return element;
}

function createDetachedEditTrigger() {
  const button = document.createElement('button');
  button.type = 'button';
  button.hidden = true;
  button.tabIndex = -1;
  button.setAttribute('aria-hidden', 'true');
  return button;
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
  const workspace = new WorkspaceController({ canvas, world, initialSelectedCardId });
  const linkController = new LinkController({
    linkButton: getRequiredElement(root, 'linkButton'),
    hint,
    onStateChange: () => workspace.renderCards(),
  });

  workspace.setLinkSourceProvider(() => linkController.getSourceId());
  workspace.setLinkModeProvider(() => linkController.isActive());
  workspace.setCardTapHandler((card) => linkController.handleCardTap(card));
  workspace.setBackgroundTapHandler(() => {
    if (linkController.isActive()) linkController.cancel();
  });

  await workspace.init({ onEmpty });

  const utilityRailController = new UtilityRailController({
    rail: getRequiredElement(root, 'utilityRail'),
    grip: getRequiredElement(root, 'railGrip'),
    lockButton: getRequiredElement(root, 'cardLockButton'),
    homeButton: getRequiredElement(root, 'homeSelfButton'),
    hint,
    onHome: () => workspace.focusSelfCard(),
  });
  await utilityRailController.init();

  const oneHandPanelController = new OneHandPanelController({
    openButton: getRequiredElement(root, 'moreToolsButton'),
    sheet: getRequiredElement(root, 'toolsSheet'),
    closeButton: getRequiredElement(root, 'closeToolsButton'),
  });

  const nodeController = new NodeController({
    addButton: getRequiredElement(root, 'addCardButton'),
    editButton: createDetachedEditTrigger(),
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

  const displayController = new CardDisplayController({
    root: document.body,
    getCardElement: (cardId) => workspace.getCardElement(cardId),
  });

  const openEditor = (card) => {
    if (!card) return false;
    store.setState({ selectedCardId: card.id });
    nodeController.openEdit();
    return true;
  };
  workspace.setCardEditHandler(openEditor);
  workspace.setCardDisplayHandler((card) => displayController.open(card.id));

  const zoomController = new ZoomController({
    range: getRequiredElement(root, 'zoomRange'),
    zoomOutButton: getRequiredElement(root, 'zoomOutButton'),
    zoomInButton: getRequiredElement(root, 'zoomInButton'),
    getCenter: () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }),
  });

  return {
    workspace,
    linkController,
    utilityRailController,
    oneHandPanelController,
    nodeController,
    displayController,
    zoomController,
    storagePlatform,
    destroy() {
      zoomController.destroy();
      displayController.destroy();
      nodeController.destroy();
      oneHandPanelController.destroy();
      utilityRailController.destroy();
      linkController.destroy();
      workspace.destroy();
    },
  };
}

export default bootstrapBoonwave;
