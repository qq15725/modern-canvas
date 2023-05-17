import type { App } from './app'

export interface Plugin {
  name: string
  register?(app: App): void
}

export function definePlugin(plugin: Plugin | (() => Plugin)): Plugin {
  return typeof plugin === 'function' ? plugin() : plugin
}
