import type { GlProgramOptions, GlRenderer, ShaderLikeReactiveObject } from '../../../core'
import { property } from 'modern-idoc'
import { GlProgram, Resource } from '../../../core'

export interface MaterialProperties {
  gl?: Partial<GlProgramOptions>
  uniforms?: Record<string, any>
}

function getDefaultUniforms(): Record<string, any> {
  return {
    projectionMatrix: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
    modelViewMatrix: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
    tint: new Float32Array([1, 1, 1, 1]),
  }
}

export class Material extends Resource implements ShaderLikeReactiveObject {
  static instance = new this()

  readonly glProgram: GlProgram
  @property({ default: getDefaultUniforms }) declare uniforms: Record<string, any>

  constructor(properties: MaterialProperties = {}) {
    super()
    const { uniforms, gl } = properties
    if (uniforms) {
      this.uniforms = uniforms
    }
    this.glProgram = new GlProgram({
      vertex: `in vec2 position;
uniform mat3 projectionMatrix;
uniform mat3 modelViewMatrix;
void main(void) {
  gl_Position = vec4((projectionMatrix * modelViewMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
}`,
      fragment: `uniform vec4 tint;
void main(void) {
  gl_FragColor = tint;
}`,
      ...gl,
    })
  }

  activate(renderer: GlRenderer, uniforms: Record<string, any> = {}): void {
    renderer.shader.bind(this)
    this.uniforms = {
      ...this.uniforms,
      ...uniforms,
    }
    renderer.shader.updateUniforms(this)
  }
}
