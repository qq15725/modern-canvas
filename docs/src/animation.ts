import {
  Animation,
  Element2D,
  Engine,
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
      style: {
        left: 100,
        top: 100,
        width: 100,
        height: 100,
        backgroundColor: '#00FF00',
      },
    }, [
      new Animation({
        loop: true,
        keyframes: [
          { opacity: 0, rotate: 180 },
        ],
      }),
    ]),

    new Element2D({
      style: {
        left: 200,
        top: 200,
        width: 100,
        height: 100,
        backgroundColor: '#00FF00',
      },
    }, [
      new Animation({
        loop: true,
        keyframes: [
          { opacity: 0, transform: 'translate3d(0, -100%, 0)' },
          { opacity: 1 },
        ],
      }),
    ]),
  ])
}

init()
