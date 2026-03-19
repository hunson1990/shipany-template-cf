'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { RiImageAddLine, RiMagicLine, RiCoinsLine } from 'react-icons/ri';
import { ZoomIn, Trash2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { ModelSelector } from '../model-selector';
import ImageEditModal from '../image-edit-modal';
import { useImageUpload } from '@/shared/context/ImageUploadContext';
import { ImageToVideoModels } from '@/lib/image-to-video/constants';
import { calculateRequiredCredits } from '@/lib/image-to-video/credits';
import type { ModelOption } from '@/types/image-to-video';
import { toast } from 'sonner';

const MODELS: ModelOption[] = Object.values(ImageToVideoModels);

export function GenerationControlMobile({
  onGenerationComplete,
}: {
  onGenerationComplete?: () => void;
}) {
  const { imageFile, imagePreviewUrl, shouldOpenEditModal, initialPrompt, deviceType, closeEditModal } = useImageUpload();
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODELS[0]);
  const [prompt, setPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreviewUrlState, setImagePreviewUrlState] = useState<string>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [resolution, setResolution] = useState<string>(selectedModel.resolution[0]);
  const [duration, setDuration] = useState<number>(selectedModel.duration[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [costCredits, setCostCredits] = useState<number>(0);

  // Update cost credits when model, resolution, or duration change
  useEffect(() => {
    const newCost = calculateRequiredCredits(selectedModel, resolution, duration);
    setCostCredits(newCost);
  }, [selectedModel, resolution, duration]);

  // Open edit modal when coming from homepage (only on mobile)
  useEffect(() => {
    if (shouldOpenEditModal && deviceType === 'mobile' && imageFile && imagePreviewUrl) {
      setIsEditModalOpen(true);
      setPendingImageFile(imageFile);
      setPrompt(initialPrompt);
    }
  }, [shouldOpenEditModal, deviceType, imageFile, imagePreviewUrl, initialPrompt]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingImageFile(file);
      setIsEditModalOpen(true);
    }
  };

  const handleModelChange = (model: ModelOption) => {
    setSelectedModel(model);
    setResolution(model.resolution[0]);
    setDuration(model.duration[0]);
  };

  const handleEditConfirm = async (processedFile: File) => {
    // Close modal immediately
    setIsEditModalOpen(false);
    closeEditModal();
    setPendingImageFile(null);

    // Show preview and start uploading
    const previewUrl = URL.createObjectURL(processedFile);
    setImagePreviewUrlState(previewUrl);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('files', processedFile);

      const response = await fetch('/api/storage/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const result = await response.json();
      if (result.code !== 0 || !result.data?.urls?.length) {
        throw new Error(result.message || 'Upload failed');
      }

      const uploadedUrl = result.data.urls[0];
      // 只有上传成功后才设置 uploadedImage，这样生成时才会用远程 URL
      setUploadedImage(processedFile);
      setImagePreviewUrlState(uploadedUrl);
      toast.success('Image uploaded successfully');
      console.log('Processed image uploaded:', uploadedUrl);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
      // Reset on error
      setImagePreviewUrlState('');
      setUploadedImage(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditClose = () => {
    setIsEditModalOpen(false);
    setPendingImageFile(null);
  };

  const handleImageDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadedImage(null);
    setImagePreviewUrlState('');
  };

  const handleImagePreview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (imagePreviewUrlState) {
      setShowImagePreview(true);
    }
  };

  const handleCreate = async () => {
    if (!uploadedImage || !prompt.trim()) return;

    setIsCreating(true);

    const generationParams = {
      model: selectedModel,
      prompt,
      image: uploadedImage,
      imageUrl: imagePreviewUrl,
      resolution,
      duration,
    };

    console.log('Create with:', generationParams);

    // Call API to generate video
    if (selectedModel.platform === 'kie') {
      try {
        const response = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider: 'kie',
            mediaType: 'video',
            model: selectedModel.id,
            prompt,
            scene: 'image-to-video',
            options: {
              resolution,
              duration,
              imageUrl: imagePreviewUrlState,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();
        if (result.code === 0) {
          toast.success('Video generation started');
          console.log('Generation task created:', result.data);
          // Call the callback to switch to history tab
          onGenerationComplete?.();
        } else {
          throw new Error(result.message || 'Generation failed');
        }
      } catch (error) {
        console.error('Generation failed:', error);
        toast.error(error instanceof Error ? error.message : 'Generation failed');
      } finally {
        setIsCreating(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-4 flex-1 overflow-y-auto">
        {/* Model Selection */}
        <div>
          <label className="text-sm font-medium block mb-1">Model</label>
          <ModelSelector
            models={MODELS}
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            dropdownDirection="down"
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="text-sm font-medium block mb-1">Image</label>
          <div
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg text-center hover:border-primary/50 transition-colors cursor-pointer relative overflow-hidden w-full h-40 bg-muted/10"
            onClick={() => !isUploading && !imagePreviewUrlState && document.getElementById('image-input-mobile')?.click()}
          >
            {isUploading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm">Uploading...</span>
              </div>
            )}

            {imagePreviewUrlState ? (
              <div className="relative w-full h-full group">
                <img
                  src={imagePreviewUrlState}
                  alt="Uploaded"
                  className="w-full h-full object-contain"
                />
                {/* Image operation buttons */}
                {!isUploading && (
                  <div
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex space-x-2 opacity-100 transition-opacity z-40"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={handleImagePreview}
                      className="bg-black/70 hover:bg-black/90 text-white border-0 w-8 h-8 z-50"
                      title="Zoom to view"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={handleImageDelete}
                      className="bg-black/70 hover:bg-black/90 text-white border-0 w-8 h-8 z-50"
                      title="Delete image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <RiImageAddLine className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload an image</p>
              </div>
            )}
            <input
              id="image-input-mobile"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
              disabled={isUploading}
            />
          </div>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Upload JPG/PNG/WEBP images up to 10MB, with a minimum width/height of 300px.
          </p>
        </div>

        {/* Prompt */}
        <div>
          <label className="text-sm font-medium block mb-1">Prompt</label>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What do you want to create with this image?"
              className="w-full bg-muted/20 border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              rows={4}
            />
            <span className="absolute bottom-2 right-3 text-xs text-muted-foreground/60">
              {prompt.length} / 2000
            </span>
          </div>
        </div>

        {/* Resolution */}
        <div>
          <label className="text-sm font-medium block mb-1">Resolution</label>
          <div className="flex gap-2">
            {selectedModel.resolution.map((res) => (
              <Button
                key={res}
                variant={resolution === res ? "default" : "outline"}
                size="sm"
                onClick={() => setResolution(res)}
                className="flex-1 text-xs"
              >
                {res}
              </Button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="text-sm font-medium block mb-1">Duration</label>
          <div className="flex gap-2">
            {selectedModel.duration.map((dur) => (
              <Button
                key={dur}
                variant={duration === dur ? "default" : "outline"}
                size="sm"
                onClick={() => setDuration(dur)}
                className="flex-1 text-xs"
              >
                {dur}s
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section - Credits and Create Button (Fixed) */}
      <div className="fixed bottom-0 left-0 right-0 p-3 space-y-2 border-t border-border bg-background">
        {/* Credits */}
        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
          <div className="flex items-center gap-2">
            <RiCoinsLine className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-muted-foreground/90">Credits required:</span>
          </div>
          <span className="text-sm font-medium text-muted-foreground/90">{costCredits} Credits</span>
        </div>

        {/* Create Button */}
        <Button
          onClick={handleCreate}
          disabled={!uploadedImage || !prompt.trim() || isUploading || isCreating}
          className="w-full bg-primary hover:bg-primary/90 text-white h-10"
        >
          <RiMagicLine className="w-4 h-4 mr-2" />
          {isCreating ? 'Creating...' : 'Create'}
        </Button>
      </div>

      {/* Image Edit Modal */}
      <ImageEditModal
        isOpen={isEditModalOpen}
        imageFile={pendingImageFile}
        existingImageUrl={pendingImageFile ? undefined : imagePreviewUrl}
        onClose={handleEditClose}
        onConfirm={handleEditConfirm}
      />

      {/* Image zoom preview modal */}
      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-4">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center max-h-[80vh]">
            <img
              src={imagePreviewUrlState}
              alt="Image preview"
              className="max-w-full max-h-full object-contain rounded-md"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
