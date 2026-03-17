"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/shared/components/ui/drawer";
import { Button } from "@/shared/components/ui/button";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import Cropper from 'react-easy-crop';

interface ImageEditModalProps {
  isOpen: boolean;
  imageFile: File | null;
  existingImageUrl?: string;
  onClose: () => void;
  onConfirm: (processedFile: File) => void;
}

interface AspectRatio {
  name: string;
  ratio: number;
}

const aspectRatios: AspectRatio[] = [
  { name: "Original", ratio: 0 },
  { name: "1:1", ratio: 1 },
  { name: "16:9", ratio: 16/9 },
  { name: "9:16", ratio: 9/16 },
  { name: "4:3", ratio: 4/3 },
  { name: "3:4", ratio: 3/4 },
];

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

function ImageEditModal({ isOpen, imageFile, existingImageUrl, onClose, onConfirm }: ImageEditModalProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [customRatio, setCustomRatio] = useState<number>(1);
  const [originalRatio, setOriginalRatio] = useState<number>(1);
  const [selectedRatioName, setSelectedRatioName] = useState<string>("Original");
  const [imageUrl, setImageUrl] = useState<string>('');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropData | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen) {
      let url = '';

      if (existingImageUrl) {
        url = existingImageUrl;
        setImageUrl(url);

        const img = new Image();
        img.onload = () => {
          const imageRatio = img.naturalWidth / img.naturalHeight;
          setOriginalRatio(imageRatio);

          let closestRatio: AspectRatio | null = null;
          let minDifference = Infinity;

          aspectRatios.forEach(ratio => {
            if (ratio.name !== "Original") {
              const difference = Math.abs(imageRatio - ratio.ratio);
              if (difference < minDifference) {
                minDifference = difference;
                closestRatio = ratio;
              }
            }
          });

          if (closestRatio && minDifference < 0.05) {
            setCustomRatio((closestRatio as AspectRatio).ratio);
            setSelectedRatioName((closestRatio as AspectRatio).name);
          } else {
            setCustomRatio(imageRatio);
            setSelectedRatioName("Original");
          }
        };
        img.src = url;
      } else if (imageFile) {
        url = URL.createObjectURL(imageFile);
        setImageUrl(url);

        const img = new Image();
        img.onload = () => {
          const imageRatio = img.naturalWidth / img.naturalHeight;
          setOriginalRatio(imageRatio);

          let closestRatio: AspectRatio | null = null;
          let minDifference = Infinity;

          aspectRatios.forEach(ratio => {
            if (ratio.name !== "Original") {
              const difference = Math.abs(imageRatio - ratio.ratio);
              if (difference < minDifference) {
                minDifference = difference;
                closestRatio = ratio;
              }
            }
          });

          if (closestRatio && minDifference < 0.05) {
            setCustomRatio((closestRatio as AspectRatio).ratio);
            setSelectedRatioName((closestRatio as AspectRatio).name);
          } else {
            setCustomRatio(imageRatio);
            setSelectedRatioName("Original");
          }
        };
        img.src = url;

        return () => URL.revokeObjectURL(url);
      }
    }
  }, [imageFile, existingImageUrl, isOpen]);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: CropData) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleReset = () => {
    setZoom(1);
    setCrop({ x: 0, y: 0 });

    let closestRatio: AspectRatio | null = null;
    let minDifference = Infinity;

    aspectRatios.forEach(ratio => {
      if (ratio.name !== "Original") {
        const difference = Math.abs(originalRatio - ratio.ratio);
        if (difference < minDifference) {
          minDifference = difference;
          closestRatio = ratio;
        }
      }
    });

    if (closestRatio && minDifference < 0.05) {
      setCustomRatio((closestRatio as AspectRatio).ratio);
      setSelectedRatioName((closestRatio as AspectRatio).name);
    } else {
      setCustomRatio(originalRatio);
      setSelectedRatioName("Original");
    }
  };

  const createCroppedImage = useCallback(async (): Promise<File | null> => {
    if (!imageFile || !croppedAreaPixels || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;

        ctx.drawImage(
          img,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          croppedAreaPixels.width,
          croppedAreaPixels.height
        );

        canvas.toBlob((blob) => {
          if (blob) {
            const processedFile = new File([blob], imageFile.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(processedFile);
          } else {
            resolve(null);
          }
        }, 'image/jpeg', 0.9);
      };

      img.src = imageUrl;
    });
  }, [imageFile, croppedAreaPixels, imageUrl]);

  const handleConfirm = async () => {
    const croppedImage = await createCroppedImage();
    if (croppedImage) {
      onConfirm(croppedImage);
    }
  };

  if (!imageFile && !existingImageUrl) return null;

  const renderContent = () => (
    <>
      <div className="text-sm md:text-sm text-xs text-gray-400">
        The image directly affects video quality. Please choose a clear, relevant image, 10MB max file size, 300px min dimension.
      </div>

      <div className="flex flex-col space-y-4 mt-2">
        <div className="relative bg-black rounded-lg overflow-hidden w-full h-[300px]">
          {imageUrl && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={customRatio > 0 ? customRatio : 1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              cropShape="rect"
              showGrid={true}
              style={{
                containerStyle: {
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#000000'
                },
                cropAreaStyle: {
                  border: '1px solid white'
                }
              }}
            />
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
              style={{
                background: 'rgba(209, 213, 219, 0.3)',
                WebkitAppearance: 'none',
              } as any}
            />
            <span className="text-sm w-12 text-right">{zoom.toFixed(1)}x</span>
          </div>

          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium">Aspect Ratio</label>
            <input
              type="range"
              min={0.5}
              max={2.5}
              step={0.01}
              value={customRatio}
              onChange={(e) => {
                const newRatio = Number(e.target.value);
                setCustomRatio(newRatio);
                const matchedPreset = aspectRatios.find(r =>
                  r.name !== "Original" && Math.abs(newRatio - r.ratio) < 0.01
                );
                if (matchedPreset) {
                  setSelectedRatioName(matchedPreset.name);
                } else if (Math.abs(newRatio - originalRatio) < 0.01) {
                  setSelectedRatioName("Original");
                } else {
                  setSelectedRatioName("");
                }
              }}
              className="flex-1 h-1 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
              style={{
                background: 'rgba(209, 213, 219, 0.3)',
                WebkitAppearance: 'none',
              } as any}
            />
            <span className="text-sm w-12 text-right">{customRatio.toFixed(2)}</span>
          </div>

          <div className="space-y-2">
            <div className="flex space-x-1 md:space-x-2 overflow-x-auto">
              {aspectRatios.map((ratio) => {
                const isSelected = ratio.name === "Original"
                  ? selectedRatioName === "Original"
                  : selectedRatioName === ratio.name && Math.abs(customRatio - ratio.ratio) < 0.01;

                return (
                  <button
                    key={ratio.name}
                    onClick={() => {
                      if (ratio.name === "Original") {
                        setCustomRatio(originalRatio);
                        setSelectedRatioName("Original");
                      } else {
                        setCustomRatio(ratio.ratio);
                        setSelectedRatioName(ratio.name);
                      }
                    }}
                    className={`
                      flex flex-col items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-lg border transition-colors flex-shrink-0
                      ${isSelected
                        ? 'border-primary bg-primary/20'
                        : 'border-primary/40 hover:border-primary/60'}
                    `}
                  >
                    <div
                      className="bg-primary/60 rounded-sm"
                      style={{
                        width: `${(() => {
                          const currentRatio = ratio.name === "Original" ? originalRatio : ratio.ratio;
                          const maxSize = 20;
                          if (currentRatio >= 1) {
                            return maxSize;
                          } else {
                            return maxSize * currentRatio;
                          }
                        })()}px`,
                        height: `${(() => {
                          const currentRatio = ratio.name === "Original" ? originalRatio : ratio.ratio;
                          const maxSize = 20;
                          if (currentRatio >= 1) {
                            return maxSize / currentRatio;
                          } else {
                            return maxSize;
                          }
                        })()}px`
                      }}
                    ></div>
                    <span className="text-xs mt-1">{ratio.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {isDesktop && (
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button onClick={handleConfirm}>
              Confirm
            </Button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[650px] max-w-[650px] h-[90vh] overflow-hidden p-6">
          <DialogHeader>
            <DialogTitle>Edit uploaded images</DialogTitle>
          </DialogHeader>
          {renderContent()}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={onClose} snapPoints={[1]} fadeFromIndex={0}>
      <DrawerContent className="overflow-hidden !max-h-[96vh] !mt-0">
        <DrawerHeader>
          <DrawerTitle>Edit uploaded images</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 flex-1 overflow-y-auto">
          {renderContent()}
        </div>
        <DrawerFooter className="pt-4 space-y-2">
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              Reset
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              Confirm
            </Button>
          </div>
          <DrawerClose asChild>
            {/* <Button variant="outline" className="w-full">Close</Button> */}
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export default ImageEditModal;
