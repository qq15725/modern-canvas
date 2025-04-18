import type { WebGLFramebufferMeta, WebGLFramebufferOptions } from '../types'
import type { WebGLRenderer } from '../WebGLRenderer'
import { WebGLModule } from './WebGLModule'

export class WebGLFramebufferModule extends WebGLModule {
  override install(renderer: WebGLRenderer): void {
    super.install(renderer)
    renderer.framebuffer = this
  }

  boundFramebuffer: WebGLFramebuffer | null = null
  protected _msaaSamples: number[] = []
  protected _hasMRT = true
  protected _writeDepthTexture = true

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

  create(options?: WebGLFramebufferOptions): WebGLFramebuffer {
    const framebuffer = this._renderer.gl.createFramebuffer()

    if (!framebuffer) {
      throw new Error('Unable to create framebuffer')
    }

    if (options) {
      this.bind(framebuffer)
      this.update(options)
    }

    return framebuffer
  }

  getMeta(framebuffer: WebGLFramebuffer): WebGLFramebufferMeta {
    return this._renderer.getRelated(framebuffer, () => {
      return {
        width: 0,
        height: 0,
        mipLevel: 0,
        stencil: false,
        depth: false,
        depthTexture: null,
        colorTextures: [],
        multisample: 0,
      }
    })
  }

  update(options: WebGLFramebufferOptions): void
  update(framebuffer: WebGLFramebuffer, options: WebGLFramebufferOptions): void
  update(...args: any[]): void {
    if (args.length > 1) {
      this.bind(args[0])
      return this.update(args[1])
    }

    const framebuffer = this.boundFramebuffer
    if (!framebuffer)
      return

    const options = args[0] as WebGLFramebufferOptions

    const meta = this.getMeta(framebuffer)
    Object.assign(meta, { ...options })

    const gl = this._renderer.gl

    let count = meta.colorTextures.length
    if (!('drawBuffers' in gl)) {
      count = Math.min(count, 1)
    }

    for (let i = 0; i < count; i++) {
      const texture = meta.colorTextures[i]

      this._renderer.texture.bind({
        location: 0,
        target: 'texture_2d',
        value: texture,
        forceUpdateLocation: true,
      })

      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0 + i,
        gl.TEXTURE_2D,
        texture,
        meta.mipLevel,
      )

      this._renderer.texture.unbind(texture)
    }

    if (count > 1) {
      (gl as any).drawBuffers(
        meta.colorTextures.map((_, i) => gl.COLOR_ATTACHMENT0 + i),
      )
    }

    if (meta.depthTexture && (this._renderer.version > 1 || this._renderer.extensions.depthTexture)) {
      this._renderer.texture.bind({
        location: 0,
        target: 'texture_2d',
        value: meta.depthTexture,
        forceUpdateLocation: true,
      })

      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.DEPTH_ATTACHMENT,
        gl.TEXTURE_2D,
        meta.depthTexture,
        meta.mipLevel,
      )

