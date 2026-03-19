import type { ModelOption } from '@/types/image-to-video';

// 积分计算配置
const MARKUP_MULTIPLIER = 10; // 加价系数
const CREDIT_ANCHOR = 0.05; // 站内积分锚定

/**
 * 计算指定分辨率和时长的所需积分
 */
export const calculateRequiredCredits = (
  model: ModelOption,
  resolution: string,
  duration: number
): number => {
  if (!model.decrease_credits) {
    return 0;
  }

  const creditRule = model.decrease_credits.find(
    (rule: any) =>
      (rule.resolution === resolution || !rule.resolution) &&
      rule.duration === duration
  );

  if (!creditRule || !creditRule.cost_price) {
    return 0;
  }

  // 新算法：(成本价 * 加价系数) / 站内积分锚定
  const calculatedCredits =
    (creditRule.cost_price * MARKUP_MULTIPLIER) / CREDIT_ANCHOR;

  // 返回向上取整的结果
  return Math.ceil(calculatedCredits);
};

/**
 * 计算模型最低积分成本
 */
export const calculateMinimumCredits = (model: ModelOption): number => {
  if (!model.decrease_credits || model.decrease_credits.length === 0) {
    return 0;
  }

  // 过滤出有效的cost_price值，找到最低值
  const validCostPrices = model.decrease_credits
    .map((rule: any) => rule.cost_price)
    .filter(
      (price: any) => typeof price === 'number' && !isNaN(price) && price > 0
    );

  if (validCostPrices.length === 0) {
    return 0;
  }

  const minCostPrice = Math.min(...validCostPrices);

  // 使用新算法计算积分
  const calculatedCredits =
    (minCostPrice * MARKUP_MULTIPLIER) / CREDIT_ANCHOR;

  // 返回向上取整的结果
  return Math.ceil(calculatedCredits);
};
