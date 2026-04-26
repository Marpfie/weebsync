import type { FC, PropsWithChildren } from 'react'
import { useCallback, useMemo, useState } from 'react'

import { buildAuthUrl, clearToken, getToken, storeToken } from '../lib/anilist-auth'
import type { ViewerUser } from './auth-contexts'
import { AuthContext, SetTokenContext } from './auth-contexts'

const clientId = import.meta.env.VITE_ANILIST_CLIENT_ID as string
const login = () => {
    globalThis.location.href = buildAuthUrl(clientId)
}

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
    const [token, setToken] = useState<null | string>(() => getToken())
    const [user, setUser] = useState<null | ViewerUser>(null)

    const logout = useCallback(() => {
        clearToken()
        setToken(null)
        setUser(null)
    }, [])

    const handleSetToken = useCallback((received: string) => {
        storeToken(received)
        setToken(received)
    }, [])

    const authValue = useMemo(() => ({ login, logout, setUser, token, user }), [logout, token, user])

    return (
        <AuthContext value={authValue}>
            <SetTokenContext value={handleSetToken}>{children}</SetTokenContext>
        </AuthContext>
    )
}
