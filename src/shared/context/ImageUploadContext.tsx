'use client';

import React, { createContext, useContext, useState } from 'react';

interface ImageUploadContextType {
  imageFile: File | null;
  imagePreviewUrl: string | null;
  setImageData: (file: File | null, previewUrl: string | null) => void;
  clearImageData: () => void;
}

const ImageUploadContext = createContext<ImageUploadContextType | undefined>(undefined);

export function ImageUploadProvider({ children }: { children: React.ReactNode }) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const setImageData = (file: File | null, previewUrl: string | null) => {
    setImageFile(file);
    setImagePreviewUrl(previewUrl);
  };

  const clearImageData = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImageFile(null);
    setImagePreviewUrl(null);
  };

  return (
    <ImageUploadContext.Provider value={{ imageFile, imagePreviewUrl, setImageData, clearImageData }}>
      {children}
    </ImageUploadContext.Provider>
  );
}

export function useImageUpload() {
  const context = useContext(ImageUploadContext);
  if (context === undefined) {
    throw new Error('useImageUpload must be used within ImageUploadProvider');
  }
  return context;
}
