import { basename, resolve } from 'node:path'
import { defineConfig } from 'vite'
import { browser, name } from './package.json'

const resolvePath = (str: string) => resolve(__dirname, str)

export default defineConfig({
  build: {
    lib: {
      entry: resolvePath('./src/index.ts'),
    },
    rollupOptions: {
      external: ['modern-gif', 'lottie-web', /^yoga-layout/],
      output: [
        {
          format: 'umd',
          entryFileNames: basename(browser),
          name: name.replace(/-(\w)/g, (_, v) => v.toUpperCase()),
          globals: {
            'modern-gif': 'modernGif',
            'lottie-web': 'lottie',
            'yoga-layout': 'yogaLayout', // yoga-layout does not have umi
          },
        },
      ],
    },
  },
})
