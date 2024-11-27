import type { WebGLDrawMode, WebGLRenderer } from '../../renderer'
import type { Material } from '../materials/Material'
import type { IndexBuffer } from './IndexBuffer'
import type { VertexAttribute } from './VertexAttribute'
import type { VertexBuffer } from './VertexBuffer'
import { toRaw } from '../../shared'
import { Resource } from '../Resource'

export interface GeometryOptions {
  vertexAttributes?: Record<string, VertexAttribute>
  indexBuffer?: IndexBuffer
  instanceCount?: number
  mode?: WebGLDrawMode
}

export class Geometry extends Resource {
  vertexAttributes: Map<string, VertexAttribute>
  indexBuffer?: IndexBuffer
  instanceCount?: number
  mode: WebGLDrawMode

  protected _materialWeakMap = new WeakMap<Material, Record<string, any>>()

  constructor(options: GeometryOptions = {}) {
    super()

    this.vertexAttributes = new Map(Object.entries(options?.vertexAttributes ?? {}))
    this.indexBuffer = options?.indexBuffer
    this.instanceCount = options?.instanceCount
    this.mode = options?.mode ?? 'triangles'
  }

  /** @internal */
  _glVertexArray(renderer: WebGLRenderer) {
    return {
      attributes: Object.fromEntries(
        Array.from(this.vertexAttributes).map(([key, attrib]) => {
          return [key, {
            buffer: attrib.buffer._glBuffer(renderer),
            size: attrib.size,
            type: attrib.type,
            normalized: attrib.normalized,
            stride: attrib.stride,
            offset: attrib.offset,
            divisor: attrib.divisor,
          }]
        }),
      ),
      elementArrayBuffer: this.indexBuffer?._glBuffer(renderer),
    }
  }

  /** @internal */
  _glVertexArrayObject(renderer: WebGLRenderer, material: Material): WebGLVertexArrayObject | null {
    material = toRaw(material)
    let obj = this._materialWeakMap.get(material)
    if (!obj) {
      obj = {
        material: material.instanceId,
        geometry: this.instanceId,
      }
      this._materialWeakMap.set(material, obj)
    }
    return renderer.getRelated(obj, () => {
      return renderer.vertexArray.create(
        material._glProgram(renderer),
        this._glVertexArray(renderer),
      )
    })
  }

  draw(renderer: WebGLRenderer, material: Material, uniforms?: Record<string, any>): void {
    renderer.flush()
    material.activate(renderer, uniforms)

    const vao = this._glVertexArrayObject(renderer, material)

    let updateVertexArray = false
    let buffer: VertexBuffer | undefined
    this.vertexAttributes.forEach((attribute) => {
      if (buffer?.instanceId !== attribute.buffer.instanceId) {
        buffer = attribute.buffer
        if (buffer!.upload(renderer)) {
          updateVertexArray = true
        }
      }
      if (attribute.upload()) {
        updateVertexArray = true
      }
    })

    if (this.indexBuffer?.upload(renderer)) {
      updateVertexArray = true
    }

    if (updateVertexArray && vao) {
      renderer.vertexArray.update(
        material._glProgram(renderer),
        vao,
        this._glVertexArray(renderer),
      )
    }

    renderer.vertexArray.bind(vao ?? this._glVertexArray(renderer))

    renderer.draw({
      mode: this.mode,
      instanceCount: this.instanceCount,
    })

    renderer.vertexArray.unbind()
  }
}
