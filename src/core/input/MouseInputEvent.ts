import { UIInputEvent } from './UIInputEvent'

export class MouseInputEvent extends UIInputEvent implements MouseEvent {
  altKey!: boolean
  button!: number
  buttons!: number
  ctrlKey!: boolean
  metaKey!: boolean
  relatedTarget!: EventTarget | null
  shiftKey!: boolean
  client = { x: 0, y: 0 }
  get clientX(): number { return this.client.x }
  get clientY(): number { return this.client.y }
  get x(): number { return this.clientX }
  get y(): number { return this.clientY }
  declare detail: number
  movement = { x: 0, y: 0 }
  get movementX(): number { return this.movement.x }
  get movementY(): number { return this.movement.y }
  offset = { x: 0, y: 0 }
  get offsetX(): number { return this.offset.x }
  get offsetY(): number { return this.offset.y }
  global = { x: 0, y: 0 }
  get globalX(): number { return this.global.x }
  get globalY(): number { return this.global.y }
  screen = { x: 0, y: 0 }
  get screenX(): number { return this.screen.x }
  get screenY(): number { return this.screen.y }
  getModifierState(key: string): boolean {
    return 'getModifierState' in this.nativeEvent && (this.nativeEvent as any).getModifierState(key)
  }

  initMouseEvent(..._args: any[]): void {
    throw new Error('Method not implemented.')
  }
}
