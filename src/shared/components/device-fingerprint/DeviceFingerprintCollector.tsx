'use client';

import { useEffect } from 'react';

// 设备指纹收集器组件
export default function DeviceFingerprintCollector() {
  useEffect(() => {
    // 收集设备指纹信息
    const collectFingerprint = () => {
      try {
        const fingerprint = {
          userAgent: navigator.userAgent,
          screenResolution: `${screen.width}x${screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          platform: navigator.platform,
          colorDepth: screen.colorDepth,
          pixelRatio: window.devicePixelRatio,
          cookieEnabled: navigator.cookieEnabled,
          timestamp: Date.now(),
        };

        // 存储到cookie中，供服务端使用
        const fingerprintString = encodeURIComponent(JSON.stringify(fingerprint));
        document.cookie = `client_fingerprint=${fingerprintString}; path=/; max-age=86400; SameSite=Lax`;
      } catch (error) {
        console.error('[DeviceFingerprint] 收集失败:', error);
      }
    };

    // 页面加载后立即收集
    collectFingerprint();
  }, []);

  // 不渲染任何UI
  return null;
}
