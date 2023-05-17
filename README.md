<h1 align="center">modern-canvas</h1>

<p align="center">
  <a href="https://unpkg.com/modern-canvas">
    <img src="https://img.shields.io/bundlephobia/minzip/modern-canvas" alt="Minzip">
  </a>
  <a href="https://www.npmjs.com/package/modern-canvas">
    <img src="https://img.shields.io/npm/v/modern-canvas.svg" alt="Version">
  </a>
  <a href="https://www.npmjs.com/package/modern-canvas">
    <img src="https://img.shields.io/npm/dm/modern-canvas" alt="Downloads">
  </a>
  <a href="https://github.com/qq15725/modern-canvas/issues">
    <img src="https://img.shields.io/github/issues/qq15725/modern-canvas" alt="Issues">
  </a>
  <a href="https://github.com/qq15725/modern-canvas/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/modern-canvas.svg" alt="License">
  </a>
</p>


## 📦 Install

```shell
npm i modern-canvas
```

## 🦄 Usage

```ts
import { createApp, plugins } from 'modern-canvas'

const app = createApp({
  view: document.querySelector('canvas'),
  children: [
    {
      type: 'image',
      style: {
        left: 0,
        top: 0,
        width: 130,
        height: 130,
        rotation: 30,
      },
      src: '/example.jpg',
    },
    {
      type: 'text',
      style: {
        left: 60,
        top: 60,
        width: 240,
        height: 240,
        rotation: 0,
        fontSize: 40,
        color: 'red',
      },
      content: 'TEXT',
    },
    {
      type: 'video',
      style: {
        left: 60,
        top: 60,
        width: 30,
        height: 30,
        rotation: 30,
      },
      src: 'example.mp4',
    },
  ],
  plugins,
})

await app.load()

app.start()
```
