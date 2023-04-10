<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { createCanvas, plugins } from '../../src'

  const canvasEl = ref()

  onMounted(async () => {
    const canvas = createCanvas({
      view: canvasEl.value,
      children: [
        { x: 0, y: 0, width: 130, height: 130, rotation: 30, image: '/example.jpg' },
        { x: 30, y: 30, width: 200, height: 200, image: '/example.png' },
        { x: 60, y: 60, width: 240, height: 240, rotation: 50, image: '/example.jpg', fade: true },
        { x: 30, y: 30, width: 200, height: 200, rotation: 40, fontSize: 40, text: 'example', color: 'red' },
        { x: 200, y: 200, width: 100, height: 100, image: '/example.png' },
      ],
      plugins,
    })

    await canvas.load()

    canvas.startRenderLoop()

    const pointer: Record<string, any> = {
      startX: undefined,
      startY: undefined,
      offsetX: 0,
      offsetY: 0,
    }

    const selected = {
      x: 0,
      y: 0,
    }

    document.addEventListener('pointerdown', e => {
      if (!canvas.get('selected')) return
      pointer.startX = e.clientX
      pointer.startY = e.clientY
      selected.x = canvas.get('selected').x
      selected.y = canvas.get('selected').y
    })
    document.addEventListener('pointermove', e => {
      if (pointer.startX === undefined) return
      pointer.offsetX = e.clientX - pointer.startX
      pointer.offsetY = e.clientY - pointer.startY
      canvas.get('selected').x = selected.x + pointer.offsetX * 2
      canvas.get('selected').y = selected.y + pointer.offsetY * 2
    })
    document.addEventListener('pointerup', () => {
      pointer.startX = undefined
      pointer.startY = undefined
    })
  })
</script>

<template>
  <div style="text-align: center;">
    <canvas ref="canvasEl" style="width: 200px; border: 1px solid grey;" width="400" height="400" />
  </div>
</template>

<style>
  html body {
    margin: 0;
  }
</style>
