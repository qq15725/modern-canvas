import type { Reactivable } from 'modern-idoc'
import type { BufferLike } from '../buffer'
import type { Topology, VertexFormat } from './const'

export interface GeometryAttributeLike {
  format: VertexFormat
  buffer: BufferLike
  instance?: boolean
  stride?: number
  offset?: number
  start?: number
  divisor?: number
}

export interface GeometryLikeObject {
  instanceId: number
  topology?: Topology
  attributes: Record<string, GeometryAttributeLike>
  indexBuffer?: BufferLike
  instanceCount?: number
}

export interface GeometryLikeReactiveObject extends GeometryLikeObject, Reactivable {
  //
}

export type GeometryLike
  = | GeometryLikeObject
    | GeometryLikeReactiveObject
