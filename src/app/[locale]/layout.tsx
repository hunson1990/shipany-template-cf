import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { routing } from '@/core/i18n/config';
import { ThemeProvider } from '@/core/theme/provider';
import { Toaster } from '@/shared/components/ui/sonner';
import DeviceFingerprintCollector from '@/shared/components/device-fingerprint/DeviceFingerprintCollector';
import { AppContextProvider } from '@/shared/contexts/app';
import { ImageUploadProvider } from '@/shared/context/ImageUploadContext';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata();

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <NextIntlClientProvider>
      <ThemeProvider>
        <ImageUploadProvider>
          <AppContextProvider>
            {children}
            <Toaster position="top-center" richColors />
            <DeviceFingerprintCollector />
          </AppContextProvider>
        </ImageUploadProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
