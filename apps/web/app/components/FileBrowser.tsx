import { useState, useEffect, useMemo } from "react";
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
  ChevronRight,
  ChevronDown,
  Search,
  X,
  MoreVertical,
} from "lucide-react";
import type { FileSystemItem } from "shared-types";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { LoadingSkeleton } from "./ui/LoadingSkeleton";

interface FileBrowserProps {
  workspaceName: string;
  onFileSelect?: (filePath: string) => void;
}

interface FileItemProps {
  item: FileSystemItem;
  level: number;
  onFileSelect?: (filePath: string) => void;
  searchTerm?: string;
}

interface FileTypeInfo {
  icon: React.ReactNode;
  color: string;
  badge?: string;
}

function getFileTypeInfo(fileName: string, isOpen?: boolean): FileTypeInfo {
  const ext = fileName.split(".").pop()?.toLowerCase();

  // Directory icons
  if (!ext) {
    return {
      icon: isOpen ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />,
      color: "text-yellow-600",
      badge: "DIR"
    };
  }

  // Enhanced file icons based on extension
  switch (ext) {
    case "js":
      return { icon: <Code className="w-4 h-4" />, color: "text-yellow-500", badge: "JS" };
    case "jsx":
      return { icon: <Code className="w-4 h-4" />, color: "text-blue-500", badge: "JSX" };
    case "ts":
      return { icon: <Code className="w-4 h-4" />, color: "text-blue-600", badge: "TS" };
    case "tsx":
      return { icon: <Code className="w-4 h-4" />, color: "text-blue-600", badge: "TSX" };
    case "vue":
      return { icon: <Code className="w-4 h-4" />, color: "text-green-500", badge: "VUE" };
    case "py":
      return { icon: <Code className="w-4 h-4" />, color: "text-yellow-600", badge: "PY" };
    case "java":
      return { icon: <Code className="w-4 h-4" />, color: "text-red-500", badge: "JAVA" };
    case "php":
      return { icon: <Code className="w-4 h-4" />, color: "text-purple-500", badge: "PHP" };
    case "cpp":
    case "c":
    case "h":
      return { icon: <Code className="w-4 h-4" />, color: "text-blue-700", badge: "C++" };
    case "go":
      return { icon: <Code className="w-4 h-4" />, color: "text-cyan-500", badge: "GO" };
    case "rs":
      return { icon: <Code className="w-4 h-4" />, color: "text-orange-600", badge: "RUST" };
    case "rb":
      return { icon: <Code className="w-4 h-4" />, color: "text-red-600", badge: "RUBY" };

    case "json":
      return { icon: <Settings className="w-4 h-4" />, color: "text-gray-500", badge: "JSON" };
    case "yaml":
    case "yml":
      return { icon: <Settings className="w-4 h-4" />, color: "text-orange-500", badge: "YAML" };
    case "toml":
      return { icon: <Settings className="w-4 h-4" />, color: "text-gray-600", badge: "TOML" };
    case "xml":
      return { icon: <Settings className="w-4 h-4" />, color: "text-orange-400", badge: "XML" };
    case "env":
      return { icon: <Settings className="w-4 h-4" />, color: "text-green-600", badge: "ENV" };

    case "md":
      return { icon: <FileText className="w-4 h-4" />, color: "text-green-500", badge: "MD" };
    case "txt":
      return { icon: <FileText className="w-4 h-4" />, color: "text-gray-500", badge: "TXT" };

    case "png":
    case "jpg":
    case "jpeg":
      return { icon: <Image className="w-4 h-4" />, color: "text-purple-500", badge: "IMG" };
    case "gif":
      return { icon: <Image className="w-4 h-4" />, color: "text-pink-500", badge: "GIF" };
    case "svg":
      return { icon: <Image className="w-4 h-4" />, color: "text-green-600", badge: "SVG" };
    case "webp":
      return { icon: <Image className="w-4 h-4" />, color: "text-blue-400", badge: "WEBP" };

    case "sql":
      return { icon: <Database className="w-4 h-4" />, color: "text-orange-500", badge: "SQL" };
    case "db":
    case "sqlite":
      return { icon: <Database className="w-4 h-4" />, color: "text-orange-600", badge: "DB" };

    case "lock":
      return { icon: <Package className="w-4 h-4" />, color: "text-red-500", badge: "LOCK" };

    default:
      return { icon: <File className="w-4 h-4" />, color: "text-muted-foreground", badge: ext?.toUpperCase() };
  }
}

