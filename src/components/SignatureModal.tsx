'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface SignatureStyle {
  id: string;
  name: string;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
}

export const SIGNATURE_STYLES: SignatureStyle[] = [
  {
    id: 'elegant',
    name: 'Elegant',
    fontFamily: "'Dancing Script', cursive",
    fontWeight: '700',
    fontStyle: 'normal',
  },
  {
    id: 'classic',
    name: 'Classic',
    fontFamily: "'Great Vibes', cursive",
    fontWeight: '400',
    fontStyle: 'normal',
  },
  {
    id: 'modern',
    name: 'Modern',
    fontFamily: "'Caveat', cursive",
    fontWeight: '700',
    fontStyle: 'normal',
  },
  {
    id: 'formal',
    name: 'Formal',
    fontFamily: "'Allura', cursive",
    fontWeight: '400',
    fontStyle: 'normal',
  },
];

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, style: SignatureStyle) => void;
}

export default function SignatureModal({ isOpen, onClose, onConfirm }: SignatureModalProps) {
  const [name, setName] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<SignatureStyle>(SIGNATURE_STYLES[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim(), selectedStyle);
      setName('');
      setSelectedStyle(SIGNATURE_STYLES[0]);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Load Google Fonts for signatures */}
      <link
        href="https://fonts.googleapis.com/css2?family=Allura&family=Caveat:wght@700&family=Dancing+Script:wght@700&family=Great+Vibes&display=swap"
        rel="stylesheet"
      />

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold">Create Your E-Signature</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-elevated transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium mb-2">Enter your name</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
                />
              </div>

              {/* Signature Preview */}
              <div>
                <label className="block text-sm font-medium mb-2">Preview</label>
                <div className="bg-white rounded-lg p-6 border border-border min-h-[80px] flex items-center justify-center">
                  {name ? (
                    <span
                      className="text-4xl text-black"
                      style={{
                        fontFamily: selectedStyle.fontFamily,
                        fontWeight: selectedStyle.fontWeight,
                        fontStyle: selectedStyle.fontStyle,
                      }}
                    >
                      {name}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">Your signature will appear here</span>
                  )}
                </div>
              </div>

              {/* Style Selection */}
              <div>
                <label className="block text-sm font-medium mb-3">Choose a style</label>
                <div className="grid grid-cols-2 gap-3">
                  {SIGNATURE_STYLES.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setSelectedStyle(style)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedStyle.id === style.id
                          ? 'border-accent bg-accent/10'
                          : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <div className="bg-white rounded px-3 py-2 mb-2">
                        <span
                          className="text-xl text-black block truncate"
                          style={{
                            fontFamily: style.fontFamily,
                            fontWeight: style.fontWeight,
                            fontStyle: style.fontStyle,
                          }}
                        >
                          {name || 'John Doe'}
                        </span>
                      </div>
                      <span className="text-xs text-text-muted">{style.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Signature
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

