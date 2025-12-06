import type { ClearOrBool } from './const'
import type {
  GlExtensions,
  GlRenderingContext,
  GlTarget,
} from './types'
import { createHTMLCanvas, isCanvasElement, isWebgl2 } from '../../shared'
import { Renderer } from '../shared'
import { GlBufferSystem } from './buffer'
import { Clear } from './const'
import { GlGeometrySystem } from './geometry'
import { GlBatch2DSystem } from './GlBatch2DSystem'
import { GlColorMaskSystem } from './GlColorMaskSystem'
import { GlMaskSystem } from './GlMaskSystem'
import { GlStencilSystem } from './GlStencilSystem'
import { GlViewportSystem } from './GlViewportSystem'
import { GlRenderTargetSystem } from './renderTarget'
import { GlShaderSystem } from './shader'
import { GlStateSystem } from './state'
import { GlTextureSystem } from './texture'

export interface GlRenderer {
  texture: GlTextureSystem
  buffer: GlBufferSystem
  shader: GlShaderSystem
  geometry: GlGeometrySystem
  renderTarget: GlRenderTargetSystem
  state: GlStateSystem
  mask: GlMaskSystem
  colorMask: GlColorMaskSystem
  stencil: GlStencilSystem
  batch2D: GlBatch2DSystem
  viewport: GlViewportSystem
}

export class GlRenderer extends Renderer {
  contextLost = false

  declare gl: GlRenderingContext
  declare version: 1 | 2
  declare extensions: GlExtensions

  protected _systems = [
    new GlTextureSystem(),
    new GlBufferSystem(),
    new GlShaderSystem(),
    new GlGeometrySystem(),
    new GlRenderTargetSystem(),
    new GlStateSystem(),
    new GlMaskSystem(),
    new GlColorMaskSystem(),
    new GlStencilSystem(),
    new GlBatch2DSystem(),
    new GlViewportSystem(),
  ]

  readonly bindPoints = new Map<number, GlTarget>()
  readonly supports = {
    uint32Indices: true,
    uniformBufferObject: true,
    vertexArrayObject: true,
    srgbTextures: true,
    nonPowOf2wrapping: true,
    msaa: true,
    nonPowOf2mipmaps: true,
  }

  constructor(
    view:
      | HTMLCanvasElement
      | WebGLRenderingContext
      | WebGL2RenderingContext = createHTMLCanvas()!,
    options?: WebGLContextAttributes,
  ) {
    super()

    if (!view) {
      throw new Error('Failed to createHTMLCanvas')
    }

    if (isCanvasElement(view)) {
      this._setupContext(view, options)
    }
    else {
      this.gl = view as GlRenderingContext
      this.version = isWebgl2(this.gl) ? 2 : 1
    }

    this
      ._setupBindPoints()
      ._setupExtensions()
      ._setupPolyfill()
      ._setupSupports()

    this._systems.forEach(system => system.install(this))
    this._systems.forEach(system => system.onUpdateContext(this.gl))
  }

  protected _setupContext(view: HTMLCanvasElement, options?: WebGLContextAttributes): this {
    this.view = view
    let gl = <any>(
      view.getContext('webgl2', options)
      || view.getContext('experimental-webgl2', options)
    )
    let version: 1 | 2 = 2

    if (!gl) {
      gl = view.getContext('webgl', options)
        || view.getContext('experimental-webgl', options)
      version = 1
    }

    if (!gl) {
      throw new Error('Unable to getContext')
    }

    this.gl = gl
    this.version = version

    this._contextLost = this._contextLost.bind(this)
    this._contextRestored = this._contextRestored.bind(this)

    view.addEventListener('webglcontextlost', this._contextLost as any, false)
    view.addEventListener('webglcontextrestored', this._contextRestored as any, false)

    return this
  }

  protected _setupExtensions(): this {
    const gl = this.gl

    let extensions: Record<string, any> = {
      anisotropicFiltering: gl.getExtension('EXT_texture_filter_anisotropic'),
      floatTextureLinear: gl.getExtension('OES_texture_float_linear'),
      s3tc: gl.getExtension('WEBGL_compressed_texture_s3tc'),
      s3tc_sRGB: gl.getExtension('WEBGL_compressed_texture_s3tc_srgb'),
      etc: gl.getExtension('WEBGL_compressed_texture_etc'),
      etc1: gl.getExtension('WEBGL_compressed_texture_etc1'),
      pvrtc: gl.getExtension('WEBGL_compressed_texture_pvrtc')
        || gl.getExtension('WEBKIT_WEBGL_compressed_texture_pvrtc'),
      atc: gl.getExtension('WEBGL_compressed_texture_atc'),
      astc: gl.getExtension('WEBGL_compressed_texture_astc'),
      bptc: gl.getExtension('EXT_texture_compression_bptc'),
      rgtc: gl.getExtension('EXT_texture_compression_rgtc'),
      loseContext: gl.getExtension('WEBGL_lose_context'),
    }

    if (this.version === 1) {
      extensions = {
        ...extensions,
        drawBuffers: gl.getExtension('WEBGL_draw_buffers'),
        depthTexture: gl.getExtension('WEBGL_depth_texture'),
        vertexArrayObject: gl.getExtension('OES_vertex_array_object')
          || gl.getExtension('MOZ_OES_vertex_array_object')
          || gl.getExtension('WEBKIT_OES_vertex_array_object'),
        uint32ElementIndex: gl.getExtension('OES_element_index_uint'),
        // Floats and half-floats
        floatTexture: gl.getExtension('OES_texture_float'),
        floatTextureLinear: gl.getExtension('OES_texture_float_linear'),
        textureHalfFloat: gl.getExtension('OES_texture_half_float'),
        textureHalfFloatLinear: gl.getExtension('OES_texture_half_float_linear'),
        vertexAttribDivisorANGLE: gl.getExtension('ANGLE_instanced_arrays'),
        srgb: gl.getExtension('EXT_sRGB'),
      }
    }
    else if (this.version === 2) {
      extensions = {
        ...extensions,
        colorBufferFloat: gl.getExtension('EXT_color_buffer_float'),
      }

      const provokeExt = gl.getExtension('WEBGL_provoking_vertex')
      if (provokeExt) {
        provokeExt.provokingVertexWEBGL(provokeExt.FIRST_VERTEX_CONVENTION_WEBGL)
      }
    }

    this.extensions = extensions

    return this
  }

