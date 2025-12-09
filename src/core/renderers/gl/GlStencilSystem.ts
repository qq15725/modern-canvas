import type { RenderTargetLike } from '../shared'
import type { GlRenderer } from './GlRenderer'
import type { GlRenderingContext } from './types'
import { StencilMode } from './const'
import { GlSystem } from './system'

export interface StencilState {
  stencilWriteMask?: number
  stencilReadMask?: number
  stencilFront?: {
    compare: 'always' | 'equal' | 'not-equal'
    passOp: 'increment-clamp' | 'decrement-clamp' | 'keep' | 'replace'
  }
  stencilBack?: {
    compare: 'always' | 'equal' | 'not-equal'
    passOp: 'increment-clamp' | 'decrement-clamp' | 'keep' | 'replace'
  }
}

/** @internal */
export const stencilModeMap: StencilState[] = []
stencilModeMap[StencilMode.none] = {}
stencilModeMap[StencilMode.disabled] = {
  stencilWriteMask: 0,
  stencilReadMask: 0,
}
stencilModeMap[StencilMode.renderingMaskAdd] = {
  stencilFront: {
    compare: 'equal',
    passOp: 'increment-clamp',
  },
  stencilBack: {
    compare: 'equal',
    passOp: 'increment-clamp',
  },
}
stencilModeMap[StencilMode.renderingMaskRemove] = {
  stencilFront: {
    compare: 'equal',
    passOp: 'decrement-clamp',
  },
  stencilBack: {
    compare: 'equal',
    passOp: 'decrement-clamp',
  },
}
stencilModeMap[StencilMode.maskActive] = {
  stencilWriteMask: 0,
  stencilFront: {
    compare: 'equal',
    passOp: 'keep',
  },
  stencilBack: {
    compare: 'equal',
    passOp: 'keep',
  },
}
stencilModeMap[StencilMode.inverseMaskActive] = {
  stencilWriteMask: 0,
  stencilFront: {
    compare: 'not-equal',
    passOp: 'keep',
  },
  stencilBack: {
    compare: 'not-equal',
    passOp: 'keep',
  },
}

export class GlStencilSystem extends GlSystem {
  override install(renderer: GlRenderer): void {
    super.install(renderer)
    renderer.stencil = this
  }

  protected readonly _cache = {
    enabled: false,
    stencilMode: StencilMode.none,
    refCount: 0,
  }

  current: Record<number, { stencilMode: StencilMode, refCount: number }> = {
    [-1]: {
      stencilMode: StencilMode.disabled,
      refCount: 0,
    },
  }

  protected _passOpMap!: {
    'keep': number
    'zero': number
    'replace': number
    'invert': number
    'increment-clamp': number
    'decrement-clamp': number
    'increment-wrap': number
    'decrement-wrap': number
  }

  protected _compareMap!: {
    'always': number
    'never': number
    'equal': number
    'not-equal': number
    'less': number
    'less-equal': number
    'greater': number
    'greater-equal': number
  }

  protected override _updateContext(gl: GlRenderingContext): void {
    super._updateContext(gl)

    this._compareMap = {
      'always': gl.ALWAYS,
      'never': gl.NEVER,
      'equal': gl.EQUAL,
      'not-equal': gl.NOTEQUAL,
      'less': gl.LESS,
      'less-equal': gl.LEQUAL,
      'greater': gl.GREATER,
      'greater-equal': gl.GEQUAL,
    }

    this._passOpMap = {
      'keep': gl.KEEP,
      'zero': gl.ZERO,
      'replace': gl.REPLACE,
      'invert': gl.INVERT,
      'increment-clamp': gl.INCR,
      'decrement-clamp': gl.DECR,
      'increment-wrap': gl.INCR_WRAP,
      'decrement-wrap': gl.DECR_WRAP,
    }

    this.reset()
  }

  protected override _setup(): void {
    super._setup()
    this._renderer.renderTarget.on('updateRenderTarget', this._updateRenderTarget)
  }

  reset(): void {
    this._cache.enabled = false
    this._cache.stencilMode = StencilMode.none
    this._cache.refCount = 0
  }

  protected _updateRenderTarget = (renderTarget: RenderTargetLike | null): void => {
    if (renderTarget) {
      let stencilState = this.current[renderTarget.instanceId]
      if (!stencilState) {
        stencilState = this.current[renderTarget.instanceId] = {
          stencilMode: StencilMode.disabled,
          refCount: 0,
        }
      }
      this.bind(stencilState.stencilMode, stencilState.refCount)
    }
  }

  bind(stencilMode: StencilMode, refCount: number): void {
    const stencilState = this.current[this._renderer.renderTarget.current?.instanceId ?? -1]
    const gl = this._gl
    const mode = stencilModeMap[stencilMode]
    const _cache = this._cache
    stencilState.stencilMode = stencilMode
    stencilState.refCount = refCount

    if (stencilMode === StencilMode.disabled) {
      if (this._cache.enabled) {
        this._cache.enabled = false
        gl.disable(gl.STENCIL_TEST)
      }
      return
    }

    if (!this._cache.enabled) {
      this._cache.enabled = true
      gl.enable(gl.STENCIL_TEST)
    }

    if (
      stencilMode !== _cache.stencilMode
      || _cache.refCount !== refCount
    ) {
      _cache.stencilMode = stencilMode
      _cache.refCount = refCount
      if (mode.stencilBack) {
        gl.stencilFunc((this._compareMap as any)[mode.stencilBack.compare], refCount, 0xFF)
        gl.stencilOp(gl.KEEP, gl.KEEP, (this._passOpMap as any)[mode.stencilBack.passOp])
      }
    }
  }

  override destroy(): void {
    super.destroy()
    this._renderer.renderTarget.off('updateRenderTarget', this._updateRenderTarget)
  }
}
