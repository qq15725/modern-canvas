import type { GlRenderer } from '../GlRenderer'
import type { GlRenderingContext } from '../types'
import { GlSystem } from '../system'
import { GlBlendMode, mapGlBlendModes } from './GlBlendMode'

export interface GlState {
  blend: boolean
  offsets: boolean
  culling: boolean
  depthTest: boolean
  clockwiseFrontFace: boolean
  depthMask: boolean
}

export class GlState {
  static readonly _properties = [
    'blend',
    'offsets',
    'culling',
    'depthTest',
    'clockwiseFrontFace',
    'depthMask',
  ]

  static _init(): void {
    this._properties.forEach((prop, index) => {
      Object.defineProperty(this.prototype, prop, {
        get() {
          return !!(this.bitmap & (1 << index))
        },
        set(value: boolean) {
          if (!!(this.bitmap & (1 << index)) !== value) {
            this.bitmap ^= (1 << index)
          }
        },
        enumerable: true,
        configurable: true,
      })
    })
  }

  static for2D(): GlState {
    const state = new GlState()
    state.depthTest = false
    state.blend = true
    return state
  }

  protected _blendMode = GlBlendMode.normal
  protected _polygonOffset = 0

  bitmap = 0

  get blendMode(): GlBlendMode { return this._blendMode }
  set blendMode(value: GlBlendMode) {
    this.blend = (value !== GlBlendMode.none)
    this._blendMode = value
  }

  get polygonOffset(): number { return this._polygonOffset }
  set polygonOffset(value: number) {
    this.offsets = !!value
    this._polygonOffset = value
  }

  constructor(options?: Partial<GlState>) {
    if (options) {
      for (const key in options) {
        (this as any)[key] = (options as any)[key]
      }
    }
  }
}

GlState._init()

export class GlStateSystem extends GlSystem {
  override install(renderer: GlRenderer): void {
    super.install(renderer)
    renderer.state = this
  }

  protected _blendEq = false
  protected _setters = GlState._properties.map((prop) => {
    return (this as any)[`set${prop.replace(/^\S/, s => s.toUpperCase())}`]
  })

  boundStateBitmap = 0
  boundBlendMode?: string
  blendModes!: Record<GlBlendMode, any>
  defaultState = new GlState({ blend: true })

  override onUpdateContext(gl: GlRenderingContext): void {
    super.onUpdateContext(gl)
    this.blendModes = mapGlBlendModes(gl)
  }

  toggle(boundPoint: number, enable: boolean): void { this._renderer.gl[enable ? 'enable' : 'disable'](boundPoint) }
  setBlend(value: boolean): void { this.toggle(this._renderer.gl.BLEND, value) }
  setOffsets(value: boolean): void { this.toggle(this._renderer.gl.POLYGON_OFFSET_FILL, value) }
  setCulling(value: boolean): void { this.toggle(this._renderer.gl.CULL_FACE, value) }
  setDepthTest(value: boolean): void { this.toggle(this._renderer.gl.DEPTH_TEST, value) }
  setDepthMask(value: boolean): void { this._renderer.gl.depthMask(value) }
  setClockwiseFrontFace(value: boolean): void {
    const gl = this._renderer.gl
    gl.frontFace(gl[value ? 'CW' : 'CCW'])
  }

  setBlendMode(value: GlBlendMode): void {
    if (value === this.boundBlendMode) {
      return
    }

    this.boundBlendMode = value

    const mode = this.blendModes[value]
    const gl = this._renderer.gl

    if (mode.length === 2) {
      gl.blendFunc(mode[0], mode[1])
    }
    else {
      gl.blendFuncSeparate(mode[0], mode[1], mode[2], mode[3])
    }
    if (mode.length === 6) {
      this._blendEq = true
      gl.blendEquationSeparate(mode[4], mode[5])
    }
    else if (this._blendEq) {
      this._blendEq = false
      gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD)
    }
  }

  setPolygonOffset(value: number, scale: number): void { this._renderer.gl.polygonOffset(value, scale) }

  bind(state: GlState): void {
    if (this.boundStateBitmap !== state.bitmap) {
      let diff = this.boundStateBitmap ^ state.bitmap
      let i = 0
      while (diff) {
        if (diff & 1) {
          this._setters[i]?.call(this, !!(state.bitmap & (1 << i)))
        }
        diff = diff >> 1
        i++
      }
      this.boundStateBitmap = state.bitmap
    }

    state.blend && this.setBlendMode(state.blendMode)
    state.offsets && this.setPolygonOffset(1, state.polygonOffset)
  }

  reset(): void {
    super.reset()
    this.bind(this.defaultState)
    this._blendEq = true
    this.setBlendMode(GlBlendMode.normal)
  }
}
