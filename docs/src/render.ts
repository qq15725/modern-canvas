import { fonts } from 'modern-font'
import { render } from '../../src'

async function init(): Promise<void> {
  await fonts.loadFallbackFont({ family: 'fallbackFont', src: '/fonts/AaHouDiHei.woff' })

  render({
    debug: true,
    data: [
      {
        meta: {
          inCanvasIs: 'Image2D',
        },
        style: { left: 0, top: 0, width: 100, height: 100 },
        src: '/example.jpg',
      },
      {
        meta: {
          inCanvasIs: 'Image2D',
        },
        style: { left: 100, top: 100, width: 100, height: 100 },
        src: '/example.jpg',
      },
      {
        meta: {
          inCanvasIs: 'Element2D',
        },
        style: { left: 200, top: 200, width: 100, height: 100 },
        content: '/example.jpg',
      },
    ],
    width: 500,
    height: 500,
  }).then((res) => {
    document.body.append(res)
  })

  render({
    debug: true,
    data: [
      {
        meta: {
          inCanvasIs: 'Image2D',
        },
        style: { left: 0, top: 0, width: 100, height: 100 },
        src: '/example.jpg',
      },
      {
        meta: {
          inCanvasIs: 'Image2D',
        },
        style: { left: 100, top: 100, width: 100, height: 100 },
        src: '/example.jpg',
      },
      {
        meta: {
          inCanvasIs: 'Element2D',
        },
        style: { left: 200, top: 200, width: 100, height: 100 },
        content: '/example.jpg',
      },
    ],
    width: 150,
    height: 150,
  }).then((res) => {
    document.body.append(res)
  })
}

init()
