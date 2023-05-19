import type { QueryOptions } from './query'
import type { RenderNodeOptions } from './render'
import type { System } from './system'
import type { Texture } from './texture'
import type { Shape, UserShape } from './shape'
import type { Node } from './node'
import type { Material, UserMaterial } from './material'
import type { Plugin } from './plugin'
import type { Container } from './container'

export interface App extends Container {
  view: HTMLCanvasElement
  children: Node[]
  context: WebGLRenderingContext
  defaultTexture: WebGLTexture
  framebuffers: {
    buffer: WebGLFramebuffer | null
    depthBuffer: WebGLRenderbuffer | null
    texture: WebGLTexture | null
    resize(): void
  }[]
  drawModes: {
    points: GLenum
    linear: GLenum
    triangles: GLenum
    triangleStrip: GLenum
    triangleFan: GLenum
  }
  slTypes: Record<number, 'float' | 'vec2' | 'vec3' | 'vec4' | 'int' | 'ivec2' | 'ivec3' | 'ivec4' | 'uint' | 'uvec2' | 'uvec3' | 'uvec4' | 'bool' | 'bvec2' | 'bvec3' | 'bvec4' | 'mat2' | 'mat3' | 'mat4' | 'sampler2D' | 'samplerCube' | 'sampler2DArray'>
  extensions: {
    loseContext: WEBGL_lose_context | null
  }
  width: number
  height: number
  plugins: Map<string, Plugin>
  shapes: Map<string, Shape>
  registerShape(name: string, shape: UserShape): void
  materials: Map<string, Material>
  registerMaterial(name: string, material: UserMaterial): void
  textures: Map<number, Texture>
  registerTexture(id: number, source: TexImageSource): Promise<void>
  lastState?: {
    material: string
    shape: string
  }

  // ECS
  // Map<entity-id, node-path>
  entities: Map<number, {
    path: number[]
    archetypeId: string
  }>
  // Map<component-name, component-id>
  components: Map<string, number>
  // Map<archetype-id, entity-id[]>
  archetypes: Map<string, {
    entityIds: Set<number>
    codePoints: number[]
  }>
  systems: System[]
  registerSystem(system: System): void
  query(where?: QueryOptions): Node

  setup(): void
  load(): Promise<void>
  renderNode(options: RenderNodeOptions): void
  render(time?: number): void
  start(): void
  destroy(): void
}
