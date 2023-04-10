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
import { createCanvas, plugins } from 'modern-canvas'

const canvas = createCanvas({
  view: document.querySelector('canvas'),
  children: [
    { x: 0, y: 0, width: 30, height: 30, rotation: 30, image: '/example.jpg' },
    { x: 30, y: 30, width: 200, height: 200, image: '/example.png' },
    { x: 60, y: 60, width: 120, height: 120, rotation: 50, image: '/example.jpg' },
    { x: 200, y: 200, width: 100, height: 100, image: '/example.png' },
    { x: 30, y: 30, width: 100, height: 100, rotation: 40, text: 'example' },
  ],
  plugins,
})

await canvas.load()

canvas.startRenderLoop()
```
