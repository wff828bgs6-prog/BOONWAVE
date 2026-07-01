import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

test('production shell exposes one complete one-hand rail', () => {
  const index = read('index.html');
  assert.match(index, /class="one-hand-rail"/);
  assert.match(index, /id="railGrip"/);
  assert.match(index, /id="homeSelfButton"/);
  assert.match(index, /id="cardLockButton"/);
  assert.match(index, /id="redoButton"/);
  assert.match(index, /id="zoomRange"/);
  assert.match(index, /id="undoButton"/);
  assert.match(index, /id="addCardButton"/);
  assert.match(index, /id="moreToolsButton"/);
  assert.doesNotMatch(index, /class="mobile-dock"/);
});

test('handedness uses a dedicated grip instead of functional buttons', () => {
  const controller = read('controllers/utility-rail-controller.js');
  assert.match(controller, /SIDE_SETTING_KEY = 'utilityRailSide'/);
  assert.match(controller, /HOLD_MS = 480/);
  assert.match(controller, /SWIPE_THRESHOLD_PX = 28/);
  assert.match(controller, /this\.grip\.addEventListener\('pointerdown'/);
  assert.match(controller, /this\.grip\.addEventListener\('pointermove'/);
  assert.match(controller, /this\.setSide\(delta < 0 \? 'left' : 'right'/);
  assert.doesNotMatch(controller, /suppressedButton|SUPPRESS_CLICK_MS/);
});

test('card lock state is loaded and persisted transactionally', () => {
  const controller = read('controllers/utility-rail-controller.js');
  assert.match(controller, /LOCK_SETTING_KEY = 'cardsLocked'/);
  assert.match(controller, /storage\.loadSetting\(LOCK_SETTING_KEY\)/);
  assert.match(controller, /storage\.saveSetting\(LOCK_SETTING_KEY, nextLocked\)/);
  assert.match(controller, /store\.setState\(\{ cardsLocked: savedLock === true \}\)/);
  assert.match(controller, /store\.setState\(\{ cardsLocked: previousLocked \}\)/);
});

test('locked cards keep passive hold and double-tap tracking while canvas pans', () => {
  const cardController = read('canvas/card-controller.js');
  const gestureMachine = read('canvas/gesture-machine.js');
  const workspace = read('controllers/workspace-controller.js');

  assert.match(cardController, /captured: movable/);
  assert.match(cardController, /if \(!drag\.movable\) return;/);
  assert.match(cardController, /resetInteraction\(\{ setIdle: active\.movable \}\)/);
  assert.match(gestureMachine, /allowPanFromInteractive/);
  assert.match(workspace, /allowPanFromInteractive:\(\)=>Boolean\(store\.getState\(\)\.cardsLocked\)/);
  assert.match(workspace, /canMoveCard:\(\)=>!store\.getState\(\)\.cardsLocked/);
});

test('closed lock means locked and open lock means movable', () => {
  const styles = read('styles/one-hand-rail.css');
  assert.match(styles, /#cardLockButton \.lock-closed\{display:none\}/);
  assert.match(styles, /#cardLockButton \.lock-open\{display:block\}/);
  assert.match(styles, /#cardLockButton\[aria-pressed="true"\] \.lock-closed\{display:block\}/);
  assert.match(styles, /#cardLockButton\[aria-pressed="true"\] \.lock-open\{display:none\}/);
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
