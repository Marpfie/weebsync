import { createContext } from 'react'

export interface AuthContextValue {
    consumeCallbackToken: () => null | string
    login: () => void
    logout: () => void
    setToken: (token: string) => void
    setUser: (user: ViewerUser) => void
    token: null | string
    user: null | ViewerUser
}

export interface ViewerUser {
    avatar?: null | { medium?: null | string }
    id: number
    name: string
    siteUrl?: null | string
}

export const AuthContext = createContext<AuthContextValue | null>(null)
