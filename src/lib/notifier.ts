import { getAllConfigs } from '@/shared/models/config';

export type NotifyType = 'register' | 'payment' | 'renewal' | 'cancel';

interface NotifyData {
  email?: string;
  userId?: string;
  amount?: number;
  currency?: string;
  planName?: string;
  productName?: string;
  orderNo?: string;
  subscriptionNo?: string;
  canceledReason?: string;
  // Register extra fields
  ip?: string;
  location?: string;
  locationCn?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  signupUrl?: string;
  signupReferrer?: string;
}

/**
 * Send admin notification
 * Fire-and-forget: won't block business flow
 */
export function notifyAdmin(type: NotifyType, data: NotifyData) {
  console.log(`[Notifier] notifyAdmin called: type=${type}, data=${JSON.stringify(data)}`);
  
  // Don't await, let it run in background
  sendNotification(type, data).catch((error) => {
    console.error('[Notifier] sendNotification failed:', error);
  });
}

/**
 * Internal: actually send notification
 */
async function sendNotification(type: NotifyType, data: NotifyData) {
  console.log('[Notifier] sendNotification started');
  
  const configs = await getAllConfigs();
  console.log('[Notifier] configs loaded:', {
    dingtalk_enabled: configs.dingtalk_enabled,
    dingtalk_webhook_url: configs.dingtalk_webhook_url ? '***set***' : '***empty***',
    dingtalk_keyword: configs.dingtalk_keyword,
  });

  // DingTalk
  if (configs.dingtalk_enabled === 'true' && configs.dingtalk_webhook_url) {
    console.log('[Notifier] DingTalk conditions met, sending...');
    await sendDingTalk(
      configs.dingtalk_webhook_url,
      configs.dingtalk_keyword,
      type,
      data
    );
  } else {
    console.log('[Notifier] DingTalk skipped:', {
      enabled: configs.dingtalk_enabled === 'true',
      hasWebhook: !!configs.dingtalk_webhook_url,
    });
  }

  // Future: add more channels here (WeCom, Feishu, Slack, Email...)
  // if (configs.wecom_enabled === 'true') { ... }
}

/**
 * Send DingTalk message
 */
async function sendDingTalk(
  webhookUrl: string,
  keyword: string | undefined,
  type: NotifyType,
  data: NotifyData
) {
  const { title, content } = formatMessage(type, data, keyword);
  
  console.log('[Notifier] DingTalk message prepared:', { title, content: content.slice(0, 100) + '...' });

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: {
          title,
          text: content,
        },
      }),
    });

    const responseText = await response.text();
    console.log('[Notifier] DingTalk response:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
    });

    if (!response.ok) {
      console.error('[Notifier] Failed to send DingTalk notification:', responseText);
    } else {
      console.log('[Notifier] DingTalk notification sent successfully');
    }
  } catch (error) {
    console.error('[Notifier] DingTalk fetch error:', error);
    throw error;
  }
}

/**
 * Format UTM params for display
 */
function formatUtm(data: NotifyData): string {
  const parts: string[] = [];
  if (data.utmSource) parts.push(`Source: ${data.utmSource}`);
  if (data.utmMedium) parts.push(`Medium: ${data.utmMedium}`);
  if (data.utmCampaign) parts.push(`Campaign: ${data.utmCampaign}`);
  return parts.length > 0 ? parts.join(' | ') : '-';
}

/**
 * Format notification message
 */
function formatMessage(
  type: NotifyType,
  data: NotifyData,
  keyword?: string
): { title: string; content: string } {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'App';
  
  // Add keyword to title if configured
  const keywordPrefix = keyword ? `[${keyword}] ` : '';
  
  switch (type) {
    case 'register': {
      const utmInfo = formatUtm(data);
      const locationInfo = data.locationCn || data.location || '-';
      
      return {
        title: `${keywordPrefix}New User Registration`,
        content: `## 🎉 ${keywordPrefix}New User Registration\n\n` +
          `- **App**: ${appName}\n` +
          `- **Email**: ${data.email || '-'}\n` +
          `- **User ID**: ${data.userId || '-'}\n` +
          `- **IP**: ${data.ip || '-'}\n` +
          `- **Location**: ${locationInfo}\n` +
          `- **UTM**: ${utmInfo}\n` +
          `- **Signup URL**: ${data.signupUrl || '-'}\n` +
          `- **Referrer**: ${data.signupReferrer || '-'}\n` +
          `- **Time**: ${formatTime()}\n`,
      };
    }

    case 'payment':
      return {
        title: `${keywordPrefix}Payment Success`,
        content: `## ● ${keywordPrefix}Payment Success\n\n` +
          `- **App**: ${appName}\n` +
          `- **Email**: ${data.email || '-'}\n` +
          `- **Type**: ${data.subscriptionNo ? 'Subscription' : 'One-time'}\n` +
          `- **Plan**: ${data.planName || data.productName || '-'}\n` +
          `- **Amount**: ${data.currency || '$'}${data.amount || '-'}\n` +
          `- **Order**: ${data.orderNo || '-'}\n` +
          `- **Time**: ${formatTime()}\n`,
      };

    case 'renewal':
      return {
        title: `${keywordPrefix}Renewal Success`,
        content: `## 🔄 ${keywordPrefix}Renewal Success\n\n` +
          `- **App**: ${appName}\n` +
          `- **Email**: ${data.email || '-'}\n` +
          `- **Plan**: ${data.planName || '-'}\n` +
          `- **Amount**: ${data.currency || '$'}${data.amount || '-'}\n` +
          `- **Subscription**: ${data.subscriptionNo || '-'}\n` +
          `- **Time**: ${formatTime()}\n`,
      };

    case 'cancel':
      return {
        title: `${keywordPrefix}Subscription Canceled`,
        content: `## ⚠️ ${keywordPrefix}Subscription Canceled\n\n` +
          `- **App**: ${appName}\n` +
          `- **Email**: ${data.email || '-'}\n` +
          `- **Plan**: ${data.planName || '-'}\n` +
          `- **Subscription**: ${data.subscriptionNo || '-'}\n` +
          `- **Reason**: ${data.canceledReason || '-'}\n` +
          `- **Time**: ${formatTime()}\n`,
      };

    default:
      return {
        title: `${keywordPrefix}System Notification`,
        content: `## 📢 ${keywordPrefix}System Notification\n\n${JSON.stringify(data, null, 2)}`,
      };
  }
}

function formatTime(): string {
  return new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
