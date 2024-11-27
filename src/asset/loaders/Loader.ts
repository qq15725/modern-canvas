import type { Assets } from '../Assets'

export abstract class Loader {
  abstract install(assets: Assets): this
}
