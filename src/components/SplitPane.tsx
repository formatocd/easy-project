import React, { useState, useRef, useCallback } from 'react';

interface SplitPaneProps {
  left: (props: {
    scrollRef: React.RefObject<HTMLDivElement | null>;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  }) => React.ReactNode;
  right: (props: {
    scrollRef: React.RefObject<HTMLDivElement | null>;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  }) => React.ReactNode;
  initialLeftWidth?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
}

export const SplitPane: React.FC<SplitPaneProps> = ({
  left,
  right,
  initialLeftWidth = 480,
  minLeftWidth = 250,
  minRightWidth = 300,
}) => {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [isDragging, setIsDragging] = useState(false);

  const leftScrollRef = useRef<HTMLDivElement | null>(null);
  const rightScrollRef = useRef<HTMLDivElement | null>(null);
  const isSyncingScroll = useRef(false);

  // Synchronized Vertical Scrolling
  const handleLeftScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (rightScrollRef.current) {
      rightScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  }, []);

  const handleRightScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (leftScrollRef.current) {
      leftScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  }, []);

  // Splitter Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const startX = e.clientX;
    const startWidth = leftWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(minLeftWidth, startWidth + delta);
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Left Pane (Task Sheet) */}
      <div id="split-pane-left" style={{ width: `${leftWidth}px` }} className="h-full flex-shrink-0">
        {left({ scrollRef: leftScrollRef, onScroll: handleLeftScroll })}
      </div>

      {/* Splitter Handle */}
      <div
        id="split-pane-divider"
        onMouseDown={handleMouseDown}
        className={`w-1 hover:w-1.5 cursor-col-resize bg-neutral-300 dark:bg-neutral-800 hover:bg-blue-500 transition-colors z-30 select-none ${
          isDragging ? 'bg-blue-600 w-1.5' : ''
        }`}
      />

      {/* Right Pane (Gantt Chart) */}
      <div id="split-pane-right" className="flex-1 h-full overflow-hidden">
        {right({ scrollRef: rightScrollRef, onScroll: handleRightScroll })}
      </div>
    </div>
  );
};
