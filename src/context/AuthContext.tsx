import type { FC, PropsWithChildren } from 'react'
import { useCallback, useMemo, useState } from 'react'

import { buildAuthUrl, clearToken, getToken, parseTokenFromHash, storeToken } from '../lib/anilist-auth'
import { AuthContext, type AuthContextValue, type ViewerUser } from './auth-context'

const clientId = import.meta.env.VITE_ANILIST_CLIENT_ID as string

const login = (): void => {
    globalThis.location.href = buildAuthUrl(clientId)
}

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
    const [token, setToken] = useState<null | string>(() => getToken())
    const [user, setUser] = useState<null | ViewerUser>(null)

    const setTokenAndPersist = useCallback((received: string) => {
        storeToken(received)
        setToken(received)
    }, [])

    const logout = useCallback(() => {
        clearToken()
        setToken(null)
        setUser(null)
    }, [])

    /**
     * Reads the OAuth implicit-grant token from `window.location.hash`,
     * persists it, and clears the hash so it doesn't end up in browser history.
     * Returns the token, or null if none was present.
     */
    const consumeCallbackToken = useCallback((): null | string => {
        const parsed = parseTokenFromHash(globalThis.location.hash)
        if (!parsed) return null
        storeToken(parsed)
        setToken(parsed)
        globalThis.history.replaceState(null, '', globalThis.location.pathname)
        return parsed
    }, [])

    const value = useMemo<AuthContextValue>(
        () => ({ consumeCallbackToken, login, logout, setToken: setTokenAndPersist, setUser, token, user }),
        [consumeCallbackToken, logout, setTokenAndPersist, token, user]
    )

    return <AuthContext value={value}>{children}</AuthContext>
}
