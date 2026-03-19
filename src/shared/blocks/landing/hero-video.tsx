'use client';

import { useState } from 'react';
import { useRouter } from '@/core/i18n/navigation';
import { useImageUpload } from '@/shared/context/ImageUploadContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from '@/shared/components/ui/form';
import { toast } from 'sonner';

const formSchema = z.object({
  prompt: z.string().min(1, 'Please enter your idea'),
  model: z.string().min(1, 'Please select a model'),
  style: z.string().min(1, 'Please select a style'),
});

type FormValues = z.infer<typeof formSchema>;

interface HeroVideoProps {
  videoUrl?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  onSubmit?: (data: FormValues) => void;
  isLoading?: boolean;
  models?: Array<{ id: string; name: string }>;
  styles?: Array<{ id: string; name: string }>;
  hints?: Array<{ id: string; label: string; icon?: string }>;
  ctaText?: string;
}

export function HeroVideo({
  videoUrl = 'https://static.supermaker.ai/banner-3.mp4',
  title = 'Create Stunning Videos',
  subtitle = 'with AI Video Generator',
  description = 'Unlock your creative power with our leading AI Video Generator. Effortlessly craft exceptional videos through streamlined AI Workflows.',
  onSubmit,
  isLoading = false,
  models = [
    { id: 'ai-video', name: 'AI Video' },
    { id: 'ai-music', name: 'AI Music' },
  ],
  styles = [
    { id: 'basic', name: 'Basic' },
    { id: 'pro', name: 'Pro' },
    { id: 'premium', name: 'Premium' },
  ],
  hints = [
    { id: 'cinematic', label: 'Cinematic Product Ad', icon: '🎬' },
    { id: 'travel', label: 'Travel Aerial Narrative', icon: '✈️' },
    { id: 'action', label: 'Action/Sports', icon: '⚡' },
  ],
  ctaText = 'Generate',
}: HeroVideoProps) {
  const router = useRouter();
  const { setImageData, openEditModal } = useImageUpload();
  const [selectedHint, setSelectedHint] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: '',
      model: models[0]?.id || '',
      style: styles[0]?.id || '',
    },
  });

  const handleSubmit = (data: FormValues) => {
    if (!imagePreviewUrl || !selectedFile) {
      toast.error('Please upload an image first');
      return;
    }

    // Determine device type
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    const device = isDesktop ? 'pc' : 'mobile';

    // Store image data and open edit modal
    setImageData(selectedFile, imagePreviewUrl);
    openEditModal(data.prompt, device);

    // Navigate to /app
    router.push(`/app`);
  };

  const handleHintClick = (hintId: string) => {
    setSelectedHint(hintId);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create local preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
    setSelectedFile(file);
  };

  return (
    <div className="relative w-full overflow-hidden">
      <style>{`
        @keyframes gradientShift {
          0% {
            background-position: 0% center;
          }
          50% {
            background-position: 100% center;
          }
          100% {
            background-position: 0% center;
          }
        }

        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradientShift 3s ease infinite;
        }

        .hero-video-textarea {
          background-color: transparent;
          border: 2px solid hsl(var(--primary));
          color: white;
          font-size: 1rem;
          line-height: 1.5;
          padding: 0.75rem 1rem;
          resize: none;
          outline: none;
          font-family: inherit;
          border-radius: 0.5rem;
        }

        .hero-video-textarea::placeholder {
          color: rgb(107, 114, 128);
        }

        .hero-video-textarea:focus {
          outline: none;
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
        }
      `}</style>

      {/* Background Video */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/30 to-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-20 sm:px-6 lg:px-8">
        {/* Text Content */}
        <div className="mb-12 w-full text-center">
          <h1 className="mb-6 text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            {title}
          </h1>

          <p className="animate-gradient-shift bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-2xl font-bold text-transparent sm:text-3xl lg:text-4xl">
            {subtitle}
          </p>
        </div>

        {/* Form Card */}
        <div className="w-full rounded-lg bg-black/40 p-8 backdrop-blur-xl shadow-2xl">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              {/* Prompt Input */}
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex gap-3">
                        {/* Image Upload */}
                        <label className="flex h-full min-h-24 w-24 flex-shrink-0 cursor-pointer items-center justify-center rounded border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5 transition-colors overflow-hidden relative group">
                          {imagePreviewUrl ? (
                            <>
                              <img
                                src={imagePreviewUrl}
                                alt="Uploaded"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="text-center">
                                  <div className="text-2xl">+</div>
                                  <div className="text-xs text-gray-300 mt-1">Change</div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="text-center">
                              <div className="text-2xl">+</div>
                              <div className="text-xs text-gray-400 mt-1">Upload</div>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                          />
                        </label>

                        {/* Textarea */}
                        <textarea
                          placeholder="Type your idea, click 'Generate' to get a video"
                          {...field}
                          rows={4}
                          className="hero-video-textarea flex-1"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Model and Style Selects */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="w-40">
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="border-0 bg-gray-900/50 text-white">
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {models.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                {/* CTA Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-48 py-6 text-base font-semibold"
                >
                  {isLoading ? 'Generating...' : ctaText}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
