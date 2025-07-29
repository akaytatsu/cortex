import { useState, useEffect, useRef } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Folder,
  FolderOpen,
  File,
  FileText,
  Code,
  Image,
  Package,
  Settings,
  Database,
  Loader2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import type { FileSystemItem } from "shared-types";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "./ui/PullToRefreshIndicator";
import { useViewportSize } from "../lib/responsive";
import { useContextMenu } from "../hooks/useContextMenu";
import { ContextMenu } from "./ui/ContextMenu";
import { Copy, Trash2, Edit, FolderPlus, FilePlus } from "lucide-react";

interface FileBrowserProps {
  workspaceName: string;
  onFileSelect?: (filePath: string) => void;
}

interface FileItemProps {
  item: FileSystemItem;
  level: number;
  onFileSelect?: (filePath: string) => void;
  onContextMenuAction?: (action: string, item: FileSystemItem) => void;
}

function getFileIcon(fileName: string, isOpen?: boolean) {
  const ext = fileName.split(".").pop()?.toLowerCase();

  // Directory icons
  if (!ext) {
    return isOpen ? (
      <FolderOpen className="w-4 h-4" />
    ) : (
      <Folder className="w-4 h-4" />
    );
  }

  // File icons based on extension
  switch (ext) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "vue":
    case "py":
    case "java":
    case "php":
    case "cpp":
    case "c":
    case "h":
    case "go":
    case "rs":
    case "rb":
      return <Code className="w-4 h-4 text-blue-500" />;

    case "json":
    case "yaml":
    case "yml":
    case "toml":
    case "xml":
    case "env":
      return <Settings className="w-4 h-4 text-gray-500" />;

    case "md":
    case "txt":
    case "readme":
      return <FileText className="w-4 h-4 text-green-500" />;

    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "webp":
      return <Image className="w-4 h-4 text-purple-500" />;

    case "sql":
    case "db":
    case "sqlite":
      return <Database className="w-4 h-4 text-orange-500" />;

    case "package":
    case "lock":
      return <Package className="w-4 h-4 text-red-500" />;

    default:
      return <File className="w-4 h-4 text-gray-400" />;
  }
}

