import type { GrowthResource, User } from '@/types'

export type PathResourceBucket = 'intentional' | 'alignment'

export const PATH_LABELS = {
  intentional: 'The Intentional Path',
  alignment: 'The Alignment Path',
} as const

export const PATH_RESOURCE_STORAGE_KEYS: Record<PathResourceBucket, string> = {
  intentional: 'intentional-path-resources',
  alignment: 'alignment-path-resources',
}

export const LEGACY_PATH_RESOURCE_STORAGE_KEYS: Record<PathResourceBucket, string> = {
  intentional: 'growth-resources',
  alignment: 'paid-growth-resources',
}

export const PATH_RESOURCE_RECORD_IDS: Record<PathResourceBucket, string> = {
  intentional: 'resources_intentional',
  alignment: 'resources_alignment',
}

export const LEGACY_PATH_RESOURCE_RECORD_IDS: Record<PathResourceBucket, string> = {
  intentional: 'resources_free',
  alignment: 'resources_paid',
}

export const getPathBucketForUser = (
  user: Pick<User, 'assessmentPassed'> | null | undefined,
): PathResourceBucket => (user?.assessmentPassed ? 'alignment' : 'intentional')

export const readPathResourcesFromStorage = (
  bucket: PathResourceBucket,
  fallback: GrowthResource[] = [],
): GrowthResource[] => {
  try {
    const nextValue = localStorage.getItem(PATH_RESOURCE_STORAGE_KEYS[bucket])
    const legacyValue = localStorage.getItem(LEGACY_PATH_RESOURCE_STORAGE_KEYS[bucket])
    const raw = nextValue ?? legacyValue
    if (!raw) return fallback

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : fallback
  } catch (error) {
    console.warn(`Failed to read ${bucket} path resources from localStorage.`, error)
    return fallback
  }
}

export const writePathResourcesToStorage = (
  bucket: PathResourceBucket,
  resources: GrowthResource[],
): void => {
  const serialized = JSON.stringify(resources)
  localStorage.setItem(PATH_RESOURCE_STORAGE_KEYS[bucket], serialized)
  localStorage.setItem(LEGACY_PATH_RESOURCE_STORAGE_KEYS[bucket], serialized)
}
