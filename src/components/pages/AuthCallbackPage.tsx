import { useNavigate } from '@tanstack/react-router'
import type { FC } from 'react'
import { useEffect } from 'react'

import { useSetToken } from '../../hooks/useAuth'
import { parseTokenFromHash } from '../../lib/anilist-auth'

export const AuthCallbackPage: FC = () => {
    const setToken = useSetToken()
    const navigate = useNavigate()

    useEffect(() => {
        const token = parseTokenFromHash(globalThis.location.hash)

        if (token) {
            setToken(token)
            // Clear the hash so the token isn't in browser history
            globalThis.history.replaceState(null, '', globalThis.location.pathname)
            void navigate({ to: '/dashboard' })
            return
        }

        void navigate({ to: '/' })
    }, [setToken, navigate])

    return (
        <div className="min-h-screen flex items-center justify-center">
            <p className="text-muted-foreground">Signing you in…</p>
        </div>
    )
}
