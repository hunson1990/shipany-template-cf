import { nanoid } from 'nanoid';

import { getUuid } from '@/shared/lib/hash';

import { saveFiles } from '.';
import {
  AIConfigs,
  AIFile,
  AIGenerateParams,
  AIImage,
  AIMediaType,
  AIProvider,
  AISong,
  AITaskResult,
  AITaskStatus,
  AIVideo,
} from './types';

/**
 * Kie configs
 * @docs https://kie.ai/
 */
export interface KieConfigs extends AIConfigs {
  apiKey: string;
  customStorage?: boolean; // use custom storage to save files
}

/**
 * Kie provider
 * @docs https://kie.ai/
 */
export class KieProvider implements AIProvider {
  // provider name
  readonly name = 'kie';
  // provider configs
  configs: KieConfigs;

  // api base url
  private baseUrl = 'https://api.kie.ai/api/v1';

  // init provider
  constructor(configs: KieConfigs) {
    this.configs = configs;
  }

  async generateMusic({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/generate`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    // todo: check model
    if (!params.model) {
      params.model = 'V5';
    }

    // build request params
    let payload: any = {
      prompt: params.prompt,
      model: params.model,
      callBackUrl: params.callbackUrl,
    };

    if (params.options && params.options.customMode) {
      // custom mode
      payload.customMode = true;
      payload.title = params.options.title;
      payload.style = params.options.style;
      payload.instrumental = params.options.instrumental;
      if (!params.options.instrumental) {
        // not instrumental, lyrics is used as prompt
        payload.prompt = params.options.lyrics;
      }
    } else {
      // not custom mode
      payload.customMode = false;
      payload.prompt = params.prompt;
      payload.instrumental = params.options?.instrumental;
    }

    // const params = {
    //   customMode: false,
    //   instrumental: false,
    //   style: "",
    //   title: "",
    //   prompt: prompt || "",
    //   model: model || "V4_5",
    //   callBackUrl,
    //   negativeTags: "",
    //   vocalGender: "m", // m or f
    //   styleWeight: 0.65,
    //   weirdnessConstraint: 0.65,
    //   audioWeight: 0.65,
    // };

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const { code, msg, data } = await resp.json();

    if (code !== 200) {
      throw new Error(`generate music failed: ${msg}`);
    }

    if (!data || !data.taskId) {
      throw new Error(`generate music failed: no taskId`);
    }

    return {
      taskStatus: AITaskStatus.PENDING,
      taskId: data.taskId,
      taskInfo: {},
      taskResult: data,
    };
  }

  async generateImage({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/jobs/createTask`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    if (!params.model) {
      throw new Error('model is required');
    }

    if (!params.prompt) {
      throw new Error('prompt is required');
    }

    // build request params
    let payload: any = {
      model: params.model,
      callBackUrl: params.callbackUrl,
      input: {
        prompt: params.prompt,
      },
    };

    if (params.options) {
      const options = params.options;
      if (options.image_input && Array.isArray(options.image_input)) {
        payload.input.image_input = options.image_input;
      }
      if (options.aspect_ratio) {
        payload.input.aspect_ratio = options.aspect_ratio;
      }
      if (options.resolution) {
        payload.input.resolution = options.resolution;
      }
      if (options.output_format) {
        payload.input.output_format = options.output_format;
      }
    }

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const { code, msg, data } = await resp.json();

    if (code !== 200) {
      throw new Error(`generate image failed: ${msg}`);
    }

    if (!data || !data.taskId) {
      throw new Error(`generate image failed: no taskId`);
    }

    return {
      taskStatus: AITaskStatus.PENDING,
      taskId: data.taskId,
      taskInfo: {},
      taskResult: data,
    };
  }

  async generateVideo({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/runway/generate`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    if (!params.model) {
      throw new Error('model is required');
    }

    // build request params
    let payload: any = {
      prompt: params.prompt || '',
      callBackUrl: params.callbackUrl,
      waterMark: 'kie.ai',
      duration: 5,
      quality: '720p',
    };

    if (params.options) {
      const options = params.options;
      // image-to-video: use imageUrl
      if (options.imageUrl) {
        payload.imageUrl = options.imageUrl;
      }
      // text-to-video: use aspectRatio
      if (options.aspectRatio) {
        payload.aspectRatio = options.aspectRatio;
      } else if (!options.imageUrl) {
        // default aspect ratio for text-to-video
        payload.aspectRatio = '16:9';
      }
      // duration: 5 or 10
      if (options.duration) {
        payload.duration = options.duration;
      }
      // quality: 720p or 1080p
      if (options.resolution) {
        payload.quality = options.resolution;
      }
    }

    console.log('kie input', apiUrl, payload);

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const { code, msg, data } = await resp.json();

    if (code !== 200) {
      throw new Error(`generate video failed: ${msg}`);
    }

    if (!data || !data.taskId) {
      throw new Error(`generate video failed: no taskId`);
    }

    return {
      taskStatus: AITaskStatus.PENDING,
      taskId: data.taskId,
      taskInfo: {},
      taskResult: data,
    };
  }

  // generate task
  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    if (
      ![AIMediaType.MUSIC, AIMediaType.IMAGE, AIMediaType.VIDEO].includes(
        params.mediaType
      )
    ) {
      throw new Error(`mediaType not supported: ${params.mediaType}`);
    }

    if (params.mediaType === AIMediaType.MUSIC) {
      return this.generateMusic({ params });
    } else if (params.mediaType === AIMediaType.IMAGE) {
      return this.generateImage({ params });
    } else if (params.mediaType === AIMediaType.VIDEO) {
      return this.generateVideo({ params });
    }

    throw new Error(`mediaType not supported: ${params.mediaType}`);
  }

  async queryImage({ taskId }: { taskId: string }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/jobs/recordInfo?taskId=${taskId}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    const resp = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });
    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const { code, msg, data } = await resp.json();

    if (code !== 200) {
      throw new Error(msg);
    }

    if (!data || !data.state) {
      throw new Error(`query failed`);
    }

    let images: AIImage[] | undefined = undefined;

    if (data.resultJson) {
      const resultJson = JSON.parse(data.resultJson);
      const resultUrls = resultJson.resultUrls;
      if (Array.isArray(resultUrls)) {
        images = resultUrls.map((image: any) => ({
          id: '',
          createTime: new Date(data.createTime),
          imageUrl: image,
        }));
      }
    }

    const taskStatus = this.mapImageStatus(data.state);

    // use custom storage to save images
    if (
      taskStatus === AITaskStatus.SUCCESS &&
      images &&
      images.length > 0 &&
      this.configs.customStorage
    ) {
      const filesToSave: AIFile[] = [];
      images.forEach((image, index) => {
        if (image.imageUrl) {
          filesToSave.push({
            url: image.imageUrl,
            contentType: 'image/png',
            key: `kie/image/${getUuid()}.png`,
            index: index,
            type: 'image',
          });
        }
      });

      if (filesToSave.length > 0) {
        const uploadedFiles = await saveFiles(filesToSave);
        if (uploadedFiles) {
          uploadedFiles.forEach((file: AIFile) => {
            if (file && file.url && images && file.index !== undefined) {
              const image = images[file.index];
              if (image) {
                image.imageUrl = file.url;
              }
            }
          });
        }
      }
    }

    return {
      taskId,
      taskStatus,
      taskInfo: {
        images,
        status: data.state,
        errorCode: data.failCode,
        errorMessage: data.failMsg,
        createTime: new Date(data.createTime),
      },
      taskResult: data,
    };
  }

  async queryVideo({ taskId }: { taskId: string }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/runway/record-detail?taskId=${taskId}`;
    console.log('Kie queryVideo apiUrl:', apiUrl);

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    const resp = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });
    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const { code, msg, data } = await resp.json();

    // 根据 API 文档，code 200 表示成功
    if (code !== 200) {
      console.error(`Kie query failed: code=${code}, msg=${msg}, taskId=${taskId}`);
      throw new Error(msg || 'Query failed');
    }

    if (!data || !data.state) {
      throw new Error('Invalid response: missing data or state');
    }

    // 根据 state 字段映射任务状态
    // wait, queueing, generating -> pending
    // success -> success
    // fail -> failed
    let taskStatus: AITaskStatus;
    switch (data.state) {
      case 'wait':
      case 'queueing':
      case 'generating':
        taskStatus = AITaskStatus.PENDING;
        break;
      case 'success':
        taskStatus = AITaskStatus.SUCCESS;
        break;
      case 'fail':
        taskStatus = AITaskStatus.FAILED;
        break;
      default:
        taskStatus = AITaskStatus.PENDING;
    }

    // 构建返回结果
    const result: AITaskResult = {
      taskStatus,
      taskId: data.taskId,
      taskInfo: {
        status: data.state,
        createTime: data.generateTime ? new Date(data.generateTime) : undefined,
        errorCode: data.failCode?.toString(),
        errorMessage: data.failMsg,
      },
    };

    // 如果成功，添加视频信息
    if (taskStatus === AITaskStatus.SUCCESS && data.videoInfo) {
      result.taskResult = {
        videoInfo: {
          videoId: data.videoInfo.videoId,
          videoUrl: data.videoInfo.videoUrl,
          imageUrl: data.videoInfo.imageUrl,
        },
      };

      // 如果配置了自定义存储，保存视频
      if (this.configs.customStorage && data.videoInfo.videoUrl) {
        const filesToSave: AIFile[] = [
          {
            url: data.videoInfo.videoUrl,
            contentType: 'video/mp4',
            key: `kie/video/${getUuid()}.mp4`,
            type: 'video',
          },
        ];

        const uploadedFiles = await saveFiles(filesToSave);
        if (uploadedFiles && uploadedFiles.length > 0) {
          result.taskResult.videoInfo.videoUrl = uploadedFiles[0].url;
        }
      }
    }

    return result;
  }

