"use client"

import {
  BoxIcon,
  Command,
  DatabaseIcon,
  FileIcon,
  FolderIcon,
  LayoutTemplateIcon,
} from "lucide-react"
import * as React from "react"
import { ModeToggle } from "@/components/mode-toggle"
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
  useSidebar,
} from "@/components/ui/sidebar"

// This is sample data
const data = {
  navMain: [
    {
      title: "Assets",
      icon: FileIcon,
      items: ["Images", "Videos", "Audio", "Models", "Textures"],
    },
    {
      title: "Node Library",
      icon: BoxIcon,
      items: [
        "Loaders",
        "Samplers",
        "Conditioning",
        "Latent",
        "Image Processing",
      ],
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
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [activeItem, setActiveItem] = React.useState(data.navMain[0])
  const [items, setItems] = React.useState(data.navMain[0].items)
  const { setOpen, toggleSidebar } = useSidebar()

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row"
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
                {data.navMain.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      onClick={() => {
                        const isCurrentlyActive =
                          activeItem?.title === item.title
                        if (isCurrentlyActive) {
                          toggleSidebar()
                        } else {
                          setActiveItem(item)
                          setItems(item.items)
                          setOpen(true)
                        }
                      }}
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

      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">
              {activeItem?.title}
            </div>
          </div>
          <SidebarInput placeholder="Type to search..." />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {items.map((item) => (
                <a
                  href="#"
                  key={item}
                  className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight whitespace-nowrap last:border-b-0"
                >
                  <span className="font-medium">{item}</span>
                </a>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  )
}
