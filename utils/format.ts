export const formatDate = (dateString: string | undefined) => {
  // 날짜 문자열이 없거나 잘못된 경우 현재 날짜 반환
  if (!dateString || dateString === 'Invalid Date' || isNaN(new Date(dateString).getTime())) {
    return 'No date';
  }
  
  try {
    const date = new Date(dateString);
    
    // 영어로 날짜 형식 변경
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (error) {
    console.error('Date format error:', error);
    return 'No date';
  }
}; 