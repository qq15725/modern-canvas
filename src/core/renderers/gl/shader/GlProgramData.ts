export class GlProgramData {
  /**
   * Per uniform-group last-synced `_dirtyId`, keyed by the group's uid.
   * If a group's current `_dirtyId` differs from the value stored here, the
   * group's data is (re)uploaded to this program.
   */
  uniformDirtyGroups: Record<number, number> = Object.create(null)

  constructor(
    public native: WebGLProgram,
  ) {
    //
  }
}
