-- shared_images 테이블에 original_generation_id 컬럼 추가
ALTER TABLE shared_images 
ADD COLUMN IF NOT EXISTS original_generation_id UUID;

-- 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_shared_images_original_generation_id 
ON shared_images(original_generation_id);

-- 설명 추가
COMMENT ON COLUMN shared_images.original_generation_id IS '원본 이미지 ID (generations 테이블의 ID)'; 