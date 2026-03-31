import { inngest, uploadToR2Function } from '@/lib/inngest';
import { serve } from 'inngest/next';

// Create an API that serves Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [uploadToR2Function],
});
