import { fonts } from 'modern-font'
import { Engine, Image2D, Text2D } from '../../src'

async function loadFallbackFont(): Promise<void> {
  fonts.fallbackFont = await fonts.load({ family: 'fallbackFont', src: '/fallback.woff' })
}

loadFallbackFont().then(() => {
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
  engine.root.addChild(
    new Text2D({
      style: {
        left: 100,
        top: 100,
      },
      content: '/example.png',
    }),
  )

  console.log(engine)

  document.body.append(engine.view!)
})
