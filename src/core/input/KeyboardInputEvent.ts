import { InputEvent } from './InputEvent'

export class KeyboardInputEvent extends InputEvent implements KeyboardEvent {
  declare altKey: boolean
  declare charCode: number
  declare code: string
  declare ctrlKey: boolean
  declare isComposing: boolean
  declare key: string
  declare keyCode: number
  declare location: number
  declare metaKey: boolean
  declare repeat: boolean
  declare shiftKey: boolean

  getModifierState(..._args: any[]): boolean {
    throw new Error('getModifierState() is a legacy DOM API. It is not implemented in the Federated Events API.')
  }

  initKeyboardEvent(..._args: any[]): void {
    throw new Error('initKeyboardEvent() is a legacy DOM API. It is not implemented in the Federated Events API.')
  }

  declare DOM_KEY_LOCATION_STANDARD: 0x00
  declare DOM_KEY_LOCATION_LEFT: 0x01
  declare DOM_KEY_LOCATION_RIGHT: 0x02
  declare DOM_KEY_LOCATION_NUMPAD: 0x03
}
