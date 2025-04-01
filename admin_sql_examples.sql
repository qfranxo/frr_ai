-- 1. 관리자 권한 활성화
SELECT set_admin_role(true);

-- 관리자 권한으로 모든 이미지 사용 로그 조회
SELECT * FROM image_usage_logs ORDER BY created_at DESC LIMIT 100;

-- 특정 사용자의 로그만 조회
SELECT * FROM image_usage_logs WHERE user_id = '사용자ID' ORDER BY created_at DESC;

-- 특정 날짜 범위의 로그 조회
SELECT * FROM image_usage_logs 
WHERE created_at BETWEEN '2023-01-01' AND '2023-12-31'
ORDER BY created_at DESC;

-- 새 로그 삽입 예제 (관리자 권한으로 직접 삽입)
INSERT INTO image_usage_logs (user_id, action_type, created_at)
VALUES 
('사용자ID', 'generate', NOW()),
('다른사용자ID', 'share', NOW());

-- 댓글 관리 예제
SELECT * FROM comments ORDER BY created_at DESC LIMIT 100;

-- 특정 이미지의 댓글 조회
SELECT * FROM comments WHERE image_id = '이미지ID';

-- 부적절한 댓글 삭제
DELETE FROM comments WHERE id = '댓글ID';

-- 특정 사용자의 모든 댓글 삭제
DELETE FROM comments WHERE user_id = '사용자ID';

-- 좋아요 관리 예제
SELECT * FROM likes ORDER BY created_at DESC LIMIT 100;

-- 특정 이미지의 좋아요 카운트 수정
UPDATE shared_images
SET likes = 10, like_count = 10
WHERE id = '이미지ID';

-- 특정 사용자의 모든 좋아요 조회
SELECT * FROM likes WHERE user_id = '사용자ID';

-- 이미지 관리 예제
SELECT * FROM shared_images ORDER BY created_at DESC LIMIT 100;

-- 부적절한 이미지 삭제
DELETE FROM shared_images WHERE id = '이미지ID';

-- 특정 카테고리의 이미지 조회
SELECT * FROM shared_images WHERE category = '카테고리명';

-- 특정 사용자의 모든 이미지 조회
SELECT * FROM shared_images WHERE user_id = '사용자ID';

-- 작업 완료 후 관리자 권한 비활성화 (중요!)
SELECT set_admin_role(false); 