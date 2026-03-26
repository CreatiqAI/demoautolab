import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link, X, Video, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoUploadProps {
  value: string;
  onChange: (url: string, metadata?: { fileName?: string; fileSize?: number; mimeType?: string; thumbnailUrl?: string }) => void;
  onRemove?: () => void;
  placeholder?: string;
  bucket?: string;
  path?: string;
  maxSize?: number;
  className?: string;
}

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

function isEmbeddableUrl(url: string): boolean {
  return /youtube\.com\/watch|youtu\.be\/|vimeo\.com\//i.test(url);
}

function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

export default function VideoUpload({
  value,
  onChange,
  onRemove,
  placeholder = "Upload a video",
  bucket = "product-videos",
  path = "uploads",
  maxSize = MAX_VIDEO_SIZE,
  className = ""
}: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
        throw new Error(`File type ${file.type} is not supported. Please use: MP4, WebM, or MOV`);
      }
      if (file.size > maxSize) {
        throw new Error(`Video is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max size: ${Math.round(maxSize / 1024 / 1024)}MB`);
      }

      setUploadProgress(10);

      const { data: { user } } = await supabase.auth.getUser();
      const adminUser = localStorage.getItem('admin_user');
      if (!user && !adminUser) {
        throw new Error('You must be logged in to upload videos');
      }

      const fileExt = file.name.split('.').pop() || 'mp4';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      setUploadProgress(20);

      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '31536000',
          upsert: true,
          contentType: file.type,
        });

      if (error) {
        if (error.message.includes('row-level security') || error.message.includes('policy')) {
          throw new Error('Storage permissions error. Please contact administrator.');
        } else if (error.message.includes('not found')) {
          throw new Error(`Storage bucket '${bucket}' not found. Please create the bucket first.`);
        }
        throw new Error(`Upload failed: ${error.message}`);
      }

      setUploadProgress(80);

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onChange(publicUrl, {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });

      setUploadProgress(100);

      toast({
        title: "Video uploaded",
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB) uploaded successfully`
      });

    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload video",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUrlSubmit = () => {
    const url = urlInput.trim();
    if (!url) return;
    onChange(url);
    setUrlInput('');
    toast({
      title: "Success",
      description: isEmbeddableUrl(url) ? "Video URL added (YouTube/Vimeo)" : "Video URL added"
    });
  };

  const handleRemove = () => {
    onChange('');
    setUrlInput('');
    if (onRemove) onRemove();
  };

  const embedUrl = value ? getEmbedUrl(value) : null;

  return (
    <div className={`space-y-4 ${className}`}>
      {value ? (
        <div className="relative group">
          <div className="aspect-video w-full max-w-xs rounded-lg border overflow-hidden bg-gray-900">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            ) : (
              <video
                src={value}
                className="w-full h-full object-contain"
                controls
                preload="metadata"
              />
            )}
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
              <Video className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-2">{placeholder}</p>
              <p className="text-xs text-gray-500 mb-4">
                Drag and drop a video here, or click to select
              </p>
              <p className="text-xs text-gray-400">
                Supported: MP4, WebM, MOV • Max: {Math.round(maxSize / 1024 / 1024)}MB
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_VIDEO_TYPES.join(',')}
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
              {uploading ? 'Uploading...' : 'Choose Video File'}
            </Button>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL</Label>
              <p className="text-xs text-gray-500">YouTube, Vimeo, or direct video URL</p>
              <div className="flex gap-2">
                <Input
                  id="videoUrl"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or direct .mp4 URL"
                  type="url"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleUrlSubmit();
                    }
                  }}
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

            {urlInput && getEmbedUrl(urlInput) && (
              <div className="aspect-video w-full max-w-xs rounded-lg border overflow-hidden bg-gray-900">
                <iframe
                  src={getEmbedUrl(urlInput)!}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export { isEmbeddableUrl, getEmbedUrl };
