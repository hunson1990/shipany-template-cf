'use client';

import { GenerationControlPC } from './pc';
import { GenerationControlMobile } from './mobile';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';

export function GenerationControl() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  if (isDesktop) {
    return <GenerationControlPC />;
  }

  return <GenerationControlMobile />;
}

export { GenerationControlPC, GenerationControlMobile };
