import type { Assets } from '../Assets'
import { VideoTexture } from '../../scene'
import { Loader } from './Loader'

export class VideoLoader extends Loader {
  declare load: (url: string) => Promise<VideoTexture>

  install(assets: Assets): this {
    this.load = (url) => {
      return assets.awaitBy(async () => {
        const texture = await new VideoTexture(url).load()
        // emit 'loaded' 让消费方（如 mce 时间轴据视频时长刷 endTime）在视频就绪后收到通知。
        // 保持 awaitBy 而非改用 loadBy：loadBy 会按 url 缓存并复用同一 VideoTexture 实例，
        // 同一视频出现在多个节点时会共享播放头/解码器，相互干扰；这里只补通知、不引入共享。
        assets.emit('loaded', url, texture)
        return texture
      })
    }

    assets.video = this

    return this
  }
}
