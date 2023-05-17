import type { Node } from './node'
import type { Plugin } from './plugin'

export interface Options extends WebGLContextAttributes {
  view?: HTMLCanvasElement
  children?: Node[]
  plugins?: Plugin[]
}
