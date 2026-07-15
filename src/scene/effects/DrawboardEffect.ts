import type { WebGLRenderer } from '../../core'
import type { EffectProperties, Node, Viewport } from '../main'
import type { Texture2D } from '../resources'
import { property } from 'modern-idoc'
import { assets } from '../../asset'
import { Color, customNode } from '../../core'
import { Effect } from '../main/Effect'
import { Material, QuadUvGeometry } from '../resources'
import fragment from './DrawboardEffect.frag?raw'

// 底纹家族（明暗不再进枚举，交由 checkerboardColor / checkerboardDotColor 颜色决定）。
export type CheckerboardStyle = 'grid' | 'dot'

export interface DrawboardEffectProperties extends EffectProperties {
  checkerboard?: boolean
  checkerboardStyle?: CheckerboardStyle
  pixelGrid?: boolean
  /** 底纹底色（网格底格 / 点阵底）。颜色字符串，可为主题 token；缺省浅色。 */
  checkerboardColor?: string
  /** 点阵圆点色。缺省浅灰。 */
  checkerboardDotColor?: string
  /** 放大时圆点的额外提亮量（0..1）。 */
  dotColorDiff?: number
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
  @property({ fallback: '#f2f3f5' }) declare checkerboardColor: string
  @property({ fallback: '#c8ccd4' }) declare checkerboardDotColor: string
  @property({ fallback: 0.06 }) declare dotColorDiff: number
  @property() declare watermark?: string
  @property({ fallback: 100 }) declare watermarkWidth: number
  @property({ fallback: 0.05 }) declare watermarkAlpha: number
  @property({ fallback: 0.5236 }) declare watermarkRotation: number

  protected _watermark?: Texture2D
  // 底纹颜色解析缓存：属性变更时重解析成 RGB（0..1），供 shader 直接使用。
  protected _color = new Color('#f2f3f5')
  protected _dotColor = new Color('#c8ccd4')

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
      case 'checkerboardColor':
        this._color.value = value
        this.requestRender()
        break
      case 'checkerboardDotColor':
        this._dotColor.value = value
        this.requestRender()
        break
      case 'checkerboard':
      case 'checkerboardStyle':
      case 'pixelGrid':
      case 'dotColorDiff':
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
    dot: 2,
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

      // 底纹颜色（明暗由传入的颜色决定，主题解析在上层完成）→ RGB(0..1)。
      const [cr, cg, cb] = this._color.toArray()
      const [dr, dg, db] = this._dotColor.toArray()

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
        checkerboardColor: [cr, cg, cb],
        checkerboardDotColor: [dr, dg, db],
        dotColorDiff: this.dotColorDiff,
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
