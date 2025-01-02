import { basename, resolve } from 'node:path'
import { defineConfig } from 'vite'
import { browser, name } from './package.json'

const resolvePath = (str: string) => resolve(__dirname, str)

export default defineConfig({
  build: {
    lib: {
      formats: ['umd'],
      entry: resolvePath('./src/index.ts'),
    },
    rollupOptions: {
      external: ['modern-gif', 'lottie-web'],
      output: [
        {
          format: 'umd',
          entryFileNames: basename(browser),
          name: name.replace(/-(\w)/g, (_, v) => v.toUpperCase()),
          globals: {
            'modern-gif': 'modernGif',
            'lottie-web': 'lottie',
          },
        },
      ],
    },
  },
})
