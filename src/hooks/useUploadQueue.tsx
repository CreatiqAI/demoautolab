import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export type UploadStatus = 'uploading' | 'cancelling' | 'cancelled' | 'complete' | 'failed';

export interface UploadItem {
  id: string;
  fileName: string;
  fileSize: number;
  productId: string;
  productName: string;
  status: UploadStatus;
  error?: string;
  startedAt: number;
}

export interface CompletedMedia {
  url: string;
  productImageId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface EnqueueParams {
  file: File;
  productId: string;
  productName: string;
  onComplete?: (media: CompletedMedia) => void;
}

interface UploadQueueContextValue {
  uploads: UploadItem[];
  enqueueVideoUpload: (params: EnqueueParams) => string;
  dismissUpload: (id: string) => void;
  cancelUpload: (id: string) => void;
}

const UploadQueueContext = createContext<UploadQueueContextValue | null>(null);

export const PRODUCT_MEDIA_UPLOADED_EVENT = 'product-media-uploaded';

export interface ProductMediaUploadedDetail {
  productId: string;
  media: CompletedMedia;
}

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const { toast } = useToast();

  // The Supabase JS SDK doesn't expose AbortSignal on .upload(), so we can't
  // truly abort an in-flight upload. Cancellation is "soft": we set this flag,
  // let the upload finish server-side, then immediately delete the file and
  // skip the DB insert. The user sees an instant "Cancelled" state; the only
  // cost is the bytes already in flight.
  const cancelledIds = useRef<Set<string>>(new Set());

  const enqueueVideoUpload = useCallback<UploadQueueContextValue['enqueueVideoUpload']>(
    ({ file, productId, productName, onComplete }) => {
      const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const item: UploadItem = {
        id,
        fileName: file.name,
        fileSize: file.size,
        productId,
        productName,
        status: 'uploading',
        startedAt: Date.now(),
      };
      setUploads((prev) => [...prev, item]);

      void (async () => {
        const fileExt = file.name.split('.').pop() || 'mp4';
        const filePath = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

        try {
          const { error: uploadError } = await supabase.storage
            .from('product-videos')
            .upload(filePath, file, { contentType: file.type });

          // If user cancelled while bytes were in flight, clean up and bail.
          if (cancelledIds.current.has(id)) {
            cancelledIds.current.delete(id);
            await supabase.storage.from('product-videos').remove([filePath]).catch(() => {});
            setUploads((prev) =>
              prev.map((u) => (u.id === id ? { ...u, status: 'cancelled' } : u))
            );
            setTimeout(() => {
              setUploads((prev) => prev.filter((u) => u.id !== id));
            }, 3000);
            return;
          }

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('product-videos')
            .getPublicUrl(filePath);

          const { data: row, error: insertError } = await supabase
            .from('product_images_new' as any)
            .insert({
              product_id: productId,
              url: publicUrl,
              alt_text: `${productName} - Video`,
              is_primary: false,
              sort_order: 9999,
              media_type: 'video',
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type,
            } as any)
            .select('id')
            .maybeSingle();
          if (insertError) throw insertError;

          const media: CompletedMedia = {
            url: publicUrl,
            productImageId: (row as any)?.id,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          };

          setUploads((prev) =>
            prev.map((u) => (u.id === id ? { ...u, status: 'complete' } : u))
          );

          onComplete?.(media);

          window.dispatchEvent(
            new CustomEvent<ProductMediaUploadedDetail>(PRODUCT_MEDIA_UPLOADED_EVENT, {
              detail: { productId, media },
            })
          );

          toast({
            title: 'Video uploaded',
            description: `${file.name} added to ${productName}`,
          });

          setTimeout(() => {
            setUploads((prev) => prev.filter((u) => u.id !== id));
          }, 5000);
        } catch (err: any) {
          // If cancelled, treat the error path the same as the cancelled path —
          // clean up the storage file (might exist if upload partially succeeded)
          // and mark as cancelled rather than failed.
          if (cancelledIds.current.has(id)) {
            cancelledIds.current.delete(id);
            await supabase.storage.from('product-videos').remove([filePath]).catch(() => {});
            setUploads((prev) =>
              prev.map((u) => (u.id === id ? { ...u, status: 'cancelled' } : u))
            );
            setTimeout(() => {
              setUploads((prev) => prev.filter((u) => u.id !== id));
            }, 3000);
            return;
          }

          const message = err?.message || 'Upload failed';
          setUploads((prev) =>
            prev.map((u) =>
              u.id === id ? { ...u, status: 'failed', error: message } : u
            )
          );
          toast({
            title: 'Video upload failed',
            description: `${file.name}: ${message}`,
            variant: 'destructive',
          });
        }
      })();

      return id;
    },
    [toast]
  );

  const cancelUpload = useCallback((id: string) => {
    cancelledIds.current.add(id);
    setUploads((prev) =>
      prev.map((u) => (u.id === id && u.status === 'uploading' ? { ...u, status: 'cancelling' } : u))
    );
  }, []);

  const dismissUpload = useCallback((id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  return (
    <UploadQueueContext.Provider
      value={{ uploads, enqueueVideoUpload, dismissUpload, cancelUpload }}
    >
      {children}
    </UploadQueueContext.Provider>
  );
}

export function useUploadQueue() {
  const ctx = useContext(UploadQueueContext);
  if (!ctx) throw new Error('useUploadQueue must be used within UploadQueueProvider');
  return ctx;
}
