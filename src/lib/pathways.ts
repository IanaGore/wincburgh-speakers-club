export const VALID_PATHWAY_CODES = ['F1','F2','F3','F4','F5','A1','A2','A3','A4','A5'] as const
export type PathwayCode = typeof VALID_PATHWAY_CODES[number]

export const PATHWAY_DEFINITIONS = {
  foundation: [
    { code: 'F1', name: 'Public Speaking Cheat Sheet' },
    { code: 'F2', name: 'Speech Construction Guidance' },
    { code: 'F3', name: 'Mean What You Say' },
    { code: 'F4', name: 'Body Talk' },
    { code: 'F5', name: 'Vocal Impact' },
  ],
  advanced: [
    { code: 'A1', name: 'Using Language Creatively' },
    { code: 'A2', name: 'Telling the Story' },
    { code: 'A3', name: 'Beyond the Jokes' },
    { code: 'A4', name: 'Speak and Connect' },
    { code: 'A5', name: 'Showcase Speech' },
  ],
} as const
