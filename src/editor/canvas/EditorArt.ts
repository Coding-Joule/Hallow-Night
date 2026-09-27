import { dataUri } from '../../game/render/art/svg';
import { coreTextures } from '../../game/render/textures';

/**
 * The editor draws with the SAME generated SVG art as the game, rasterised
 * into HTMLImageElements / CanvasPatterns.
 */
export class EditorArt {
  private images = new Map<string, HTMLImageElement>();
  private patterns = new Map<string, CanvasPattern>();
  private loaded = 0;
  private total = 0;

  constructor(private onLoad: () => void) {
    for (const t of coreTextures()) {
      const img = new Image();
      this.total++;
      img.onload = () => {
        this.loaded++;
        this.patterns.clear();
        if (this.loaded === this.total || this.loaded % 20 === 0) this.onLoad();
      };
      img.src = dataUri(t.svg);
      this.images.set(t.key, img);
    }
  }

  img(key: string): HTMLImageElement | null {
    const i = this.images.get(key);
    return i && i.complete && i.naturalWidth > 0 ? i : null;
  }

  pattern(ctx: CanvasRenderingContext2D, key: string): CanvasPattern | null {
    let p = this.patterns.get(key);
    if (p) return p;
    const img = this.img(key);
    if (!img) return null;
    p = ctx.createPattern(img, 'repeat') ?? undefined;
    if (!p) return null;
    this.patterns.set(key, p);
    return p;
  }
}
