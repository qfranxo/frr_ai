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
    '갈색': 'brown eyes, natural symmetrical brown eyes, warm brown eyes, detailed brown irises, natural eye reflections, lifelike brown eyes, perfect symmetrical eyes',
    '파란색': 'blue eyes, natural symmetrical blue eyes, bright blue eyes, detailed blue irises, natural eye reflections, lifelike blue eyes, perfect symmetrical eyes',
    '검은색': 'black eyes, natural symmetrical black eyes, deep black eyes, detailed black irises, natural eye reflections, lifelike black eyes, perfect symmetrical eyes',
    '초록색': 'green eyes, natural symmetrical green eyes, emerald eyes, detailed green irises, natural eye reflections, lifelike green eyes, perfect symmetrical eyes',
    '회색': 'gray eyes, natural symmetrical gray eyes, steel gray eyes, detailed gray irises, natural eye reflections, lifelike gray eyes, perfect symmetrical eyes',
    'brown': 'brown eyes, natural symmetrical brown eyes, warm brown eyes, detailed brown irises, natural eye reflections, lifelike brown eyes, perfect symmetrical eyes',
    'blue': 'blue eyes, natural symmetrical blue eyes, bright blue eyes, detailed blue irises, natural eye reflections, lifelike blue eyes, perfect symmetrical eyes',
    'black': 'black eyes, natural symmetrical black eyes, deep black eyes, detailed black irises, natural eye reflections, lifelike black eyes, perfect symmetrical eyes',
    'green': 'green eyes, natural symmetrical green eyes, emerald eyes, detailed green irises, natural eye reflections, lifelike green eyes, perfect symmetrical eyes',
    'gray': 'gray eyes, natural symmetrical gray eyes, steel gray eyes, detailed gray irises, natural eye reflections, lifelike gray eyes, perfect symmetrical eyes'
  },
  cameraDistance: {
    'close_up': 'extreme close-up shot, highly detailed close shot, extreme close portrait, focus on subject, no background, studio lighting',
    'medium': 'medium shot, clear detailed medium portrait, standard framing, balanced composition',
    'far': 'wide shot, full environment visible, distant perspective, environmental portrait',
    'full_body': 'full body shot, complete body visible, full length portrait',
    'upper_body': 'upper body shot, clear focus on upper body, professional modeling of upper body',
    'lower_body': 'lower body shot, clear focus on lower body, professional modeling of lower body'
  }
} as const; 