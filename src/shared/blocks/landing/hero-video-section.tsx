'use client';

import { useState } from 'react';
import { HeroVideo } from '@/shared/blocks/landing';
import { toast } from 'sonner';

export function HeroVideoSection() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success('Video generation started!');
      console.log('Form data:', data);
    } catch (error) {
      toast.error('Failed to generate video');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <HeroVideo
      videoUrl="/video/banner.mp4"
      title="Turn Photos Into AI Videos"
      subtitle="Create romantic, fun, and cinematic moments with AI"
      description=""
      onSubmit={handleSubmit}
      isLoading={isLoading}
      models={[
        { id: 'ai-video', name: '🎬 AI Video' },
      ]}
      styles={[
        { id: 'basic', name: 'Veo 3.1 Basic' },
        { id: 'pro', name: 'Veo 3.1 Pro' },
        { id: 'premium', name: 'Veo 3.1 Premium' },
      ]}
      hints={[
        { id: 'cinematic', label: 'Cinematic Product Ad', icon: '🎬' },
        { id: 'travel', label: 'Travel Aerial Narrative', icon: '✈️' },
        { id: 'action', label: 'Action/Sports', icon: '⚡' },
      ]}
      ctaText="Generate for free"
    />
  );
}
