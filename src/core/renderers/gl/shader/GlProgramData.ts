import type { GlUniform } from './GlProgram'

export class GlProgramData {
  /**
   * Per uniform-group last-synced `_dirtyId`, keyed by the group's uid.
   * If a group's current `_dirtyId` differs from the value stored here, the
   * group's data is (re)uploaded to this program.
   */
  uniformDirtyGroups: Record<number, number> = Object.create(null)

  /**
   * Per-context uniform metadata: introspected name/type/size plus the lazily
   * resolved {@link GlUniform.location} and the shadow copy of the last uploaded
   * value. Both `location` and `value` are specific to THIS linked program in
   * THIS GL context, so they must live here — not on the shared {@link GlProgram},
   * which a module-level (static) Material reuses across multiple renderers/contexts.
   * Storing them on the shared program would let one context clobber another's
   * locations/shadows (e.g. a sampler `uniform1i` silently dropped → the sampler
   * falls back to texture unit 0).
   */
  uniforms: Record<string, GlUniform> = Object.create(null)

  constructor(
    public native: WebGLProgram,
  ) {
    //
  }
}
