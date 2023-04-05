<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { createCanvas } from '../../src'

  const canvasEl = ref()

  onMounted(async () => {
    const canvas = createCanvas({
      view: canvasEl.value,
    })

    canvas.children.push({
      type: 'image',
      x: 0.2,
      y: 0.2,
      w: 1 / 4,
      h: 1 / 4,
      url: '/example.jpg',
    })

    await canvas.boot()

    canvas.draw(0)
  })
</script>

<template>
  <div style="text-align: center;">
    <canvas ref="canvasEl" style="width: 200px" width="400" height="400" />
  </div>
</template>

<style>
  html body {
    margin: 0;
  }
</style>
