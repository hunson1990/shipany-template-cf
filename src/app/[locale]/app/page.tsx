import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AppContent } from './app-content';

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
