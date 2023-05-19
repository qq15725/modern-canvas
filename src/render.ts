import type { App } from './app'

export interface RenderNodeOptions {
  shape: string
  material: string
  uniforms?: Record<string, any>
  extraRenderers?: {
    shape: string
    material: string
    uniforms?: Record<string, any>
  }[]
}

export function renderNode(app: App, options: RenderNodeOptions) {
  const { width, height, context, shapes, materials, framebuffers, lastState } = app
  const { extraRenderers = [] } = options

  const renderers = [
    options,
    ...extraRenderers,
  ].filter(renderer => shapes.has(renderer.shape) && materials.has(renderer.material))

  for (let len = renderers.length, i = 0; i < len; i++) {
    const render = renderers[i]
    const {
      shape: shapeName,
      material: materialName,
      uniforms,
    } = render
    const shape = shapes.get(shapeName)!
    const material = materials.get(materialName)!

    if (lastState?.material !== materialName && lastState?.shape !== shapeName) {
      material.setupAttributes({ aPosition: shape.buffer })
    }

    const framebuffer = i < len - 1 ? framebuffers[i % 2] : null
    context.bindFramebuffer(context.FRAMEBUFFER, framebuffer?.buffer ?? null)
    context.viewport(0, 0, width, height)
    framebuffer && context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT)

    if (lastState?.material !== materialName) {
      context.useProgram(material.program)
    }

    uniforms && material.setupUniforms(uniforms)
    context.drawArrays(shape.mode, 0, shape.count)
    framebuffer && context.bindTexture(context.TEXTURE_2D, framebuffer.texture)

    app.lastState = {
      material: materialName,
      shape: shapeName,
    }
  }
}

export function render(app: App, time = 0) {
  const { context, systems, framebuffers } = app

  framebuffers.forEach(framebuffer => framebuffer.resize())

  context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT)

  for (let len = systems.length, i = 0; i < len; i++) {
    systems[i].update?.(time)
  }

  context.flush()
}
