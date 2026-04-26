import { createContext } from 'react'

export interface AuthContextValue {
    login: () => void
    logout: () => void
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

export const SetTokenContext = createContext<((token: string) => void) | null>(null)
