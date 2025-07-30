import { MouseInputEvent } from './MouseInputEvent'

export class PointerInputEvent extends MouseInputEvent implements PointerEvent {
  declare altitudeAngle: number
  declare azimuthAngle: number
  declare pointerId: number
  width = 0
  height = 0
  isPrimary = false
  declare pointerType: string
  declare pressure: number
  declare tangentialPressure: number
  declare tiltX: number
  declare tiltY: number
  declare twist: number
  declare detail: number
  getCoalescedEvents(): PointerEvent[] {
    if (this.type === 'pointermove' || this.type === 'mousemove' || this.type === 'touchmove') {
      return [this as any]
    }
    return []
  }

  getPredictedEvents(): PointerEvent[] {
    throw new Error('getPredictedEvents is not supported!')
  }
}
