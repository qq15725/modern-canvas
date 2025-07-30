import { MouseInputEvent } from './MouseInputEvent'

export class WheelInputEvent extends MouseInputEvent implements WheelEvent {
  declare deltaMode: number
  declare deltaX: number
  declare deltaY: number
  declare deltaZ: number
  static readonly DOM_DELTA_PIXEL = 0
  readonly DOM_DELTA_PIXEL = 0
  static readonly DOM_DELTA_LINE = 1
  readonly DOM_DELTA_LINE = 1
  static readonly DOM_DELTA_PAGE = 2
  readonly DOM_DELTA_PAGE = 2
}
