import type { GlSlType } from './gl'
import type { Canvas } from './canvas'

export interface Material {
  name: string
  vertexShader: string
  fragmentShader: string
  uniforms?: Record<string, any>
}

export type InternalMaterial = Material & {
  program: WebGLProgram
  attributes: Record<string, MaterialAttribute>
  uniforms: Record<string, MaterialUniform>
  setAttributes(attributes: Record<string, any>): void
  setUniforms(uniforms: Record<string, any>): void
}

export interface MaterialAttribute {
  type: GlSlType
  isArray: boolean
  location: GLint
}

export interface MaterialUniform {
  type: GlSlType
  isArray: boolean
  location: WebGLUniformLocation | null
}

export function registerMaterial(canvas: Canvas, material: Material) {
  const { gl, materials, glSlTypes } = canvas

  const {
    name,
    vertexShader,
    fragmentShader,
    uniforms: userUniforms,
  } = material

  if (materials.has(name)) return

  // create shaders
  const shaders = ([
    { type: gl.VERTEX_SHADER, source: vertexShader },
    { type: gl.FRAGMENT_SHADER, source: fragmentShader.includes('precision') ? fragmentShader : `precision mediump float;\n${ fragmentShader }` },
  ]).map(({ type, source }) => {
    const shader = gl.createShader(type)
    if (!shader) throw new Error('failed to create shader')
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`failed to compiling shader:\n${ source }\n${ gl.getShaderInfoLog(shader) }`)
    }
    return shader
  })

  // create program
  const program = gl.createProgram()
  if (!program) throw new Error('failed to create program')
  shaders.forEach(shader => gl.attachShader(program, shader))
  gl.linkProgram(program)
  shaders.forEach(shader => gl.deleteShader(shader))
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`failed to initing program: ${ gl.getProgramInfoLog(program) }`)
  }

  // resovle attributes
  const attributes: Record<string, MaterialAttribute> = {}
  for (let len = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES), i = 0; i < len; i++) {
    const activeAttrib = gl.getActiveAttrib(program, i)
    if (!activeAttrib) continue
    const name = activeAttrib.name.replace(/\[.*?]$/, '')
    attributes[name] = {
      type: glSlTypes[activeAttrib.type],
      isArray: name !== activeAttrib.name,
      location: gl.getAttribLocation(program, name),
    }
  }

  // resovle uniforms
  const uniforms: Record<string, MaterialUniform> = {}
  for (let len = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS), i = 0; i < len; i++) {
    const activeUniform = gl.getActiveUniform(program, i)
    if (!activeUniform) continue
    const name = activeUniform.name.replace(/\[.*?]$/, '')
    uniforms[name] = {
      type: glSlTypes[activeUniform.type],
      isArray: name !== activeUniform.name,
      location: gl.getUniformLocation(program, name),
    }
  }

  const internalMaterial: InternalMaterial = {
    ...material,
    program,
    attributes,
    uniforms,
    setAttributes(userAttributes) {
      for (const [key, value] of Object.entries(userAttributes)) {
        const attribute = attributes[key]
        if (!attribute) continue
        const { type, isArray, location } = attribute
        if (value instanceof WebGLBuffer) {
          gl.bindBuffer(gl.ARRAY_BUFFER, value)
          const location = gl.getAttribLocation(program, key)
          switch (type) {
            case 'vec2':
              gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0)
              gl.enableVertexAttribArray(location)
              break
            case 'vec3':
              gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0)
              gl.enableVertexAttribArray(location)
              break
          }
        } else {
          switch (type) {
            case 'float':
              if (isArray) {
                gl.vertexAttrib1fv(location, value)
              } else {
                gl.vertexAttrib1f(location, value)
              }
              break
            case 'vec2':
              gl.vertexAttrib2fv(location, value)
              break
            case 'vec3':
              gl.vertexAttrib3fv(location, value)
              break
            case 'vec4':
              gl.vertexAttrib4fv(location, value)
              break
          }
        }
      }
    },
    setUniforms(userUniforms) {
      for (const [key, value] of Object.entries(userUniforms)) {
        const uniform = uniforms[key]
        if (!uniform) continue
        const { type, isArray, location } = uniform
        switch (type) {
          case 'float':
            if (isArray) {
              gl.uniform1fv(location, value)
            } else {
              gl.uniform1f(location, value)
            }
            break
          case 'bool':
          case 'int':
            if (isArray) {
              gl.uniform1iv(location, value)
            } else {
              gl.uniform1i(location, value)
            }
            break
          case 'vec2':
            gl.uniform2fv(location, value)
            break
          case 'vec3':
            gl.uniform3fv(location, value)
            break
          case 'vec4':
            gl.uniform4fv(location, value)
            break
          case 'mat2':
            gl.uniformMatrix2fv(location, false, value)
            break
          case 'mat3':
            gl.uniformMatrix3fv(location, false, value)
            break
          case 'mat4':
            gl.uniformMatrix4fv(location, false, value)
            break
          case 'sampler2D':
            gl.bindTexture(
              gl.TEXTURE_2D,
              canvas.resources.get(value)?.texture
              ?? canvas.glDefaultTexture,
            )
            gl.uniform1i(location, 0)
            break
        }
      }
    },
  }

  userUniforms && internalMaterial.setUniforms(userUniforms)

  materials.set(name, internalMaterial)
}
