import {
  Element2D,
  Engine,
  Image2D,
  Timeline,
} from '../../src'

const engine = new Engine({
  autoStart: true,
  autoResize: true,
  backgroundColor: '#F6F7F9',
  timeline: Timeline.from([0, 5000], true),
})
;(window as any).engine = engine
document.body.append(engine.view!)

async function init(): Promise<void> {
  engine.root.append([
    new Element2D({
      delay: 0,
      duration: 1500,
    }, [
      new Image2D({
        name: 'example.png',
        style: {
          width: 100,
          height: 100,
        },
        src: '/example.png',
      }),
    ]),
    new Element2D({
      delay: 1500,
      duration: 1500,
    }, [
      new Image2D({
        name: 'example.jpg',
        style: {
          width: 100,
          height: 100,
        },
        src: '/example.jpg',
      }),
    ]),
  ])
}

init()
