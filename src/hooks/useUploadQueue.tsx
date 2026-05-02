import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export type UploadStatus = 'uploading' | 'cancelling' | 'cancelled' | 'complete' | 'failed' | 'interrupted';

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
  uploadId: string;
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
export const PRODUCT_MEDIA_UPLOAD_REMOVED_EVENT = 'product-media-upload-removed';

export interface ProductMediaUploadedDetail {
  productId: string;
  media: CompletedMedia;
}

export interface ProductMediaUploadRemovedDetail {
  productId: string;
  uploadId: string;
}

const QUEUE_STORAGE_KEY = 'autolab.uploadQueue.v1';

// Persist queue snapshot so an in-progress queue survives page refresh.
// Note: actual file bytes can't survive refresh (the SDK upload aborts), so any
// 'uploading' items present at boot are reclassified as 'interrupted' to tell
// the admin they need to re-select the file.
function loadInitialQueue(): UploadItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: UploadItem[] = JSON.parse(raw);
    return parsed.map((u) =>
      u.status === 'uploading' || u.status === 'cancelling'
        ? { ...u, status: 'interrupted', error: 'Page was refreshed before upload finished — please re-select the file' }
        : u
    );
  } catch {
    return [];
  }
}

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const [uploads, setUploads] = useState<UploadItem[]>(loadInitialQueue);
  const { toast } = useToast();

  // The Supabase JS SDK doesn't expose AbortSignal on .upload(), so we can't
  // truly abort an in-flight upload. Cancellation is "soft": we set this flag,
  // let the upload finish server-side, then immediately delete the file and
  // skip the DB insert. The user sees an instant "Cancelled" state; the only
  // cost is the bytes already in flight.
  const cancelledIds = useRef<Set<string>>(new Set());

  // Persist queue snapshot whenever it changes so a refresh shows the recovered
  // state (even if interrupted) instead of a silent disappearance.
  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(uploads));
    } catch {
      // localStorage may be full or disabled; non-fatal
    }
  }, [uploads]);

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

        const emitRemoved = () => {
          window.dispatchEvent(
            new CustomEvent<ProductMediaUploadRemovedDetail>(PRODUCT_MEDIA_UPLOAD_REMOVED_EVENT, {
              detail: { productId, uploadId: id },
            })
          );
        };

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
            emitRemoved();
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
            uploadId: id,
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
          // Cancellation racing the error path: still treat as cancelled.
          if (cancelledIds.current.has(id)) {
            cancelledIds.current.delete(id);
            await supabase.storage.from('product-videos').remove([filePath]).catch(() => {});
            setUploads((prev) =>
              prev.map((u) => (u.id === id ? { ...u, status: 'cancelled' } : u))
            );
            emitRemoved();
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
          emitRemoved();
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
    setUploads((prev) => {
      // If dismissing an interrupted/failed item, also notify any open modal so
      // its placeholder slot (if still present) gets cleaned up.
      const item = prev.find((u) => u.id === id);
      if (item && (item.status === 'interrupted' || item.status === 'failed' || item.status === 'cancelled')) {
        window.dispatchEvent(
          new CustomEvent<ProductMediaUploadRemovedDetail>(PRODUCT_MEDIA_UPLOAD_REMOVED_EVENT, {
            detail: { productId: item.productId, uploadId: item.id },
          })
        );
      }
      return prev.filter((u) => u.id !== id);
    });
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
