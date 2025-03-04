import { fonts } from 'modern-font'
import { render } from '../../src'

async function init(): Promise<void> {
  fonts.fallbackFont = await fonts.load({ family: 'fallbackFont', src: '/fonts/AaHouDiHei.woff' })

  document.body.append(
    await render({
      data: [
        {
          tag: 'Image2D',
          props: {
            style: {
              left: 0,
              top: 0,
              width: 100,
              height: 100,
            },
            src: '/example.jpg',
          },
        },
        {
          tag: 'Image2D',
          props: {
            style: {
              left: 100,
              top: 100,
              width: 100,
              height: 100,
            },
            src: '/example.jpg',
          },
        },
        {
          tag: 'Text2D',
          props: {
            style: {
              left: 200,
              top: 200,
              width: 100,
              height: 100,
            },
            content: '/example.jpg',
          },
        },
      ],
      width: 500,
      height: 500,
    }),
  )
}

init()
