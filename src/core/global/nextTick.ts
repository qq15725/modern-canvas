import { Ticker } from './Ticker'

export async function nextTick(cb?: () => void): Promise<void> {
  return new Promise((resolve) => {
    Ticker.on(
      () => {
        cb?.()
        resolve()
      },
      { sort: 1, once: true },
    )
  })
}
