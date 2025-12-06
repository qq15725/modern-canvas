import type { Reactivable } from 'modern-idoc'
import type { AlphaMode, CompareFunction, ScaleMode, TextureFormat, WrapMode } from './const'

export type TextureSource
  = | TexImageSource
    | ArrayBufferView
    | null

export interface TextureLikeObject {
  instanceId: number
  uploadMethodId: string
  // source
  source: TextureSource
  format: TextureFormat
  width: number
  height: number
  pixelRatio?: number
  pixelWidth?: number
  pixelHeight?: number
  sourceWidth?: number
  sourceHeight?: number
  alphaMode?: AlphaMode
  // mipmap
  mipmap: boolean
  mipLevelCount: number
  // style
  isPowerOfTwo?: boolean
  addressModeU?: WrapMode
  addressModeV?: WrapMode
  addressModeW?: WrapMode
  magFilter?: ScaleMode
  minFilter?: ScaleMode
  mipmapFilter?: ScaleMode
  compare?: CompareFunction
  maxAnisotropy?: number
}

export interface TextureLikeReactiveObject extends TextureLikeObject, Reactivable {
  //
}

export type TextureLike
  = | TextureLikeObject
    | TextureLikeReactiveObject
