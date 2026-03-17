'use client';

import { useState } from 'react';
import { GenerationHistory } from '@/shared/blocks/landing/generation-history';
import { GenerationControlPC } from '@/shared/blocks/landing/generation-control/pc';
import { GenerationControlMobile } from '@/shared/blocks/landing/generation-control/mobile';

interface AppContentProps {
  mockVideos: any[];
}

export function AppContent({ mockVideos }: AppContentProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  return (
    <>
      {/* Desktop Layout (> 1024px) */}
      <div className="hidden lg:block min-h-screen bg-background pb-48">
        <div className="mx-auto max-w-6xl p-8">
          <div className="p-6">
            <GenerationHistory videos={mockVideos} />
          </div>
        </div>
        <GenerationControlPC />
      </div>

      {/* Mobile Layout (<= 1024px) */}
      <div className="lg:hidden min-h-screen bg-background flex flex-col">
        {/* Tab Navigation */}
        <div className="flex bg-muted">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 text-center transition-colors border-b-2 ${
              activeTab === 'create'
                ? 'text-foreground border-primary bg-white/10'
                : 'text-muted-foreground border-transparent'
            }`}
          >
            Create
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-center transition-colors border-b-2 ${
              activeTab === 'history'
                ? 'text-foreground border-primary bg-white/10'
                : 'text-muted-foreground border-transparent'
            }`}
          >
            History
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'create' && <GenerationControlMobile />}
          {activeTab === 'history' && (
            <div className="p-4">
              <GenerationHistory videos={mockVideos} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
