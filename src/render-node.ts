import type { Canvas } from './canvas'

export interface RenderNodeOptions {
  shape: string
  material: string
  uniforms?: Record<string, any>
}

export function renderNode(canvas: Canvas, options: RenderNodeOptions) {
  const { gl, shapes, materials } = canvas
  const {
    shape: shapeName,
    material: materialName,
    uniforms,
  } = options

  const shape = shapes.get(shapeName)
  const material = materials.get(materialName)

  if (!shape || !material) return

  const {
    drawMode = 'triangles',
    glProgram,
  } = material

  // use program
  gl.useProgram(glProgram)

  // bind webgl vertex buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, shape.glBuffer)
  const location = gl.getAttribLocation(glProgram, 'aPosition')
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(location)

  uniforms && material.setUniforms(uniforms)

  gl.drawArrays(canvas.glDrawModes[drawMode], 0, shape.numberPoints / 2)
}
