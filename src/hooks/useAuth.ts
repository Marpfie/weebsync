import { use } from 'react'

import type { AuthContextValue } from '../context/auth-contexts'
import { AuthContext, SetTokenContext } from '../context/auth-contexts'

export const useAuth = (): AuthContextValue => {
    const context = use(AuthContext)
    if (!context) throw new Error('useAuth must be used inside AuthProvider')
    return context
}

export const useSetToken = (): ((token: string) => void) => {
    const context = use(SetTokenContext)
    if (!context) throw new Error('useSetToken must be used inside AuthProvider')
    return context
}
