import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import { useAuth } from '../../hooks/useAuth'

const AuthCallback = () => {
    const { consumeCallbackToken } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        const token = consumeCallbackToken()
        void navigate({ to: token ? '/dashboard' : '/' })
    }, [consumeCallbackToken, navigate])

    return (
        <div className="min-h-screen flex items-center justify-center">
            <p className="text-muted-foreground">Signing you in…</p>
        </div>
    )
}

export const Route = createFileRoute('/auth/callback')({ component: AuthCallback })
