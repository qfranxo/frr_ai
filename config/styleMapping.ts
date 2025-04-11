export const modelStyleMapping = {
  pose: {
    '정면': 'front facing, direct eye contact',
    '측면': 'side profile, elegant pose',
    '전신': 'full body shot, standing pose',
    '상반신': 'upper body shot, professional',
    '자연스러운 포즈': 'natural pose, candid shot'
  },
  style: {
    '비즈니스': 'business attire, professional look',
    '캐주얼': 'casual wear, relaxed style',
    '스포티': 'athletic wear, dynamic pose',
    '고급스러운': 'luxury fashion, elegant style',
    '친근한': 'approachable, warm expression'
  },
  background: {
    '스튜디오': 'studio background, professional lighting',
    '사무실': 'modern office setting',
    '야외': 'outdoor natural environment',
    '추상적': 'abstract background, blurred',
    '단색': 'solid color background, clean'
  },
  lighting: {
    '자연광': 'natural daylight, soft shadows',
    '스튜디오 조명': 'professional studio lighting',
    '드라마틱': 'dramatic lighting, high contrast',
    '소프트': 'soft diffused lighting',
    '하이키': 'high-key lighting, bright and airy'
  },
  clothing: {
    '스타킹': 'wearing sheer black stockings, elegant legs, professional stockings',
    '정장': 'wearing business suit, formal attire',
    '캐주얼': 'casual clothing, comfortable outfit',
    '스포츠': 'sports wear, athletic clothing',
    '드레스': 'elegant dress, formal gown'
  },
  hair: {
    'short': 'short hair, cropped hair, pixie cut, modern short hairstyle, professional short hair',
    'long': 'long hair, flowing hair, cascading hair, elegant long hairstyle, natural long hair',
    'wave': 'wavy hair, natural waves, beach waves, textured waves, voluminous wavy hair',
    'straight': 'straight hair, sleek hair, smooth straight hair, glossy straight hair, professional straight hair',
    'short_wave': 'short wavy hair, cropped waves, modern wavy bob, textured short waves, stylish short wavy cut'
  },
  eyes: {
    '갈색': 'natural warm brown eyes, symmetrical eyes, natural eye reflections',
    '파란색': 'natural bright blue eyes, symmetrical eyes, natural eye reflections',
    '검은색': 'dark brown eyes, symmetrical eyes, natural eye reflections',
    '초록색': 'natural green eyes, symmetrical eyes, natural eye reflections',
    '회색': 'natural gray eyes, symmetrical eyes, natural eye reflections',
    'brown': 'natural warm brown eyes, symmetrical eyes, natural eye reflections',
    'blue': 'natural bright blue eyes, symmetrical eyes, natural eye reflections',
    'black': 'dark brown eyes, symmetrical eyes, natural eye reflections',
    'green': 'natural green eyes, symmetrical eyes, natural eye reflections',
    'gray': 'natural gray eyes, symmetrical eyes, natural eye reflections',
    'hazel': 'natural hazel eyes, symmetrical eyes, warm golden flecks, natural eye reflections'
  },
  cameraDistance: {
    'close_up': 'medium close-up shot, showing head and shoulders, balanced portrait, professional portrait framing, not too tight',
    'medium': 'medium shot, clear detailed medium portrait, showing upper body, balanced composition, professional distance',
    'far': 'wide shot, showing full body, environment visible, balanced full composition, proper framing',
    'full_body': 'full body shot, complete body visible, properly framed full length portrait, showing entire person',
    'upper_body': 'upper body shot, showing shoulders to waist, professionally framed upper body, balanced composition',
    'lower_body': 'lower body shot, properly framed focus on lower body, professional modeling of lower body'
  }
} as const; 