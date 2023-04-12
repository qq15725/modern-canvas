<script setup lang="ts">
  import { onMounted, reactive, ref } from 'vue'
  import { createCanvas, plugins } from '../../src'
  import type { Node } from '../../src'

  const viewEl = ref()
  const activeElement = ref<Node>()
  const children = reactive([
    { x: 0, y: 0, width: 130, height: 130, rotation: 30, image: '/example.jpg' },
    { x: 30, y: 30, width: 200, height: 200, image: '/example.png' },
    { x: 60, y: 60, width: 240, height: 240, rotation: 50, image: '/example.jpg', fade: true },
    { x: 30, y: 30, width: 200, height: 200, rotation: 40, fontSize: 40, text: 'example', color: 'red' },
    { x: 200, y: 200, width: 100, height: 100, image: '/example.png' },
    { x: 100, y: 200, width: 100, height: 100, video: '/example.mp4' },
  ])

  onMounted(async () => {
    const canvas = createCanvas({
      view: viewEl.value,
      children,
      plugins,
    })
    await canvas.load()
    canvas.startRenderLoop()
  })

  const pointer = { x: 0, y: 0 }
  function onMoveStart(event: MouseEvent) {
    if (!activeElement.value) return
    pointer.x = event.clientX - (activeElement.value.x ?? 0)
    pointer.y = event.clientY - (activeElement.value.y ?? 0)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onMoveEnd, true)
  }
  function onMove(event: MouseEvent) {
    if (!activeElement.value) return
    activeElement.value.x = event.clientX - pointer.x
    activeElement.value.y = event.clientY - pointer.y
  }
  function onMoveEnd() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onMoveEnd, true)
  }
</script>

<template>
  <div class="editor">
    <canvas
      ref="viewEl"
      style="width: 100%;"
      width="400"
      height="400"
    />

    <div class="editor__cover">
      <div
        v-for="(node, key) in children"
        :key="key"
        class="editor__element-placeholder"
        :style="{
          width: `${node.width}px`,
          height: `${node.height}px`,
          transform: `translate(${node.x}px, ${node.y}px) rotate(${node.rotation ?? 0}deg)`,
        }"
        @mousedown.stop.prevent="(event) => {
          activeElement = node
          onMoveStart(event)
        }"
      />

      <div
        v-if="activeElement"
        class="drag-box"
        :style="{
          width: `${activeElement.width}px`,
          height: `${activeElement.height}px`,
          transform: `translate(${activeElement.x}px, ${activeElement.y}px) rotate(${activeElement.rotation ?? 0}deg)`,
        }"
        @mousedown.stop.prevent="onMoveStart"
      />
    </div>
  </div>
</template>

<style>
  html body {
    margin: 0;
  }

  .editor {
    position: relative;
    width: 400px;
    height: 400px;
    margin: auto;
    border: 1px solid grey;
  }

  .editor__cover {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
  }

  .editor__element-placeholder {
    position: absolute;
  }

  .editor__element-placeholder:hover {
    outline: 1px dashed red;
  }

  .drag-box {
    position: absolute;
    pointer-events: auto;
    outline: #6ccefe solid 2px;
    outline-offset: 0;
  }
</style>
