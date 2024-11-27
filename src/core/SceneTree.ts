import type { WebGLRenderer } from '../renderer'
import { QuadUvGeometry } from './geometries'
import { MainLoop } from './MainLoop'
import { RenderStack } from './RenderStack'
import { Timer } from './Timer'
import { Viewport } from './Viewport'

export class SceneTree extends MainLoop {
  readonly renderStack = new RenderStack()
  readonly root = new Viewport(true)._setTree(this)
  readonly timeline = new Timer({ loop: true })._setTree(this)

  protected _currentViewport?: Viewport
  getCurrentViewport() { return this._currentViewport }
  setCurrentViewport(viewport: Viewport | undefined) { this._currentViewport = viewport }

  protected _render(renderer: WebGLRenderer, delta = 0): this {
    this.timeline.addTime(delta)
    this.emit('processing')
    this.root.notification('process', { delta })
    this.emit('processed')
    renderer.program.uniforms.projectionMatrix = this.root.toProjectionArray(true)
    this.renderStack.render(renderer)
    this._renderScreen(renderer)
    return this
  }

  protected _renderScreen(renderer: WebGLRenderer) {
    renderer.state.reset()
    const pixelRatio = renderer.pixelRatio
    const { width, height } = this.root
    renderer.framebuffer.bind(null)
    renderer.viewport.bind({
      x: 0,
      y: 0,
      width: width * pixelRatio,
      height: height * pixelRatio,
    })
    renderer.clear()
    const texture = this.root.texture
    texture.activate(renderer, 0)
    QuadUvGeometry.draw(renderer)
    renderer.texture.unbind(texture)
  }
}
