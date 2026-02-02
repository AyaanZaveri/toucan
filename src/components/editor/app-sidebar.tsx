"use client"

import {
  BoxIcon,
  ChevronRight,
  Circle,
  Command,
  DatabaseIcon,
  FileIcon,
  FolderIcon,
  LayoutTemplateIcon,
} from "lucide-react"
import * as React from "react"
import { ModeToggle } from "@/components/mode-toggle"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  type FolderNode,
  fetchObjectInfo,
  filterTree,
  type NodeLeaf,
  type NodeLibraryTree,
  transformObjectInfoToTree,
} from "@/lib/comfy/objectInfoSidebar"

// Static sections that don't change
const STATIC_SECTIONS = [
  {
    title: "Assets",
    icon: FileIcon,
    items: ["Images", "Videos", "Audio", "Models", "Textures"],
  },
  {
    title: "Model Library",
    icon: DatabaseIcon,
    items: ["Checkpoints", "VAE", "LoRA", "Embeddings", "Upscale Models"],
  },
  {
    title: "Workflows",
    icon: FolderIcon,
    items: ["Recent", "Favorites", "Shared", "Templates", "Examples"],
  },
  {
    title: "Templates",
    icon: LayoutTemplateIcon,
    items: [
      "Text to Image",
      "Image to Image",
      "Upscaling",
      "Inpainting",
      "ControlNet",
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Node library tree state
  const [nodeLibraryTree, setNodeLibraryTree] =
    React.useState<NodeLibraryTree | null>(null)
  const [nodeLibraryLoading, setNodeLibraryLoading] = React.useState(true)
  const [nodeLibraryError, setNodeLibraryError] = React.useState<string | null>(
    null,
  )
  const [openFolders, setOpenFolders] = React.useState<Set<string>>(new Set())

  // Navigation state
  const [navMain, setNavMain] = React.useState(() => {
    // Initialize with static sections + placeholder Node Library
    return [
      STATIC_SECTIONS[0], // Assets
      {
        title: "Node Library",
        icon: BoxIcon,
        items: ["Loading..."],
      },
      ...STATIC_SECTIONS.slice(1), // Model Library, Workflows, Templates
    ]
  })

  const [activeItem, setActiveItem] = React.useState(navMain[0])
  const [items, setItems] = React.useState(navMain[0].items)
  const [searchQuery, setSearchQuery] = React.useState("")

  const { setOpen, toggleSidebar } = useSidebar()

  // Fetch node library on mount
  React.useEffect(() => {
    async function loadNodeLibrary() {
      try {
        setNodeLibraryLoading(true)
        setNodeLibraryError(null)

        const objectInfo = await fetchObjectInfo()
        const tree = transformObjectInfoToTree(objectInfo)

        setNodeLibraryTree(tree)
      } catch (error) {
        console.error("Failed to load node library:", error)
        setNodeLibraryError(
          error instanceof Error
            ? error.message
            : "Failed to load node library",
        )
      } finally {
        setNodeLibraryLoading(false)
      }
    }

    loadNodeLibrary()
  }, [])

  // Handle clicking a sidebar icon
  const handleSidebarIconClick = (item: (typeof navMain)[0]) => {
    const isCurrentlyActive = activeItem?.title === item.title

    if (isCurrentlyActive) {
      toggleSidebar()
    } else {
      setActiveItem(item)
      setSearchQuery("")

      // For non-Node Library sections, update items
      if (item.title !== "Node Library") {
        setItems(item.items)
      }

      setOpen(true)
    }
  }

  // Toggle folder open/closed state
  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  // Get the current display items based on state and search (for non-Node Library sections)
  const getDisplayItems = (): string[] => {
    let baseItems = items

    // Apply search filter
    if (searchQuery.trim()) {
      baseItems = baseItems.filter((item) =>
        item.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    return baseItems
  }

  const displayItems = getDisplayItems()

  // Get filtered tree and auto-open folders for Node Library search
  const { tree: filteredTree, autoOpen } = React.useMemo(() => {
    if (!nodeLibraryTree) {
      return { tree: null, autoOpen: new Set<string>() }
    }
    return filterTree(nodeLibraryTree, searchQuery)
  }, [nodeLibraryTree, searchQuery])

  // Recursive folder renderer
  const renderFolder = (
    folder: FolderNode,
    depth: number = 0,
  ): React.ReactNode => {
    const isOpen = openFolders.has(folder.id) || autoOpen.has(folder.id)
    const clampedDepth = Math.min(depth, 6)
    const paddingLeft = 8 + clampedDepth * 8

    return (
      <Collapsible
        key={folder.id}
        open={isOpen}
        onOpenChange={() => toggleFolder(folder.id)}
      >
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              className="w-full flex items-center gap-2"
              style={{ paddingLeft: `${paddingLeft}px` }}
            >
              <ChevronRight
                className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
              />
              <FolderIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{folder.title}</span>
              <Badge
                variant="secondary"
                className="shrink-0 h-5 px-2 text-[10px]"
              >
                {folder.count}
              </Badge>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub className="mx-0 border-l-0 px-0">
              {folder.children.map((child) => {
                if (child.kind === "folder") {
                  return renderFolder(child, depth + 1)
                } else {
                  return renderNode(child, depth + 1)
                }
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    )
  }

  // Node leaf renderer
  const renderNode = (node: NodeLeaf, depth: number = 0): React.ReactNode => {
    const clampedDepth = Math.min(depth, 6)
    const paddingLeft = 12 + clampedDepth * 12

    return (
      <SidebarMenuSubItem key={node.key}>
        <SidebarMenuSubButton
          asChild
          className="translate-x-0"
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="flex items-center gap-2 min-w-0"
          >
            <div className="size-2 rounded-full bg-primary shrink-0" />
            <span className="min-w-0 flex-1 truncate">{node.title}</span>
          </a>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    )
  }

  return (
    <Sidebar
      collapsible="icon"
      className="[&>[data-sidebar=sidebar]]:flex-row"
      {...props}
    >
      <Sidebar
        collapsible="none"
        className="!w-[calc(var(--sidebar-width-icon)_+_1px)] border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <a href="#">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Toucan</span>
                    <span className="truncate text-xs">Editor</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {navMain.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      onClick={() => handleSidebarIconClick(item)}
                      isActive={activeItem?.title === item.title}
                      className="px-2.5 md:px-2"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={{
                  children: "Theme",
                  hidden: false,
                }}
                // className="px-2.5 md:px-2"
                asChild
              >
                <ModeToggle />
                {/* <span>Theme</span> */}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <Sidebar
        collapsible="none"
        className="hidden flex-1 md:flex flex-col min-w-0"
      >
        <SidebarHeader className="gap-3.5 border-b p-4 shrink-0">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">
              {activeItem?.title}
            </div>
          </div>
          <SidebarInput
            placeholder="Type to search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SidebarHeader>
        <SidebarContent className="min-h-0 overflow-auto">
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {activeItem?.title === "Node Library" ? (
                // Node Library tree view
                nodeLibraryLoading ? (
                  <div className="flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight">
                    <span className="text-muted-foreground">
                      Loading node library...
                    </span>
                  </div>
                ) : nodeLibraryError && !nodeLibraryTree ? (
                  <div className="flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight">
                    <span className="text-destructive text-xs">
                      {nodeLibraryError}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      Failed to load node library
                    </span>
                  </div>
                ) : filteredTree && filteredTree.children.length > 0 ? (
                  <SidebarMenu>
                    {filteredTree.children.map((child) => {
                      if (child.kind === "folder") {
                        return renderFolder(child, 0)
                      }
                      return null
                    })}
                  </SidebarMenu>
                ) : searchQuery.trim() ? (
                  <div className="flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight">
                    <span className="text-muted-foreground">
                      No results found
                    </span>
                  </div>
                ) : null
              ) : // Other sections - flat list view
              displayItems.length === 0 ? (
                <div className="flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight">
                  <span className="text-muted-foreground">
                    No results found
                  </span>
                </div>
              ) : (
                displayItems.map((item) => (
                  <a
                    href="#"
                    key={item}
                    onClick={(e) => e.preventDefault()}
                    className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight whitespace-nowrap last:border-b-0"
                  >
                    <span className="font-medium">{item}</span>
                  </a>
                ))
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  )
}
