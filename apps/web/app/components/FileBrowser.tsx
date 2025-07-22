import { useState, useEffect } from "react";
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

interface FileBrowserProps {
  workspaceName: string;
  onFileSelect?: (filePath: string) => void;
}

interface FileItemProps {
  item: FileSystemItem;
  level: number;
  onFileSelect?: (filePath: string) => void;
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

function FileItem({ item, level, onFileSelect }: FileItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    console.log("FileBrowser: File clicked", {
      path: item.path,
      type: item.type,
      name: item.name,
      onFileSelect: !!onFileSelect,
    });

    if (item.type === "directory") {
      setIsExpanded(!isExpanded);
    } else {
      console.log("FileBrowser: Calling onFileSelect with path:", item.path);
      onFileSelect?.(item.path);
    }
  };

  const paddingLeft = `${level * 16 + 8}px`;

  return (
    <div>
      <div
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileBrowser({ workspaceName, onFileSelect }: FileBrowserProps) {
  const fetcher = useFetcher<{ files: FileSystemItem[]; error?: string }>();
  const [files, setFiles] = useState<FileSystemItem[]>([]);

  useEffect(() => {
    fetcher.load(`/api/workspaces/${workspaceName}/files`);
  }, [workspaceName]);

  useEffect(() => {
    if (fetcher.data?.files) {
      setFiles(fetcher.data.files);
    }
  }, [fetcher.data]);

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

  return (
    <div className="flex-1 overflow-auto">
      <div className="space-y-1 p-2">
        {files.map(file => (
          <FileItem
            key={file.path}
            item={file}
            level={0}
            onFileSelect={onFileSelect}
          />
        ))}
      </div>
    </div>
  );
}
