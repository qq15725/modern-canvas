import type { Reactivable } from 'modern-idoc'
import type { BufferUsage } from './const'

export type TypedArray
  = | Int8Array
    | Uint8Array
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Uint8ClampedArray
    | Float32Array
    | Float64Array

export interface BufferLikeObject {
  instanceId: number
  usage: BufferUsage
  data: TypedArray
}

export interface BufferLikeReactiveObject extends BufferLikeObject, Reactivable {
  //
}

export type BufferLike
  = | BufferLikeObject
    | BufferLikeReactiveObject
