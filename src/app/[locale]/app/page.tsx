import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getMetadata } from '@/shared/lib/seo';
import { AppContent } from './app-content';

export const generateMetadata = getMetadata({
  canonicalUrl: '/app',
  noIndex: true,
});

export default async function AppPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('pages.pricing');
  const pricingSection = t.raw('page.sections.pricing');

  return <AppContent pricingSection={pricingSection} />;
}
