import type Phaser from 'phaser';

import { loadSettings } from '../systems/Settings';

/**
 * By default the canvas renders at 2× the logical view (960×540) so the
 * vector art stays crisp; every camera zooms by that factor around its
 * top-left corner, so game code always thinks in 960×540 world units.
 * The "Sharp rendering" setting (or ?lowres) drops to 1× for slow machines.
 */
export function renderScale(): number {
  try {
    if (new URLSearchParams(globalThis.location?.search ?? '').has('lowres')) return 1;
  } catch {
    /* no location (tests) */
  }
  return loadSettings().sharpRendering ? 2 : 1;
}

export function configureCamera(cam: Phaser.Cameras.Scene2D.Camera): void {
  cam.setOrigin(0, 0);
  cam.setZoom(cam.scene.game.registry.get('renderScale') ?? 2);
}
