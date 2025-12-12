'use client';

import React, { useEffect, useRef } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAddTextBox: () => void;
  onAddSignature: () => void;
}

export default function ContextMenu({ x, y, onClose, onAddTextBox, onAddSignature }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-surface border border-border rounded-lg shadow-xl py-1 min-w-[180px] animate-fade-in"
      style={{ left: x, top: y }}
    >
      <button
        className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface-elevated flex items-center gap-3 transition-colors"
        onClick={() => {
          onAddTextBox();
          onClose();
        }}
      >
        <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Add Text Box
      </button>
      
      <div className="border-t border-border my-1" />
      
      <button
        className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface-elevated flex items-center gap-3 transition-colors"
        onClick={() => {
          onAddSignature();
          onClose();
        }}
      >
        <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        Add E-Signature
      </button>
    </div>
  );
}
