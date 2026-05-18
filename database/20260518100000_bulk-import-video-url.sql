-- 20260518100000_bulk-import-video-url.sql
-- Adds optional video URL field to components for bulk import support.

ALTER TABLE component_library
  ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN component_library.video_url IS
  'Optional public video URL (YouTube/Vimeo/Drive). Stored as-is, not re-hosted.';
