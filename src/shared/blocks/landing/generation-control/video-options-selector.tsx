'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Clock } from 'lucide-react';
import type { ModelOption } from '@/types/image-to-video';

export interface VideoOptions {
  duration: number;
  resolution: string;
  aspectRatio: string;
}

interface VideoOptionsSelectorProps {
  value: VideoOptions;
  onChange: (options: VideoOptions) => void;
  selectedModel: ModelOption;
}

export function VideoOptionsSelector({
  value,
  onChange,
  selectedModel,
}: VideoOptionsSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get available options from selected model
  const availableDurations = selectedModel.duration;
  const availableResolutions = selectedModel.resolution;
  const availableAspectRatios = selectedModel.aspect_ratio && selectedModel.aspect_ratio.length > 0
    ? selectedModel.aspect_ratio
    : ['16:9', '9:16']; // Default aspect ratios

  // Auto-adjust selected values if they're not available in the new model
  useEffect(() => {
    let needsUpdate = false;
    const newOptions = { ...value };

    // Check duration
    if (availableDurations.length > 0 && !availableDurations.includes(value.duration)) {
      newOptions.duration = availableDurations[0];
      needsUpdate = true;
    }

    // Check resolution
    if (availableResolutions.length > 0 && !availableResolutions.includes(value.resolution)) {
      newOptions.resolution = availableResolutions[0];
      needsUpdate = true;
    }

    // Check aspect ratio
    if (!availableAspectRatios.includes(value.aspectRatio)) {
      newOptions.aspectRatio = availableAspectRatios[0];
      needsUpdate = true;
    }

    if (needsUpdate) {
      onChange(newOptions);
    }
  }, [selectedModel.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDurationChange = (duration: number) => {
    onChange({ ...value, duration });
  };

  const handleResolutionChange = (resolution: string) => {
    onChange({ ...value, resolution });
  };

  const handleAspectRatioChange = (aspectRatio: string) => {
    onChange({ ...value, aspectRatio });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Single Button with Three Sections */}
      <button
        className="bg-muted/10 hover:bg-muted/80 border border-border text-sm h-9 rounded-lg transition-colors flex items-center divide-x divide-border"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="px-3 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {value.duration}s
        </span>
        <span className="px-3">
          {value.resolution}
        </span>
        <span className="px-3 flex items-center gap-1.5">
          <div
            className="border border-current"
            style={
              value.aspectRatio === '16:9'
                ? { width: '14px', height: '8px' }
                : { width: '8px', height: '14px' }
            }
          />
          {value.aspectRatio}
          <ChevronDown className={`h-3 w-3 ml-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-background/95 backdrop-blur-sm border border-border rounded-2xl shadow-lg z-50 p-4 w-auto">
          {/* Video Length Section */}
          <div className="mb-4">
            <h3 className="text-muted-foreground text-xs mb-2">Video Length</h3>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(62px,1fr))] gap-1 bg-muted/30 p-1 rounded-lg max-w-96">
              {availableDurations.map((duration) => (
                <button
                  key={duration}
                  className={`px-1 py-2 rounded-lg text-sm transition-colors ${
                    value.duration === duration
                      ? 'bg-foreground/10 text-foreground'
                      : 'bg-transparent text-muted-foreground hover:bg-foreground/10'
                  }`}
                  onClick={() => handleDurationChange(duration)}
                >
                  {duration}s
                </button>
              ))}
            </div>
          </div>

          {/* Resolution Section */}
          <div className="mb-4">
            <h3 className="text-muted-foreground text-xs mb-2">Resolution</h3>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(62px,1fr))] gap-1 bg-muted/30 p-1 rounded-lg max-w-96">
              {availableResolutions.map((resolution) => (
                <button
                  key={resolution}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    value.resolution === resolution
                      ? 'bg-foreground/10 text-foreground'
                      : 'bg-transparent text-muted-foreground hover:bg-foreground/10'
                  }`}
                  onClick={() => handleResolutionChange(resolution)}
                >
                  {resolution}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio Section */}
          <div>
            <h3 className="text-muted-foreground text-xs mb-2">Aspect Ratio</h3>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(62px,1fr))] gap-1 bg-muted/30 p-1 rounded-lg max-w-96">
              {availableAspectRatios.map((ratio) => (
                <button
                  key={ratio}
                  className={`py-2 rounded-lg text-sm transition-colors flex flex-col items-center justify-center gap-1 ${
                    value.aspectRatio === ratio
                      ? 'bg-foreground/10 text-foreground'
                      : 'bg-transparent text-muted-foreground hover:bg-foreground/10'
                  }`}
                  onClick={() => handleAspectRatioChange(ratio)}
                >
                  <div className={`border-2 ${value.aspectRatio === ratio ? 'border-foreground' : 'border-muted-foreground'}`}
                       style={ratio === '16:9' ? { width: '24px', height: '13.5px' } : { width: '13.5px', height: '24px' }}>
                  </div>
                  <div>{ratio}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
