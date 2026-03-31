import { Inngest } from 'inngest';

// Create a client to send and receive events
export const inngest = new Inngest({
  id: 'soul-fuse',
  eventKey: process.env.INNGEST_EVENT_KEY,
});

// Define the upload to R2 function
export const uploadToR2Function = inngest.createFunction(
  {
    id: 'upload-video-to-r2',
    name: 'Upload Video to R2',
    retries: 3,
    concurrency: {
      limit: 5, // Limit concurrent uploads to avoid overwhelming R2
    },
  },
  { event: 'ai/video.upload-to-r2' },
  async ({ event, step }) => {
    const { videoUrl, taskId, mediaType } = event.data;

    console.log(
      `[Inngest] Starting upload for task ${taskId}, URL: ${videoUrl}`
    );

    try {
      // Step 1: Download from third-party URL
      const videoData = await step.run('download-video', async () => {
        const response = await fetch(videoUrl, {
          // Timeout for download
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to download video: ${response.status} ${response.statusText}`
          );
        }

        const contentLength = response.headers.get('content-length');
        console.log(`[Inngest] Downloaded video size: ${contentLength} bytes`);

        return response;
      });

      // Step 2: Upload to R2
      const r2Url = await step.run('upload-to-r2', async () => {
        const fileExt = mediaType === 'video' ? 'mp4' : 'jpg';
        const key = `ai-media/${mediaType}/${taskId}.${fileExt}`;

        const uploadResponse = await fetch(
          `${process.env.R2_UPLOAD_ENDPOINT}/${key}`,
          {
            method: 'PUT',
            body: videoData.body,
            headers: {
              'Content-Type':
                mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
              Authorization: `Bearer ${process.env.R2_UPLOAD_TOKEN}`,
            },
          }
        );

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload to R2: ${uploadResponse.status}`);
        }

        const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
        console.log(`[Inngest] Uploaded to R2: ${publicUrl}`);

        return publicUrl;
      });

      // Step 3: Update database
      await step.run('update-database', async () => {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/internal/r2-uploaded`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
            },
            body: JSON.stringify({
              taskId,
              r2Url,
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
        r2Url,
      };
    } catch (error: any) {
      console.error(`[Inngest] Upload failed for task ${taskId}:`, error);

      // Update database with failure status
      await step.run('update-failure', async () => {
        await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/internal/r2-uploaded`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
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

// Type definitions for events
declare module 'inngest' {
  interface Events {
    'ai/video.upload-to-r2': {
      data: {
        videoUrl: string;
        taskId: string;
        mediaType: 'video' | 'image';
      };
    };
  }
}
