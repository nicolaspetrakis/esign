'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { SignatureStyle } from './SignatureModal';

export interface SignatureData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  style: SignatureStyle;
  pageNumber: number;
}

interface SignatureProps {
  data: SignatureData;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (data: SignatureData) => void;
  onDelete: () => void;
}

export default function Signature({
  data,
  scale,
  isSelected,
  onSelect,
  onChange,
  onDelete,
}: SignatureProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const boxRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect();

      const rect = boxRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
      setIsDragging(true);
    },
    [onSelect]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging && boxRef.current) {
        const parent = boxRef.current.parentElement;
        if (!parent) return;

        const parentRect = parent.getBoundingClientRect();
        const newX = (e.clientX - parentRect.left - dragOffset.x) / scale;
        const newY = (e.clientY - parentRect.top - dragOffset.y) / scale;

        onChange({
          ...data,
          x: Math.max(0, newX),
          y: Math.max(0, newY),
        });
      }

      if (isResizing && boxRef.current) {
        const parent = boxRef.current.parentElement;
        if (!parent) return;

        const parentRect = parent.getBoundingClientRect();
        const boxLeft = data.x * scale + parentRect.left;
        const boxTop = data.y * scale + parentRect.top;

        const newWidth = Math.max(100, (e.clientX - boxLeft) / scale);
        const newHeight = Math.max(40, (e.clientY - boxTop) / scale);

        onChange({
          ...data,
          width: newWidth,
          height: newHeight,
        });
      }
    },
    [isDragging, isResizing, dragOffset, scale, data, onChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Delete') {
        onDelete();
      }
    },
    [onDelete]
  );

  // Calculate font size based on height
  const fontSize = Math.min(data.height * 0.6, data.width * 0.15);

  return (
    <>
      {/* Delete button when selected */}
      {isSelected && (
        <div
          className="absolute z-20 bg-surface border border-border rounded-lg shadow-lg p-1"
          style={{
            left: data.x * scale,
            top: data.y * scale - 40,
          }}
        >
          <button
            className="w-8 h-8 flex items-center justify-center rounded text-red-500 hover:bg-red-500/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete signature"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Signature Box */}
      <div
        ref={boxRef}
        className={`absolute cursor-move transition-shadow ${
          isSelected ? 'ring-2 ring-accent shadow-lg' : 'hover:ring-1 hover:ring-accent/50'
        }`}
        style={{
          left: data.x * scale,
          top: data.y * scale,
          width: data.width * scale,
          height: data.height * scale,
        }}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div
          className="w-full h-full bg-transparent flex items-center justify-center overflow-hidden"
          style={{
            fontFamily: data.style.fontFamily,
            fontWeight: data.style.fontWeight,
            fontStyle: data.style.fontStyle,
            fontSize: fontSize * scale,
            color: '#000',
          }}
        >
          {data.name}
        </div>

        {/* Resize handle */}
        {isSelected && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-accent rounded-tl"
            onMouseDown={handleResizeMouseDown}
          />
        )}
      </div>
    </>
  );
}

