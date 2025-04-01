export const formatDate = (dateString: string | undefined) => {
  // 날짜 문자열이 없거나 잘못된 경우 현재 날짜 반환
  if (!dateString || dateString === 'Invalid Date' || isNaN(new Date(dateString).getTime())) {
    return '날짜 정보 없음';
  }
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    }).format(date);
  } catch (error) {
    console.error('날짜 형식 오류:', error);
    return '날짜 정보 없음';
  }
}; 