export type ObjectInfo = Record<
  string,
  {
    display_name?: string
    category?: string
    name?: string
  } & Record<string, any>
>

// Tree structure types
export interface NodeLeaf {
  kind: "node"
  key: string
  title: string
}

export interface FolderNode {
  kind: "folder"
  id: string // stable id, e.g. "sampling" or "sampling/custom_sampling"
  title: string // display label, e.g. "sampling"
  children: Array<FolderNode | NodeLeaf>
  count: number // computed leaf count in subtree
}

export interface NodeLibraryTree {
  kind: "root"
  children: FolderNode[]
}

// Legacy types (kept for backwards compatibility, can be removed later)
export interface NodeItem {
  key: string
  title: string
}

export interface CategoryData {
  id: string
  title: string
  nodes: NodeItem[]
}

export type NodeCategoryMap = Record<string, CategoryData>

export interface NodeLibraryData {
  categories: NodeCategoryMap
  categoryOrder: string[]
}

/**
 * Fetch ComfyUI's object_info from the proxied endpoint.
 */
export async function fetchObjectInfo(): Promise<ObjectInfo> {
  const res = await fetch("/comfy/api/object_info", { method: "GET" })
  if (!res.ok) {
    throw new Error(
      `Failed to fetch object_info: ${res.status} ${res.statusText}`,
    )
  }
  return await res.json()
}

/**
 * Normalize a category string to its display title.
 * - Takes first path segment before "/"
 * - Title-cases it (e.g. "loaders" -> "Loaders")
 */
function normalizeCategoryTitle(categoryRaw: string): string {
  const firstSegment = categoryRaw.split("/")[0]
  return firstSegment
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

/**
 * Transform the raw objectInfo response into a structured category map.
 */
export function transformObjectInfoToCategories(
  objectInfo: ObjectInfo,
): NodeLibraryData {
  const categoryMap: NodeCategoryMap = {}

  for (const [nodeKey, info] of Object.entries(objectInfo)) {
    const categoryRaw = info.category ?? "uncategorized"
    const categoryId = categoryRaw.split("/")[0].toLowerCase()
    const categoryTitle = normalizeCategoryTitle(categoryRaw)

    const nodeTitle = info.display_name ?? info.name ?? nodeKey

    if (!categoryMap[categoryId]) {
      categoryMap[categoryId] = {
        id: categoryId,
        title: categoryTitle,
        nodes: [],
      }
    }

    categoryMap[categoryId].nodes.push({
      key: nodeKey,
      title: nodeTitle,
    })
  }

  for (const category of Object.values(categoryMap)) {
    category.nodes.sort((a, b) => a.title.localeCompare(b.title))
  }

  const categoryOrder = Object.keys(categoryMap).sort((a, b) =>
    categoryMap[a].title.localeCompare(categoryMap[b].title),
  )

  return {
    categories: categoryMap,
    categoryOrder,
  }
}

/**
 * Transform the raw objectInfo response into a hierarchical tree structure.
 */
export function transformObjectInfoToTree(
  objectInfo: ObjectInfo,
): NodeLibraryTree {
  const root: NodeLibraryTree = { kind: "root", children: [] }
  const folderMap = new Map<string, FolderNode>()

  // Helper to get or create a folder at a given path
  function getOrCreateFolder(pathSegments: string[]): FolderNode {
    const folderId = pathSegments.join("/")

    if (folderMap.has(folderId)) {
      return folderMap.get(folderId)!
    }

    const title = pathSegments[pathSegments.length - 1]
    const folder: FolderNode = {
      kind: "folder",
      id: folderId,
      title,
      children: [],
      count: 0,
    }

    folderMap.set(folderId, folder)

    // Attach to parent or root
    if (pathSegments.length === 1) {
      root.children.push(folder)
    } else {
      const parentSegments = pathSegments.slice(0, -1)
      const parent = getOrCreateFolder(parentSegments)
      parent.children.push(folder)
    }

    return folder
  }

  // Build the tree
  for (const [nodeKey, info] of Object.entries(objectInfo)) {
    const categoryRaw = info.category ?? "uncategorized"
    const segments = categoryRaw.split("/").filter(Boolean)
    const nodeTitle = info.display_name ?? info.name ?? nodeKey

    // Get the folder for this category path
    const folder = getOrCreateFolder(segments)

    // Add the node as a leaf
    folder.children.push({
      kind: "node",
      key: nodeKey,
      title: nodeTitle,
    })
  }

  // Compute counts and sort
  function processFolder(folder: FolderNode): number {
    let leafCount = 0

    // Separate folders and nodes
    const folders: FolderNode[] = []
    const nodes: NodeLeaf[] = []

    for (const child of folder.children) {
      if (child.kind === "folder") {
        folders.push(child)
        leafCount += processFolder(child)
      } else {
        nodes.push(child)
        leafCount += 1
      }
    }

    // Sort folders and nodes alphabetically
    folders.sort((a, b) => a.title.localeCompare(b.title))
    nodes.sort((a, b) => a.title.localeCompare(b.title))

    // Combine: folders first, then nodes
    folder.children = [...folders, ...nodes]
    folder.count = leafCount

    return leafCount
  }

  // Process all root folders
  for (const child of root.children) {
    if (child.kind === "folder") {
      processFolder(child)
    }
  }

  // Sort root folders
  root.children.sort((a, b) => {
    if (a.kind === "folder" && b.kind === "folder") {
      return a.title.localeCompare(b.title)
    }
    return 0
  })

  return root
}

/**
 * Filter a tree based on a search query and return folders that should auto-expand.
 */
export function filterTree(
  tree: NodeLibraryTree,
  query: string,
): { tree: NodeLibraryTree; autoOpen: Set<string> } {
  const autoOpen = new Set<string>()

  if (!query.trim()) {
    return { tree, autoOpen }
  }

  const lowerQuery = query.toLowerCase()

  function matchesQuery(text: string): boolean {
    return text.toLowerCase().includes(lowerQuery)
  }

  function filterFolder(folder: FolderNode): FolderNode | null {
    const titleMatches = matchesQuery(folder.title)
    const filteredChildren: Array<FolderNode | NodeLeaf> = []
    let hasMatchingDescendant = false

    for (const child of folder.children) {
      if (child.kind === "folder") {
        const filtered = filterFolder(child)
        if (filtered) {
          filteredChildren.push(filtered)
          hasMatchingDescendant = true
          autoOpen.add(folder.id) // Parent should expand
        }
      } else if (child.kind === "node") {
        if (matchesQuery(child.title)) {
          filteredChildren.push(child)
          hasMatchingDescendant = true
          autoOpen.add(folder.id) // Parent should expand
        }
      }
    }

    // Keep folder if title matches OR has matching descendants
    if (titleMatches || hasMatchingDescendant) {
      // Recalculate count for filtered children
      let newCount = 0
      for (const child of filteredChildren) {
        if (child.kind === "folder") {
          newCount += child.count
        } else {
          newCount += 1
        }
      }

      return {
        ...folder,
        children: filteredChildren,
        count: newCount,
      }
    }

    return null
  }

  const filteredRootChildren: FolderNode[] = []
  for (const child of tree.children) {
    if (child.kind === "folder") {
      const filtered = filterFolder(child)
      if (filtered) {
        filteredRootChildren.push(filtered)
      }
    }
  }

  return {
    tree: { kind: "root", children: filteredRootChildren },
    autoOpen,
  }
}