      this._renderer.texture.unbind(meta.depthTexture)
    }

    if (
      (meta.stencilBuffer || meta.stencil || meta.depth)
      && !(meta.depthTexture && this._writeDepthTexture)
    ) {
      meta.stencilBuffer ??= gl.createRenderbuffer()

      gl.bindRenderbuffer(gl.RENDERBUFFER, meta.stencilBuffer)

      const { attachment, format } = this._getAttachmentAndFormat(meta)

      if (meta.msaaBuffer) {
        (gl as WebGL2RenderingContext).renderbufferStorageMultisample(
          gl.RENDERBUFFER,
          meta.multisample,
          format,
          meta.width,
          meta.height,
        )
      }
      else {
        gl.renderbufferStorage(
          gl.RENDERBUFFER,
          format,
          meta.width * this._renderer.pixelRatio,
          meta.height * this._renderer.pixelRatio,
        )
      }

      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, attachment, gl.RENDERBUFFER, meta.stencilBuffer)
    }
    else if (meta.stencilBuffer) {
      gl.deleteRenderbuffer(meta.stencilBuffer)
      meta.stencilBuffer = null
    }
  }

  protected _getAttachmentAndFormat(meta: WebGLFramebufferMeta): { attachment: number, format: number } {
    const gl = this.gl
    let attachment
    let format
    if (this._renderer.version === 1) {
      attachment = gl.DEPTH_STENCIL_ATTACHMENT
      format = gl.DEPTH_STENCIL
    }
    else if (meta.depth && meta.stencil) {
      attachment = gl.DEPTH_STENCIL_ATTACHMENT
      format = (gl as WebGL2RenderingContext).DEPTH24_STENCIL8
    }
    else if (meta.depth) {
      attachment = gl.DEPTH_ATTACHMENT
      format = (gl as WebGL2RenderingContext).DEPTH_COMPONENT24
    }
    else {
      attachment = gl.STENCIL_ATTACHMENT
      format = gl.STENCIL_INDEX8
    }
    return { attachment, format }
  }

  resize(framebuffer: WebGLFramebuffer, width: number, height: number): void {
    const gl = this.gl
    const meta = this.getMeta(framebuffer)
    Object.assign(meta, { width, height })

    if (meta.stencil) {
      const { format } = this._getAttachmentAndFormat(meta)
      gl.bindRenderbuffer(gl.RENDERBUFFER, meta.stencil)
      if (meta.msaaBuffer) {
        (gl as WebGL2RenderingContext).renderbufferStorageMultisample(
          gl.RENDERBUFFER,
          meta.multisample,
          format,
          meta.width,
          meta.height,
        )
      }
      else {
        gl.renderbufferStorage(gl.RENDERBUFFER, format, meta.width, meta.height)
      }
    }

    let count = meta.colorTextures.length
    if (!(gl as WebGL2RenderingContext).drawBuffers) {
      count = Math.min(count, 1)
    }

    for (let i = 0; i < count; i++) {
      const texture = meta.colorTextures[i]

      this._renderer.texture.update(texture, {
        value: {
          pixels: null,
          width: meta.width,
          height: meta.height,
        },
      })

      if (i === 0 && meta.msaaBuffer) {
        gl.bindRenderbuffer(gl.RENDERBUFFER, meta.msaaBuffer)
        ;(gl as WebGL2RenderingContext).renderbufferStorageMultisample(
          gl.RENDERBUFFER,
          meta.multisample,
          gl.RGBA,
          meta.width,
          meta.height,
        )
      }
    }

    if (meta.depthTexture) {
      this._renderer.texture.update(meta.depthTexture, {
        value: {
          pixels: null,
          width: meta.width,
          height: meta.height,
        },
      })
    }
  }

  bind(framebuffer: WebGLFramebuffer | null): void {
    const gl = this._renderer.gl

    // changed
    const value = framebuffer
    const oldValue = this.boundFramebuffer
    const changed = {
      value: oldValue !== value,
    }

    // bind framebuffer
    if (changed.value) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, value)
      this.boundFramebuffer = value
    }

    if (value) {
      const meta = this.getMeta(value)

      for (let i = 0; i < meta.colorTextures.length; i++) {
        this._renderer.texture.unbind(meta.colorTextures[i])
      }

      if (meta.depthTexture) {
        this._renderer.texture.unbind(meta.depthTexture)
      }

      const mipWidth = (meta.width >> meta.mipLevel)
      const mipHeight = (meta.height >> meta.mipLevel)

      this._renderer.viewport.bind({
        x: 0,
        y: 0,
        width: mipWidth * this._renderer.pixelRatio,
        height: mipHeight * this._renderer.pixelRatio,
      })
    }
    else {
      this._renderer.viewport.bind({
        x: 0,
        y: 0,
        width: this._renderer.screen.width * this._renderer.pixelRatio,
        height: this._renderer.screen.height * this._renderer.pixelRatio,
      })
    }
  }

  forceStencil(): void {
    const framebuffer = this.boundFramebuffer

    if (!framebuffer) {
      return
    }

    const meta = this.getMeta(framebuffer)

    if (!meta || meta.stencilBuffer) {
      return
    }

    const gl = this._renderer.gl

    meta.stencilBuffer = gl.createRenderbuffer()

    gl.bindRenderbuffer(gl.RENDERBUFFER, meta.stencilBuffer)

    let attachment: number
    let format: number
    if (this._renderer.version === 1) {
      attachment = gl.DEPTH_STENCIL_ATTACHMENT
      format = gl.DEPTH_STENCIL
    }
    else if (meta.depth) {
      attachment = gl.DEPTH_STENCIL_ATTACHMENT
      format = (gl as WebGL2RenderingContext).DEPTH24_STENCIL8
    }
    else {
      attachment = gl.STENCIL_ATTACHMENT
      format = gl.STENCIL_INDEX8
    }

    if (meta.msaaBuffer) {
      (gl as WebGL2RenderingContext).renderbufferStorageMultisample(
        gl.RENDERBUFFER,
        meta.multisample,
        format,
        meta.width * this._renderer.pixelRatio,
        meta.height * this._renderer.pixelRatio,
      )
    }
    else {
      gl.renderbufferStorage(
        gl.RENDERBUFFER,
        format,
        meta.width * this._renderer.pixelRatio,
        meta.height * this._renderer.pixelRatio,
      )
    }

    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, attachment, gl.RENDERBUFFER, meta.stencilBuffer)
  }

  override reset(): void {
    super.reset()
    this.boundFramebuffer = null
  }
}
