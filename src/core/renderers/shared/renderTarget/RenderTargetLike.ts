import type { Reactivable } from 'modern-idoc'
import type { TextureLike } from '../texture'

export interface RenderTargetLikeObject {
  instanceId: number
  width: number
  height: number
  colorTextures: TextureLike[]
  isRoot?: boolean
  mipLevel?: number
  msaa?: boolean
  stencil?: boolean
  depth?: boolean
}

export interface RenderTargetLikeReactiveObject extends RenderTargetLikeObject, Reactivable {
  //
}

export type RenderTargetLike
  = | RenderTargetLikeObject
    | RenderTargetLikeReactiveObject
