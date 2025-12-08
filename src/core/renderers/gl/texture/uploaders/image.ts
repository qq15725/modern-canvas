import type { GlTextureUploader } from '../GlTextureUploader'

export const image: GlTextureUploader = {
  id: 'image',
  upload: (texture, glTexture, gl, webGLVersion) => {
    const glPixelWidth = glTexture.width
    const glPixelHeight = glTexture.height
    const pixelWidth = texture.pixelWidth ?? texture.width
    const pixelHeight = texture.pixelHeight ?? texture.height
    const sourceWidth = texture.sourceWidth ?? pixelWidth
    const sourceHeight = texture.sourceHeight ?? pixelHeight
    if (sourceWidth < pixelWidth || sourceHeight < pixelHeight) {
      if (glPixelWidth !== pixelWidth || glPixelHeight !== pixelHeight) {
        gl.texImage2D(
          glTexture.target,
          0,
          glTexture.internalFormat,
          pixelWidth,
          pixelHeight,
          0,
          glTexture.format,
          glTexture.type,
          null,
        )
      }

      if (webGLVersion === 2) {
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          0,
          sourceWidth,
          sourceHeight,
          glTexture.format,
          glTexture.type,
          texture.source as TexImageSource,
        )
      }
      else {
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          0,
          glTexture.format,
          glTexture.type,
          texture.source as TexImageSource,
        )
      }
    }
    else if (glPixelWidth === pixelWidth && glPixelHeight === pixelHeight) {
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        glTexture.format,
        glTexture.type,
        texture.source as TexImageSource,
      )
    }
    else if (webGLVersion === 2) {
      gl.texImage2D(
        glTexture.target,
        0,
        glTexture.internalFormat,
        pixelWidth,
        pixelHeight,
        0,
        glTexture.format,
        glTexture.type,
        texture.source as TexImageSource,
      )
    }
    else {
      gl.texImage2D(
        glTexture.target,
        0,
        glTexture.internalFormat,
        glTexture.format,
        glTexture.type,
        texture.source as TexImageSource,
      )
    }

    glTexture.width = pixelWidth
    glTexture.height = pixelHeight
  },
}
