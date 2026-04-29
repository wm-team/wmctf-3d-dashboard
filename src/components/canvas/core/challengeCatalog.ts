import type { CategoryKey } from './coreSceneConfig'

export type ChallengeItem = {
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert'
  points: number
  status: 'solved' | 'hot' | 'locked'
  title: string
}

export const challengeCatalog: Record<CategoryKey, ChallengeItem[]> = {
  web: [
    { title: 'babylogin', difficulty: 'Easy', points: 100, status: 'solved' },
    { title: 'include_you', difficulty: 'Medium', points: 200, status: 'hot' },
    { title: 'jwt_lab', difficulty: 'Medium', points: 250, status: 'locked' },
    { title: 'node_escape', difficulty: 'Hard', points: 400, status: 'locked' },
  ],
  pwn: [
    { title: 'babystack', difficulty: 'Easy', points: 100, status: 'solved' },
    { title: 'fmt_got', difficulty: 'Medium', points: 250, status: 'hot' },
    { title: 'heapnote', difficulty: 'Hard', points: 350, status: 'locked' },
    { title: 'kernel_gate', difficulty: 'Expert', points: 500, status: 'locked' },
  ],
  rev: [
    { title: 'ez_rev', difficulty: 'Easy', points: 100, status: 'solved' },
    { title: 'vm_trace', difficulty: 'Medium', points: 250, status: 'hot' },
    { title: 'ollvm_core', difficulty: 'Hard', points: 400, status: 'locked' },
  ],
  crypto: [
    { title: 'easy_rsa', difficulty: 'Easy', points: 100, status: 'solved' },
    { title: 'lattice_hint', difficulty: 'Hard', points: 400, status: 'hot' },
    { title: 'ecc_fault', difficulty: 'Expert', points: 500, status: 'locked' },
  ],
  misc: [
    { title: 'simple_misc', difficulty: 'Easy', points: 100, status: 'solved' },
    { title: 'zip_shadow', difficulty: 'Medium', points: 200, status: 'hot' },
    { title: 'audio_trace', difficulty: 'Hard', points: 350, status: 'locked' },
  ],
  forensics: [
    { title: 'find_me', difficulty: 'Easy', points: 100, status: 'solved' },
    { title: 'memory_dump', difficulty: 'Medium', points: 250, status: 'hot' },
    { title: 'timeline_case', difficulty: 'Hard', points: 400, status: 'locked' },
  ],
}