  // query task
  async query({
    taskId,
    mediaType,
  }: {
    taskId: string;
    mediaType?: AIMediaType;
  }): Promise<AITaskResult> {
    if (mediaType === AIMediaType.IMAGE) {
      return this.queryImage({ taskId });
    }

    if (mediaType === AIMediaType.VIDEO) {
      return this.queryVideo({ taskId });
    }

    const apiUrl = `${this.baseUrl}/generate/record-info?taskId=${taskId}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    const resp = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });
    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const { code, msg, data } = await resp.json();

    if (code !== 200) {
      throw new Error(msg);
    }

    if (!data || !data.status) {
      throw new Error(`query failed`);
    }

    const songs: AISong[] = data?.response?.sunoData?.map((song: any) => ({
      id: song.id,
      createTime: new Date(song.createTime),
      audioUrl: song.audioUrl,
      imageUrl: song.imageUrl,
      duration: song.duration,
      prompt: song.prompt,
      title: song.title,
      tags: song.tags,
      style: song.style,
      model: song.modelName,
      artist: song.artist,
      album: song.album,
    }));

    const taskStatus = this.mapStatus(data.status);

    // save files if custom storage is enabled
    if (
      taskStatus === AITaskStatus.SUCCESS &&
      songs &&
      songs.length > 0 &&
      this.configs.customStorage
    ) {
      const audioFilesToSave: AIFile[] = [];
      const imageFilesToSave: AIFile[] = [];

      songs.forEach((song, index) => {
        if (song.audioUrl) {
          audioFilesToSave.push({
            url: song.audioUrl,
            contentType: 'audio/mpeg',
            key: `kie/audio/${getUuid()}.mp3`,
            index: index,
            type: 'audio',
          });
        }
        if (song.imageUrl) {
          imageFilesToSave.push({
            url: song.imageUrl,
            contentType: 'image/png',
            key: `kie/image/${getUuid()}.png`,
            index: index,
            type: 'image',
          });
        }
      });

      if (audioFilesToSave.length > 0) {
        const uploadedFiles = await saveFiles(audioFilesToSave);
        if (uploadedFiles) {
          uploadedFiles.forEach((file: AIFile) => {
            if (file && file.url && songs && file.index !== undefined) {
              const song = songs[file.index];
              song.audioUrl = file.url;
            }
          });
        }
      }

      if (imageFilesToSave.length > 0) {
        const uploadedFiles = await saveFiles(imageFilesToSave);
        if (uploadedFiles) {
          uploadedFiles.forEach((file: AIFile) => {
            if (file && file.url && songs && file.index !== undefined) {
              const song = songs[file.index];
              song.imageUrl = file.url;
            }
          });
        }
      }
    }

    return {
      taskId,
      taskStatus,
      taskInfo: {
        songs,
        status: data.status,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        createTime: new Date(data.createTime),
      },
      taskResult: data,
    };
  }

  // map image task status
  private mapImageStatus(status: string): AITaskStatus {
    switch (status) {
      case 'waiting':
        return AITaskStatus.PENDING;
      case 'queuing':
        return AITaskStatus.PENDING;
      case 'generating':
        return AITaskStatus.PROCESSING;
      case 'success':
        return AITaskStatus.SUCCESS;
      case 'fail':
        return AITaskStatus.FAILED;
      default:
        throw new Error(`unknown status: ${status}`);
    }
  }

  // map music task status
  private mapStatus(status: string): AITaskStatus {
    switch (status) {
      case 'PENDING':
        return AITaskStatus.PENDING;
      case 'TEXT_SUCCESS':
        return AITaskStatus.PROCESSING;
      case 'FIRST_SUCCESS':
        return AITaskStatus.PROCESSING;
      case 'SUCCESS':
        return AITaskStatus.SUCCESS;
      case 'CREATE_TASK_FAILED':
      case 'GENERATE_AUDIO_FAILED':
      case 'CALLBACK_EXCEPTION':
      case 'SENSITIVE_WORD_ERROR':
        return AITaskStatus.FAILED;
      default:
        throw new Error(`unknown status: ${status}`);
    }
  }
}
