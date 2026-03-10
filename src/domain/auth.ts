const AUTH_HASH_KEY = 'pp_auth_hash'
const AUTH_SALT_KEY = 'pp_auth_salt'
const AUTH_SESSION_KEY = 'pp_auth_session'

const toHex = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const sha256Hex = async (value: string): Promise<string> => {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return value
  }
  const data = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return toHex(hash)
}

const getSalt = (): string => {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const getAuthMode = async (): Promise<'setup' | 'locked' | 'unlocked'> => {
  const hash = localStorage.getItem(AUTH_HASH_KEY)
  if (!hash) return 'setup'
  if (hasSession()) return 'unlocked'
  return 'locked'
}

export const createAuth = async (password: string, remember: boolean): Promise<void> => {
  const salt = getSalt()
  const hash = await sha256Hex(`${salt}:${password}`)
  localStorage.setItem(AUTH_SALT_KEY, salt)
  localStorage.setItem(AUTH_HASH_KEY, hash)
  setAuthSession(true, remember)
}

export const verifyAuth = async (password: string, remember: boolean): Promise<boolean> => {
  const salt = localStorage.getItem(AUTH_SALT_KEY)
  const hash = localStorage.getItem(AUTH_HASH_KEY)
  if (!salt || !hash) return false
  const attempt = await sha256Hex(`${salt}:${password}`)
  const ok = attempt === hash
  if (ok) setAuthSession(true, remember)
  return ok
}

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_SESSION_KEY)
  sessionStorage.removeItem(AUTH_SESSION_KEY)
}

export const setAuthSession = (active: boolean, remember: boolean) => {
  if (!active) {
    clearAuthSession()
    return
  }
  if (remember) {
    localStorage.setItem(AUTH_SESSION_KEY, 'true')
    sessionStorage.removeItem(AUTH_SESSION_KEY)
  } else {
    localStorage.removeItem(AUTH_SESSION_KEY)
    sessionStorage.setItem(AUTH_SESSION_KEY, 'true')
  }
}

export const hasSession = (): boolean => {
  return localStorage.getItem(AUTH_SESSION_KEY) === 'true' || sessionStorage.getItem(AUTH_SESSION_KEY) === 'true'
}
