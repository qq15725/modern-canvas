import type { RectangleLike } from '../../../math'
import type { RenderTargetLike, TextureLike } from '../../shared'
import type { GlRenderer } from '../GlRenderer'
import { Projection2D } from '../../../math'
import { GlSystem } from '../system'
import { GlRenderTarget } from './GlRenderTarget'

export class GlRenderTargetSystem extends GlSystem {
  override install(renderer: GlRenderer): void {
    super.install(renderer)
    renderer.renderTarget = this
  }

  readonly renderTargets = new Map<number, RenderTargetLike>()
  readonly glRenderTargets = new Map<number, GlRenderTarget>()
  current: RenderTargetLike | null = null

  protected _msaaSamples: number[] = []
  protected _hasMRT = true
  protected _writeDepthTexture = true
  projectionMatrix = new Projection2D()

  override onUpdateContext(): void {
    this._hasMRT = true
    this._writeDepthTexture = true

    if (this._renderer.version === 1) {
      const gl = this._renderer.gl as WebGLRenderingContext
      const drawBuffers = this._renderer.extensions.drawBuffers
      const depthTexture = this._renderer.extensions.depthTexture

      if (drawBuffers) {
        (gl as any).drawBuffers = (activeTextures: number[]): void => drawBuffers!.drawBuffersWEBGL(activeTextures)
      }
      else {
        this._hasMRT = false
        ;(gl as any).drawBuffers = (): void => {}
      }

      if (!depthTexture) {
        this._writeDepthTexture = false
      }
    }
    else {
      const gl = this._renderer.gl as WebGL2RenderingContext
      this._msaaSamples = gl.getInternalformatParameter(gl.RENDERBUFFER, gl.RGBA8, gl.SAMPLES)
    }
  }

  bind(
    renderTarget: RenderTargetLike | null,
    frame?: RectangleLike,
  ): void {
    const gl = this._gl

    const didChange = this.current !== renderTarget
    this.current = renderTarget

    if (renderTarget) {
      const glRenderTarget = this.getGlRenderTarget(renderTarget)

      const texture = renderTarget.colorTextures[0]
      const pixelWidth = texture.pixelWidth ?? texture.width
      const pixelHeight = texture.pixelHeight ?? texture.height
      const pixelRatio = texture.pixelRatio || 1

      if (
        pixelWidth !== glRenderTarget.width
        || pixelHeight !== glRenderTarget.height
      ) {
        this.resizeGpuRenderTarget(renderTarget)
      }

      renderTarget.colorTextures.forEach((texture) => {
        this._renderer.texture.unbind(texture)
      })

      gl.bindFramebuffer(gl.FRAMEBUFFER, glRenderTarget.framebuffer)

      const viewport = { x: 0, y: 0, width: 0, height: 0 }
      if (frame) {
        viewport.x = ((frame.x * pixelRatio) + 0.5) | 0
        viewport.y = ((frame.y * pixelRatio) + 0.5) | 0
        viewport.width = ((frame.width * pixelRatio) + 0.5) | 0
        viewport.height = ((frame.height * pixelRatio) + 0.5) | 0
      }
      else {
        viewport.x = 0
        viewport.y = 0
        viewport.width = texture.pixelWidth || texture.width
        viewport.height = texture.pixelHeight || texture.height
      }

      this.projectionMatrix.flipY(renderTarget.isRoot ?? false)
      this.projectionMatrix.translate(0, 0)
      this.projectionMatrix.resize(
        viewport.width / pixelRatio,
        viewport.height / pixelRatio,
      )
      this._renderer.shader.uniforms.projectionMatrix = this.projectionMatrix.toArray(true)

      this._renderer.viewport.bind(viewport)

      if (
        !glRenderTarget.depthStencilRenderBuffer
        && (renderTarget.stencil || renderTarget.depth)
      ) {
        this._initStencil(glRenderTarget)
      }
    }
    else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)

