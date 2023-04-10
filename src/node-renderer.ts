import type { Canvas } from './canvas'
import type { Material } from './material'
import type { Shape } from './shape'
import type { Node } from './node'

export interface NodeRenderer {
  name: string
  include?: (node: Node, path: number[]) => boolean
  exclude?: (node: Node, path: number[]) => boolean
  shape: string | Omit<Shape, 'name'>
  material: string | Omit<Material, 'name'>
  update?(node: Node, time: number): undefined | Record<string, any>
}

export interface InternalNodeRenderer extends NodeRenderer {
  shape: string
  material: string
  render(node: Node, time: number): void
}

export function registerNodeRenderer(canvas: Canvas, renderer: NodeRenderer) {
  const { gl, shapes, materials, nodeRenderers } = canvas
  const { name, shape: userShape, material: userMaterial } = renderer

  const shapeName = typeof userShape === 'string' ? userShape : `${ name }-shape`
  if (typeof userShape !== 'string') {
    canvas.registerShape({ ...userShape, name: shapeName })
  }

  const materialName = typeof userMaterial === 'string' ? userMaterial : `${ name }-material`
  if (typeof userMaterial !== 'string') {
    canvas.registerMaterial({ ...userMaterial, name: materialName })
  }

  const shape = shapes.get(shapeName)
  const material = materials.get(materialName)

  if (!shape || !material) return

  const { buffer: aPosition } = shape

  material.setAttributes({ aPosition })

  nodeRenderers.set(name, {
    ...renderer,
    shape: shapeName,
    material: materialName,
    render: (node: Node, time: number) => {
      const shape = shapes.get(shapeName)
      const material = materials.get(materialName)

      if (!shape || !material) return

      const { program } = material
      const { mode, count } = shape

      // use program
      gl.useProgram(program)

      const uniforms = renderer.update?.(node, time)

      // update uniforms
      uniforms && material.setUniforms(uniforms)

      gl.drawArrays(mode, 0, count)
    },
  })
}
