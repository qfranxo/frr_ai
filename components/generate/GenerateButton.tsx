'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUser } from '@clerk/nextjs';

interface GenerateButtonProps {
  prompt: string;
  style: string;
  size: string;
  gender: string;
  age: string;
  ratio: string;
  renderStyle: string;
  cameraDistance?: string;
  clothing?: string;
  hair?: string;
  eyes?: string;
  background?: string;
  skinType?: string;
  eyeColor?: string;
  hairStyle?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
  mode?: 'generate' | 'save';
  generatedImageUrl?: string;
}

export const GenerateButton = ({
  prompt,
  style,
  size,
  gender,
  age,
  ratio,
  renderStyle,
  cameraDistance,
  clothing,
  hair,
  eyes,
  background,
  skinType,
  eyeColor,
  hairStyle,
  onSuccess,
  onError,
  mode = 'generate',
  generatedImageUrl
}: GenerateButtonProps) => {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleGenerate = async () => {
    if (!user) {
      toast.error("Login required.");
      return;
    }

    if (!prompt.trim()) {
      toast.error("Please enter a prompt.");
      return;
    }

    if (!gender) {
      toast.error("Please select a gender.");
      return;
    }

    if (!age) {
      toast.error("Please select an age group.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          style,
          size,
          gender,
          age,
          ratio,
          renderStyle,
          cameraDistance,
          clothing,
          hair,
          eyes,
          background,
          skinType,
          eyeColor,
          hairStyle,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Image generation failed.');
      }

      toast.success("Image generated successfully!");
      onSuccess?.(result);
    } catch (error) {
      console.error('Image generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Image generation failed.');
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Login required.");
      return;
    }

    if (!generatedImageUrl) {
      toast.error("No image to save.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          imageUrl: generatedImageUrl,
          prompt,
          aspectRatio: ratio,
          renderingStyle: renderStyle,
          gender,
          age,
          background,
          skinType,
          eyeColor,
          hairStyle,
          isShared: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save image.');
      }

      setSuccess(true);
      toast.success("Image saved successfully!");
    } catch (error) {
      console.error('Image saving error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save image.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = mode === 'generate' ? handleGenerate : handleSave;

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {mode === 'generate' ? 'Generating...' : 'Saving...'}
        </>
      ) : success ? (
        'Saved!'
      ) : (
        mode === 'generate' ? 'Generate Image' : 'Save Result'
      )}
    </Button>
  );
};
