import type { WebGLRenderer } from '../../renderer'
import { Resource } from '../Resource'

export interface MaterialOptions {
  vert?: string
  frag?: string
  uniforms?: Record<string, any>
}

export class Material extends Resource {
  static instance = new this()

  vert: string
  frag: string
  readonly uniforms: Map<string, any>

  constructor(options: MaterialOptions = {}) {
    super()

    this.vert = options.vert ?? `precision highp float;
attribute vec2 position;
uniform mat3 projectionMatrix;
uniform mat3 modelViewMatrix;
void main(void) {
  gl_Position = vec4((projectionMatrix * modelViewMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
}`

    this.frag = options.frag ?? `uniform vec4 tint;
void main(void) {
  gl_FragColor = tint;
}`

    this.uniforms = new Map(Object.entries(options.uniforms ?? {
      projectionMatrix: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
      modelViewMatrix: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
      tint: new Float32Array([1, 1, 1, 1]),
    }))
  }

  /** @internal */
  _glProgram(renderer: WebGLRenderer): WebGLProgram {
    return renderer.getRelated(this, () => {
      let vert = this.vert
      let frag = this.frag
      if (!frag.includes('precision'))
        frag = `precision mediump float;\n${frag}`
      if (!vert.includes('precision'))
        vert = `precision mediump float;\n${vert}`
      return renderer.program.create({ vert, frag })
    })
  }

  activate(renderer: WebGLRenderer, uniforms?: Record<string, any>): void {
    renderer.program.bind(this._glProgram(renderer))

    if (uniforms || this.uniforms.size > 0) {
      renderer.program.updateUniforms({
        ...Object.fromEntries(this.uniforms.entries()),
        ...uniforms,
      })
    }
  }
}
