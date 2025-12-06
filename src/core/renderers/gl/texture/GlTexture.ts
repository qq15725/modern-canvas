import { GlFormat, GlTarget, GlType } from './const'

export class GlTexture {
  target = GlTarget.TEXTURE_2D
  width = -1
  height = -1
  mipmap = false
  type = GlType.UNSIGNED_BYTE
  internalFormat = GlFormat.RGBA
  format = GlFormat.RGBA

  constructor(
    public native: WebGLTexture,
  ) {
    //
  }
}
