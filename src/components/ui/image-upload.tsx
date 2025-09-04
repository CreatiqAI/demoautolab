import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  value: string;
  onChange: (url: string, metadata?: { fileName?: string; fileSize?: number; mimeType?: string }) => void;
  onRemove?: () => void;
  placeholder?: string;
  bucket?: string;
  path?: string;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  className?: string;
}

export default function ImageUpload({
  value,
  onChange,
  onRemove,
  placeholder = "Upload an image",
  bucket = "product-images",
  path = "uploads",
  maxSize = 10 * 1024 * 1024, // 10MB default
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  className = ""
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [urlInput, setUrlInput] = useState(value || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      // Validate file size
      if (file.size > maxSize) {
        throw new Error(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
      }

      // Validate file type
      if (!acceptedTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} is not supported. Please use: ${acceptedTypes.join(', ')}`);
      }

      // Check if user is authenticated (either Supabase auth or admin localStorage)
      const { data: { user } } = await supabase.auth.getUser();
      const adminUser = localStorage.getItem('admin_user');
      
      if (!user && !adminUser) {
        throw new Error('You must be logged in to upload images');
      }
      
      // Use admin user ID if available, otherwise use Supabase user ID
      const userId = adminUser ? JSON.parse(adminUser).username : user?.id;

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      console.log('Uploading file:', { fileName, filePath, bucket, userId });
      setUploadProgress(25);

      // Try to upload with upsert: true to handle potential conflicts
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Changed to true to overwrite if exists
        });

      if (error) {
        console.error('Storage upload error:', error);
        
        // Provide more specific error messages
        if (error.message.includes('row-level security')) {
          throw new Error('Storage permissions error. Please contact administrator to fix storage policies.');
        } else if (error.message.includes('not found')) {
          throw new Error(`Storage bucket '${bucket}' not found. Please create the bucket first.`);
        } else if (error.message.includes('policy')) {
          throw new Error('Storage access denied. Please check your permissions.');
        } else {
          throw new Error(`Upload failed: ${error.message}`);
        }
      }

      setUploadProgress(75);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Call onChange with URL and metadata
      onChange(publicUrl, {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type
      });

      setUploadProgress(100);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully"
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      toast({
        title: "Success",
        description: "Image URL added successfully"
      });
    }
  };

  const handleRemove = () => {
    onChange('');
    setUrlInput('');
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {value ? (
        // Show uploaded image
        <div className="relative group">
          <div className="aspect-square w-full max-w-xs rounded-lg border overflow-hidden bg-gray-50">
            <img
              src={value}
              alt="Uploaded image"
              className="w-full h-full object-cover"
              onError={() => {
                toast({
                  title: "Error",
                  description: "Failed to load image",
                  variant: "destructive"
                });
              }}
            />
          </div>
          <Button
            type="button"
            onClick={handleRemove}
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        // Show upload interface
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload File</TabsTrigger>
            <TabsTrigger value="url">From URL</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-2">{placeholder}</p>
              <p className="text-xs text-gray-500 mb-4">
                Drag and drop an image here, or click to select
              </p>
              <p className="text-xs text-gray-400">
                Supported: {acceptedTypes.map(type => type.split('/')[1]).join(', ')} 
                • Max size: {Math.round(maxSize / 1024 / 1024)}MB
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />

            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              variant="outline"
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Uploading...' : 'Choose File'}
            </Button>
          </TabsContent>
          
          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <div className="flex gap-2">
                <Input
                  id="imageUrl"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  type="url"
                />
                <Button
                  type="button"
                  onClick={handleUrlSubmit}
                  disabled={!urlInput.trim()}
                >
                  <Link className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {urlInput && (
              <div className="aspect-video w-full max-w-xs rounded-lg border overflow-hidden bg-gray-50">
                <img
                  src={urlInput}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={() => {
                    toast({
                      title: "Invalid URL",
                      description: "Unable to load image from this URL",
                      variant: "destructive"
                    });
                  }}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}