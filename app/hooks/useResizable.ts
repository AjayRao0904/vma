import { useState, useCallback, useEffect, useRef } from 'react';

interface UseResizableOptions {
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  onResize?: (width: number, height: number) => void;
}

type ResizeType = 'width' | 'height' | 'both';

export const useResizable = (options: UseResizableOptions = {}) => {
  const {
    initialWidth = 300,
    initialHeight = 200,
    minWidth = 100,
    maxWidth = Infinity,
    minHeight = 100,
    maxHeight = Infinity,
    onResize,
  } = options;

  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);
  const [isResizing, setIsResizing] = useState<ResizeType | null>(null);
  
  const startPosRef = useRef({ x: 0, y: 0 });
  const startSizeRef = useRef({ width: 0, height: 0 });

  const startResize = useCallback((e: React.MouseEvent, type: ResizeType) => {
    e.preventDefault();
    setIsResizing(type);
    
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startSizeRef.current = { width, height };
  }, [width, height]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startPosRef.current.x;
    const deltaY = e.clientY - startPosRef.current.y;

    if (isResizing === 'width' || isResizing === 'both') {
      const newWidth = Math.max(
        minWidth,
        Math.min(maxWidth, startSizeRef.current.width + deltaX)
      );
      setWidth(newWidth);
    }

    if (isResizing === 'height' || isResizing === 'both') {
      const newHeight = Math.max(
        minHeight,
        Math.min(maxHeight, startSizeRef.current.height + deltaY)
      );
      setHeight(newHeight);
    }
  }, [isResizing, minWidth, maxWidth, minHeight, maxHeight]);

  const handleMouseUp = useCallback(() => {
    if (isResizing && onResize) {
      onResize(width, height);
    }
    setIsResizing(null);
  }, [isResizing, width, height, onResize]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isResizing === 'width' ? 'col-resize' : 
                                   isResizing === 'height' ? 'row-resize' : 
                                   'nw-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const resetSize = useCallback(() => {
    setWidth(initialWidth);
    setHeight(initialHeight);
  }, [initialWidth, initialHeight]);

  return {
    width,
    height,
    isResizing,
    startResize,
    resetSize,
    setWidth,
    setHeight,
  };
};