      this._renderer.viewport.bind({
        x: 0, y: 0,
        width: this._renderer.screen.width * this._renderer.pixelRatio,
        height: this._renderer.screen.height * this._renderer.pixelRatio,
      })
    }

    // TODO
    if (didChange) {
      this._renderer.scissor.onRenderTargetChange(this.current)
      this._renderer.stencil.onRenderTargetChange(this.current)
    }
  }

  unbind(): void {
    return this.bind(null)
  }

  getGlRenderTarget(renderTarget: RenderTargetLike): GlRenderTarget {
    return this.glRenderTargets.get(renderTarget.instanceId)
      || this._createGlRenderTarget(renderTarget)
  }

  protected _createGlRenderTarget(renderTarget: RenderTargetLike): GlRenderTarget {
    const gl = this._gl
    const glRenderTarget = new GlRenderTarget(gl.createFramebuffer())
    glRenderTarget.msaa = !!renderTarget.msaa

    renderTarget.colorTextures.forEach((texture) => {
      this._renderer.texture.unbind(texture)
    })
    gl.bindFramebuffer(gl.FRAMEBUFFER, glRenderTarget.framebuffer)

    this.glRenderTargets.set(renderTarget.instanceId, glRenderTarget)

    if (!this.renderTargets.get(renderTarget.instanceId)) {
      this.renderTargets.set(renderTarget.instanceId, renderTarget)

      if ('on' in renderTarget) {
        renderTarget.on('updateProperty', (key) => {
          switch (key) {
            case 'width':
            case 'height':
              this.resizeGpuRenderTarget(renderTarget)
              break
            case 'msaa':
              glRenderTarget.msaa = !!renderTarget.msaa
              this._init(renderTarget)
              break
            case 'colorTextures':
              this._init(renderTarget)
              break
          }
        })
        renderTarget.on('destroy', () => {
          this.destroyGpuRenderTarget(glRenderTarget)
          this.renderTargets.delete(renderTarget.instanceId)
        })
      }

      this._init(renderTarget)
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    return glRenderTarget
  }

  protected _init(renderTarget: RenderTargetLike): void {
    this.bind(renderTarget)

    const gl = this._gl
    const glRenderTarget = this.getGlRenderTarget(renderTarget)

    const { colorTextures, mipLevel = 0 } = renderTarget

    colorTextures?.forEach((texture, i) => {
      this._renderer.texture.bind(texture)
      texture.pixelRatio = this._renderer.pixelRatio
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0 + i,
        gl.TEXTURE_2D,
        this._renderer.texture.getGlTexture(texture).native,
        mipLevel,
      )
    })

    if (glRenderTarget.msaa) {
      const viewFramebuffer = gl.createFramebuffer()
      glRenderTarget.framebuffer2 = viewFramebuffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, viewFramebuffer)
      renderTarget.colorTextures.forEach((_, i) => {
        glRenderTarget.msaaRenderBuffer[i] = gl.createRenderbuffer()
      })
    }
    else {
      glRenderTarget.framebuffer2 = glRenderTarget.framebuffer
    }

    this._resizeColorTextures(renderTarget, glRenderTarget)
  }

  ensureDepthStencil(): void {
    const renderTarget = this.current
    if (renderTarget && !renderTarget.stencil) {
      renderTarget.stencil = true
      this._initStencil(this.getGlRenderTarget(renderTarget))
    }
  }

  destroyGpuRenderTarget(gpuRenderTarget: GlRenderTarget): void {
    const gl = this._renderer.gl
    if (gpuRenderTarget.framebuffer) {
      gl.deleteFramebuffer(gpuRenderTarget.framebuffer)
      gpuRenderTarget.framebuffer = undefined as any
    }
    if (gpuRenderTarget.framebuffer2) {
      gl.deleteFramebuffer(gpuRenderTarget.framebuffer2)
      gpuRenderTarget.framebuffer2 = undefined as any
    }
    if (gpuRenderTarget.depthStencilRenderBuffer) {
      gl.deleteRenderbuffer(gpuRenderTarget.depthStencilRenderBuffer)
      gpuRenderTarget.depthStencilRenderBuffer = undefined as any
    }
    gpuRenderTarget.msaaRenderBuffer.forEach((renderBuffer) => {
      gl.deleteRenderbuffer(renderBuffer)
    })
    gpuRenderTarget.msaaRenderBuffer = []
  }

  resizeGpuRenderTarget(renderTarget: RenderTargetLike): void {
    const texture = renderTarget.colorTextures[0]
    const pixelWidth = texture.pixelWidth ?? texture.width
    const pixelHeight = texture.pixelHeight ?? texture.height
    const glRenderTarget = this.getGlRenderTarget(renderTarget)
    glRenderTarget.width = pixelWidth
    glRenderTarget.height = pixelHeight
    this._resizeColorTextures(renderTarget, glRenderTarget)
    if (renderTarget.stencil || renderTarget.depth) {
      this._resizeStencil(glRenderTarget)
    }
  }

  protected _initStencil(glRenderTarget: GlRenderTarget): void {
    if (glRenderTarget.framebuffer === null)
      return

    const gl = this._renderer.gl

    const depthStencilRenderBuffer = gl.createRenderbuffer()
    glRenderTarget.depthStencilRenderBuffer = depthStencilRenderBuffer

    gl.bindRenderbuffer(gl.RENDERBUFFER, depthStencilRenderBuffer)

    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.DEPTH_STENCIL_ATTACHMENT,
      gl.RENDERBUFFER,
      depthStencilRenderBuffer,
    )

    this._resizeStencil(glRenderTarget)
  }

  protected _resizeStencil(glRenderTarget: GlRenderTarget): void {
    if (!glRenderTarget.depthStencilRenderBuffer) {
      return
    }

    const gl = this._gl

    gl.bindRenderbuffer(gl.RENDERBUFFER, glRenderTarget.depthStencilRenderBuffer)

    if (glRenderTarget.msaa) {
      gl.renderbufferStorageMultisample(
        gl.RENDERBUFFER,
        4,
        gl.DEPTH24_STENCIL8,
        glRenderTarget.width,
        glRenderTarget.height,
      )
    }
    else {
      gl.renderbufferStorage(
        gl.RENDERBUFFER,
        this._renderer.version === 2
          ? gl.DEPTH24_STENCIL8
          : gl.DEPTH_STENCIL,
        glRenderTarget.width,
        glRenderTarget.height,
      )
    }
  }

  protected _resizeColorTextures(renderTarget: RenderTargetLike, glRenderTarget: GlRenderTarget): void {
    renderTarget.colorTextures.forEach((texture) => {
      texture.pixelRatio = this._renderer.pixelRatio
      texture.width = renderTarget.width
      texture.height = renderTarget.height
    })

    if (glRenderTarget.msaa) {
      const renderer = this._renderer
      const gl = renderer.gl
      gl.bindFramebuffer(gl.FRAMEBUFFER, glRenderTarget.framebuffer2!)
      renderTarget.colorTextures.forEach((texture, i) => {
        renderer.texture.bind(texture, 0)
        const glTexture = renderer.texture.getGlTexture(texture)
        const glInternalFormat = glTexture.internalFormat
        const msaaRenderBuffer = glRenderTarget.msaaRenderBuffer[i]
        gl.bindRenderbuffer(gl.RENDERBUFFER, msaaRenderBuffer)
        gl.renderbufferStorageMultisample(
          gl.RENDERBUFFER,
          4,
          glInternalFormat,
          glRenderTarget.width,
          glRenderTarget.height,
        )
        gl.framebufferRenderbuffer(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0 + i,
          gl.RENDERBUFFER,
          msaaRenderBuffer,
        )
      })
    }
  }

  finishRenderPass(viewport: RenderTargetLike): void {
    if (!viewport.msaa)
      return
    const glViewport = this.getGlRenderTarget(viewport)
    const gl = this._renderer.gl as WebGL2RenderingContext
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, glViewport.framebuffer)
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, glViewport.framebuffer2!)
    const width = viewport.width * this._renderer.pixelRatio
    const height = viewport.height * this._renderer.pixelRatio
    gl.blitFramebuffer(
      0, 0, width, height,
      0, 0, width, height,
      gl.COLOR_BUFFER_BIT, gl.NEAREST,
    )
    gl.bindFramebuffer(gl.FRAMEBUFFER, glViewport.framebuffer)
  }

  copyToTexture(
    framebuffer: RenderTargetLike,
    texture: TextureLike,
  ): void {
    const gl = this._renderer.gl
    const glViewport = this.getGlRenderTarget(framebuffer)
    this.finishRenderPass(framebuffer)
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    this._renderer.texture.bind(texture)
    gl.copyTexSubImage2D(
      gl.TEXTURE_2D, 0,
      0, 0,
      0, 0,
      glViewport.width, glViewport.height,
    )
  }

  override reset(): void {
    super.reset()
    this.renderTargets.clear()
    this.glRenderTargets.clear()
    this.current = null
    this._msaaSamples.length = 0
  }
}
