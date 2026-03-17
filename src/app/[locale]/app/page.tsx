import { setRequestLocale } from 'next-intl/server';
import { AppContent } from './app-content';

export default async function AppPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Mock data for demonstration
  const mockVideos = [
    {
      id: '1',
      prompt: 'A beautiful sunset over the ocean with waves crashing on the beach',
      imageUrl: '/imgs/avatars/1.png',
      videoUrl: '/video/banner.mp4',
      status: 'succeed' as const,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      model: 'Veo 3.1 Pro',
    },
    {
      id: '2',
      prompt: 'A cinematic product showcase of a luxury watch',
      imageUrl: '/imgs/avatars/2.png',
      status: 'processing' as const,
      progress: 65,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      model: 'Veo 3.1 Basic',
    },
    {
      id: '3',
      prompt: 'Travel vlog style video of mountain hiking adventure',
      imageUrl: '/imgs/avatars/3.png',
      status: 'failed' as const,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      model: 'Veo 3.1 Premium',
    },
  ];

  return <AppContent mockVideos={mockVideos} />;
}
