import store from '../state/store.js';
import { TypedWorkspaceController as WorkspaceController } from '../controllers/typed-workspace-controller.js';
import { LinkController } from '../controllers/link-controller.js';
import { TransactionalNodeController as NodeController } from '../controllers/transactional-node-controller.js';
import { CardDisplayController } from '../controllers/card-display-controller.js';
import { ZoomController } from '../controllers/zoom-controller.js';
import { UtilityRailController } from '../controllers/utility-rail-controller.js';
import { OneHandPanelController } from '../controllers/one-hand-panel-controller.js';
import { ContactsScreenController } from '../controllers/contacts-screen-controller.js';
import { ContactEditorController } from '../controllers/contact-editor-controller.js';
import { updateCardNode } from '../services/node-service.js';
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

function addUnique(list = [], id) {
  return [...new Set([...(Array.isArray(list) ? list : []), id].filter(Boolean))];
}

async function assignContactToTarget(contactId, targetCard) {
  if (!contactId || !targetCard || targetCard.type === 'person') return false;
  const current = targetCard.data ?? {};
  const patch = { contactAssignments: addUnique(current.contactAssignments, contactId) };
  if (targetCard.type === 'process') {
    const participants = Array.isArray(current.participants) ? current.participants : [];
    if (!participants.some((item) => item.contactId === contactId || item.personId === contactId)) {
      patch.participants = [...participants, {
        id: `participant-${Date.now()}`,
        contactId,
        personId: contactId,
        role: 'Участник',
        responsibility: '',
        status: 'active',
        stageIds: [],
      }];
    }
  }
  await updateCardNode(targetCard.id, { data: patch });
  return true;
}

export async function bootstrapBoonwave({ canvas, world, root = document, initialSelectedCardId = null, onEmpty } = {}) {
  if (!(canvas instanceof Element) || !(world instanceof Element)) throw new TypeError('bootstrapBoonwave expects canvas and world elements.');

  const hint = getRequiredElement(root, 'hint');
  const workspace = new WorkspaceController({ canvas, world, initialSelectedCardId });
  const linkController = new LinkController({ linkButton: getRequiredElement(root, 'linkButton'), hint, onStateChange: () => workspace.renderCards() });
  let pendingContactAssignmentId = null;

  workspace.setLinkSourceProvider(() => linkController.getSourceId());
  workspace.setLinkModeProvider(() => linkController.isActive());
  workspace.setCardTapHandler(async (card) => {
    if (pendingContactAssignmentId) {
      const contactId = pendingContactAssignmentId;
      pendingContactAssignmentId = null;
      const assigned = await assignContactToTarget(contactId, card);
      hint.textContent = assigned ? 'Контакт назначен' : 'Выбери проект, процесс, цель или идею';
      workspace.renderCards();
      return assigned;
    }
    return linkController.handleCardTap(card);
  });
  workspace.setBackgroundTapHandler(() => {
    if (pendingContactAssignmentId) {
      pendingContactAssignmentId = null;
      hint.textContent = 'Назначение контакта отменено';
      return;
    }
    if (linkController.isActive()) linkController.cancel();
  });
  await workspace.init({ onEmpty });

  let zoomController = null;
  const utilityRailController = new UtilityRailController({ rail: getRequiredElement(root, 'utilityRail'), lockButton: getRequiredElement(root, 'cardLockButton'), homeButton: getRequiredElement(root, 'homeSelfButton'), positionButtons: root.querySelectorAll('[data-rail-position]'), hint, onHome: () => workspace.focusSelfCard(), onPositionChange: () => requestAnimationFrame(() => zoomController?.refreshLayout()) });
  await utilityRailController.init();

  const oneHandPanelController = new OneHandPanelController({ openButton: getRequiredElement(root, 'moreToolsButton'), sheet: getRequiredElement(root, 'toolsSheet'), closeButton: getRequiredElement(root, 'closeToolsButton') });

  const nodeController = new NodeController({ addButton: getRequiredElement(root, 'addCardButton'), editButton: createDetachedEditTrigger(), deleteButton: getRequiredElement(root, 'deleteButton'), createSheet: getRequiredElement(root, 'createSheet'), closeCreateButton: getRequiredElement(root, 'closeSheetButton'), createForm: getRequiredElement(root, 'createCardForm'), typeGrid: getRequiredElement(root, 'typeGrid'), titleInput: getRequiredElement(root, 'cardTitle'), descriptionInput: getRequiredElement(root, 'cardDescription'), createTypeFields: getRequiredElement(root, 'createTypeFields'), editSheet: getRequiredElement(root, 'editSheet'), closeEditButton: getRequiredElement(root, 'closeEditSheetButton'), editForm: getRequiredElement(root, 'editCardForm'), editTitleInput: getRequiredElement(root, 'editCardTitle'), editDescriptionInput: getRequiredElement(root, 'editCardDescription'), editTypeFields: getRequiredElement(root, 'editTypeFields'), hint, getViewportCenter: () => workspace.getViewportCenter() });

  let contactsScreenController = null;
  const contactEditorController = new ContactEditorController({
    onSaved: (contactId) => {
      contactsScreenController?.open();
      contactsScreenController.selectedContactId = contactId;
      contactsScreenController.render();
    },
  });

  contactsScreenController = new ContactsScreenController({
    openButton: getRequiredElement(root, 'contactsButton'),
    beforeOpen: () => oneHandPanelController.close(),
    createContact: () => { oneHandPanelController.close(); contactEditorController.openCreate(); },
    editContact: (contactId) => { oneHandPanelController.close(); contactEditorController.openEdit(contactId); },
    assignContact: async (contactId, mode = 'library') => {
      oneHandPanelController.close();
      const contact = store.getState().cards[contactId];
      if (!contact) return;
      if (mode === 'canvas') {
        const center = workspace.getViewportCenter();
        await updateCardNode(contactId, { x: center.x, y: center.y, data: { showOnCanvas: true } });
        store.setState({ selectedCardId: contactId });
        hint.textContent = 'Контакт добавлен на рабочий стол';
        workspace.renderCards();
        return;
      }
      pendingContactAssignmentId = contactId;
      hint.textContent = 'Выбери карточку, куда назначить контакт';
      workspace.renderCards();
    },
    deleteContact: async (contactId) => {
      oneHandPanelController.close();
      store.setState({ selectedCardId: contactId });
      await nodeController.deleteSelected();
      return !store.getState().cards[contactId];
    },
  });

  const displayController = new CardDisplayController({ root: document.body, getCardElement: (cardId) => workspace.getCardElement(cardId) });
  const openEditor = (card) => {
    if (!card) return false;
    if (card.type === 'person') contactEditorController.openEdit(card.id);
    else { store.setState({ selectedCardId: card.id }); nodeController.openEdit(); }
    return true;
  };
  workspace.setCardEditHandler(openEditor);
  workspace.setCardDisplayHandler((card) => displayController.open(card.id));

  zoomController = new ZoomController({ range: getRequiredElement(root, 'zoomRange'), getCenter: () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }) });
  zoomController.refreshLayout();

  return { workspace, linkController, utilityRailController, oneHandPanelController, contactsScreenController, contactEditorController, nodeController, displayController, zoomController, storagePlatform, destroy() { zoomController.destroy(); displayController.destroy(); contactsScreenController.destroy(); contactEditorController.destroy(); nodeController.destroy(); oneHandPanelController.destroy(); utilityRailController.destroy(); linkController.destroy(); workspace.destroy(); } };
}

export default bootstrapBoonwave;
