import type { App } from './app'

export interface System {
  update?(time?: number): void
}

export function registerSystem(app: App, system: System) {
  const { systems } = app

  systems.push(system)
}
