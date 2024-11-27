import { UIInputEvent } from './UIInputEvent'

export class MouseInputEvent extends UIInputEvent implements MouseEvent {
  /** Whether the "alt" key was pressed when this mouse event occurred. */
  altKey!: boolean

  /** The specific button that was pressed in this mouse event. */
  button!: number

  /** The button depressed when this event occurred. */
  buttons!: number

  /** Whether the "control" key was pressed when this mouse event occurred. */
  ctrlKey!: boolean

  /** Whether the "meta" key was pressed when this mouse event occurred. */
  metaKey!: boolean

  /** This is currently not implemented in the Federated Events API. */
  relatedTarget!: EventTarget | null

  /** Whether the "shift" key was pressed when this mouse event occurred. */
  shiftKey!: boolean

  /** The coordinates of the mouse event relative to the canvas. */
  client = { x: 0, y: 0 }

  get clientX(): number { return this.client.x }
  get clientY(): number { return this.client.y }
  get x(): number { return this.clientX }
  get y(): number { return this.clientY }

  /** This is the number of clicks that occurs in 200ms/click of each other. */
  declare detail: number

  /** The movement in this pointer relative to the last `mousemove` event. */
  movement = { x: 0, y: 0 }

  get movementX(): number { return this.movement.x }
  get movementY(): number { return this.movement.y }

  /**
   * The offset of the pointer coordinates w.r.t. target DisplayObject in world space. This is
   * not supported at the moment.
   */
  offset = { x: 0, y: 0 }

  get offsetX(): number { return this.offset.x }
  get offsetY(): number { return this.offset.y }

  /** The pointer coordinates in world space. */
  global = { x: 0, y: 0 }

  get globalX(): number { return this.global.x }
  get globalY(): number { return this.global.y }

  /**
   * The pointer coordinates in the renderer's.
   * This has slightly different semantics than native PointerEvent screenX/screenY.
   */
  screen = { x: 0, y: 0 }

  get screenX(): number { return this.screen.x }
  get screenY(): number { return this.screen.y }

  /**
   * Whether the modifier key was pressed when this event natively occurred.
   * @param key - The modifier key.
   */
  getModifierState(key: string): boolean {
    return 'getModifierState' in this.nativeEvent && (this.nativeEvent as any).getModifierState(key)
  }

  initMouseEvent(..._args: any[]): void {
    throw new Error('Method not implemented.')
  }
}
