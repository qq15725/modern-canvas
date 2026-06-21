import type { CommentThread, NormalizedCommentThread, PropertyDeclaration } from 'modern-idoc'
import type { Element2D } from './Element2D'
import { idGenerator, normalizeComments } from 'modern-idoc'
import { CoreObject } from '../../../core'

/**
 * 元素上的评论线程集合。内部按 `threadId` 作动态键存储（仿 {@link Meta}），
 * 从而能像其它子属性一样被 CRDT 逐线程映射为 Y.Map 项（并发新增不同线程天然合并）。
 * 对外 `toJSON` 输出 idoc 规范的 `CommentThread[]` 数组形态。
 */
export class Element2DComments extends CoreObject {
  [key: string]: any

  constructor(public parent: Element2D) {
    super()
  }

  // 动态键：声明随当前已存的线程 id 生成（与 Meta 同套路），供 resetProperties 枚举。
  override getPropertyDeclarations(): Record<string, PropertyDeclaration> {
    super.getPropertyDeclarations()
    const declarations: Record<string, PropertyDeclaration> = {}
    Object.keys(this._properties).forEach((key) => {
      declarations[key] = { internalKey: `____${key}` as any }
    })
    return declarations
  }

  override getPropertyDeclaration(key: string): PropertyDeclaration | undefined {
    return { internalKey: `____${key}` as any }
  }

  /** 接受 CommentThread[]（按 thread.id 归键）或已归键的对象。 */
  override setProperties(value?: CommentThread[] | Record<string, CommentThread>): this {
    if (Array.isArray(value)) {
      const map: Record<string, CommentThread> = {}
      value.forEach((thread) => {
        const id = thread.id ?? idGenerator()
        map[id] = { ...thread, id }
      })
      return super.setProperties(map)
    }
    return super.setProperties(value)
  }

  /** 序列化为 idoc 规范的线程数组。 */
  override toJSON(): NormalizedCommentThread[] {
    return normalizeComments(Object.values(this._properties) as CommentThread[]) ?? []
  }

  isValid(): boolean {
    return Object.keys(this._properties).length > 0
  }
}
