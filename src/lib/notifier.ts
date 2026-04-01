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
    await sendDingTalk(
      configs.dingtalk_webhook_url,
      configs.dingtalk_keyword,
      type,
      data
    );
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

  if (!response.ok) {
    console.error('Failed to send DingTalk notification:', await response.text());
  }
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
    case 'register':
      return {
        title: `${keywordPrefix}新用户注册`,
        content: `## 🎉 ${keywordPrefix}新用户注册\n\n` +
          `- **应用**: ${appName}\n` +
          `- **邮箱**: ${data.email || '-'}\n` +
          `- **用户ID**: ${data.userId || '-'}\n` +
          `- **时间**: ${formatTime()}\n`,
      };

    case 'payment':
      return {
        title: `${keywordPrefix}支付成功`,
        content: `## 💰 ${keywordPrefix}支付成功\n\n` +
          `- **应用**: ${appName}\n` +
          `- **邮箱**: ${data.email || '-'}\n` +
          `- **类型**: ${data.subscriptionNo ? '订阅' : '一次性'}\n` +
          `- **套餐**: ${data.planName || data.productName || '-'}\n` +
          `- **金额**: ${data.currency || '$'}${data.amount || '-'}\n` +
          `- **订单**: ${data.orderNo || '-'}\n` +
          `- **时间**: ${formatTime()}\n`,
      };

    case 'renewal':
      return {
        title: `${keywordPrefix}续费成功`,
        content: `## 🔄 ${keywordPrefix}续费成功\n\n` +
          `- **应用**: ${appName}\n` +
          `- **邮箱**: ${data.email || '-'}\n` +
          `- **套餐**: ${data.planName || '-'}\n` +
          `- **金额**: ${data.currency || '$'}${data.amount || '-'}\n` +
          `- **订阅**: ${data.subscriptionNo || '-'}\n` +
          `- **时间**: ${formatTime()}\n`,
      };

    case 'cancel':
      return {
        title: `${keywordPrefix}订阅取消`,
        content: `## ⚠️ ${keywordPrefix}订阅取消\n\n` +
          `- **应用**: ${appName}\n` +
          `- **邮箱**: ${data.email || '-'}\n` +
          `- **套餐**: ${data.planName || '-'}\n` +
          `- **订阅**: ${data.subscriptionNo || '-'}\n` +
          `- **原因**: ${data.canceledReason || '-'}\n` +
          `- **时间**: ${formatTime()}\n`,
      };

    default:
      return {
        title: `${keywordPrefix}系统通知`,
        content: `## 📢 ${keywordPrefix}系统通知\n\n${JSON.stringify(data, null, 2)}`,
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
