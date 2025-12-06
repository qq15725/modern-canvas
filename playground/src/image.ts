import type { Style } from 'modern-idoc'
import { fonts } from 'modern-font'
import {
  Engine,
  Timeline,
} from '../../src'

function testcase(style: Style = {}): any {
  return [
    // base
    {
      is: 'Element2D',
      style: { left: 0, top: 0, width: 100, height: 100, borderRadius: 10, ...style },
      foreground: { image: '/example.gif' },
    },
    // crop
    {
      is: 'Element2D',
      style: { left: 100, top: 0, width: 100, height: 100, ...style },
      foreground: { image: '/example.gif', cropRect: { left: 0.2, right: 0.2, top: 0.2, bottom: 0.2 } },
    },
    // mask
    {
      is: 'Element2D',
      style: { left: 200, top: 0, width: 100, height: 100, maskImage: '/mask1.png', ...style },
      foreground: { image: '/example.gif' },
    },
    // filter
    {
      is: 'Element2D',
      style: { left: 300, top: 0, width: 100, height: 100, filter: 'brightness(52%) contrast(90%) saturate(128%) sepia(18%)', ...style },
      foreground: { image: '/example.gif' },
    },
  ]
}

async function init(): Promise<void> {
  await fonts.loadFallbackFont({ family: 'fallbackFont', src: '/fonts/AaHouDiHei.woff' })

  const engine = new Engine({
    autoStart: true,
    autoResize: true,
    timeline: Timeline.from([0, 5000], true),
    data: [
      { is: 'Camera2D' },
      {
        is: 'Element2D',
        style: { top: 100, width: 1000, height: 100 },
        children: testcase(),
      },
      {
        is: 'Element2D',
        style: { top: 200 },
        children: testcase({ opacity: 0.5 }),
      },
      {
        is: 'Element2D',
        style: { top: 300 },
        children: testcase({ rotate: 4 }),
      },
      {
        is: 'Element2D',
        style: { top: 400 },
        children: testcase({ rotate: 60 }),
      },
      {
        is: 'Element2D',
        style: { top: 500 },
        children: testcase({ rotate: 60, scaleX: 0.5, scaleY: 0.5 }),
      },
    ],
  })

  ;(window as any).engine = engine

  document.body.append(engine.view!)
}

init()
