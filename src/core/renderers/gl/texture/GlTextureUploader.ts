import type { TextureLikeObject } from '../../shared'
import type { GlRenderingContext } from '../types'
import type { GlTexture } from './GlTexture'

/** @internal */
export interface GlTextureUploader {
  id: string
  upload: (
    texture: TextureLikeObject,
    glTexture: GlTexture,
    gl: GlRenderingContext,
    webGLVersion: number,
  ) => void
}
