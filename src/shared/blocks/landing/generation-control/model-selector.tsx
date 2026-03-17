'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

import type { ModelOption } from '@/types/image-to-video';

interface ModelSelectorProps {
  models: ModelOption[];
  selectedModel: ModelOption;
  onModelChange: (model: ModelOption) => void;
  dropdownDirection?: 'up' | 'down';
}

export function ModelSelector({ models, selectedModel, onModelChange, dropdownDirection = 'up' }: ModelSelectorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (dropdownOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [dropdownOpen]);

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
    if (!dropdownOpen) {
      setSearchTerm('');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer border border-border bg-muted/30 hover:bg-muted/50 transition-colors h-9"
        onClick={handleToggleDropdown}
      >
        <div className="flex items-center gap-2">
          {selectedModel.icon && (
            <img
              src={selectedModel.icon}
              alt={selectedModel.name}
              className="w-4 h-4 object-contain"
            />
          )}
          <span className="font-medium text-sm">{selectedModel.name}</span>
        </div>
        <ChevronDown className={`h-3 w-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
      </div>

      {dropdownOpen && (
        <div className={`absolute left-0 right-0 bg-background border border-border rounded-lg shadow-lg z-50 min-w-[280px] ${
          dropdownDirection === 'down'
            ? 'top-full mt-1'
            : 'bottom-full mb-1'
        }`}>
          {/* Search Input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search models..."
                className="w-full pl-7 pr-3 py-1.5 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Model List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredModels.length > 0 ? (
              filteredModels.map((model) => (
                <div
                  key={model.id}
                  className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedModel.id === model.id ? 'bg-muted border-l-2 border-primary' : ''
                  }`}
                  onClick={() => {
                    onModelChange(model);
                    setDropdownOpen(false);
                    setSearchTerm('');
                  }}
                >
                  {model.icon && (
                    <img
                      src={model.icon}
                      alt={model.name}
                      className="w-5 h-5 object-contain flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{model.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{model.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No models found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
