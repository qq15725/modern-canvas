import type { GlTextureUploader } from '../GlTextureUploader'

export const image: GlTextureUploader = {
  id: 'image',
  upload: (source, glTexture, gl, webGLVersion) => {
    const glWidth = glTexture.width
    const glHeight = glTexture.height
    const pixelWidth = source.pixelWidth ?? source.width
    const pixelHeight = source.pixelHeight ?? source.height
    const sourceWidth = source.sourceWidth ?? pixelWidth
    const sourceHeight = source.sourceHeight ?? pixelHeight
    if (sourceWidth < pixelWidth || sourceHeight < pixelHeight) {
      if (glWidth !== pixelWidth || glHeight !== pixelHeight) {
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
          source.source as TexImageSource,
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
          source.source as TexImageSource,
        )
      }
    }
    else if (glWidth === pixelWidth && glHeight === pixelHeight) {
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        glTexture.format,
        glTexture.type,
        source.source as TexImageSource,
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
        source.source as TexImageSource,
      )
    }
    else {
      gl.texImage2D(
        glTexture.target,
        0,
        glTexture.internalFormat,
        glTexture.format,
        glTexture.type,
        source.source as TexImageSource,
      )
    }

    glTexture.width = pixelWidth
    glTexture.height = pixelHeight
  },
}