  protected _setupSupports(): this {
    const supports = this.supports
    const isWebGl2 = this.version === 2
    const extensions = this.extensions
    supports.uint32Indices = isWebGl2 || !!extensions.uint32ElementIndex
    supports.uniformBufferObject = isWebGl2
    supports.vertexArrayObject = isWebGl2 || !!extensions.vertexArrayObject
    supports.srgbTextures = isWebGl2 || !!extensions.srgb
    supports.nonPowOf2wrapping = isWebGl2
    supports.nonPowOf2mipmaps = isWebGl2
    supports.msaa = isWebGl2
    return this
  }

  protected _setupBindPoints(): this {
    for (const key in this.gl) {
      if (key === key.toUpperCase()) {
        const value = (this.gl as any)[key]
        if (typeof value === 'number') {
          this.bindPoints.set(value, key.toLowerCase() as any)
        }
      }
    }
    return this
  }

  /**
   * Setup polyfill
   *
   * @protected
   */
  protected _setupPolyfill(): this {
    if (this.version === 1) {
      const { vertexAttribDivisorANGLE, vertexArrayObject, drawBuffers } = this.extensions
      const polyfill = this.gl as WebGL2RenderingContext
      if (vertexArrayObject) {
        polyfill.createVertexArray = () => vertexArrayObject.createVertexArrayOES()
        polyfill.bindVertexArray = vao => vertexArrayObject.bindVertexArrayOES(vao)
        polyfill.deleteVertexArray = vao => vertexArrayObject.deleteVertexArrayOES(vao)
      }
      if (vertexAttribDivisorANGLE) {
        polyfill.vertexAttribDivisor = (a, b) => vertexAttribDivisorANGLE.vertexAttribDivisorANGLE(a, b)
        polyfill.drawElementsInstanced = (a, b, c, d, e) => vertexAttribDivisorANGLE.drawElementsInstancedANGLE(a, b, c, d, e)
        polyfill.drawArraysInstanced = (a, b, c, d) => vertexAttribDivisorANGLE.drawArraysInstancedANGLE(a, b, c, d)
      }
      if (drawBuffers) {
        polyfill.drawBuffers = (buffers: number[]) => drawBuffers.drawBuffersWEBGL(buffers)
      }
    }
    return this
  }

  protected _contextLost(event: WebGLContextEvent): void {
    event.preventDefault()
    this.contextLost = true
    setTimeout(() => {
      if (this.gl.isContextLost()) {
        this.extensions.loseContext?.restoreContext()
      }
    }, 0)
  }

  protected _contextRestored(): void {
    this.contextLost = false
    this._setupExtensions()
    this._systems.forEach(system => system.onUpdateContext(this.gl))
  }

  override resize(width: number, height: number, updateStyle: boolean = true): void {
    super.resize(width, height, updateStyle)
    this.viewport.bind({
      x: 0,
      y: 0,
      width: this.screen.width * this.pixelRatio,
      height: this.screen.height * this.pixelRatio,
    })
  }

  clear(clear: ClearOrBool = Clear.all): void {
    if (typeof clear === 'boolean') {
      clear = clear ? Clear.all : Clear.none
    }
    if (clear) {
      this.gl.clear(clear)
    }
  }

  reset(): void {
    this._systems.forEach(system => system.reset())
  }

  flush(): void {
    this._systems.forEach(system => system.flush())
  }

  override destroy(): void {
    this._systems.forEach(system => system.destroy())
    this.view?.removeEventListener('webglcontextlost', this._contextLost as any, false)
    this.view?.removeEventListener('webglcontextrestored', this._contextRestored as any, false)
    this.gl.useProgram(null)
    this.extensions.loseContext?.loseContext()
    super.destroy()
  }

  toPixels(
    x = 0,
    y = 0,
    width = this.gl.drawingBufferWidth,
    height = this.gl.drawingBufferHeight,
  ): Uint8ClampedArray<ArrayBuffer> {
    const length = width * height * 4
    const row = width * 4
    const end = (height - 1) * row
    const flipedPixels = new Uint8Array(length)
    const pixels = new Uint8ClampedArray(length)
    this.gl.readPixels(x, y, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, flipedPixels)
    for (let i = 0; i < length; i += row) {
      pixels.set(flipedPixels.subarray(i, i + row), end - i)
    }
    return pixels
  }
}
