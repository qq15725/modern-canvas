import type { EffectProperties } from './Effect'
import type { Node } from './Node'
import { customNode } from '../../core'
import { Effect } from './Effect'

export interface TransitionProperties extends Omit<EffectProperties, 'effectMode' | 'processMode'> {
  //
}

@customNode<EffectProperties>('Transition', {
  effectMode: 'transition',
  duration: 2000,
})
export class Transition extends Effect {
  constructor(properties?: Partial<TransitionProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }
}
