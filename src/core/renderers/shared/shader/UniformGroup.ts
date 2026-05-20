let uidCounter = 0

export interface UniformGroupOptions {
  /**
   * If true the group is treated as a Uniform Buffer Object (WebGL2 only). The
   * whole group is uploaded as a single buffer instead of per-uniform calls.
   */
  ubo?: boolean
  /**
   * If true the group is only re-uploaded to a program when its `_dirtyId`
   * changes (you are responsible for calling `update()`); otherwise it is
   * re-uploaded every time it is used.
   */
  isStatic?: boolean
}

/**
 * A named bag of uniform values shared across shaders, with a version counter
 * (`_dirtyId`) so the renderer can skip re-uploading it when nothing changed.
 *
 * This is the unit the renderer tracks per program (see
 * `GlShaderSystem.updateUniformGroup`): each program records the last `_dirtyId`
 * it synced, and re-uploads only when the group's id moved on.
 */
export class UniformGroup<T extends Record<string, any> = Record<string, any>> {
  readonly isUniformGroup = true
  /** unique id used as the key for per-program dirty tracking */
  readonly uid: number = ++uidCounter
  uniforms: T
  ubo: boolean
  isStatic: boolean
  /** bumped whenever the group's data changes; compared against per-program last-synced id */
  _dirtyId = 1

  constructor(uniforms: T, options: UniformGroupOptions = {}) {
    this.uniforms = uniforms
    this.ubo = options.ubo ?? false
    this.isStatic = options.isStatic ?? false
  }

  /** Flag the group's data as changed so it is re-uploaded on next use. */
  update(): void {
    this._dirtyId++
  }
}
