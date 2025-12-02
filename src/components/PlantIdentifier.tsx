import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Camera, Upload, Loader2, Leaf } from 'lucide-react';
import CameraCapture from './CameraCapture';

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
  onError: (error: string) => void;
}

const PlantIdentifier = ({ onIdentified, onError }: PlantIdentifierProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [preview, setPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImage(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImage(file);
  };

  const handleCameraCapture = (blob: Blob) => {
    setShowCamera(false);
    processImage(blob);
  };

  const processImage = async (file: File | Blob) => {
    setLoading(true);
    setLoadingStep('Preparing image...');

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

      // Step 1: Verify if image contains a plant
      setLoadingStep('Checking if this is a plant...');
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-plant', {
        body: { imageBase64: base64 },
      });

      if (verifyError) {
        console.error('Verification error:', verifyError);
        // Continue anyway if verification fails
      } else if (verifyData && !verifyData.isPlant) {
        setLoading(false);
        setPreview(null);
        onError("Oops! This doesn't look like a plant. Please try again with a clear photo of a leaf or flower 🌿");
        return;
      }

      // Step 2: Call PlantID API
      setLoadingStep('Identifying plant...');
      const { data, error } = await supabase.functions.invoke('identify-plant', {
        body: { imageBase64: base64 },
      });

      if (error) throw error;

      // Check for low confidence response
      if (data && data.lowConfidence) {
        setLoading(false);
        setPreview(null);
        onError("I couldn't confidently recognize any plant in this photo 🌱. Try again with a clearer image.");
        return;
      }

      if (data && data.commonName) {
        toast.success('Plant identified!');
        onIdentified({
          ...data,
          imageUrl: previewUrl,
        });
      } else {
        onError("I couldn't confidently recognize any plant in this photo 🌱. Try again with a clearer image.");
      }
    } catch (error) {
      console.error('Identification error:', error);
      onError('Failed to identify plant. Please try again.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const resetState = () => {
    setPreview(null);
    setShowCamera(false);
    setLoading(false);
    setLoadingStep('');
  };

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  return (
    <Card className="w-full bg-card/90 backdrop-blur-md border-border/50 shadow-xl">
      <CardContent className="pt-6 pb-8">
        {preview && loading ? (
          <div className="space-y-4">
            <img
              src={preview}
              alt="Plant preview"
              className="w-full h-64 object-cover rounded-xl shadow-lg"
            />
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <div className="relative">
                <Leaf className="h-8 w-8 text-primary animate-pulse" />
                <Loader2 className="h-12 w-12 text-primary/30 animate-spin absolute -top-2 -left-2" />
              </div>
              <span className="text-muted-foreground text-sm">{loadingStep}</span>
            </div>
          </div>
        ) : (
          <div 
            className="space-y-6"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                <Leaf className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Identify Your Plant</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                Upload a photo, drag & drop, or take a picture to instantly identify any plant
              </p>
            </div>

            <div 
              className={`border-2 border-dashed rounded-xl p-6 transition-all duration-200 ${
                isDragging 
                  ? 'border-primary bg-primary/5 scale-[1.02]' 
                  : 'border-border/60 bg-background/30'
              }`}
            >
              {isDragging ? (
                <div className="flex flex-col items-center justify-center py-4 text-primary">
                  <Upload className="h-10 w-10 mb-2 animate-bounce" />
                  <span className="font-medium">Drop your image here</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
                  <Button
                    variant="outline"
                    className="h-28 flex-col gap-3 bg-background/50 hover:bg-primary/5 border-border/60 hover:border-primary/40 transition-all duration-200 rounded-xl"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={loading}
                  >
                    <Upload className="h-8 w-8 text-primary" />
                    <span className="font-medium">Upload Photo</span>
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
                    className="h-28 flex-col gap-3 bg-background/50 hover:bg-primary/5 border-border/60 hover:border-primary/40 transition-all duration-200 rounded-xl"
                    onClick={() => setShowCamera(true)}
                    disabled={loading}
                  >
                    <Camera className="h-8 w-8 text-primary" />
                    <span className="font-medium">Take Photo</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlantIdentifier;
