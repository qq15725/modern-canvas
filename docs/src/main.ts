import { fonts } from 'modern-font'
import {
  Editor2D,
  Engine,
  Image2D,
  KeyframeAnimation,
  Node2D,
  ShadowEffect,
  Text2D, Video2D,
} from '../../src'

const editor = new Editor2D()
const engine = new Engine({
  autoStart: true,
  autoResize: true,
  backgroundColor: '#F6F7F9',
})
engine.root.append(editor)
document.body.append(engine.view!)

async function init(): Promise<void> {
  fonts.fallbackFont = await fonts.load({ family: 'fallbackFont', src: '/fonts/AaHouDiHei.woff' })

  editor.drawboard.append([
    new Node2D({
      style: {
        width: 100,
        height: 100,
        opacity: 0.9,
        filter: 'sepia(0.5)',
        backgroundColor: '#00ff00',
      },
    }, [
      new KeyframeAnimation({
        loop: true,
        keyframes: [
          { offset: 1, rotate: 180 },
        ],
      }),
      new Image2D({
        style: {
          width: 100,
          height: 100,
          filter: 'sepia(0.5)',
        },
        src: '/example.png',
      }),
      new Text2D({
        fonts,
        style: {
          fontSize: 20,
          textDecoration: 'underline',
        },
        content: [
          {
            fragments: [
              {
                content: 'Highhhh',
              },
              {
                content: 'lig',
                highlightImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUxLjM2NDYgNDUuODY0MkM0OS43ODA4IDQ2LjI3ODIgNDcuOTA2IDQ2LjcwNSA0NS44NTg4IDQ3LjA4NTdNNDUuODU4OCA0Ny4wODU3QzM0LjE2NDkgNDkuMjYwNyAxNi44NDg2IDQ5LjkzNDMgMTYuMDI3NyAzOC4xNDg0QzE1LjIyIDI2LjU1MzMgMzIuMjY0IDIyLjM2MzYgNDUuNjEzNSAyNC41NjI2QzUzLjYwMSAyNS44NzgzIDU3LjQ1MDcgMjkuNjIwOCA1Ny45Mjg1IDM0LjIzN0M1OC4yODExIDM3LjY0MzUgNTUuNzc4IDQzLjM3MDIgNDUuODU4OCA0Ny4wODU3Wk00NS44NTg4IDQ3LjA4NTdDNDIuMzM2NyA0OC40MDUxIDM3Ljg3OTUgNDkuNDcwOCAzMi4yODMgNTAuMDg5MSIgc3Ryb2tlPSIjRkZDMzAwIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPgo=',
              },
              {
                content: 'ht',
                highlightImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE5LjkyNzcgNDcuMzU4OUg1My4wMDc4IiBzdHJva2U9IiM3MUUzNUIiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtZGFzaGFycmF5PSIwLjEgOCIvPgo8L3N2Zz4K',
              },
            ],
          },
          {
            fragments: [
              {
                content: 'High',
              },
              {
                content: 'ligh',
                highlightImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE5LjkyNzcgNDcuMzU4OUg1My4wMDc4IiBzdHJva2U9IiM3MUUzNUIiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtZGFzaGFycmF5PSIwLjEgOCIvPgo8L3N2Zz4K',
              },
              {
                content: 't',
              },
            ],
          },
          {
            fragments: [
              {
                content: 'Highlig',
              },
              {
                content: 'ht',
                highlightImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQyLjE2MDIgMzcuMTk0TDUxLjQ5NDkgMzAuNzc5MUM1MS41MTgxIDMwLjc2MzIgNTEuNTU0MSAzMC43ODAzIDUxLjUzODEgMzAuODAzNEM1MC4zODQ4IDMyLjQ2NTEgMzYuMDQzOSA1My4zNzQ4IDU2LjAyMDIgMzcuMTk0TTQyLjE1ODggMzcuMTk0QzIyLjE4MjYgNTMuMzc0OCAzNi41MjM1IDMyLjQ2NTEgMzcuNjc2OCAzMC44MDM0QzM3LjY5MjggMzAuNzgwMyAzNy42NTY3IDMwLjc2MzIgMzcuNjMzNiAzMC43NzkxTDI4LjI5ODggMzcuMTk0QzguMzIyNTggNTMuMzc0OCAyMi42NjQxIDMyLjQ2NTEgMjMuODE3NCAzMC44MDM0QzIzLjgzMzQgMzAuNzgwMyAyMy43OTc0IDMwLjc2MzIgMjMuNzc0MiAzMC43NzkxTDE0LjQzOTUgMzcuMTk0IiBzdHJva2U9IiM4OERBRjkiIHN0cm9rZS13aWR0aD0iOC44MiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPgo=',
              },
            ],
          },
        ],
      }),
    ]),
    new Image2D({
      style: {
        left: 200,
        top: 50,
        width: 100,
        height: 100,
      },
      src: '/example.jpg',
    }, [
      new ShadowEffect(),
    ]),
    new Video2D({
      style: {
        left: 200,
        top: 200,
        width: 100,
        height: 100,
      },
      src: '/example.mp4',
    }, [
      new ShadowEffect(),
    ]),
  ])

  console.warn(editor.drawboard.toJSON())
}

init()
