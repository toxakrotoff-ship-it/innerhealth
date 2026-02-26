export interface CategoryTreeItem {
  id: string
  title: string
  slug: string
  parentId: string | null
  sortOrder: number | null
}

export interface CategoryTreeNode extends CategoryTreeItem {
  children: CategoryTreeNode[]
}

export interface FlatCategoryTreeNode extends CategoryTreeItem {
  depth: number
}

function sortNodes(a: CategoryTreeItem, b: CategoryTreeItem): number {
  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER
  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER

  if (orderA !== orderB) {
    return orderA - orderB
  }

  return a.title.localeCompare(b.title, 'ru')
}

export function buildCategoryTree(categories: readonly CategoryTreeItem[]): CategoryTreeNode[] {
  const map = new Map<string, CategoryTreeNode>()
  const roots: CategoryTreeNode[] = []

  for (const category of categories) {
    map.set(category.id, { ...category, children: [] })
  }

  for (const node of map.values()) {
    if (!node.parentId) {
      roots.push(node)
      continue
    }

    const parent = map.get(node.parentId)
    if (!parent) {
      roots.push(node)
      continue
    }

    parent.children.push(node)
  }

  const sortRecursively = (nodes: CategoryTreeNode[]) => {
    nodes.sort(sortNodes)
    for (const node of nodes) {
      sortRecursively(node.children)
    }
  }

  sortRecursively(roots)
  return roots
}

export function flattenCategoryTree(
  tree: readonly CategoryTreeNode[],
  depth = 0
): FlatCategoryTreeNode[] {
  const flattened: FlatCategoryTreeNode[] = []
  for (const node of tree) {
    flattened.push({
      id: node.id,
      title: node.title,
      slug: node.slug,
      parentId: node.parentId,
      sortOrder: node.sortOrder,
      depth,
    })

    flattened.push(...flattenCategoryTree(node.children, depth + 1))
  }
  return flattened
}

export function getCategoryAncestorChain(
  categories: readonly CategoryTreeItem[],
  categoryId: string
): CategoryTreeItem[] {
  const byId = new Map(categories.map((category) => [category.id, category]))
  const chain: CategoryTreeItem[] = []
  const visited = new Set<string>()

  let current: CategoryTreeItem | undefined = byId.get(categoryId)
  while (current) {
    if (visited.has(current.id)) {
      break
    }

    visited.add(current.id)
    chain.push(current)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }

  return chain.reverse()
}

export function getDescendantCategoryIds(
  tree: readonly CategoryTreeNode[],
  categoryId: string
): Set<string> {
  const descendants = new Set<string>()

  const visit = (nodes: readonly CategoryTreeNode[], isInsideTargetBranch: boolean) => {
    for (const node of nodes) {
      const insideBranch = isInsideTargetBranch || node.id === categoryId
      if (insideBranch && node.id !== categoryId) {
        descendants.add(node.id)
      }
      visit(node.children, insideBranch)
    }
  }

  visit(tree, false)
  return descendants
}
