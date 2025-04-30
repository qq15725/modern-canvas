import {
  Engine,
  Timeline,
  Video2D,
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
    new Video2D({
      style: {
        width: 300,
        height: 300,
      },
      src: '/example.mp4',
    }),
  ])
}

init()
