import { fonts } from 'modern-font'
import {
  Animation,
  Engine,
  FlexElement2D,
  FlexLayout,
  Timeline,
} from '../../src'

const engine = new Engine({
  autoStart: true,
  autoResize: true,
  backgroundColor: '#F6F7F9',
  timeline: Timeline.from([0, 5000], true),
})
document.body.append(engine.view!)

async function init(): Promise<void> {
  await FlexLayout.load()

  fonts.fallbackFont = await fonts.load({ family: 'fallbackFont', src: '/fonts/AaHouDiHei.woff' })

  engine.root.appendChild(
    new FlexElement2D({
      style: {
        width: 350, height: 350, padding: 20, margin: 100,
        backgroundColor: '#0000FF', opacity: 0.5, gap: 10,
        filter: 'brightness(102%) contrast(90%) saturate(128%) sepia(18%)',
      },
    }, [
      new FlexElement2D({
        style: {
          flexGrow: 0.33, backgroundColor: '#00FF00',
        },
      }, [
        new Animation({
          keyframes: [
            { flexGrow: 0 },
          ],
        }),
      ]),
      new FlexElement2D({
        style: {
          flexGrow: 0.33, backgroundColor: '#000A00',
        },
      }),
      new FlexElement2D({
        style: {
          flexGrow: 0.33, backgroundColor: '#008F00',
        },
      }),
    ]),
  )
}

init()
