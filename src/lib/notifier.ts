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
  [key: string]: any;
}

/**
 * Send admin notification
 * Fire-and-forget: won't block business flow
 */
export function notifyAdmin(type: NotifyType, data: NotifyData) {
  // Don't await, let it run in background
  sendNotification(type, data).catch(() => {
    // Silently fail, don't affect business
  });
}

/**
 * Internal: actually send notification
 */
async function sendNotification(type: NotifyType, data: NotifyData) {
  const configs = await getAllConfigs();

  // DingTalk
  if (configs.dingtalk_enabled === 'true' && configs.dingtalk_webhook_url) {
    await sendDingTalk(configs.dingtalk_webhook_url, configs.dingtalk_secret, type, data);
  }

  // Future: add more channels here (WeCom, Feishu, Slack, Email...)
  // if (configs.wecom_enabled === 'true') { ... }
}

/**
 * Send DingTalk message
 */
async function sendDingTalk(
  webhookUrl: string,
  secret: string | undefined,
  type: NotifyType,
  data: NotifyData
) {
  const { title, content } = formatMessage(type, data);

  let url = webhookUrl;

  // Add signature if secret is configured
  if (secret) {
    const timestamp = Date.now();
    const sign = generateDingTalkSign(timestamp, secret);
    url = `${webhookUrl}&timestamp=${timestamp}&sign=${sign}`;
  }

  const payload = {
    msgtype: 'markdown',
    markdown: {
      title,
      text: content,
    },
  };

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Generate DingTalk signature
 */
function generateDingTalkSign(timestamp: number, secret: string): string {
  const crypto = require('crypto');
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(stringToSign);
  return encodeURIComponent(hmac.digest('base64'));
}

/**
 * Format notification message
 */
function formatMessage(type: NotifyType, data: NotifyData): { title: string; content: string } {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'App';
  
  switch (type) {
    case 'register':
      return {
        title: '新用户注册',
        content: `## 🎉 新用户注册\n\n` +
          `- **邮箱**: ${data.email || '-'}\n` +
          `- **用户ID**: ${data.userId || '-'}\n` +
          `- **时间**: ${formatTime()}\n`,
      };

    case 'payment':
      return {
        title: '支付成功',
        content: `## 💰 支付成功\n\n` +
          `- **邮箱**: ${data.email || '-'}\n` +
          `- **类型**: ${data.subscriptionNo ? '订阅' : '一次性'}\n` +
          `- **套餐**: ${data.planName || data.productName || '-'}\n` +
          `- **金额**: ${data.currency || '$'}${data.amount || '-'}\n` +
          `- **订单**: ${data.orderNo || '-'}\n` +
          `- **时间**: ${formatTime()}\n`,
      };

    case 'renewal':
      return {
        title: '续费成功',
        content: `## 🔄 续费成功\n\n` +
          `- **邮箱**: ${data.email || '-'}\n` +
          `- **套餐**: ${data.planName || '-'}\n` +
          `- **金额**: ${data.currency || '$'}${data.amount || '-'}\n` +
          `- **订阅**: ${data.subscriptionNo || '-'}\n` +
          `- **时间**: ${formatTime()}\n`,
      };

    case 'cancel':
      return {
        title: '订阅取消',
        content: `## ⚠️ 订阅取消\n\n` +
          `- **邮箱**: ${data.email || '-'}\n` +
          `- **套餐**: ${data.planName || '-'}\n` +
          `- **订阅**: ${data.subscriptionNo || '-'}\n` +
          `- **时间**: ${formatTime()}\n`,
      };

    default:
      return {
        title: '系统通知',
        content: `## 📢 系统通知\n\n${JSON.stringify(data, null, 2)}`,
      };
  }
}

function formatTime(): string {
  return new Date().toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
