import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export type UploadStatus = 'uploading' | 'cancelling' | 'cancelled' | 'complete' | 'failed' | 'interrupted';

export type UploadTarget = 'product-image' | 'installation-video';

export interface UploadItem {
  id: string;
  fileName: string;
  fileSize: number;
  productId: string;
  productName: string;
  target: UploadTarget;
  status: UploadStatus;
  error?: string;
  startedAt: number;
}

export interface CompletedMedia {
  url: string;
  productImageId?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadId: string;
}

export interface InstallationVideoMeta {
  title: string;
  duration: string;
}

interface EnqueueParams {
  file: File;
  productId: string;
  productName: string;
  target?: UploadTarget;
  /** Required when target === 'installation-video'. Captured at enqueue time. */
  installationMeta?: InstallationVideoMeta;
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
export const INSTALLATION_VIDEO_UPLOADED_EVENT = 'installation-video-uploaded';
export const INSTALLATION_VIDEO_UPLOAD_REMOVED_EVENT = 'installation-video-upload-removed';

export interface ProductMediaUploadedDetail {
  productId: string;
  media: CompletedMedia;
}

export interface ProductMediaUploadRemovedDetail {
  productId: string;
  uploadId: string;
}

export interface InstallationVideoUploadedDetail {
  productId: string;
  uploadId: string;
  url: string;
  title: string;
  duration: string;
}

export interface InstallationVideoUploadRemovedDetail {
  productId: string;
  uploadId: string;
}

const QUEUE_STORAGE_KEY = 'autolab.uploadQueue.v1';

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

  const cancelledIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(uploads));
    } catch {
      // localStorage may be full or disabled; non-fatal
    }
  }, [uploads]);

  // Warn before refresh / tab close while uploads are in flight. The browser
  // aborts the underlying fetch on navigation, so any 'uploading' item will
  // come back as 'interrupted' on reload — we want the admin to confirm
  // before that happens. Modern browsers ignore the custom message and show
  // their own ("Leave site?" / "Reload site?"), so the string here is a
  // no-op placeholder for the legacy non-standard API.
  useEffect(() => {
    const hasActive = uploads.some(
      (u) => u.status === 'uploading' || u.status === 'cancelling'
    );
    if (!hasActive) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [uploads]);

  const enqueueVideoUpload = useCallback<UploadQueueContextValue['enqueueVideoUpload']>(
    ({ file, productId, productName, target = 'product-image', installationMeta, onComplete }) => {
      const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const item: UploadItem = {
        id,
        fileName: file.name,
        fileSize: file.size,
        productId,
        productName,
        target,
        status: 'uploading',
        startedAt: Date.now(),
      };
      setUploads((prev) => [...prev, item]);

      void (async () => {
        const fileExt = file.name.split('.').pop() || 'mp4';
        const folder = target === 'installation-video' ? 'installation-videos' : 'uploads';
        const filePath = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

        const removedEventName =
          target === 'installation-video'
            ? INSTALLATION_VIDEO_UPLOAD_REMOVED_EVENT
            : PRODUCT_MEDIA_UPLOAD_REMOVED_EVENT;

        const emitRemoved = () => {
          window.dispatchEvent(
            new CustomEvent(removedEventName, {
              detail: { productId, uploadId: id },
            })
          );
        };

        try {
          const { error: uploadError } = await supabase.storage
            .from('product-videos')
            .upload(filePath, file, { contentType: file.type });

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

          let productImageId: string | undefined;

          if (target === 'product-image') {
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
            productImageId = (row as any)?.id;
          } else {
            // installation-video: read current row, append entry to JSONB, upsert.
            const meta = installationMeta ?? { title: '', duration: '' };
            const { data: existing } = await supabase
              .from('product_installation_guides' as any)
              .select('installation_videos')
              .eq('product_id', productId)
              .maybeSingle();
            const current: Array<{ url: string; title: string; duration: string }> =
              ((existing as any)?.installation_videos as any[] | undefined) ?? [];
            // Skip if this URL somehow already exists (shouldn't, since URLs are random)
            const merged = current.some((v) => v.url === publicUrl)
              ? current
              : [...current, { url: publicUrl, title: meta.title, duration: meta.duration }];
            const { error: upErr } = await supabase
              .from('product_installation_guides' as any)
              .upsert({ product_id: productId, installation_videos: merged } as any, {
                onConflict: 'product_id',
              });
            if (upErr) throw upErr;
          }

          const media: CompletedMedia = {
            url: publicUrl,
            productImageId,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            uploadId: id,
          };

          setUploads((prev) =>
            prev.map((u) => (u.id === id ? { ...u, status: 'complete' } : u))
          );

          onComplete?.(media);

          if (target === 'product-image') {
            window.dispatchEvent(
              new CustomEvent<ProductMediaUploadedDetail>(PRODUCT_MEDIA_UPLOADED_EVENT, {
                detail: { productId, media },
              })
            );
          } else {
            const meta = installationMeta ?? { title: '', duration: '' };
            window.dispatchEvent(
              new CustomEvent<InstallationVideoUploadedDetail>(INSTALLATION_VIDEO_UPLOADED_EVENT, {
                detail: { productId, uploadId: id, url: publicUrl, title: meta.title, duration: meta.duration },
              })
            );
          }

          toast({
            title: target === 'installation-video' ? 'Installation video uploaded' : 'Video uploaded',
            description: `${file.name} added to ${productName}`,
            variant: 'success',
          });

          setTimeout(() => {
            setUploads((prev) => prev.filter((u) => u.id !== id));
          }, 5000);
        } catch (err: any) {
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
      const item = prev.find((u) => u.id === id);
      if (item && (item.status === 'interrupted' || item.status === 'failed' || item.status === 'cancelled')) {
        const eventName =
          item.target === 'installation-video'
            ? INSTALLATION_VIDEO_UPLOAD_REMOVED_EVENT
            : PRODUCT_MEDIA_UPLOAD_REMOVED_EVENT;
        window.dispatchEvent(
          new CustomEvent(eventName, {
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
