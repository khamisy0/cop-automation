'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  className = '',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filtered = search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const highlighted = listRef.current.children[highlightedIndex] as HTMLElement;
    highlighted?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  function open() {
    if (!disabled) {
      setIsOpen(true);
      setSearch('');
    }
  }

  function close() {
    setIsOpen(false);
    setSearch('');
  }

  function select(option: Option) {
    onChange(option.value);
    close();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlightedIndex]) select(filtered[highlightedIndex]);
    } else if (e.key === 'Escape') {
      close();
    }
  }

  const baseClass =
    'w-full px-3 py-2 bg-white border rounded-lg text-sm transition duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {isOpen ? (
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setHighlightedIndex(0); }}
          onKeyDown={handleKeyDown}
          placeholder="Type to search..."
          className={`${baseClass} border-primary text-gray-900 placeholder:text-gray-400`}
        />
      ) : (
        <button
          type="button"
          onClick={open}
          disabled={disabled}
          className={`${baseClass} flex items-center justify-between text-left border-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed focus:border-primary`}
        >
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
        </button>
      )}

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div ref={listRef} className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2.5 text-sm text-gray-400">No results found</div>
            ) : (
              filtered.map((option, i) => (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={() => select(option)}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    i === highlightedIndex
                      ? 'bg-indigo-50 text-indigo-700'
                      : option.value === value
                      ? 'text-indigo-600 font-medium'
                      : 'text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
