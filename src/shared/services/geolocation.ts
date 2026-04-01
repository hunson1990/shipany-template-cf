import { getAllConfigs } from '@/shared/models/config';

interface IPInfoResponse {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  loc?: string;
  org?: string;
  postal?: string;
  timezone?: string;
}

interface LocationResult {
  location: string;
  locationCn: string;
}

// Common country code to Chinese name mapping
const countryCodeToChinese: Record<string, string> = {
  // Asia
  CN: '中国',
  HK: '中国香港',
  TW: '中国台湾',
  MO: '中国澳门',
  JP: '日本',
  KR: '韩国',
  SG: '新加坡',
  MY: '马来西亚',
  TH: '泰国',
  VN: '越南',
  ID: '印度尼西亚',
  PH: '菲律宾',
  IN: '印度',
  PK: '巴基斯坦',
  BD: '孟加拉国',
  // North America
  US: '美国',
  CA: '加拿大',
  MX: '墨西哥',
  // Europe
  GB: '英国',
  FR: '法国',
  DE: '德国',
  IT: '意大利',
  ES: '西班牙',
  PT: '葡萄牙',
  NL: '荷兰',
  BE: '比利时',
  CH: '瑞士',
  AT: '奥地利',
  SE: '瑞典',
  NO: '挪威',
  DK: '丹麦',
  FI: '芬兰',
  IE: '爱尔兰',
  PL: '波兰',
  CZ: '捷克',
  HU: '匈牙利',
  RO: '罗马尼亚',
  GR: '希腊',
  UA: '乌克兰',
  RU: '俄罗斯',
  // Oceania
  AU: '澳大利亚',
  NZ: '新西兰',
  // South America
  BR: '巴西',
  AR: '阿根廷',
  CL: '智利',
  CO: '哥伦比亚',
  PE: '秘鲁',
  // Africa
  ZA: '南非',
  EG: '埃及',
  NG: '尼日利亚',
  KE: '肯尼亚',
  // Middle East
  AE: '阿联酋',
  SA: '沙特阿拉伯',
  IL: '以色列',
  TR: '土耳其',
  // Others
  // Add more as needed
};

/**
 * Get location info from IP address using IPInfo service
 * @param ip - IP address
 * @returns Location result with both English and Chinese formats
 */
export async function getLocationFromIP(ip: string): Promise<LocationResult> {
  const emptyResult: LocationResult = { location: '', locationCn: '' };
  
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return emptyResult;
  }

  try {
    const configs = await getAllConfigs();
    const token = configs.ipinfo_token;

    if (!token) {
      return emptyResult;
    }

    const response = await fetch(`https://ipinfo.io/${ip}?token=${token}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('IPInfo API error:', response.status, await response.text());
      return emptyResult;
    }

    const data: IPInfoResponse = await response.json();

    if (!data.country) {
      return emptyResult;
    }

    // English format: US+California
    const location = data.region 
      ? `${data.country}+${data.region}`
      : data.country;
    
    // Chinese format: 美国+California (only country is translated)
    const countryCn = countryCodeToChinese[data.country] || data.country;
    const locationCn = data.region 
      ? `${countryCn}+${data.region}`
      : countryCn;

    return { location, locationCn };
  } catch (error) {
    console.error('Failed to get location from IP:', error);
    return emptyResult;
  }
}
