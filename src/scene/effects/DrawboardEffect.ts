import type { WebGLRenderer } from '../../core'
import type { EffectProperties, Node, Viewport } from '../main'
import type { Texture2D } from '../resources'
import { property } from 'modern-idoc'
import { assets } from '../../asset'
import { customNode } from '../../core'
import { Effect } from '../main/Effect'
import { Material, QuadUvGeometry } from '../resources'
import fragment from './DrawboardEffect.frag?raw'

export type CheckerboardStyle = 'grid' | 'gridDark' | 'dot' | 'dotDark'

export interface DrawboardEffectProperties extends EffectProperties {
  checkerboard?: boolean
  checkerboardStyle?: CheckerboardStyle
  pixelGrid?: boolean
  /** Override dot grid surface colour (0..1). Defaults to the dot/dotDark preset. */
  dotBaseColor?: number
  /** Override dot fill colour at the zoomed-out limit (0..1). */
  dotColor?: number
  /** Extra brightening of the dot when zooming in (0..1). */
  dotZoomDiff?: number
  watermark?: string
  watermarkWidth?: number
  watermarkAlpha?: number
  watermarkRotation?: number
}

@customNode('DrawboardEffect')
export class DrawboardEffect extends Effect {
  @property({ fallback: false }) declare checkerboard: boolean
  @property({ fallback: 'grid' }) declare checkerboardStyle: CheckerboardStyle
  @property({ fallback: false }) declare pixelGrid: boolean
  @property() declare dotBaseColor?: number
  @property() declare dotColor?: number
  @property() declare dotZoomDiff?: number
  @property() declare watermark?: string
  @property({ fallback: 100 }) declare watermarkWidth: number
  @property({ fallback: 0.05 }) declare watermarkAlpha: number
  @property({ fallback: 0.5236 }) declare watermarkRotation: number

  protected _watermark?: Texture2D

  static material = new Material({
    gl: {
      vertex: `attribute vec2 position;
in vec2 uv;
uniform mat3 projectionMatrix;
uniform mat3 viewMatrix;
out vec2 vUv;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
  vUv = uv;
}`,
      fragment,
    },
  })

  constructor(properties?: Partial<DrawboardEffectProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'watermark':
        this._loadWatermark(value)
        break
      case 'checkerboard':
      case 'checkerboardStyle':
      case 'pixelGrid':
      case 'dotBaseColor':
      case 'dotColor':
      case 'dotZoomDiff':
        // these only feed the fragment shader; nothing else marks the effect
        // dirty, so request a re-render to reflect the change next frame
        this.requestRender()
        break
    }
  }

  protected async _loadWatermark(value?: string): Promise<void> {
    if (value) {
      this._watermark = await assets.texture.load(value)
    }
    else {
      this._watermark = undefined
    }
  }

  protected _checkerboardStyleMap: Record<CheckerboardStyle, number> = {
    grid: 1,
    gridDark: 2,
    dot: 3,
    dotDark: 4,
  }

  // dot grid colours per theme: light keeps the original near-white surface with
  // darker dots; dark mirrors `gridDark`'s surface with lighter dots on top.
  protected _dotColors: Record<'light' | 'dark', { base: number, zoomedOut: number, diff: number }> = {
    light: { base: 0.9608, zoomedOut: 0.6667, diff: 0.1020 },
    dark: { base: 0.1216, zoomedOut: 0.3137, diff: 0.1020 },
  }

  override apply(renderer: WebGLRenderer, source: Viewport): void {
    source.redraw(renderer, () => {
      if (this._watermark) {
        this._watermark.activate(renderer, 1)
      }
      else {
        renderer.texture.unbind(1)
      }
      const viewMatrix = renderer.shader.uniforms.viewMatrix
      const watermarkSize = this._watermark
        ? [
            this.watermarkWidth,
            this.watermarkWidth * this._watermark.height / this._watermark.width,
          ]
        : [0, 0]
      const watermarkMaxWh = Math.max(watermarkSize[0], watermarkSize[1])

      // pick the preset from the style, then allow per-property overrides so
      // callers can theme freely without picking a new style enum
      const preset = this.checkerboardStyle === 'dotDark'
        ? this._dotColors.dark
        : this._dotColors.light
      const dot = {
        base: this.dotBaseColor ?? preset.base,
        zoomedOut: this.dotColor ?? preset.zoomedOut,
        diff: this.dotZoomDiff ?? preset.diff,
      }

      QuadUvGeometry.draw(renderer, DrawboardEffect.material, {
        uTexture: 0,
        inputSize: [source.width, source.height],
        zoom: [viewMatrix[0], viewMatrix[4]],
        translate: [viewMatrix[6], viewMatrix[7]],
        gridScale: 1 / 16,
        gridSize: [
          viewMatrix[0] > 4
            ? Math.ceil(0.5 / viewMatrix[0] * 10000) / 10000
            : 0,
          viewMatrix[4] > 4
            ? Math.ceil(0.5 / viewMatrix[4] * 10000) / 10000
            : 0,
        ],
        checkerboard: this.checkerboard ? 1 : 0,
        checkerboardStyle: this._checkerboardStyleMap[this.checkerboardStyle] ?? 0,
        dotBackgroundBaseColor: dot.base,
        dotBackgroundZoomedOutColor: dot.zoomedOut,
        dotColorDiff: dot.diff,
        pixelGrid: this.pixelGrid ? 1 : 0,
        watermark: this._watermark ? 1 : 0,
        watermarkTexture: 1,
        watermarkSize,
        watermarkSpacing: [watermarkMaxWh * 2, watermarkMaxWh * 2],
        watermarkOffset: [0, 0],
        watermarkAlpha: this.watermarkAlpha,
        watermarkRotation: this.watermarkRotation,
      })
    })
  }
}
