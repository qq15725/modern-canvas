import type { Reactivable } from 'modern-idoc'
import type { GlProgram } from '../../gl/shader/GlProgram'

export interface ShaderLikeObject {
  instanceId: number
  glProgram: GlProgram
  uniforms?: Record<string, any>
}

export interface ShaderLikeReactiveObject extends ShaderLikeObject, Reactivable {
  //
}

export type ShaderLike
  = | ShaderLikeObject
    | ShaderLikeReactiveObject
