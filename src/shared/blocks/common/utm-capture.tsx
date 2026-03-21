'use client';

import { useEffect } from 'react';

import { getCookie, setCookie } from '@/shared/lib/cookie';

const UTM_COOKIES = {
  source: 'utm_source',
  medium: 'utm_medium',
  campaign: 'utm_campaign',
};
const COOKIE_DAYS = 30;

function sanitizeUtmValue(value: string) {
  const decoded = (() => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  })();

  return decoded
    .trim()
    .replace(/[^\w\-.:]/g, '') // allow a-zA-Z0-9_ - . :
    .slice(0, 100);
}

/**
 * Capture utm_source, utm_medium, utm_campaign from landing URL and persist in cookies.
 * Also capture the full signup URL.
 * This enables server-side signup to save them into the user table.
 */
export function UtmCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Capture utm_source
    if (!getCookie(UTM_COOKIES.source)) {
      const utmSource = params.get('utm_source');
      if (utmSource) {
        const sanitized = sanitizeUtmValue(utmSource);
        if (sanitized) {
          setCookie(UTM_COOKIES.source, encodeURIComponent(sanitized), COOKIE_DAYS);
        }
      }
    }

    // Capture utm_medium
    if (!getCookie(UTM_COOKIES.medium)) {
      const utmMedium = params.get('utm_medium');
      if (utmMedium) {
        const sanitized = sanitizeUtmValue(utmMedium);
        if (sanitized) {
          setCookie(UTM_COOKIES.medium, encodeURIComponent(sanitized), COOKIE_DAYS);
        }
      }
    }

    // Capture utm_campaign
    if (!getCookie(UTM_COOKIES.campaign)) {
      const utmCampaign = params.get('utm_campaign');
      if (utmCampaign) {
        const sanitized = sanitizeUtmValue(utmCampaign);
        if (sanitized) {
          setCookie(UTM_COOKIES.campaign, encodeURIComponent(sanitized), COOKIE_DAYS);
        }
      }
    }

    // Capture signup_url
    if (!getCookie('signup_url')) {
      const url = window.location.href;
      if (url) {
        setCookie('signup_url', encodeURIComponent(url), COOKIE_DAYS);
      }
    }
  }, []);

  return null;
}
