import type { User } from '@/types'

const PENDING_SIGNUP_STORAGE_KEY = 'rooted_pending_signup'
const MAX_PENDING_SIGNUP_AGE_MS = 7 * 24 * 60 * 60 * 1000

type PendingSignupRecord = {
  email: string
  user: User
  savedAt: number
  photoPayloadStripped: boolean
}

type PendingSignupSaveResult = {
  stored: boolean
  photoPayloadStripped: boolean
}

const normalizeEmail = (value: string) => value.trim().toLowerCase()

const stripInlinePhotoPayloads = (photoUrl?: string) => {
  if (!photoUrl) return photoUrl
  const kept = photoUrl
    .split('|')
    .map((url) => url.trim())
    .filter((url) => url.length > 0 && !url.startsWith('data:'))
    .join('|')
  return kept || undefined
}

const canUseStorage = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined'

const parsePendingSignupRecord = (): PendingSignupRecord | null => {
  if (!canUseStorage()) return null

  try {
    const rawValue = localStorage.getItem(PENDING_SIGNUP_STORAGE_KEY)
    if (!rawValue) return null

    const parsed = JSON.parse(rawValue) as Partial<PendingSignupRecord>
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.email !== 'string' ||
      !parsed.user ||
      typeof parsed.user !== 'object' ||
      typeof parsed.savedAt !== 'number'
    ) {
      localStorage.removeItem(PENDING_SIGNUP_STORAGE_KEY)
      return null
    }

    return {
      email: normalizeEmail(parsed.email),
      user: parsed.user as User,
      savedAt: parsed.savedAt,
      photoPayloadStripped: Boolean(parsed.photoPayloadStripped),
    }
  } catch (error) {
    console.warn('Failed to parse pending signup data:', error)
    return null
  }
}

const writePendingSignupRecord = (record: PendingSignupRecord): PendingSignupSaveResult => {
  localStorage.setItem(PENDING_SIGNUP_STORAGE_KEY, JSON.stringify(record))
  return {
    stored: true,
    photoPayloadStripped: record.photoPayloadStripped,
  }
}

const clearPendingSignupRecord = (email?: string) => {
  if (!canUseStorage()) return

  if (!email) {
    localStorage.removeItem(PENDING_SIGNUP_STORAGE_KEY)
    return
  }

  const record = parsePendingSignupRecord()
  if (!record) return

  if (record.email === normalizeEmail(email)) {
    localStorage.removeItem(PENDING_SIGNUP_STORAGE_KEY)
  }
}

export const pendingSignupService = {
  save(user: User): PendingSignupSaveResult {
    if (!canUseStorage() || !user.email) {
      return { stored: false, photoPayloadStripped: false }
    }

    const normalizedEmail = normalizeEmail(user.email)
    const fullRecord: PendingSignupRecord = {
      email: normalizedEmail,
      user: {
        ...user,
        email: normalizedEmail,
      },
      savedAt: Date.now(),
      photoPayloadStripped: false,
    }

    try {
      return writePendingSignupRecord(fullRecord)
    } catch (error) {
      console.warn('Failed to persist full pending signup data, retrying without inline photos:', error)
    }

    try {
      return writePendingSignupRecord({
        ...fullRecord,
        user: {
          ...fullRecord.user,
          photoUrl: stripInlinePhotoPayloads(fullRecord.user.photoUrl),
        },
        photoPayloadStripped: true,
      })
    } catch (error) {
      console.warn('Failed to persist pending signup data:', error)
      return { stored: false, photoPayloadStripped: false }
    }
  },

  getByEmail(email: string): User | null {
    const record = parsePendingSignupRecord()
    if (!record) return null

    const normalizedEmail = normalizeEmail(email)
    const isExpired = Date.now() - record.savedAt > MAX_PENDING_SIGNUP_AGE_MS
    if (isExpired || record.email !== normalizedEmail) {
      if (isExpired) {
        clearPendingSignupRecord(record.email)
      }
      return null
    }

    return {
      ...record.user,
      email: normalizedEmail,
    }
  },

  wasPhotoPayloadStripped(email: string): boolean {
    const record = parsePendingSignupRecord()
    if (!record) return false
    return record.email === normalizeEmail(email) && record.photoPayloadStripped
  },

  clear(email?: string) {
    clearPendingSignupRecord(email)
  },
}
