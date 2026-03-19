'use client';

import React, { createContext, useContext, useState } from 'react';

interface ImageUploadContextType {
  imageFile: File | null;
  imagePreviewUrl: string | null;
  shouldOpenEditModal: boolean;
  initialPrompt: string;
  deviceType: 'pc' | 'mobile' | null;
  setImageData: (file: File | null, previewUrl: string | null) => void;
  clearImageData: () => void;
  openEditModal: (prompt: string, device: 'pc' | 'mobile') => void;
  closeEditModal: () => void;
}

const ImageUploadContext = createContext<ImageUploadContextType | undefined>(undefined);

export function ImageUploadProvider({ children }: { children: React.ReactNode }) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [shouldOpenEditModal, setShouldOpenEditModal] = useState(false);
  const [initialPrompt, setInitialPromptState] = useState('');
  const [deviceType, setDeviceType] = useState<'pc' | 'mobile' | null>(null);

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

  const openEditModal = (prompt: string, device: 'pc' | 'mobile') => {
    setInitialPromptState(prompt);
    setDeviceType(device);
    setShouldOpenEditModal(true);
  };

  const closeEditModal = () => {
    setShouldOpenEditModal(false);
    setDeviceType(null);
  };

  return (
    <ImageUploadContext.Provider
      value={{
        imageFile,
        imagePreviewUrl,
        shouldOpenEditModal,
        initialPrompt,
        deviceType,
        setImageData,
        clearImageData,
        openEditModal,
        closeEditModal,
      }}
    >
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
