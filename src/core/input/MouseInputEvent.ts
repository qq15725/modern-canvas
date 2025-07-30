import { InputEvent } from './InputEvent'

export class MouseInputEvent extends InputEvent implements MouseEvent {
  declare altKey: boolean
  declare button: number
  declare buttons: number
  client = { x: 0, y: 0 }
  get clientX(): number { return this.client.x }
  get clientY(): number { return this.client.y }
  declare ctrlKey: boolean
  layer = { x: 0, y: 0 }
  get layerX(): number { return this.layer.x }
  get layerY(): number { return this.layer.y }
  declare metaKey: boolean
  movement = { x: 0, y: 0 }
  get movementX(): number { return this.movement.x }
  get movementY(): number { return this.movement.y }
  offset = { x: 0, y: 0 }
  get offsetX(): number { return this.offset.x }
  get offsetY(): number { return this.offset.y }
  page = { x: 0, y: 0 }
  get pageX(): number { return this.page.x }
  get pageY(): number { return this.page.y }
  declare relatedTarget: EventTarget | null
  screen = { x: 0, y: 0 }
  get screenX(): number { return this.screen.x }
  get screenY(): number { return this.screen.y }
  declare shiftKey: boolean
  get x(): number { return this.clientX }
  get y(): number { return this.clientY }

  getModifierState(key: string): boolean {
    return 'getModifierState' in this.nativeEvent && (this.nativeEvent as any).getModifierState(key)
  }

  initMouseEvent(..._args: any[]): void {
    throw new Error('Method not implemented.')
  }

  global = { x: 0, y: 0 }
  get globalX(): number { return this.global.x }
  get globalY(): number { return this.global.y }
}
