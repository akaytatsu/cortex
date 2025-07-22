import { useEffect, useRef, useMemo } from "react";

interface MinimapProps {
  content: string;
  language: string;
}

export function Minimap({ content }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate a simplified representation of the code
  const codeMap = useMemo(() => {
    const lines = content.split('\n');
    const maxCharsPerLine = Math.max(...lines.map(line => line.length), 1);
    
    return lines.map(line => {
      // Normalize line length to 0-1 scale
      const intensity = Math.min(line.length / maxCharsPerLine, 1);
      
      // Determine line type for color coding
      let lineType = 'default';
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#') || trimmedLine.startsWith('/*')) {
        lineType = 'comment';
      } else if (trimmedLine.includes('function') || trimmedLine.includes('class') || 
                 trimmedLine.includes('def ') || trimmedLine.includes('const ') ||
                 trimmedLine.includes('let ') || trimmedLine.includes('var ')) {
        lineType = 'declaration';
      } else if (trimmedLine.includes('import') || trimmedLine.includes('from ') ||
                 trimmedLine.includes('#include') || trimmedLine.includes('require(')) {
        lineType = 'import';
      } else if (trimmedLine.includes('if ') || trimmedLine.includes('else') ||
                 trimmedLine.includes('for ') || trimmedLine.includes('while ') ||
                 trimmedLine.includes('switch')) {
        lineType = 'control';
      } else if (trimmedLine.length === 0) {
        lineType = 'empty';
      }
      
      return {
        intensity,
        type: lineType,
        length: line.length
      };
    });
  }, [content]);

  // Draw the minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to match container
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate line height
    const lineHeight = Math.max(1, canvas.height / codeMap.length);
    
    // Color scheme for different line types
    const colors = {
      default: { r: 156, g: 163, b: 175 },      // gray-400
      comment: { r: 107, g: 114, b: 128 },      // gray-500
      declaration: { r: 59, g: 130, b: 246 },  // blue-500
      import: { r: 168, g: 85, b: 247 },       // purple-500
      control: { r: 34, g: 197, b: 94 },       // green-500
      empty: { r: 243, g: 244, b: 246 }        // gray-100
    };
    
    // Draw each line
    codeMap.forEach((line, index) => {
      const y = index * lineHeight;
      const color = colors[line.type as keyof typeof colors] || colors.default;
      
      if (line.type === 'empty') {
        // Empty lines are barely visible
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.1)`;
        ctx.fillRect(0, y, canvas.width, lineHeight);
      } else {
        // Regular lines with intensity-based alpha
        const alpha = Math.max(0.3, line.intensity);
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
        
        // Width based on line content length
        const width = Math.max(2, canvas.width * line.intensity);
        ctx.fillRect(0, y, width, Math.max(1, lineHeight - 0.5));
      }
    });
    
    // Add a subtle border
    ctx.strokeStyle = 'rgba(156, 163, 175, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
  }, [codeMap]);

  // Handle minimap clicks to scroll to position
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const lineIndex = Math.floor((y / canvas.height) * codeMap.length);
    
    // Find the main editor and scroll to the line
    const mainEditor = document.querySelector('[data-testid="code-editor-textarea"]') as HTMLTextAreaElement;
    if (mainEditor) {
      const lines = content.split('\n');
      const targetLine = Math.max(0, Math.min(lineIndex, lines.length - 1));
      
      // Calculate approximate scroll position
      const lineHeight = 24; // Approximate line height in pixels
      const scrollTop = targetLine * lineHeight;
      
      mainEditor.scrollTop = scrollTop;
    }
  };

  if (codeMap.length === 0) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className="h-full w-full bg-gray-50 dark:bg-gray-800 relative overflow-hidden"
      title="Minimap do código - Clique para navegar"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onClick={handleClick}
      />
      
      {/* Optional: Add a viewport indicator */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-blue-500 bg-opacity-20 border border-blue-500 border-opacity-40 pointer-events-none hidden" />
      
      {/* Legend/Info */}
      <div className="absolute bottom-2 left-2 right-2 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 bg-opacity-80 px-1 py-0.5 rounded text-center">
        {codeMap.length} linhas
      </div>
    </div>
  );
}