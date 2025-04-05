-- shared_images 테이블에 storage_path 컬럼 추가
ALTER TABLE shared_images 
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- generations 테이블에 storage_path 컬럼 추가
ALTER TABLE generations 
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 설명 추가
COMMENT ON COLUMN shared_images.storage_path IS 'Supabase Storage에 저장된 이미지의 경로';
COMMENT ON COLUMN generations.storage_path IS 'Supabase Storage에 저장된 이미지의 경로'; 