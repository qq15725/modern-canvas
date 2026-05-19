import { render } from '../../src'

async function init(): Promise<void> {
  const width = 640
  const height = 360

  const canvas = await render({
    debug: true,
    width,
    height,
    data: {
      style: { width, height },
      children: [
        {
          name: 'Video',
          meta: { inCanvasIs: 'Video2D' },
          style: { left: 0, top: 0, width, height },
          src: '/example.mp4',
        },
      ],
    },
  })

  canvas.style.width = `${width / 2}px`
  canvas.style.height = `${height / 2}px`
  document.body.append(canvas)
}

init()
