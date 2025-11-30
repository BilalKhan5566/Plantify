import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Camera, Upload, Loader2 } from 'lucide-react';

interface IdentificationResult {
  commonName: string;
  scientificName: string;
  about: string;
  explanation: string;
  additionalInfo: string[];
  wateringFrequencyDays: number;
  probability: number;
}

interface PlantIdentifierProps {
  onIdentified: (result: IdentificationResult & { imageUrl: string }) => void;
}

const PlantIdentifier = ({ onIdentified }: PlantIdentifierProps) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    processImage(file);
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Wait for video to be ready
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      stream.getTracks().forEach((track) => track.stop());

      canvas.toBlob((blob) => {
        if (blob) {
          processImage(blob);
        }
      }, 'image/jpeg');
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Could not access camera');
    }
  };

  const processImage = async (file: File | Blob) => {
    setLoading(true);

    try {
      // Create preview and convert to base64 simultaneously
      const base64Promise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      const previewPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });

      const [base64, previewUrl] = await Promise.all([base64Promise, previewPromise]);
      setPreview(previewUrl);

      // Call edge function
      const { data, error } = await supabase.functions.invoke('identify-plant', {
        body: { imageBase64: base64 },
      });

      if (error) throw error;

      if (data && data.commonName) {
        toast.success('Plant identified!');
        onIdentified({
          ...data,
          imageUrl: previewUrl,
        });
      } else {
        toast.error('Could not identify plant');
      }
    } catch (error) {
      console.error('Identification error:', error);
      toast.error('Failed to identify plant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        {preview ? (
          <div className="space-y-4">
            <img
              src={preview}
              alt="Plant preview"
              className="w-full h-64 object-cover rounded-lg"
            />
            {loading && (
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2">Identifying plant...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Identify Your Plant</h3>
              <p className="text-muted-foreground text-sm">
                Upload a photo or take a picture to identify your plant
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-24 flex-col"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={loading}
              >
                <Upload className="h-8 w-8 mb-2" />
                <span>Upload Photo</span>
              </Button>
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              <Button
                variant="outline"
                className="h-24 flex-col"
                onClick={handleCameraCapture}
                disabled={loading}
              >
                <Camera className="h-8 w-8 mb-2" />
                <span>Take Photo</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlantIdentifier;
