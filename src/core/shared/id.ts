let instanceIdCache = 0
export function instanceId(): number {
  return ++instanceIdCache
}
