### 1. 이미지 로딩 최적화

1. **Next.js Image 컴포넌트 활용**
   ```jsx
   <Image
     src={imageSrc}
     alt={post.description || post.prompt || "Image"}
     fill
     priority={true}  // 중요 이미지 우선 로딩
     loading="eager"  // 즉시 로딩 (지연 로딩하지 않음)
     sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
     className={`${post.aspectRatio === '9:16' ? 'object-contain' : 'object-cover'} transition-all duration-300`}
   />
   ```

2. **이미지 오류 처리와 캐싱**
   - 로드 실패한 이미지는 전역 Set에 저장하여 다시 시도하지 않음
   - 이미지 상태를 useRef로 관리하여 불필요한 리렌더링 방지
   ```jsx
   const failedImageIds = new Set<string>();
   // ...
   const imageStatusRef = useRef({
     loaded: false,
     error: false
   });
   ```

3. **이미지 URL 메모이제이션**
   ```jsx
   const imageSrc = useMemo(() => {
     // 이미지 URL 유효성 검사 및 처리 로직
     // 빈 URL이나 실패한 이미지는 fallback 이미지 사용
     return imageUrl || '/fallback-image.png';
   }, [imageUrl]);
   ```

4. **초기 로드 최적화**
   - 이미지는 `priority={true}`와 `loading="eager"`로 설정하여 페이지 로드 시 즉시 다운로드
   - 성능에 영향을 주는 불필요한 상태 업데이트 방지


### 2. 댓글 로딩 최적화

1. **캐싱 메커니즘**
   - sessionStorage에 댓글 저장
   ```jsx
   // 댓글 캐시 저장
   sessionStorage.setItem(`comments_${imageId}`, JSON.stringify(comments));
   ```
   - 캐시를 먼저 확인하고 표시한 후 백그라운드에서 업데이트
   ```jsx
   const cachedComments = sessionStorage.getItem(`comments_${imageId}`);
   if (cachedComments) {
     return JSON.parse(cachedComments);
   }
   ```

2. **병렬 데이터 로드**
   ```jsx
   // 여러 이미지의 댓글을 동시에 로드
   const batchPromises = batch.map(
     postId => communityApi.loadCommentsForImage(postId)
   );
   
   const batchResults = await Promise.all(batchPromises);
   ```

3. **낙관적 UI 업데이트**
   - 사용자 입력 후 즉시 UI 업데이트하고 백그라운드에서 서버 요청
   ```jsx
   // 낙관적 UI 업데이트로 댓글 즉시 표시
   setCommentsLocalMap((prev) => ({
     ...prev,
     [postId]: [tempComment, ...updatedComments]
   }));
   // 이후 API 호출
   ```

4. **스켈레톤 UI**
   - 데이터 로딩 중 스켈레톤 컴포넌트 표시
   ```jsx
   {isCommentLoading && (
     <div className="flex flex-col items-center justify-center py-8">
       <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
       <p className="text-sm text-gray-500">댓글을 불러오는 중...</p>
     </div>
   )}
   ```

5. **페이지 진입 시 사전 로드**
   - 페이지 로드 시 필요한 데이터 미리 요청
   ```jsx
   useEffect(() => {
     const postIds = cachedData.map((post) => post.id);
     preloadComments(postIds);
   }, []);
   ```


   ### 3. 전체 성능 최적화 전략

1. **불필요한 리렌더링 방지**
   - `useMemo`, `useRef` 활용
   - 상태 변경을 최소화하여 컴포넌트 렌더링 횟수 줄임

2. **캐싱 전략**
   - 댓글 및 이미지 데이터는 sessionStorage에 캐싱
   - 백그라운드에서 데이터 업데이트하되 UI는 캐시로 먼저 표시

3. **코드 스플리팅 및 최적화**
   - 컴포넌트 분리 및 필요할 때만 로드
   - 조건부 렌더링으로 필요한 UI만 표시

4. **사용자 경험 향상**
   - 스켈레톤 UI, 낙관적 업데이트로 앱이 빠르게 반응하는 것처럼 보이게 함
   - 백그라운드 로딩 및 갱신으로 사용자 대기 시간 최소화