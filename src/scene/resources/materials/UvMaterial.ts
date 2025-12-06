import { Material } from './Material'

export class UvMaterial extends Material {
  protected static _instance: UvMaterial
  static get instance(): UvMaterial { return this._instance ??= new this() }

  constructor() {
    super({
      gl: {
        vertex: `in vec2 position;
in vec2 uv;
uniform mat3 projectionMatrix;
uniform mat3 modelViewMatrix;
out vec2 vUv;
void main(void) {
  gl_Position = vec4((projectionMatrix * modelViewMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
  vUv = uv;
}`,
        fragment: `in vec2 vUv;
uniform sampler2D sampler;
uniform vec4 tint;
void main(void) {
  gl_FragColor = texture2D(sampler, vUv) * tint;
}`,
      },
      uniforms: {
        sampler: 0,
        projectionMatrix: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
        modelViewMatrix: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
        tint: new Float32Array([1, 1, 1, 1]),
      },
    })
  }
}
