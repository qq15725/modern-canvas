import type { TextureLike } from '../../shared'
import type { GlRenderer } from '../GlRenderer'
import type {
  GlRenderingContext,
  GlTextureLocation,
} from '../types'
import type { GlTextureUploader } from './GlTextureUploader'
import { GlSystem } from '../system'
import { GlTexture } from './GlTexture'
import { mapFormatToGlFormat } from './mapFormatToGlFormat'
import { mapFormatToGlInternalFormat } from './mapFormatToGlInternalFormat'
import { mapFormatToGlType } from './mapFormatToGlType'
import { updateTextureStyle } from './updateTextureStyle'
import uploaders from './uploaders'

export class GlTextureSystem extends GlSystem {
  uploaders: Record<string, GlTextureUploader> = {
    ...uploaders,
  }

  readonly textures = new Map<number, TextureLike>()
  readonly glTextures = new Map<number, GlTexture>()
  protected _mapFormatToInternalFormat: Record<string, number> = Object.create(null)
  protected _mapFormatToType: Record<string, number> = Object.create(null)
  protected _mapFormatToFormat: Record<string, number> = Object.create(null)
  protected _premultiplyAlpha = false

  maxTextureSize = 0
  maxTextureImageUnits = 0

  protected _location: GlTextureLocation = 0
  current: (TextureLike | null)[] = []

  override install(renderer: GlRenderer): void {
    super.install(renderer)
    renderer.texture = this
  }

  protected override _updateContext(gl: GlRenderingContext): void {
    super._updateContext(gl)

    if (!Object.keys(this._mapFormatToInternalFormat).length) {
      this._mapFormatToInternalFormat = mapFormatToGlInternalFormat(gl, this._renderer.extensions)
      this._mapFormatToType = mapFormatToGlType(gl)
      this._mapFormatToFormat = mapFormatToGlFormat(gl)
    }

    this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
    this.maxTextureImageUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)

    for (let i = 0; i < this.maxTextureImageUnits; i++) {
      this.unbind(i)
    }
  }

  getGlTexture(texture: TextureLike): GlTexture {
    return this.glTextures.get(texture.instanceId)
      || this._createGlTexture(texture)
  }

  protected _createGlTexture(texture: TextureLike): GlTexture {
    const gl = this._gl
    const glTexture = new GlTexture(gl.createTexture())
    gl.bindTexture(glTexture.target, glTexture.native)
    glTexture.type = this._mapFormatToType[texture.format]
    glTexture.internalFormat = this._mapFormatToInternalFormat[texture.format]
    glTexture.format = this._mapFormatToFormat[texture.format]
    this.glTextures.set(texture.instanceId, glTexture)
    if (
      texture.mipmap
      && (this._renderer.supports.nonPowOf2mipmaps || texture.isPowerOfTwo)
    ) {
      const biggestDimension = Math.max(texture.width, texture.height)
      texture.mipLevelCount = Math.floor(Math.log2(biggestDimension)) + 1
    }
    if (!this.textures.get(texture.instanceId)) {
      if ('on' in texture) {
        texture.on('updateProperty', (key) => {
          switch (key) {
            case 'width':
            case 'height':
            case 'pixelRatio':
            case 'alphaMode':
            case 'source':
              this.updateGpuTexture(texture)
              break
            case 'addressModeU':
            case 'addressModeV':
            case 'addressModeW':
            case 'magFilter':
            case 'minFilter':
            case 'mipmapFilter':
            case 'compare':
            case 'maxAnisotropy':
              this.updateStyle(texture)
              break
            // texture.on('unload', this._sourceUnload)
            case 'mipmap':
            case 'mipLevelCount':
              this.updateMipmap(texture)
              break
          }
        })
        texture.on('destroy', () => {
          this.textures.delete(texture.instanceId)
          this._sourceUnload(texture)
        })
      }
      this.textures.set(texture.instanceId, texture)
    }
    this.updateGpuTexture(texture)
    this.updateStyle(texture)
    return glTexture
  }

  bind(texture?: TextureLike | null, location = this._location): void {
    const gl = this._gl
    const _texture = texture ?? null
    // if (texture) {
    //   texture._touched = this._renderer.textureGC.count
    // }
    if (this.current[location] !== _texture) {
      this.current[location] = _texture
      this._activateLocation(location)
      if (_texture) {
        const glTexture = this.getGlTexture(_texture)
        gl.bindTexture(glTexture.target, glTexture.native)
      }
      else {
        gl.bindTexture(gl.TEXTURE_2D, null)
      }
    }
  }

  protected _activateLocation(location: number): void {
    if (this._location !== location) {
      this._location = location
      const gl = this._gl
      gl.activeTexture(gl.TEXTURE0 + location)
    }
  }

  unbind(source: TextureLike | number): void {
    const isNum = typeof source === 'number'
    const gl = this._gl
    for (let i = 0; i < this.maxTextureImageUnits; i++) {
      const texture = this.current[i]
      if (
        texture
        && (
          isNum
            ? i === source
            : texture.instanceId === source.instanceId
        )
      ) {
        this._activateLocation(i)
        gl.bindTexture(this.getGlTexture(texture).target, null)
        this.current[i] = null
      }
    }
  }

  protected _sourceUnload(source: TextureLike): void {
    const gl = this._gl
    const glTexture = this.glTextures.get(source.instanceId)
    if (!glTexture)
      return
    this.unbind(source)
    this.glTextures.delete(source.instanceId)
    gl.deleteTexture(glTexture.native)
  }

  updateStyle(texture: TextureLike, firstCreation = false): void {
    const gl = this._gl
    updateTextureStyle(
      texture,
      gl,
      texture.mipLevelCount > 1,
      this._renderer.extensions.anisotropicFiltering,
      'texParameteri',
      gl.TEXTURE_2D,
      !this._renderer.supports.nonPowOf2wrapping && !texture.isPowerOfTwo,
      firstCreation,
    )
  }

  updateGpuTexture(texture: TextureLike): void {
    this.bind(texture)
    const glTexture = this.getGlTexture(texture)
    const gl = this._gl
    const premultipliedAlpha = texture.alphaMode === 'premultiply-alpha-on-upload'
    if (this._premultiplyAlpha !== premultipliedAlpha) {
      this._premultiplyAlpha = premultipliedAlpha
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultipliedAlpha)
    }

    if (this.uploaders[texture.uploadMethodId]) {
      this.uploaders[texture.uploadMethodId].upload(
        texture,
        glTexture,
        gl,
        this._renderer.version,
      )
    }
    else {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        texture.pixelWidth ?? texture.width,
        texture.pixelHeight ?? texture.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      )
    }

    if (texture.mipmap && texture.mipLevelCount > 1) {
      this.updateMipmap(texture)
    }
  }

  updateMipmap(texture: TextureLike): void {
    this.bind(texture)
    this._gl.generateMipmap(this.getGlTexture(texture).target)
  }

  override reset(): void {
    super.reset()
    this.textures.clear()
    this.glTextures.clear()
    this.maxTextureImageUnits = 0
    this._location = 0
    this.current.length = 0
    const gl = this._gl
    this._premultiplyAlpha = false
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this._premultiplyAlpha)
  }
}
