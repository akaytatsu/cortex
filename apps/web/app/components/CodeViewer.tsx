import { useEffect, useRef, useState } from "react";
import { useFetcher } from "@remix-run/react";
import { File, AlertCircle, Loader2, FileX } from "lucide-react";
import type { FileContent } from "shared-types";

// Import Prism.js
import Prism from "prismjs";
import "prismjs/themes/prism.css";

// Import common language definitions
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-scss";
import "prismjs/components/prism-sass";
import "prismjs/components/prism-less";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-php";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markdown";

interface CodeViewerProps {
  workspaceName: string;
  filePath: string | null;
}

function getLanguageFromMimeType(mimeType: string, fileName: string): string {
  // Try to get language from file extension first
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  const extensionMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'jsx',
    'ts': 'typescript',
    'tsx': 'tsx',
    'json': 'json',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'html': 'html',
    'py': 'python',
    'java': 'java',
    'php': 'php',
    'go': 'go',
    'rs': 'rust',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'sql': 'sql',
    'sh': 'bash',
    'bash': 'bash',
    'yml': 'yaml',
    'yaml': 'yaml',
    'md': 'markdown',
    'xml': 'xml',
  };
  
  if (ext && extensionMap[ext]) {
    return extensionMap[ext];
  }
  
  // Fallback to mime type
  if (mimeType.includes('javascript')) return 'javascript';
  if (mimeType.includes('typescript')) return 'typescript';
  if (mimeType.includes('json')) return 'json';
  if (mimeType.includes('css')) return 'css';
  if (mimeType.includes('html')) return 'html';
  if (mimeType.includes('python')) return 'python';
  if (mimeType.includes('java')) return 'java';
  if (mimeType.includes('yaml')) return 'yaml';
  if (mimeType.includes('markdown')) return 'markdown';
  
  return 'text';
}

export function CodeViewer({ workspaceName, filePath }: CodeViewerProps) {
  const fetcher = useFetcher<{ fileContent: FileContent; error?: string }>();
  const codeRef = useRef<HTMLElement>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);

  useEffect(() => {
    if (filePath) {
      fetcher.load(`/api/workspaces/${workspaceName}/file?path=${encodeURIComponent(filePath)}`);
    }
  }, [workspaceName, filePath, fetcher]);

  useEffect(() => {
    if (fetcher.data?.fileContent) {
      setFileContent(fetcher.data.fileContent);
    } else if (fetcher.data?.error) {
      setFileContent(null);
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (fileContent && codeRef.current) {
      // Apply syntax highlighting
      Prism.highlightElement(codeRef.current);
    }
  }, [fileContent]);

  // No file selected
  if (!filePath) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <File className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">
            Nenhum arquivo selecionado
          </h3>
          <p className="text-sm text-gray-400">
            Selecione um arquivo no Explorer para visualizar seu conteúdo
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (fetcher.state === "loading") {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Carregando arquivo...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (fetcher.data?.error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-300" />
          <h3 className="text-lg font-medium text-red-500 mb-2">
            Erro ao carregar arquivo
          </h3>
          <p className="text-sm text-red-400 mb-4">
            {fetcher.data.error}
          </p>
          <p className="text-xs text-gray-500">
            {filePath}
          </p>
        </div>
      </div>
    );
  }

  // No content
  if (!fileContent) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileX className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">
            Arquivo não encontrado
          </h3>
          <p className="text-xs text-gray-400">
            {filePath}
          </p>
        </div>
      </div>
    );
  }

  const language = getLanguageFromMimeType(fileContent.mimeType, filePath);
  const fileName = filePath.split('/').pop() || '';

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <File className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {fileName}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {language}
          </span>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {fileContent.content.split('\\n').length} linhas
        </div>
      </div>

      {/* Code Content */}
      <div className="flex-1 overflow-auto">
        <pre className="h-full text-sm leading-relaxed">
          <code
            ref={codeRef}
            className={`language-${language} block h-full p-4`}
            style={{ 
              margin: 0,
              background: 'transparent',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {fileContent.content}
          </code>
        </pre>
      </div>
    </div>
  );
}