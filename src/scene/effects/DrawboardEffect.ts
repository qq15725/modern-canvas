import type { WebGLRenderer } from '../../core'
import type { EffectProperties, Node, Viewport } from '../main'
import type { Texture2D } from '../resources'
import { property } from 'modern-idoc'
import { assets } from '../../asset'
import { customNode } from '../../core'
import { Effect } from '../main/Effect'
import { Material, QuadUvGeometry } from '../resources'
import frag from './DrawboardEffect.frag?raw'

export type CheckerboardStyle = 'grid' | 'gridDark' | 'dot'

export interface DrawboardEffectProperties extends EffectProperties {
  checkerboard?: boolean
  checkerboardStyle?: CheckerboardStyle
  pixelGrid?: boolean
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
  @property() declare watermark?: string
  @property({ fallback: 100 }) declare watermarkWidth: number
  @property({ fallback: 0.05 }) declare watermarkAlpha: number
  @property({ fallback: 0.5236 }) declare watermarkRotation: number

  protected _watermark?: Texture2D

  static material = new Material({
    vert: `attribute vec2 position;
attribute vec2 uv;
uniform mat3 projectionMatrix;
uniform mat3 viewMatrix;
varying vec2 vUv;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
  vUv = uv;
}`,
    frag,
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
  }

  override apply(renderer: WebGLRenderer, source: Viewport): void {
    source.redraw(renderer, () => {
      this._watermark?.activate(renderer, 1)
      const viewMatrix = renderer.program.uniforms.viewMatrix
      const watermarkSize = this._watermark
        ? [
            this.watermarkWidth,
            this.watermarkWidth * this._watermark.height / this._watermark.width,
          ]
        : [0, 0]
      const watermarkMaxWh = Math.max(watermarkSize[0], watermarkSize[1])

      QuadUvGeometry.draw(renderer, DrawboardEffect.material, {
        texture: 0,
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
        dotBackgroundBaseColor: 0.9608,
        dotBackgroundZoomedOutColor: 0.6667,
        dotColorDiff: 0.1020,
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
