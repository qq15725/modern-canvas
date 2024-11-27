import type { WebGLTextureLocation, WebGLTextureMeta, WebGLTextureOptions, WebGLTextureTarget } from '../types'
import type { WebGLRenderer } from '../WebGLRenderer'
import { getChanged } from './utils'
import { WebGLModule } from './WebGLModule'

declare module '../WebGLRenderer' {
  interface WebGLRenderer {
    texture: WebGLTextureModule
  }
}

export class WebGLTextureModule extends WebGLModule {
  override install(renderer: WebGLRenderer): void {
    super.install(renderer)
    renderer.texture = this
  }

  maxUnits = 0
  boundLocation: WebGLTextureLocation = 0
  boundTarget: WebGLTextureTarget = 'texture_2d'
  boundTextures: Record<WebGLTextureTarget, WebGLTexture | null>[] = []
  emptyTextures: Record<WebGLTextureTarget, WebGLTexture | null> = {
    texture_2d: null,
    texture_cube_map: null,
  }

  override onUpdateContext(): void {
    super.onUpdateContext()
    const gl = this.gl

    this.maxUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)
    for (let i = 0; i < this.maxUnits; i++) {
      this.boundTextures[i] = { texture_2d: null, texture_cube_map: null }
    }

    const emptyTexture2D = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, emptyTexture2D)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
    const emptyTextureCubeMap = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, emptyTextureCubeMap)
    for (let i = 0; i < 6; i++) {
      gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    }
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    this.emptyTextures = {
      texture_2d: emptyTexture2D,
      texture_cube_map: emptyTextureCubeMap,
    }

    for (let len = this.boundTextures.length, i = 0; i < len; i++) {
      this.unbind(i)
    }
  }

  create(options?: WebGLTextureOptions): WebGLTexture {
    const texture = this.gl.createTexture()

    if (!texture) {
      throw new Error('Unable to create texture')
    }

    if (options) {
      this.bind({
        location: options.location,
        target: options.target,
        value: texture,
        forceUpdateLocation: true,
      })

      this.update({
        filterMode: 'linear',
        wrapMode: 'repeat',
        ...options,
      })
    }

    return texture
  }

  getMeta(texture: WebGLTexture): WebGLTextureMeta {
    return this._renderer.getRelated(texture, () => {
      return {}
    })
  }

  update(options: WebGLTextureOptions): void
  update(texture: WebGLTexture, options: WebGLTextureOptions): void
  update(...args: any[]): void {
    if (args.length > 1) {
      this.bind({
        location: args[1].location,
        target: args[1].target,
        value: args[0] as WebGLTexture,
        forceUpdateLocation: true,
      })

      this.update(args[1])
      return
    }

    const options = args[0] as WebGLTextureOptions
    const { value, ...restOptions } = options

    const texture = this.boundTextures[this.boundLocation][options.target ?? this.boundTarget]
    if (!texture)
      return

    const gl = this.gl

    const meta = this.getMeta(texture)
    const changed = getChanged(meta, restOptions)
    Object.assign(meta, restOptions)

    const glTarget = this._renderer.getBindPoint(meta.target ?? this.boundTarget)

    // TODO lazy texImage2D
    if (value !== undefined) {
      if (value === null) {
        gl.texImage2D(glTarget, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      }
      else if ('pixels' in value) {
        gl.texImage2D(glTarget, 0, gl.RGBA, value.width, value.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, value.pixels)
      }
      else {
        gl.texImage2D(glTarget, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, value)
      }
    }

    if (changed.wrapMode && meta.wrapMode) {
      const glWrapMode = this._renderer.getBindPoint(meta.wrapMode)
      gl.texParameteri(glTarget, gl.TEXTURE_WRAP_S, glWrapMode)
      gl.texParameteri(glTarget, gl.TEXTURE_WRAP_T, glWrapMode)
    }

    const filterMode = meta.filterMode
    if (changed.filterMode && filterMode) {
      const glFilterMode = this._renderer.getBindPoint(filterMode.split('_')[0] as any)
      if (filterMode.includes('_')) {
        gl.texParameteri(glTarget, gl.TEXTURE_MIN_FILTER, this._renderer.getBindPoint(filterMode))
      }
      else {
        gl.texParameteri(glTarget, gl.TEXTURE_MIN_FILTER, glFilterMode)
      }
      gl.texParameteri(glTarget, gl.TEXTURE_MAG_FILTER, glFilterMode)
    }

    // ext: anisotropicFiltering
    if (
      meta.anisoLevel
      && filterMode === 'linear'
      && this._renderer.extensions.anisotropicFiltering
    ) {
      if (changed.anisoLevel) {
        const {
          MAX_TEXTURE_MAX_ANISOTROPY_EXT,
          TEXTURE_MAX_ANISOTROPY_EXT,
        } = this._renderer.extensions.anisotropicFiltering

        gl.texParameterf(
          glTarget,
          TEXTURE_MAX_ANISOTROPY_EXT,
          Math.min(
            meta.anisoLevel,
            gl.getParameter(MAX_TEXTURE_MAX_ANISOTROPY_EXT),
          ),
        )
      }
    }
  }

  bind(
    texture: {
      location?: WebGLTextureLocation
      forceUpdateLocation?: boolean
      target?: WebGLTextureTarget
      value: WebGLTexture | null
    } | null,
  ): void {
    const gl = this.gl

    // normalization params
    let value, target: WebGLTextureTarget | undefined, location, forceUpdateLocation
    if (texture && 'value' in texture) {
      ({ target, value, location, forceUpdateLocation } = texture)
    }
    else {
      value = texture
    }
    if (value) {
      const meta = this.getMeta(value)
      meta.target = target ??= meta.target ?? 'texture_2d'
      meta.location = location ??= meta.location ?? 0
    }
    else {
      target ??= 'texture_2d'
      location ??= 0
    }

    // get or init texture location
    let textureUnit = this.boundTextures[location]
    if (!textureUnit) {
      this.boundTextures[location] = textureUnit = { texture_2d: null, texture_cube_map: null }
    }

    // changed
    const oldValue = textureUnit[target] ?? null
    const oldLocation = this.boundLocation
    const changedTexture = value !== oldValue
    const changed = {
      location: location !== oldLocation && (changedTexture || forceUpdateLocation),
      texture: changedTexture,
    }

    // active and bind
    const glTarget = this._renderer.getBindPoint(target)
    if (changed.location) {
      gl.activeTexture(gl.TEXTURE0 + location)
      this.boundLocation = location
    }
    if (changed.texture) {
      gl.bindTexture(glTarget, value ?? this.emptyTextures[target])
      textureUnit[target] = value
    }
    this.boundTarget = target
  }

  unbind(location: number, target?: WebGLTextureTarget): void
  unbind(texture: WebGLTexture): void
  unbind(texture: WebGLTexture | number, target: WebGLTextureTarget = 'texture_2d'): void {
    const gl = this._renderer.gl
    if (typeof texture === 'number') {
      this.bind({ value: null, target, location: texture })
    }
    else {
      const meta = this.getMeta(texture)
      const { target = this.boundTarget } = meta
      const glTarget = this._renderer.getBindPoint(target)
      for (let i = 0; i < this.boundTextures.length; i++) {
        if (this.boundTextures[i][target] === texture) {
          if (this.boundLocation !== i) {
            gl.activeTexture(gl.TEXTURE0 + i)
            this.boundLocation = i
          }
          gl.bindTexture(glTarget, this.emptyTextures[target])
          this.boundTextures[i][target] = null
        }
      }
    }
  }

  override reset(): void {
    super.reset()
    this.boundLocation = 0
    this.boundTarget = 'texture_2d'
    this.boundTextures = []
    this.maxUnits = 0
  }
}
