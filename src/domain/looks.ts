export const LOOKS = [
  {
    id: 'golden-hour',
    name: 'Golden hour',
    number: '01',
    tagline: 'A little more golden.',
    description: 'Warm evening light, soft shadows, and the feeling of staying out a little longer.',
    detail: 'WARM · SUN-KISSED · SOFT',
    color: '#C08545',
    prompt: 'Relight with believable warm, low-angle golden-hour sunlight from the side. Add soft warm highlights and gentle, natural shadows. Keep skin tones realistic, not orange. Preserve the original scene.',
  },
  {
    id: 'direct-flash',
    name: 'After hours',
    number: '02',
    tagline: 'The night, caught right.',
    description: 'Crisp direct flash and a deeper background. A camera-roll favorite, after dark.',
    detail: 'FLASH · CRISP · NOSTALGIC',
    color: '#64716B',
    prompt: 'Relight as an authentic compact-camera direct-flash photograph. Illuminate the subject with crisp frontal flash, controlled bright highlights, and a slightly darker ambient background. Add subtle analog texture without obscuring detail.',
  },
  {
    id: 'soft-studio',
    name: 'Soft studio',
    number: '03',
    tagline: 'Your good-light moment.',
    description: 'Gentle window-like light and quiet contrast. Polished, without looking overdone.',
    detail: 'CLEAN · DIFFUSED · TIMELESS',
    color: '#8C768A',
    prompt: 'Relight with a large diffused studio softbox, resembling flattering window light. Balance exposure, lift harsh shadows, and use subtle editorial contrast. Retain natural skin texture and the original background.',
  },
] as const;

export type LookId = (typeof LOOKS)[number]['id'];
export type Look = (typeof LOOKS)[number];

export function isLookId(value: unknown): value is LookId {
  return LOOKS.some((look) => look.id === value);
}

export function getLook(value: string): Look {
  return LOOKS.find((look) => look.id === value) ?? LOOKS[0];
}
