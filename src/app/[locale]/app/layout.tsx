import { ReactNode } from 'react';
import { getThemeBlock } from '@/core/theme';
import { getTranslations } from 'next-intl/server';
import { LocaleDetector, TopBanner } from '@/shared/blocks/common';
import { Header as HeaderType } from '@/shared/types/blocks/landing';

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations('landing');
  const Header = await getThemeBlock('header');

  const header: HeaderType = t.raw('header');

  return (
    <div className="min-h-screen w-full flex flex-col">
      <LocaleDetector />
      {header.topbanner && header.topbanner.text && (
        <TopBanner
          id="topbanner"
          text={header.topbanner?.text}
          buttonText={header.topbanner?.buttonText}
          href={header.topbanner?.href}
          target={header.topbanner?.target}
          closable
          rememberDismiss
          dismissedExpiryDays={header.topbanner?.dismissedExpiryDays ?? 1}
        />
      )}
      <Header header={header} />
      <main className="flex-1 pt-18">
        {children}
      </main>
    </div>
  );
}
