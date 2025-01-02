import type { Style2D } from './Style2D'

export abstract class Style2DModule {
  abstract install(Style2D: new () => Style2D): void
}
