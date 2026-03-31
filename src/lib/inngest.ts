import { Inngest } from 'inngest';

import { R2Provider } from '@/extensions/storage';
import { getAllConfigs } from '@/shared/models/config';

// Create a client to send and receive events
export const inngest = new Inngest({
  id: 'soul-fuse',
  eventKey: process.env.INNGEST_EVENT_KEY,
  isDev: process.env.NODE_ENV === 'development',
});

// Define the upload to R2 function
export const uploadToR2Function = inngest.createFunction(
  {
    id: 'upload-video-to-r2',
    name: 'Upload Video to R2',
    retries: 3,
    concurrency: {
      limit: 5,
    },
    triggers: [{ event: 'ai/video.upload-to-r2' }],
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ({ event, step }: any) => {
    const { videoUrl, taskId, mediaType } = event.data;

    console.log(
      `[Inngest] Starting upload for task ${taskId}, URL: ${videoUrl}`
    );

    try {
      // Step 1: Get R2 config from database
      const r2Provider = await step.run('get-r2-config', async () => {
        const configs = await getAllConfigs();

        if (
          !configs.r2_access_key ||
          !configs.r2_secret_key ||
          !configs.r2_bucket_name
        ) {
          throw new Error('R2 is not configured in database');
        }

        const accountId = configs.r2_account_id || '';

        return new R2Provider({
          accountId: accountId,
          accessKeyId: configs.r2_access_key,
          secretAccessKey: configs.r2_secret_key,
          bucket: configs.r2_bucket_name,
          uploadPath: configs.r2_upload_path || 'ai-media',
          region: 'auto',
          endpoint: configs.r2_endpoint,
          publicDomain: configs.r2_domain,
        });
      });

      // Step 2: Download from third-party URL and upload to R2
      const uploadResult = await step.run('download-and-upload', async () => {
        const fileExt = mediaType === 'video' ? 'mp4' : 'jpg';
        const key = `${mediaType}/${taskId}.${fileExt}`;

        console.log(
          `[Inngest] Downloading from ${videoUrl} and uploading to R2 as ${key}`
        );

        const result = await r2Provider.downloadAndUpload({
          url: videoUrl,
          key,
          contentType: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
        });

        if (!result.success) {
          throw new Error(`Upload failed: ${result.error}`);
        }

        console.log(`[Inngest] Uploaded to R2: ${result.url}`);
        return result.url!;
      });

      // Step 3: Update database
      await step.run('update-database', async () => {
        const internalSecret = process.env.INTERNAL_API_SECRET;

        if (!internalSecret) {
          throw new Error('INTERNAL_API_SECRET is not configured');
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/internal/r2-uploaded`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${internalSecret}`,
            },
            body: JSON.stringify({
              taskId,
              r2Url: uploadResult,
              mediaType,
              status: 'completed',
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to update database: ${response.status}`);
        }

        console.log(`[Inngest] Database updated for task ${taskId}`);
      });

      return {
        success: true,
        taskId,
        r2Url: uploadResult,
      };
    } catch (error: any) {
      console.error(`[Inngest] Upload failed for task ${taskId}:`, error);

      // Update database with failure status
      await step.run('update-failure', async () => {
        const internalSecret = process.env.INTERNAL_API_SECRET;
        if (!internalSecret) {
          console.error(
            'INTERNAL_API_SECRET is not configured, cannot report failure'
          );
          return;
        }

        await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/internal/r2-uploaded`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${internalSecret}`,
            },
            body: JSON.stringify({
              taskId,
              status: 'failed',
              errorMessage: error.message,
            }),
          }
        );
      });

      throw error;
    }
  }
);