function FileItem({ item, level, onFileSelect, onContextMenuAction }: FileItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  // Context menu items for file/folder
  const getContextMenuItems = () => {
    const baseItems = [
      {
        id: "copy",
        label: "Copiar",
        icon: <Copy size={16} />,
        onClick: () => onContextMenuAction?.("copy", item),
      },
      {
        id: "rename",
        label: "Renomear",
        icon: <Edit size={16} />,
        onClick: () => onContextMenuAction?.("rename", item),
      },
    ];

    if (item.type === "directory") {
      baseItems.push(
        {
          id: "new-file",
          label: "Novo Arquivo",
          icon: <FilePlus size={16} />,
          onClick: () => onContextMenuAction?.("new-file", item),
        },
        {
          id: "new-folder",
          label: "Nova Pasta",
          icon: <FolderPlus size={16} />,
          onClick: () => onContextMenuAction?.("new-folder", item),
        }
      );
    }

    baseItems.push({
      id: "delete",
      label: "Excluir",
      icon: <Trash2 size={16} />,
      onClick: () => onContextMenuAction?.("delete", item),
      destructive: true,
    });

    return baseItems;
  };

  const { attachContextMenuListeners } = useContextMenu();

  // Attach context menu listeners
  useEffect(() => {
    if (itemRef.current && onContextMenuAction) {
      const cleanup = attachContextMenuListeners(itemRef.current, getContextMenuItems());
      return cleanup;
    }
  }, [attachContextMenuListeners, onContextMenuAction, item]);

  const handleClick = () => {
    if (item.type === "directory") {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect?.(item.path);
    }
  };

  const paddingLeft = `${level * 16 + 8}px`;

  return (
    <div>
      <div
        ref={itemRef}
        className={`
          flex items-center space-x-2 px-2 py-1 text-sm cursor-pointer rounded
          hover:bg-gray-100 dark:hover:bg-gray-700
          ${item.type === "file" ? "text-gray-700 dark:text-gray-300" : "text-gray-800 dark:text-gray-200 font-medium"}
        `}
        style={{ paddingLeft }}
        onClick={handleClick}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        role="button"
        tabIndex={0}
      >
        {item.type === "directory" && (
          <div className="w-4 h-4 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-gray-500" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-500" />
            )}
          </div>
        )}
        {item.type === "file" && <div className="w-4" />}
        {getFileIcon(item.name, isExpanded)}
        <span className="truncate">{item.name}</span>
      </div>

      {item.type === "directory" && isExpanded && item.children && (
        <div>
          {item.children.map(child => (
            <FileItem
              key={child.path}
              item={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              onContextMenuAction={onContextMenuAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileBrowser({ workspaceName, onFileSelect }: FileBrowserProps) {
  const { isMobile } = useViewportSize();
  const fetcher = useFetcher<{ files: FileSystemItem[]; error?: string }>();
  const [files, setFiles] = useState<FileSystemItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetcher.load(`/api/workspaces/${workspaceName}/files`);
  }, [workspaceName]);

  useEffect(() => {
    if (fetcher.data?.files) {
      setFiles(fetcher.data.files);
    }
  }, [fetcher.data]);

  // Pull to refresh functionality
  const handleRefresh = async () => {
    // Simulate network delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    fetcher.load(`/api/workspaces/${workspaceName}/files`);
  };

  const {
    attachPullToRefreshListeners,
    isRefreshing,
    pullProgress,
    getPullState,
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: isMobile,
    triggerDistance: 60,
    maxPullDistance: 100,
  });

  // Attach pull to refresh listeners
  useEffect(() => {
    if (containerRef.current && isMobile) {
      const cleanup = attachPullToRefreshListeners(containerRef.current);
      return cleanup;
    }
  }, [attachPullToRefreshListeners, isMobile]);

  // Context menu functionality
  const { contextMenu, hideContextMenu, contextMenuItems } = useContextMenu({
    enabled: true,
  });

  // Handle context menu actions
  const handleContextMenuAction = (action: string, item: FileSystemItem) => {
    console.log(`Context menu action: ${action} on ${item.name}`);
    
    switch (action) {
      case "copy":
        // Copy file/folder path to clipboard
        if (navigator.clipboard) {
          navigator.clipboard.writeText(item.path);
        }
        break;
      case "rename":
        // TODO: Implement rename functionality
        console.log("Rename not implemented yet");
        break;
      case "delete":
        // TODO: Implement delete functionality
        console.log("Delete not implemented yet");
        break;
      case "new-file":
        // TODO: Implement new file functionality
        console.log("New file not implemented yet");
        break;
      case "new-folder":
        // TODO: Implement new folder functionality
        console.log("New folder not implemented yet");
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }
  };

  if (fetcher.state === "loading" && !files.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Carregando arquivos...</span>
        </div>
      </div>
    );
  }

  if (fetcher.data?.error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-red-500 text-center">
          <p>Erro ao carregar arquivos</p>
          <p className="text-xs text-red-400 mt-1">{fetcher.data.error}</p>
        </div>
      </div>
    );
  }

  if (!files.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-gray-500 text-center">
          <Folder className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>Nenhum arquivo encontrado</p>
        </div>
      </div>
    );
  }

  const pullState = getPullState();

  return (
    <div ref={containerRef} className="flex-1 overflow-auto">
      {/* Pull to Refresh Indicator */}
      {isMobile && (
        <PullToRefreshIndicator
          progress={pullProgress}
          isRefreshing={isRefreshing}
          canTrigger={pullState.canTrigger}
          className="sticky top-0 bg-surface-primary border-b border-border-primary z-10"
        />
      )}
      
      <div className="space-y-1 p-2">
        {files.map(file => (
          <FileItem
            key={file.path}
            item={file}
            level={0}
            onFileSelect={onFileSelect}
            onContextMenuAction={handleContextMenuAction}
          />
        ))}
      </div>

      {/* Context Menu */}
      <ContextMenu
        items={contextMenuItems}
        position={contextMenu.position}
        visible={contextMenu.visible}
        onClose={hideContextMenu}
      />
    </div>
  );
}
