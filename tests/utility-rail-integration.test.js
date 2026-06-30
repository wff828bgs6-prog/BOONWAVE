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
  assert.match(index, /class="bw-icon lock-closed"/);
  assert.match(index, /class="bw-icon lock-open"/);
});

test('utility rail mirrors as a whole and persists handedness', () => {
  const controller = read('controllers/utility-rail-controller.js');
  assert.match(controller, /utilityRailSide/);
  assert.match(controller, /LONG_PRESS_MS = 520/);
  assert.match(controller, /nextSide = this\.rail\.dataset\.side === 'left' \? 'right' : 'left'/);
  assert.match(controller, /storage\.saveSetting/);
  assert.match(controller, /storage\.loadSetting/);
});

test('long-press suppression is scoped to one button and expires automatically', () => {
  const controller = read('controllers/utility-rail-controller.js');
  assert.match(controller, /SUPPRESS_CLICK_MS = 700/);
  assert.match(controller, /this\.suppressedButton = button/);
  assert.match(controller, /this\.suppressedButton === event\.currentTarget/);
  assert.match(controller, /setTimeout\(\(\) => this\.clearSuppressedClick\(\)/);
});

test('locked card surface becomes canvas while explicit controls remain usable', () => {
  const cardController = read('canvas/card-controller.js');
  const gestureMachine = read('canvas/gesture-machine.js');
  const workspace = read('controllers/workspace-controller.js');

  assert.match(cardController, /canMoveCard/);
  assert.match(cardController, /if \(!movable\) return;/);
  assert.match(cardController, /Do not capture or stop the event/);
  assert.match(gestureMachine, /allowPanFromInteractive/);
  assert.match(workspace, /allowPanFromInteractive: \(\) => Boolean\(store\.getState\(\)\.cardsLocked\)/);
  assert.match(workspace, /canMoveCard: \(\) => !store\.getState\(\)\.cardsLocked/);
});

test('closed lock means locked and open lock means movable', () => {
  const styles = read('styles/production-shell.css');
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
