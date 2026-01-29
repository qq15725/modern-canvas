import {
  Camera2D,
  Element2D, Engine,
} from '../../src'

class PerformanceTest {
  count = 4000
  width = 1000
  height = 500

  protected engine: Engine
  protected rects: { x: number, y: number, size: number, speed: number, el: Element2D }[] = []

  constructor() {
    this.rects = []
    this.engine = new Engine({
      width: this.width,
      height: this.height,
      backgroundColor: '#FFFFFF',
      antialias: true,
    })

    this.engine.root.append(
      new Camera2D({
        internalMode: 'front',
      }),
    )

    document.body.append(this.engine.view!)
    ;(window as any).engine = this.engine
  }

  protected onProcess(): void {
    const rectsToRemove = []

    for (let i = 0; i < this.count; i++) {
      const rect = this.rects[i]
      rect.x -= rect.speed
      rect.el.position.x = rect.x
      if (rect.x + rect.size / 2 < 0)
        rectsToRemove.push(i)
    }

    rectsToRemove.forEach((i) => {
      this.rects[i].x = this.width + this.rects[i].size / 2
    })
  }

  render(): void {
    this.engine.stop()
    this.engine.root.removeChildren()
    this.rects = []
    for (let i = 0; i < this.count; i++) {
      const x = Math.random() * this.width
      const y = Math.random() * this.height
      const size = 10 + Math.random() * 40
      const speed = 1 + Math.random()
      const rect = new Element2D({
        style: {
          left: x,
          top: y,
          width: size,
          height: size,
          backgroundColor: '#FFFFFF',
          borderColor: '#000000',
        },
      })
      this.engine.root.append(rect)
      this.rects[i] = { x, y, size, speed, el: rect }
    }
    this.engine.on('process', this.onProcess.bind(this))
    this.engine.start()
  }
}

new PerformanceTest().render()
