import { render, renderNode } from './render'
import { createContainer } from './container'
import { registerMaterial } from './material'
import { registerShape } from './shape'
import { setup } from './setup'
import { query } from './query'
import { registerTexture } from './texture'
import { registerSystem } from './system'
import type { Options } from './options'
import type { App } from './app'

export function createApp(options: Options = {}): App {
  const {
    view = document.createElement('canvas'),
    children = [],
    plugins: userPlugins = [],
  } = options

  const app = createContainer() as App
  app.view = view
  app.nodeLastId = 0
  app.nodeIdPathMap = new Map()

  app.singleton('context', () => {
    const { view } = app
    // TODO support webgl2
    const context = (
      view.getContext('webgl', options)
      || view.getContext('experimental-webgl', options)
    ) as WebGLRenderingContext
    if (!context) throw new Error('failed to getContext for webgl')

    // init
    const width = context.drawingBufferWidth
    const height = context.drawingBufferHeight
    context.viewport(0, 0, width, height)

    context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, true)
    context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    context.clearColor(0, 0, 0, 0)
    context.enable(context.DEPTH_TEST)
    context.enable(context.CULL_FACE)
    context.enable(context.BLEND)
    context.blendFunc(context.ONE, context.ONE_MINUS_SRC_ALPHA)
    context.depthMask(false)

    return context
  })

  app.singleton('defaultTexture', () => {
    const { context, width, height } = app
    const texture = context.createTexture()
    context.bindTexture(context.TEXTURE_2D, texture)
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)
    context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, width, height, 0, context.RGBA, context.UNSIGNED_BYTE, null)
    return texture
  })

  app.singleton('framebuffers', () => {
    const { context } = app
    return Array.from({ length: 2 }, () => {
      const texture = context.createTexture()
      const buffer = context.createFramebuffer()
      const depthBuffer = context.createRenderbuffer()
      function resize() {
        const { width, height } = app
        context.bindTexture(context.TEXTURE_2D, texture)
        context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, width, height, 0, context.RGBA, context.UNSIGNED_BYTE, null)
        context.bindRenderbuffer(context.RENDERBUFFER, depthBuffer)
        context.renderbufferStorage(context.RENDERBUFFER, context.DEPTH_COMPONENT16, width, height)
      }
      resize()
      context.bindTexture(context.TEXTURE_2D, texture)
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)
      context.bindFramebuffer(context.FRAMEBUFFER, buffer)
      context.framebufferTexture2D(context.FRAMEBUFFER, context.COLOR_ATTACHMENT0, context.TEXTURE_2D, texture, 0)
      context.bindRenderbuffer(context.RENDERBUFFER, depthBuffer)
      context.framebufferRenderbuffer(context.FRAMEBUFFER, context.DEPTH_ATTACHMENT, context.RENDERBUFFER, depthBuffer)
      return {
        buffer,
        depthBuffer,
        texture,
        resize,
      }
    })
  })

  app.singleton('drawModes', () => {
    const { context } = app
    return {
      points: context.POINTS,
      linear: context.LINEAR,
      triangles: context.TRIANGLES,
      triangleStrip: context.TRIANGLE_STRIP,
      triangleFan: context.TRIANGLE_FAN,
    }
  })

  app.singleton('slTypes', () => {
    const { context } = app
    return {
      [context.FLOAT]: 'float',
      [context.FLOAT_VEC2]: 'vec2',
      [context.FLOAT_VEC3]: 'vec3',
      [context.FLOAT_VEC4]: 'vec4',
      [context.INT]: 'int',
      [context.INT_VEC2]: 'ivec2',
      [context.INT_VEC3]: 'ivec3',
      [context.INT_VEC4]: 'ivec4',
      [context.UNSIGNED_INT]: 'uint',
      [(context as any).UNSIGNED_INT_VEC2 ?? -1]: 'uvec2',
      [(context as any).UNSIGNED_INT_VEC3 ?? -1]: 'uvec3',
      [(context as any).UNSIGNED_INT_VEC4 ?? -1]: 'uvec4',
      [context.BOOL]: 'bool',
      [context.BOOL_VEC2]: 'bvec2',
      [context.BOOL_VEC3]: 'bvec3',
      [context.BOOL_VEC4]: 'bvec4',
      [context.FLOAT_MAT2]: 'mat2',
      [context.FLOAT_MAT3]: 'mat3',
      [context.FLOAT_MAT4]: 'mat4',
      [context.SAMPLER_2D]: 'sampler2D',
      [(context as any).INT_SAMPLER_2D ?? -1]: 'sampler2D',
      [(context as any).UNSIGNED_INT_SAMPLER_2D ?? -1]: 'sampler2D',
      [context.SAMPLER_CUBE]: 'samplerCube',
      [(context as any).INT_SAMPLER_CUBE ?? -1]: 'samplerCube',
      [(context as any).UNSIGNED_INT_SAMPLER_CUBE ?? -1]: 'samplerCube',
      [(context as any).SAMPLER_2D_ARRAY ?? -1]: 'sampler2DArray',
      [(context as any).INT_SAMPLER_2D_ARRAY ?? -1]: 'sampler2DArray',
      [(context as any).UNSIGNED_INT_SAMPLER_2D_ARRAY ?? -1]: 'sampler2DArray',
    }
  })

  app.singleton('extensions', () => ({
    loseContext: app.context.getExtension('WEBGL_lose_context'),
  }))

  app.bind('width', () => app.context.drawingBufferWidth)
  app.bind('height', () => app.context.drawingBufferHeight)
  app.plugins = new Map()
  app.children = children
  app.shapes = new Map()
  app.registerShape = (name, shape) => registerShape(app, name, shape)
  app.materials = new Map()
  app.registerMaterial = (name, material) => registerMaterial(app, name, material)
  app.textures = new Map()
  app.components = new Map()
  app.registerTexture = (name, source) => registerTexture(app, name, source)
  app.systems = []
  app.registerSystem = system => registerSystem(app, system)
  app.query = (...componentNames) => query(app, ...componentNames)
  app.setup = () => setup(app)
  app.load = async () => {
    const { systems, textures } = app
    for (let len = systems.length, i = 0; i < len; i++) {
      systems[i].update?.(0)
    }
    while (Array.from(textures.values()).some(val => val.loading)) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  app.renderNode = options => renderNode(app, options)
  app.render = time => render(app, time)
  app.start = () => {
    let then = 0
    let time = 0
    renderLoop(0)
    function renderLoop(now: number) {
      requestAnimationFrame(renderLoop)
      render(app, time)
      now *= 0.001
      time += now - then
      then = now
    }
  }

  function onLost(event: WebGLContextEvent) {
    event.preventDefault()
    setTimeout(() => {
      app.context.isContextLost() && app.extensions.loseContext?.restoreContext()
    }, 0)
  }
  function onRestored() {}
  view.addEventListener?.('webglcontextlost', onLost as any, false)
  view.addEventListener?.('webglcontextrestored', onRestored, false)
  app.destroy = () => {
    view.removeEventListener?.('webglcontextlost', onLost as any)
    view.removeEventListener?.('webglcontextrestored', onRestored)
    app.context.useProgram(null)
    app.extensions.loseContext?.loseContext()
  }

  userPlugins.forEach(plugin => {
    plugin.register?.(app)
    app.plugins.set(plugin.name, plugin)
  })

  app.setup()

  return app
}
