import type Phaser from 'phaser';
import type { WorldId } from '../levels/worlds';
import { backgroundTheme, fogTexture } from './art/backgrounds';
import { bossTextures, enemyTextures, playerTextures } from './art/characters';
import { decorationTextures } from './art/decorations';
import { mechanicTextures, objectTextures } from './art/objects';
import { ART_SCALE, dataUri, type SvgTexture } from './art/svg';
import { terrainTextures } from './art/terrain';

/** All sprite textures (loaded once at boot). */
export function coreTextures(): SvgTexture[] {
  return [...playerTextures(), ...enemyTextures(), ...bossTextures(), ...objectTextures(), ...mechanicTextures(), ...terrainTextures(), ...decorationTextures()];
}

export function queueCoreTextures(loader: Phaser.Loader.LoaderPlugin): void {
  for (const t of coreTextures()) {
    if (loader.textureManager.exists(t.key)) continue;
    loader.svg(t.key, dataUri(t.svg), { scale: ART_SCALE });
  }
}

/** Background textures are big, so they are loaded per world on demand. */
export function queueWorldTextures(loader: Phaser.Loader.LoaderPlugin, world: WorldId): void {
  const theme = backgroundTheme(world);
  for (const l of theme.layers) {
    if (!loader.textureManager.exists(l.key)) loader.svg(l.key, dataUri(l.svg), { scale: 1 });
  }
  const fog = fogTexture(world);
  if (!loader.textureManager.exists(fog.key)) loader.svg(fog.key, dataUri(fog.svg), { scale: 1 });
}

/** Display scale for sprites built from ART_SCALE textures. */
export const SPRITE_SCALE = 1 / ART_SCALE;
