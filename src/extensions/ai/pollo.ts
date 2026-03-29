import { getUuid } from '@/shared/lib/hash';

import { saveFiles } from '.';
import {
  AIConfigs,
  AIFile,
  AIGenerateParams,
  AIMediaType,
  AIProvider,
  AITaskResult,
  AITaskStatus,
  AIVideo,
} from './types';

/**
 * Pollo configs
 */
export interface PolloConfigs extends AIConfigs {
  apiKey: string;
  baseUrl?: string;
  customStorage?: boolean;
}

/**
 * Pollo provider (video only)
 */
export class PolloProvider implements AIProvider {
  readonly name = 'pollo';
  configs: PolloConfigs;

  constructor(configs: PolloConfigs) {
    this.configs = configs;
  }

  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    if (params.mediaType !== AIMediaType.VIDEO) {
      throw new Error(`mediaType not supported: ${params.mediaType}`);
    }

    if (!params.model) {
      throw new Error('model is required');
    }

    const prompt =
      typeof params.prompt === 'string' ? params.prompt.trim() : '';
    const imageUrl =
      typeof params.options?.imageUrl === 'string'
        ? params.options.imageUrl.trim()
        : '';

    if (!prompt && !imageUrl) {
      throw new Error('prompt or imageUrl is required');
    }

    const brand = params.options?.modelBrand;
    const version = params.options?.modelVersion;

    if (!brand || !version) {
      throw new Error('modelBrand and modelVersion are required');
    }

    const apiUrl = `${this.getBaseUrl()}/generation/${brand}/${version}`;
    console.log('[pollo] generate apiUrl', { apiUrl, brand, version });

    let resolution = params.options?.resolution;
    if (typeof resolution === 'string' && ['wanx', 'minimax'].includes(brand)) {
      resolution = resolution.toUpperCase();
    }

    const input: any = {
      negativePrompt: '',
      imageTail: '',
      strength: 60,
      length: params.options?.duration,
      resolution,
      aspectRatio: params.options?.aspectRatio || '16:9',
      mode: 'basic',
    };

    if (prompt) {
      input.prompt = prompt;
    }

    if (imageUrl) {
      input.image = imageUrl;
    }

    if (params.options?.endFrameImageUrl) {
      input.imageTail = params.options.endFrameImageUrl;
    } else if (params.options?.endFrame) {
      input.imageTail = params.options.endFrame;
    }

    if (params.options?.waterMark) {
      input.waterMark = params.options.waterMark;
    }

    const payload = {
      input,
      webhookUrl: params.callbackUrl,
    };

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.configs.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(
        `request failed with status: ${resp.status}, body: ${errorText}`
      );
    }

    const data = await resp.json();

    const code = String(data?.code || '').toUpperCase();

    if (!data?.data?.taskId || (code && code !== 'SUCCESS')) {
      const errorDetails = data?.issues
        ? `, issues: ${JSON.stringify(data.issues)}`
        : '';
      throw new Error(
        `${data?.code || 'UNKNOWN'}: ${data?.message || data?.msg || 'generate video failed: no taskId'}${errorDetails}`
      );
    }

    return {
      taskStatus: AITaskStatus.PENDING,
      taskId: data.data.taskId,
      taskInfo: {},
      taskResult: data,
    };
  }

  async query({ taskId }: { taskId: string }): Promise<AITaskResult> {
    if (!taskId) {
      throw new Error('taskId is required');
    }

    const apiUrl = `${this.getBaseUrl()}/generation/${encodeURIComponent(taskId)}/status`;
    console.log('[pollo] query apiUrl', { apiUrl, taskId });

    const resp = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.configs.apiKey,
      },
    });

    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const data = await resp.json();

    const taskStatus = this.mapStatus(data);
    const providerStatus =
      data?.data?.status ||
      data?.status ||
      data?.data?.generations?.[0]?.status ||
      '';

    let videos: AIVideo[] | undefined = undefined;

    if (taskStatus === AITaskStatus.SUCCESS) {
      const videoUrls = this.extractVideoUrls(data);
      videos = videoUrls.map((videoUrl) => ({
        id: '',
        createTime: new Date(),
        videoUrl,
      }));

      if (this.configs.customStorage && videos.length > 0) {
        const filesToSave: AIFile[] = videos
          .map((video, index) => {
            if (!video.videoUrl) {
              return null;
            }
            return {
              url: video.videoUrl,
              contentType: 'video/mp4',
              key: `pollo/video/${getUuid()}.mp4`,
              index,
              type: 'video',
            } as AIFile;
          })
          .filter(Boolean) as AIFile[];

        if (filesToSave.length > 0) {
          const uploadedFiles = await saveFiles(filesToSave);
          if (uploadedFiles) {
            uploadedFiles.forEach((file) => {
              if (videos && file.index !== undefined && videos[file.index]) {
                videos[file.index].videoUrl = file.url;
              }
            });
          }
        }
      }
    }

    return {
      taskId,
      taskStatus,
      taskInfo: {
        videos,
        status: providerStatus,
        errorCode: data?.code ? String(data.code) : '',
        errorMessage: data?.msg || data?.message || '',
        createTime: new Date(),
      },
      taskResult: data,
    };
  }

  private getBaseUrl(): string {
    const configuredBaseUrl = this.configs.baseUrl?.trim();
    if (configuredBaseUrl) {
      return configuredBaseUrl.replace(/\/$/, '');
    }

    return 'https://pollo.ai/api/platform';
  }

  private mapStatus(data: any): AITaskStatus {
    const status = String(
      data?.data?.status ||
        data?.status ||
        data?.data?.generations?.[0]?.status ||
        ''
    ).toLowerCase();
    const code = String(data?.code || '').toUpperCase();

    if (code && code !== 'SUCCESS') {
      return AITaskStatus.FAILED;
    }

    switch (status) {
      case 'success':
      case 'succeed':
      case 'succeeded':
      case 'completed':
      case 'finish':
      case 'finished':
        return AITaskStatus.SUCCESS;
      case 'failed':
      case 'fail':
      case 'error':
        return AITaskStatus.FAILED;
      case 'processing':
      case 'running':
      case 'in_progress':
        return AITaskStatus.PROCESSING;
      case 'pending':
      case 'waiting':
      case 'queued':
      case 'created':
      case 'submitted':
        return AITaskStatus.PENDING;
      default:
        return AITaskStatus.PENDING;
    }
  }

  private extractVideoUrls(data: any): string[] {
    const candidates = [
      data?.data?.videoUrl,
      data?.data?.video_url,
      data?.data?.url,
      data?.data?.output,
      data?.data?.result,
      data?.videoUrl,
      data?.video_url,
      data?.url,
      data?.output,
      data?.result,
    ];

    const urls: string[] = [];

    candidates.forEach((candidate) => {
      if (!candidate) {
        return;
      }

      if (typeof candidate === 'string') {
        urls.push(candidate);
        return;
      }

      if (Array.isArray(candidate)) {
        candidate.forEach((item) => {
          if (typeof item === 'string') {
            urls.push(item);
          } else if (item?.url) {
            urls.push(item.url);
          } else if (item?.videoUrl) {
            urls.push(item.videoUrl);
          }
        });
      }
    });

    return Array.from(new Set(urls.filter(Boolean)));
  }
}