function FileItem({ item, level, onFileSelect, searchTerm }: FileItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const fileTypeInfo = getFileTypeInfo(item.name, isExpanded);

  const handleClick = () => {
    if (item.type === "directory") {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect?.(item.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu(!showContextMenu);
  };

  const paddingLeft = `${level * 20 + 12}px`;

  // Highlight search term in filename
  const highlightSearchTerm = (text: string) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-warning-200 text-warning-900 px-0.5 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <div>
      <div
        className={`
          group flex items-center space-x-2 px-3 py-2 text-sm cursor-pointer rounded-lg 
          transition-all duration-200 relative
          hover:bg-muted/50 hover:shadow-sm
          ${item.type === "file" ? "text-foreground" : "text-foreground font-medium"}
        `}
        style={{ paddingLeft }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
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
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
        )}
        {item.type === "file" && <div className="w-4" />}
        
        <div className={`${fileTypeInfo.color} flex-shrink-0`}>
          {fileTypeInfo.icon}
        </div>
        
        <span className="truncate flex-1 min-w-0">
          {highlightSearchTerm(item.name)}
        </span>
        
        {fileTypeInfo.badge && (
          <span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-mono">
            {fileTypeInfo.badge}
          </span>
        )}

        {/* Context Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            handleContextMenu(e);
          }}
        >
          <MoreVertical className="w-3 h-3" />
        </Button>

        {/* Context Menu */}
        {showContextMenu && (
          <Card className="absolute right-0 top-8 z-50 bg-popover border shadow-lg">
            <Card.Content className="p-1 min-w-[120px]">
              <div className="space-y-1 text-xs">
                <button className="w-full text-left px-2 py-1 hover:bg-muted rounded">
                  Renomear
                </button>
                <button className="w-full text-left px-2 py-1 hover:bg-muted rounded">
                  Duplicar
                </button>
                <hr className="my-1" />
                <button className="w-full text-left px-2 py-1 hover:bg-destructive hover:text-destructive-foreground rounded text-destructive">
                  Excluir
                </button>
              </div>
            </Card.Content>
          </Card>
        )}
      </div>

      {item.type === "directory" && isExpanded && item.children && (
        <div>
          {item.children.map(child => (
            <FileItem
              key={child.path}
              item={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              searchTerm={searchTerm}
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
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetcher.load(`/api/workspaces/${workspaceName}/files`);
  }, [workspaceName]);

  useEffect(() => {
    if (fetcher.data?.files) {
      setFiles(fetcher.data.files);
    }
  }, [fetcher.data]);

  // Filter files based on search term
  const filteredFiles = useMemo(() => {
    if (!searchTerm) return files;

    const filterItems = (items: FileSystemItem[]): FileSystemItem[] => {
      return items
        .map(item => {
          if (item.type === 'directory' && item.children) {
            const filteredChildren = filterItems(item.children);
            if (filteredChildren.length > 0 || item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
              return { ...item, children: filteredChildren };
            }
            return null;
          }
          
          if (item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return item;
          }
          
          return null;
        })
        .filter(Boolean) as FileSystemItem[];
    };

    return filterItems(files);
  }, [files, searchTerm]);

  if (fetcher.state === "loading" && !files.length) {
    return (
      <div className="flex-1 p-4">
        <div className="space-y-2">
          <LoadingSkeleton height="h-8" />
          <LoadingSkeleton height="h-6" />
          <LoadingSkeleton height="h-6" />
          <LoadingSkeleton height="h-8" />
          <LoadingSkeleton height="h-6" />
        </div>
      </div>
    );
  }

  if (fetcher.data?.error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <Card variant="outlined" className="max-w-sm">
          <Card.Content className="p-6 text-center">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-2">
              Erro ao carregar arquivos
            </h3>
            <p className="text-xs text-muted-foreground">
              {fetcher.data.error}
            </p>
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (!files.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <Card variant="outlined" className="max-w-sm">
          <Card.Content className="p-6 text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Folder className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-2">
              Nenhum arquivo encontrado
            </h3>
            <p className="text-xs text-muted-foreground">
              Este workspace parece estar vazio
            </p>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Enhanced Search Bar */}
      <div className="p-3 border-b border-border bg-muted/20">
        <div className="relative">
          <Input
            type="text"
            placeholder="Buscar arquivos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-8 text-sm bg-background"
          />
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm("")}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
        
        {searchTerm && (
          <div className="mt-2 text-xs text-muted-foreground">
            {filteredFiles.length === 0 
              ? "Nenhum resultado encontrado" 
              : `${filteredFiles.length} resultado(s) encontrado(s)`
            }
          </div>
        )}
      </div>

      {/* File List */}
      <div className="flex-1 overflow-auto">
        {filteredFiles.length > 0 ? (
          <div className="space-y-1 p-2">
            {filteredFiles.map(file => (
              <FileItem
                key={file.path}
                item={file}
                level={0}
                onFileSelect={onFileSelect}
                searchTerm={searchTerm}
              />
            ))}
          </div>
        ) : searchTerm ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <Card variant="outlined" className="max-w-sm">
              <Card.Content className="p-6 text-center">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-2">
                  Nenhum resultado encontrado
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Tente usar termos diferentes ou verifique a ortografia
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSearchTerm("")}
                >
                  Limpar busca
                </Button>
              </Card.Content>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
