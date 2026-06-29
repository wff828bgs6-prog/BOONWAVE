import { WorkspaceController } from '../controllers/workspace-controller.js';
import { storagePlatform } from '../storage/index.js';

export async function bootstrapBoonwave({
  canvas,
  world,
  initialSelectedCardId = null,
  onEmpty,
} = {}) {
  if (!(canvas instanceof Element) || !(world instanceof Element)) {
    throw new TypeError('bootstrapBoonwave expects canvas and world elements.');
  }

  const workspace = new WorkspaceController({
    canvas,
    world,
    initialSelectedCardId,
  });

  await workspace.init({ onEmpty });

  return {
    workspace,
    storagePlatform,
    destroy() {
      workspace.destroy();
    },
  };
}

export default bootstrapBoonwave;
