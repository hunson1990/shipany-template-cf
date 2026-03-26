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

 if (!params.prompt && !params.options?.imageUrl) {
 throw new Error('prompt or imageUrl is required');
 }

 const apiUrl = `${this.getBaseUrl()}/video/generate`;

 const payload: any = {
 model: params.model,
 prompt: params.prompt || '',
 callBackUrl: params.callbackUrl,
 };

 if (params.options) {
 payload.resolution = params.options.resolution;
 payload.duration = params.options.duration;
 payload.aspectRatio = params.options.aspectRatio;
 payload.imageUrl = params.options.imageUrl;
 payload.endFrame = params.options.endFrame;
 payload.waterMark = params.options.waterMark || '';
 payload.modelBrand = params.options.modelBrand;
 payload.modelVersion = params.options.modelVersion;
 }

 const resp = await fetch(apiUrl, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 Authorization: `Bearer ${this.configs.apiKey}`,
 },
 body: JSON.stringify(payload),
 });

 if (!resp.ok) {
 throw new Error(`request failed with status: ${resp.status}`);
 }

 const data = await resp.json();

 if (!data?.data?.taskId) {
 throw new Error(data?.msg || 'generate video failed: no taskId');
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

 const apiUrl = `${this.getBaseUrl()}/video/recordInfo?taskId=${encodeURIComponent(taskId)}`;

 const resp = await fetch(apiUrl, {
 method: 'GET',
 headers: {
 'Content-Type': 'application/json',
 Authorization: `Bearer ${this.configs.apiKey}`,
 },
 });

 if (!resp.ok) {
 throw new Error(`request failed with status: ${resp.status}`);
 }

 const data = await resp.json();

 const taskStatus = this.mapStatus(data);

 let videos: AIVideo[] | undefined = undefined;

 if (taskStatus === AITaskStatus.SUCCESS) {
 const videoUrls = this.extractVideoUrls(data);
 videos = videoUrls.map((videoUrl) => ({
 id: '',
 createTime: new Date(),
 videoUrl,
 }));

 if (this.configs.customStorage && videos.length >0) {
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

 if (filesToSave.length >0) {
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
 status: data?.data?.status || data?.status || '',
 errorCode: data?.code ? String(data.code) : '',
 errorMessage: data?.msg || data?.message || '',
 createTime: new Date(),
 },
 taskResult: data,
 };
 }

 private getBaseUrl(): string {
 const baseUrl = this.configs.baseUrl || '';
 if (!baseUrl) {
 throw new Error('pollo baseUrl is required');
 }

 return baseUrl.replace(/\/$/, '');
 }

 private mapStatus(data: any): AITaskStatus {
 const status = String(data?.data?.status || data?.status || '').toLowerCase();

 if (data?.code && Number(data.code) !==200) {
 return AITaskStatus.FAILED;
 }

 switch (status) {
 case 'success':
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
