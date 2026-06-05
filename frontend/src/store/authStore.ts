import { create } from 'zustand'

type AuthState = {
  token: string | null
  setToken: (t: string | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? window.localStorage.getItem('iris_token') : null,
  setToken: (t) => {
    if (t) window.localStorage.setItem('iris_token', t)
    else window.localStorage.removeItem('iris_token')
    set({ token: t })
  },
}))
