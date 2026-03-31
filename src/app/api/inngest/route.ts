import { serve } from 'inngest/next';
import { inngest, uploadToR2Function } from '@/lib/inngest';

// Create an API that serves Inngest functions
export const { GET, POST } = serve({
  client: inngest,
  functions: [uploadToR2Function],
});
