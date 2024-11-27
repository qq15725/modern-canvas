import type { WebGLVertexArrayObjectMeta, WebGLVertexArrayObjectOptions, WebGLVertexAttrib } from '../types'
import type { WebGLRenderer } from '../WebGLRenderer'
import { WebGLModule } from './WebGLModule'

declare module '../WebGLRenderer' {
  interface WebGLRenderer {
    vertexArray: WebGLVertexArrayModule
  }
}

export class WebGLVertexArrayModule extends WebGLModule {
  override install(renderer: WebGLRenderer): void {
    super.install(renderer)
    renderer.vertexArray = this
  }

  boundVertexArrayNull: WebGLVertexArrayObjectMeta = {
    attributes: {},
    elementArrayBuffer: null,
  }

  boundVertexArrayObject: WebGLVertexArrayObject | null = null
  boundVertexArray: WebGLVertexArrayObjectMeta = this.boundVertexArrayNull

  enableVertexAttrib(
    key: string,
    location: number,
    attrib: WebGLVertexAttrib,
    dimension = 1,
  ): void {
    const {
      buffer,
      size = 0,
      type = 'float',
      normalized = false,
      stride = 0,
      offset = 0,
      divisor,
    } = attrib

    const gl = this._renderer.gl
    this._renderer.buffer.bind({ target: 'array_buffer', value: buffer })

    for (let i = 0; i < dimension; i++) {
      gl.enableVertexAttribArray(location + i)
      gl.vertexAttribPointer(
        location + i,
        size,
        this._renderer.getBindPoint(type),
        normalized,
        stride,
        offset + (stride - offset) / dimension * i,
      )
    }

    // ext: instancedArrays
    if (divisor) {
      if ('vertexAttribDivisor' in gl) {
        gl.vertexAttribDivisor(location, divisor)
      }
      else {
        console.warn('Failed to active vertex array object, GPU Instancing is not supported on this device')
      }
    }

    this.boundVertexArray.attributes[key] = {
      enable: true,
      ...attrib,
    }
  }

  create(options?: WebGLVertexArrayObjectOptions): WebGLVertexArrayObject | null
  create(program?: WebGLProgram, options?: WebGLVertexArrayObjectOptions): WebGLVertexArrayObject | null
  create(...args: any[]): WebGLVertexArrayObject | null {
    const gl = this._renderer.gl

    if (!('createVertexArray' in gl)) {
      return null
    }

    const vertexArray = gl.createVertexArray()

    if (!vertexArray) {
      throw new Error('Unable to create vertex array')
    }

    if (args.length === 2) {
      this.update(args[0], vertexArray, args[1])
    }
    else if (args.length === 1) {
      this.update(vertexArray, args[0])
    }

    return vertexArray
  }

  getVertexArrayMeta(vertexArray: WebGLVertexArrayObject): WebGLVertexArrayObjectMeta {
    return this._renderer.getRelated(vertexArray, () => {
      return {
        attributes: {},
        elementArrayBuffer: null,
      }
    })
  }

  update(options: WebGLVertexArrayObjectOptions): void
  update(vertexArray: WebGLVertexArrayObject, options: WebGLVertexArrayObjectOptions): void
  update(program: WebGLProgram, vertexArray: WebGLVertexArrayObject, options: WebGLVertexArrayObjectOptions): void
  update(...args: any[]): void {
    if (args.length > 2) {
      this._renderer.program.bind(args[0])
      this.update(args[1], args[2])
      return
    }
    else if (args.length === 2) {
      if (args[0]) {
        const vao = args[0] as WebGLVertexArrayObject
        const options = args[1] as WebGLVertexArrayObjectOptions
        const meta = this.getVertexArrayMeta(vao)
        this.bind(vao)
        this.update(options)
        meta.attributes = this.boundVertexArray.attributes
        meta.elementArrayBuffer = this.boundVertexArray.elementArrayBuffer
        this.unbind()
        this._renderer.buffer.unbind('array_buffer')
        return
      }
      else {
        return this.update(args[1])
      }
    }

    const program = this._renderer.program.boundProgram

    if (!program)
      return
    const options = args[0] as WebGLVertexArrayObjectOptions

    // active vertex attrib
    if (options.attributes) {
      const programMeta = this._renderer.program.getMeta(program)
      const stride: Record<number, number> = {}
      const attributes: Record<string, any> = {}
      for (const key in options.attributes) {
        const value = options.attributes[key]
        const info = programMeta.attributes.get(key)
        let attrib: WebGLVertexAttrib
        if ('buffer' in value) {
          attrib = { ...value }
        }
        else {
          attrib = { buffer: value }
        }
        attrib.size = attrib.size || info?.size || 0
        const meta = this._renderer.buffer.getMeta(attrib.buffer)
        const dimension = Number(info?.type.match(/mat(\d)/)?.[1] ?? 1)
        let byteLength
        switch (attrib.type) {
          case 'unsigned_byte':
            byteLength = attrib.size!
            break
          case 'unsigned_short':
            byteLength = attrib.size! * 2
            break
          case 'float':
          default:
            byteLength = attrib.size! * 4
            break
        }
        byteLength *= dimension
        stride[meta.id] ??= 0
        stride[meta.id] += byteLength
        attributes[key] = { attrib, meta, info, byteLength, dimension }
      }

      const offset: Record<number, number> = {}
      for (const key in attributes) {
        const { attrib, meta, info, byteLength, dimension } = attributes[key]

        if (info?.location !== undefined) {
          offset[meta.id] ??= 0
          attrib.offset ??= offset[meta.id]
          attrib.stride ??= stride[meta.id] === byteLength ? 0 : stride[meta.id]
          this.enableVertexAttrib(key, info.location, attrib, dimension)
          offset[meta.id] += byteLength
        }
      }
    }

    // active index buffer
    const elementArrayBuffer = options.elementArrayBuffer ?? null
    this._renderer.buffer.bind({
      target: 'element_array_buffer',
      value: elementArrayBuffer,
    })
    this.boundVertexArray.elementArrayBuffer = elementArrayBuffer
  }

  bind(vertexArrayObject: WebGLVertexArrayObject | null | WebGLVertexArrayObjectOptions): void {
    const gl = this._renderer.gl

    if (vertexArrayObject && 'attributes' in vertexArrayObject) {
      this.update(vertexArrayObject)
    }
    else if ('bindVertexArray' in gl) {
      // changed
      const oldValue = this.boundVertexArrayObject
      const changed = {
        value: vertexArrayObject !== oldValue,
      }

      // bind vertex array
      if (changed.value) {
        gl.bindVertexArray(vertexArrayObject)
        this.boundVertexArrayObject = vertexArrayObject
        if (vertexArrayObject) {
          this.boundVertexArray = { ...this.getVertexArrayMeta(vertexArrayObject) }
        }
        else {
          this.boundVertexArray = this.boundVertexArrayNull
        }
      }
    }
  }

  unbind(): void {
    return this.bind(null)
  }

  override reset(): void {
    super.reset()
    this.boundVertexArrayNull = {
      attributes: {},
      elementArrayBuffer: null,
    }
    this.boundVertexArray = this.boundVertexArrayNull
    this.boundVertexArrayObject = null
  }
}
