import { fonts } from 'modern-font'
import { Animation2D, Engine, Image2D, Text2D } from '../../src'

const engine = new Engine({ width: 500, height: 500 }).start()

document.body.append(engine.view!)

async function init(): Promise<void> {
  // load fallback font
  fonts.fallbackFont = await fonts.load({ family: 'fallbackFont', src: '/fallback.woff' })

  // click
  engine.on('pointerdown', (e) => {
    console.warn(e.target)
  })

  // add elements
  engine.root.addChild(
    new Image2D({
      style: {
        width: 100,
        height: 100,
        opacity: 0.9,
        filter: 'sepia(0.5)',
        backgroundColor: '#00ff00',
      },
      src: '/example.png',
    })
      .addChild(
        new Text2D({
          content: '/example.png',
        }),
      )
      .addChild(
        new Animation2D({
          duration: 3000,
          loop: true,
          keyframes: [
            {
              offset: 0,
              width: 100,
            },
            {
              offset: 1,
              width: 0,
            },
          ],
        }),
      ),
  )
}

init()
