import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { HeroVideoSection } from '@/shared/blocks/landing/hero-video-section';
import { LandingSections } from '@/shared/blocks/landing/landing-sections';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const pageConfig = t.raw('pages.index.page');
  const sections = pageConfig.sections;

  return (
    <>
      <HeroVideoSection />
      <LandingSections sections={sections} />
    </>
  );
}
