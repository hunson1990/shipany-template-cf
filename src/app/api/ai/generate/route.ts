import { ImageToVideoModels } from '@/lib/image-to-video/constants';
import { calculateRequiredCredits } from '@/lib/image-to-video/credits';

import { envConfigs } from '@/config';
import { AIMediaType } from '@/extensions/ai';
import { getUuid } from '@/shared/lib/hash';
import { respData, respErr, respJson } from '@/shared/lib/resp';
import { createAITask, NewAITask } from '@/shared/models/ai_task';
import { getAllConfigs } from '@/shared/models/config';
import { getRemainingCredits } from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';

// Calculate cost credits based on model and options
function calculateCostCredits(
  mediaType: string,
  model: string,
  scene: string,
  options?: any
): number {
  // For image-to-video, calculate based on model's decrease_credits
  if (mediaType === AIMediaType.VIDEO && scene === 'image-to-video') {
    const modelConfig = ImageToVideoModels[model];
    if (modelConfig && options) {
      const { resolution, duration } = options;
      return calculateRequiredCredits(modelConfig, resolution, duration);
    }
  }

  // Fallback to default costs for other scenarios
  if (mediaType === AIMediaType.IMAGE) {
    if (scene === 'image-to-image') {
      return 4;
    } else if (scene === 'text-to-image') {
      return 2;
    }
  } else if (mediaType === AIMediaType.VIDEO) {
    if (scene === 'text-to-video') {
      return 6;
    } else if (scene === 'image-to-video') {
      return 8;
    } else if (scene === 'video-to-video') {
      return 10;
    }
  } else if (mediaType === AIMediaType.MUSIC) {
    return 10;
  }

  return 2; // default
}

export async function POST(request: Request) {
  try {
    let { provider, mediaType, model, prompt, options, scene } =
      await request.json();

    if (!provider || !mediaType || !model) {
      throw new Error('invalid params');
    }

    if (!prompt && !options) {
      throw new Error('prompt or options is required');
    }

    const aiService = await getAIService();
    const availableProviders = aiService.getProviderNames();

    console.log('[ai/generate] incoming request', {
      provider,
      mediaType,
      model,
      scene,
      hasPrompt: Boolean(prompt),
      hasOptions: Boolean(options),
      availableProviders,
    });

    // check generate type
    if (!aiService.getMediaTypes().includes(mediaType)) {
      throw new Error('invalid mediaType');
    }

    // check ai provider
    const aiProvider = aiService.getProvider(provider);
    if (!aiProvider) {
      throw new Error('invalid provider');
    }

    // get current user
    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    // Calculate cost credits based on model and options
    const costCredits = calculateCostCredits(mediaType, model, scene, options);

    // check credits
    const remainingCredits = await getRemainingCredits(user.id);
    if (remainingCredits < costCredits) {
      return respJson(-2, 'INSUFFICIENT_CREDITS', {
        required: costCredits,
        current: remainingCredits,
      });
    }

    const callbackUrl = `${envConfigs.app_url}/api/ai/notify/${provider}`;

    // Get global watermark config
    const allConfigs = await getAllConfigs();
    const waterMark = allConfigs.water_mark || '';

    const params: any = {
      mediaType,
      model,
      prompt,
      callbackUrl,
      options: {
        ...options,
        waterMark,
      },
    };

    // generate content
    const result = await aiProvider.generate({ params });
    if (!result?.taskId) {
      throw new Error(
        `ai generate failed, mediaType: ${mediaType}, provider: ${provider}, model: ${model}`
      );
    }

    // create ai task
    const newAITask: NewAITask = {
      id: getUuid(),
      userId: user.id,
      mediaType,
      provider,
      model,
      prompt,
      scene,
      options: options ? JSON.stringify(options) : null,
      status: result.taskStatus,
      costCredits,
      taskId: result.taskId,
      taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
      taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
    };
    await createAITask(newAITask);

    return respData(newAITask);
  } catch (e: any) {
    console.log('generate failed', e);
    return respErr(e.message);
  }
}
