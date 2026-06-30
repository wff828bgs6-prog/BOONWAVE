import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

test('production shell exposes home and card-lock controls in one side rail', () => {
  const index = read('index.html');
  assert.match(index, /id="utilityRail"/);
  assert.match(index, /id="homeSelfButton"/);
  assert.match(index, /id="cardLockButton"/);
  assert.match(index, /aria-pressed="false"/);
});

test('utility rail mirrors as a whole and persists handedness', () => {
  const controller = read('controllers/utility-rail-controller.js');
  assert.match(controller, /utilityRailSide/);
  assert.match(controller, /LONG_PRESS_MS = 520/);
  assert.match(controller, /nextSide = this\.rail\.dataset\.side === 'left' \? 'right' : 'left'/);
  assert.match(controller, /storage\.saveSetting/);
  assert.match(controller, /storage\.loadSetting/);
});

test('card lock only blocks card coordinates and allows canvas panning from cards', () => {
  const cardController = read('canvas/card-controller.js');
  const gestureMachine = read('canvas/gesture-machine.js');
  const workspace = read('controllers/workspace-controller.js');

  assert.match(cardController, /canMoveCard/);
  assert.match(cardController, /if \(!drag\.movable\) return;/);
  assert.match(gestureMachine, /allowPanFromInteractive/);
  assert.match(workspace, /allowPanFromInteractive: \(\) => Boolean\(store\.getState\(\)\.cardsLocked\)/);
  assert.match(workspace, /canMoveCard: \(\) => !store\.getState\(\)\.cardsLocked/);
});

test('home control cancels inertia and animates to the Я Есмь card', () => {
  const workspace = read('controllers/workspace-controller.js');
  const bootstrap = read('bootstrap/boonwave-bootstrap.js');
  assert.match(workspace, /focusSelfCard\(\)/);
  assert.match(workspace, /getPrimarySelfNode/);
  assert.match(workspace, /gestureMachine\?\.cancelInteraction\(\)/);
  assert.match(workspace, /interpolateCamera/);
  assert.match(bootstrap, /onHome: \(\) => workspace\.focusSelfCard\(\)/);
});
