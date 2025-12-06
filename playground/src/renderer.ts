import type { GeometryLikeObject } from '../../src'
import { BufferUsage, GlProgram, GlRenderer } from '../../src'

const renderer = new GlRenderer()

renderer.resize(500, 500)

document.body.append(renderer.view!)

const glProgram = new GlProgram({
  vertex: `attribute vec2 position;
attribute vec2 uv;
uniform mat3 projectionMatrix;
uniform mat3 modelViewMatrix;
varying vec2 vUv;
void main(void) {
  gl_Position = vec4((projectionMatrix * modelViewMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
  vUv = uv;
}`,
  fragment: `varying vec2 vUv;
uniform sampler2D sampler;
uniform vec4 tint;
void main(void) {
  gl_FragColor = texture2D(sampler, vUv) * tint;
}`,
})

const shader = {
  instanceId: -2,
  glProgram,
  uniforms: {
    sampler: 0,
    projectionMatrix: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
    modelViewMatrix: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
    tint: new Float32Array([0, 0, 0, 1]),
  },
}

const geometry: GeometryLikeObject = {
  instanceId: -2,
  attributes: {
    position: {
      format: 'float32x2',
      buffer: {
        instanceId: -1,
        usage: BufferUsage.vertex,
        data: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
      },
    },
    uv: {
      format: 'float32x2',
      buffer: {
        instanceId: -2,
        usage: BufferUsage.vertex,
        data: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      },
    },
  },
  indexBuffer: {
    instanceId: -3,
    usage: BufferUsage.index,
    data: new Uint32Array([0, 1, 2, 0, 2, 3]),
  },
}

renderer.shader.updateUniforms(shader)
renderer.geometry.bind(geometry, glProgram)
renderer.geometry.draw()

console.warn(glProgram)
console.warn(renderer)
