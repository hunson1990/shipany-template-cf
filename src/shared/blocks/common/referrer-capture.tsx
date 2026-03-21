'use client';

import { useEffect } from 'react';
import { getCookie, setCookie } from '@/shared/lib/cookie';

const COOKIE_NAME = 'signup_referrer';
const COOKIE_DAYS = 30;

/**
 * Capture document.referrer on first visit and persist in cookie.
 * This enables server-side signup to save it into the user table.
 */
export function ReferrerCapture() {
  useEffect(() => {
    // Don't overwrite if already captured.
    if (getCookie(COOKIE_NAME)) return;

    const referrer = document.referrer;
    if (!referrer) return;

    // Store encoded to keep cookie safe.
    setCookie(COOKIE_NAME, encodeURIComponent(referrer), COOKIE_DAYS);
  }, []);

  return null;
}
