import Phaser from 'phaser';
import type { InputState } from '../sim/types';

/**
 * Keyboard + gamepad → InputState.
 *  Move: ←/→ or A/D   Jump: Space, Z, W, ↑, K   Dash: Shift, X, J
 *  Crouch / drop: ↓ or S   Pause: Esc or P   Restart: R
 */
export class InputSystem {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private prevJump = false;
  private prevDash = false;
  private prevPause = false;
  private prevRestart = false;

  constructor(private scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys(
      {
        left: K.LEFT,
        right: K.RIGHT,
        up: K.UP,
        down: K.DOWN,
        a: K.A,
        d: K.D,
        w: K.W,
        s: K.S,
        space: K.SPACE,
        z: K.Z,
        k: K.K,
        shift: K.SHIFT,
        x: K.X,
        j: K.J,
        esc: K.ESC,
        p: K.P,
        r: K.R,
      },
      false,
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    // stop the page from scrolling with arrows/space while playing
    kb.addCapture([K.SPACE, K.UP, K.DOWN, K.LEFT, K.RIGHT]);
  }

  private pad(): Phaser.Input.Gamepad.Gamepad | null {
    const gp = this.scene.input.gamepad;
    if (!gp || gp.total === 0) return null;
    return gp.getPad(0) ?? null;
  }

  read(): InputState & { pausePressed: boolean; restartPressed: boolean } {
    const k = this.keys;
    const pad = this.pad();
    const axisX = pad ? pad.leftStick.x : 0;
    const axisY = pad ? pad.leftStick.y : 0;
    const left = k.left.isDown || k.a.isDown || axisX < -0.4 || !!pad?.left;
    const right = k.right.isDown || k.d.isDown || axisX > 0.4 || !!pad?.right;
    const down = k.down.isDown || k.s.isDown || axisY > 0.5 || !!pad?.down;
    const up = k.up.isDown || k.w.isDown || axisY < -0.5 || !!pad?.up;
    const jump = k.space.isDown || k.z.isDown || k.up.isDown || k.w.isDown || k.k.isDown || !!pad?.A;
    const dash = k.shift.isDown || k.x.isDown || k.j.isDown || !!pad?.X || !!pad?.B || (pad ? pad.R1 > 0.5 || pad.R2 > 0.5 : false);
    const pause = k.esc.isDown || k.p.isDown || (pad ? pad.buttons[9]?.pressed === true : false);
    const restart = k.r.isDown || (pad ? pad.buttons[8]?.pressed === true : false);
    const out = {
      left,
      right,
      up,
      down,
      jump,
      jumpPressed: jump && !this.prevJump,
      dashPressed: dash && !this.prevDash,
      pausePressed: pause && !this.prevPause,
      restartPressed: restart && !this.prevRestart,
    };
    this.prevJump = jump;
    this.prevDash = dash;
    this.prevPause = pause;
    this.prevRestart = restart;
    return out;
  }

  /** Forget held keys (e.g. after un-pausing) so nothing fires twice. */
  resetEdges(): void {
    this.prevJump = true;
    this.prevDash = true;
    this.prevPause = true;
    this.prevRestart = true;
  }
}
