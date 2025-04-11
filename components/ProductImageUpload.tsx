'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { ImageIcon, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProductImageUploadProps {
  onImageUpload: (base64Image: string) => void;
  className?: string;
}

export default function ProductImageUpload({ onImageUpload, className }: ProductImageUploadProps) {
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Image = event.target?.result as string;
      setImage(base64Image);
      onImageUpload(base64Image);
      setIsLoading(false);
    };

    reader.onerror = () => {
      setIsLoading(false);
      alert('이미지 업로드 중 오류가 발생했습니다.');
    };

    reader.readAsDataURL(file);
  }, [onImageUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    if (!file.type.includes('image')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Image = event.target?.result as string;
      setImage(base64Image);
      onImageUpload(base64Image);
      setIsLoading(false);
    };

    reader.onerror = () => {
      setIsLoading(false);
      alert('이미지 업로드 중 오류가 발생했습니다.');
    };

    reader.readAsDataURL(file);
  }, [onImageUpload]);

  const handleRemoveImage = useCallback(() => {
    setImage(null);
    onImageUpload('');
  }, [onImageUpload]);

  return (
    <div className={cn('mb-4', className)}>
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium text-gray-700">
          제품 이미지 (트라이온)
        </label>
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="relative flex flex-col items-center justify-center w-full h-32 p-4 border-2 border-dashed rounded-md cursor-pointer border-gray-300 hover:border-gray-400"
        >
          {image ? (
            <div className="relative w-full h-full">
              <Image
                src={image}
                alt="Uploaded product"
                fill
                className="object-contain rounded-md"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-0 right-0 w-6 h-6 p-0"
                onClick={handleRemoveImage}
              >
                ✕
              </Button>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mb-2 text-gray-400" />
              <p className="text-sm font-medium text-gray-500">
                {isLoading ? '이미지 업로드 중...' : '이미지를 드래그하거나 클릭하여 업로드하세요'}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                제품 이미지는 최대 5MB, JPG, PNG 형식을 지원합니다
              </p>
            </>
          )}
          <input
            type="file"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleImageUpload}
            accept="image/*"
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
} 