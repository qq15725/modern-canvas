/**
 * 标记对象「不参与响应式代理」。
 *
 * 引擎的部分内部对象是计算 / 资源对象而非视图数据——例如布局引擎的原生（embind）节点、
 * 文本排版挂载的大量字形 path 数据。它们不应被宿主的响应式系统深度代理：代理既无意义
 * （没有供视图消费的可追踪字段），又带来可观开销，甚至因被代理后再传入原生接口而崩溃。
 *
 * 实现沿用主流响应式库（Vue reactive）的事实约定：对象自带不可枚举的 `__v_skip` 标记时，
 * 响应式系统深度代理时会跳过它。这里只写入这一个标记，**不引入任何运行时依赖**；
 * 非 Vue 宿主下该标记无人读取，自然无副作用。
 */
const SKIP_FLAG = '__v_skip'

export function markRaw<T extends object>(value: T): T {
  if (
    !Object.prototype.hasOwnProperty.call(value, SKIP_FLAG)
    && Object.isExtensible(value)
  ) {
    Object.defineProperty(value, SKIP_FLAG, {
      configurable: true,
      enumerable: false,
      value: true,
    })
  }
  return value
}
