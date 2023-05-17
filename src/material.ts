import type { App } from './app'

export interface UserMaterial {
  vertexShader: string
  fragmentShader: string
  uniforms?: Record<string, any>
}

export type Material = UserMaterial & {
  program: WebGLProgram
  attributes: Record<string, MaterialAttribute>
  uniforms: Record<string, MaterialUniform>
  setupAttributes(attributes: Record<string, any>): void
  setupUniforms(uniforms: Record<string, any>): void
}

export interface MaterialAttribute {
  type: App['slTypes'][keyof App['slTypes']]
  isArray: boolean
  location: GLint
}

export interface MaterialUniform {
  type: App['slTypes'][keyof App['slTypes']]
  isArray: boolean
  location: WebGLUniformLocation | null
}

export function registerMaterial(app: App, name: string, userMaterial: UserMaterial) {
  const { context, materials, slTypes } = app

  const {
    vertexShader,
    fragmentShader,
    uniforms: userUniforms,
  } = userMaterial

  if (materials.has(name)) return

  // create shaders
  const shaders = ([
    { type: context.VERTEX_SHADER, source: vertexShader },
    { type: context.FRAGMENT_SHADER, source: fragmentShader.includes('precision') ? fragmentShader : `precision mediump float;\n${ fragmentShader }` },
  ]).map(({ type, source }) => {
    const shader = context.createShader(type)
    if (!shader) throw new Error('failed to create shader')
    context.shaderSource(shader, source)
    context.compileShader(shader)
    if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
      throw new Error(`failed to compiling shader:\n${ source }\n${ context.getShaderInfoLog(shader) }`)
    }
    return shader
  })

  // create program
  const program = context.createProgram()
  if (!program) throw new Error('failed to create program')
  shaders.forEach(shader => context.attachShader(program, shader))
  context.linkProgram(program)
  shaders.forEach(shader => context.deleteShader(shader))
  if (!context.getProgramParameter(program, context.LINK_STATUS)) {
    throw new Error(`failed to initing program: ${ context.getProgramInfoLog(program) }`)
  }

  // resovle attributes
  const attributes: Record<string, MaterialAttribute> = {}
  for (let len = context.getProgramParameter(program, context.ACTIVE_ATTRIBUTES), i = 0; i < len; i++) {
    const activeAttrib = context.getActiveAttrib(program, i)
    if (!activeAttrib) continue
    const name = activeAttrib.name.replace(/\[.*?]$/, '')
    attributes[name] = {
      type: slTypes[activeAttrib.type],
      isArray: name !== activeAttrib.name,
      location: context.getAttribLocation(program, name),
    }
  }

  // resovle uniforms
  const uniforms: Record<string, MaterialUniform> = {}
  for (let len = context.getProgramParameter(program, context.ACTIVE_UNIFORMS), i = 0; i < len; i++) {
    const activeUniform = context.getActiveUniform(program, i)
    if (!activeUniform) continue
    const name = activeUniform.name.replace(/\[.*?]$/, '')
    uniforms[name] = {
      type: slTypes[activeUniform.type],
      isArray: name !== activeUniform.name,
      location: context.getUniformLocation(program, name),
    }
  }

  const material: Material = {
    ...userMaterial,
    program,
    attributes,
    uniforms,
    setupAttributes(userAttributes) {
      for (const [key, value] of Object.entries(userAttributes)) {
        const attribute = attributes[key]
        if (!attribute) continue
        const { type, isArray, location } = attribute
        if (value instanceof WebGLBuffer) {
          context.bindBuffer(context.ARRAY_BUFFER, value)
          const location = context.getAttribLocation(program, key)
          switch (type) {
            case 'vec2':
              context.vertexAttribPointer(location, 2, context.FLOAT, false, 0, 0)
              context.enableVertexAttribArray(location)
              break
            case 'vec3':
              context.vertexAttribPointer(location, 3, context.FLOAT, false, 0, 0)
              context.enableVertexAttribArray(location)
              break
          }
        } else {
          switch (type) {
            case 'float':
              if (isArray) {
                context.vertexAttrib1fv(location, value)
              } else {
                context.vertexAttrib1f(location, value)
              }
              break
            case 'vec2':
              context.vertexAttrib2fv(location, value)
              break
            case 'vec3':
              context.vertexAttrib3fv(location, value)
              break
            case 'vec4':
              context.vertexAttrib4fv(location, value)
              break
          }
        }
      }
    },
    setupUniforms(userUniforms) {
      for (const [key, value] of Object.entries(userUniforms)) {
        const uniform = uniforms[key]
        if (!uniform) continue
        const { type, isArray, location } = uniform
        switch (type) {
          case 'float':
            if (isArray) {
              context.uniform1fv(location, value)
            } else {
              context.uniform1f(location, value)
            }
            break
          case 'bool':
          case 'int':
            if (isArray) {
              context.uniform1iv(location, value)
            } else {
              context.uniform1i(location, value)
            }
            break
          case 'vec2':
            context.uniform2fv(location, value)
            break
          case 'vec3':
            context.uniform3fv(location, value)
            break
          case 'vec4':
            context.uniform4fv(location, value)
            break
          case 'mat2':
            context.uniformMatrix2fv(location, false, value)
            break
          case 'mat3':
            context.uniformMatrix3fv(location, false, value)
            break
          case 'mat4':
            context.uniformMatrix4fv(location, false, value)
            break
          case 'sampler2D':
            context.bindTexture(
              context.TEXTURE_2D,
              value ?? app.defaultTexture,
            )
            context.uniform1i(location, 0)
            break
        }
      }
    },
  }

  userUniforms && material.setupUniforms(userUniforms)

  materials.set(name, material)
}
