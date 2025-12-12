'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

export interface TextBoxData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string;
  pageNumber: number;
}

interface TextBoxProps {
  data: TextBoxData;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (data: TextBoxData) => void;
  onDelete: () => void;
}

const FONT_OPTIONS = [
  { label: 'Sans Serif', value: 'var(--font-dm-sans), system-ui, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Monospace', value: 'var(--font-jetbrains-mono), monospace' },
];

const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

export default function TextBox({
  data,
  scale,
  isSelected,
  onSelect,
  onChange,
  onDelete,
}: TextBoxProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showToolbar, setShowToolbar] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Show toolbar when selected
  useEffect(() => {
    setShowToolbar(isSelected);
  }, [isSelected]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing) return;
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
    [isEditing, onSelect]
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

        const newWidth = Math.max(50, (e.clientX - boxLeft) / scale);
        const newHeight = Math.max(20, (e.clientY - boxTop) / scale);

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

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEditing(false);
      } else if (e.key === 'Delete' && !isEditing) {
        onDelete();
      }
    },
    [isEditing, onDelete]
  );

  return (
    <>
      {/* Toolbar */}
      {showToolbar && !isEditing && (
        <div
          className="absolute z-20 bg-surface border border-border rounded-lg shadow-lg p-2 flex items-center gap-2"
          style={{
            left: data.x * scale,
            top: data.y * scale - 48,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Font Family */}
          <select
            className="bg-surface-elevated border border-border rounded px-2 py-1 text-xs"
            value={data.fontFamily}
            onChange={(e) => onChange({ ...data, fontFamily: e.target.value })}
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>

          {/* Font Size */}
          <select
            className="bg-surface-elevated border border-border rounded px-2 py-1 text-xs w-16"
            value={data.fontSize}
            onChange={(e) => onChange({ ...data, fontSize: Number(e.target.value) })}
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}px
              </option>
            ))}
          </select>

          {/* Bold */}
          <button
            className={`w-7 h-7 flex items-center justify-center rounded text-sm font-bold transition-colors ${
              data.fontWeight === 'bold' ? 'bg-accent text-black' : 'hover:bg-surface-elevated'
            }`}
            onClick={() =>
              onChange({ ...data, fontWeight: data.fontWeight === 'bold' ? 'normal' : 'bold' })
            }
          >
            B
          </button>

          {/* Color */}
          <input
            type="color"
            className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
            value={data.color}
            onChange={(e) => onChange({ ...data, color: e.target.value })}
          />

          {/* Delete */}
          <button
            className="w-7 h-7 flex items-center justify-center rounded text-red-500 hover:bg-red-500/10 transition-colors"
            onClick={onDelete}
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

      {/* Text Box */}
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
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="w-full h-full bg-white border-0 outline-none resize-none p-1"
            style={{
              fontSize: data.fontSize * scale,
              fontFamily: data.fontFamily,
              fontWeight: data.fontWeight,
              color: data.color,
            }}
            value={data.text}
            onChange={(e) => onChange({ ...data, text: e.target.value })}
            onBlur={handleBlur}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="w-full h-full bg-transparent overflow-hidden p-1 whitespace-pre-wrap"
            style={{
              fontSize: data.fontSize * scale,
              fontFamily: data.fontFamily,
              fontWeight: data.fontWeight,
              color: data.color,
            }}
          >
            {data.text || (
              <span className="text-gray-400 italic">Double-click to edit</span>
            )}
          </div>
        )}

        {/* Resize handle */}
        {isSelected && !isEditing && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-accent rounded-tl"
            onMouseDown={handleResizeMouseDown}
          />
        )}
      </div>
    </>
  );
}

