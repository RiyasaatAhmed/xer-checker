// Helpers for the WBS groups the backend sends, in tree order with each one's parent.

import type { WbsGroup } from './types'

/** {parent ID: its groups, in order}. The root has the key "". */
export function childrenOf(groups: WbsGroup[]): Map<string, WbsGroup[]> {
  const map = new Map<string, WbsGroup[]>()
  for (const group of groups) {
    const key = group.parent_id ?? ''
    map.set(key, [...(map.get(key) ?? []), group])
  }
  return map
}

/** The groups the map starts with. A project is usually one root group, so start inside it. */
export function topLevel(groups: WbsGroup[]): WbsGroup[] {
  const children = childrenOf(groups)
  let level = children.get('') ?? []
  while (level.length === 1 && (children.get(level[0].id) ?? []).length > 0) level = children.get(level[0].id) ?? []
  return level
}

/** The groups on screen: the top level, and the children of every expanded group, in order. */
export function visibleGroups(groups: WbsGroup[], expanded: Set<string>): WbsGroup[] {
  const children = childrenOf(groups)
  const out: WbsGroup[] = []
  const walk = (group: WbsGroup) => {
    out.push(group)
    if (expanded.has(group.id)) (children.get(group.id) ?? []).forEach(walk)
  }
  topLevel(groups).forEach(walk)
  return out
}

/** A group's name and the names of every group inside it, to filter activities by their WBS. */
export function namesIn(groups: WbsGroup[], id: string): Set<string> {
  const children = childrenOf(groups)
  const names = new Set<string>()
  const walk = (group: WbsGroup) => {
    names.add(group.name)
    ;(children.get(group.id) ?? []).forEach(walk)
  }
  const start = groups.find((g) => g.id === id)
  if (start) walk(start)
  return names
}
