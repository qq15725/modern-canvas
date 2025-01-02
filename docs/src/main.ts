import { Engine, Image2D } from '../../src'

const engine = new Engine({ width: 500, height: 500, pixelRatio: 1, antialias: true })
engine.speed = 1
engine.fps = 10
engine.start()
engine.root.addChild(
  new Image2D({
    style: {
      left: 100,
      top: 100,
      width: 100,
      height: 100,
    },
    src: '/example.png',
  }),
)

console.log(engine)

document.body.append(engine.view!)
