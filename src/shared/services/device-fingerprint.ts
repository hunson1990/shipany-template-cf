// 简单哈希函数，避免crypto模块依赖
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// 生成设备指纹哈希
export function generateFingerprintHash(fingerprint: {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  ipAddress: string;
}): string {
  const { userAgent, screenResolution, timezone, language, platform, ipAddress } =
    fingerprint;

  // 组合设备特征
  const fingerprintString = [userAgent, screenResolution, timezone, language, platform, ipAddress].join('|');

  // 生成哈希值
  return simpleHash(fingerprintString);
}

// 提取客户端指纹的关键字段
export function extractKeyFingerprint(clientFingerprint: any) {
  return {
    userAgent: clientFingerprint.userAgent || '',
    screenResolution: clientFingerprint.screenResolution || '',
    timezone: clientFingerprint.timezone || '',
    language: clientFingerprint.language || '',
    platform: clientFingerprint.platform || '',
  };
}
