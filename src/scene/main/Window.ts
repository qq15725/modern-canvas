import { property } from 'modern-idoc'
import { customNode } from '../../core'
import { Viewport } from './Viewport'

@customNode('Window')
export class Window extends Viewport {
  @property({ fallback: false }) declare msaa: boolean
}
