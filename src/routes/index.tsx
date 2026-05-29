import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../hooks/useAuth'

const LoginPage = () => {
    const { t } = useTranslation()
    const { login, token } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (token) void navigate({ to: '/dashboard' })
    }, [token, navigate])

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
            <div aria-hidden="true" className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20 bg-primary" />
                <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-10 bg-primary" />
            </div>

            <div className="relative z-10 max-w-lg">
                <h1 className="text-5xl font-bold tracking-tight mb-2">
                    {t('nav.title1')}
                    <span className="text-primary">{t('nav.title2')}</span>
                </h1>
                <p className="text-xl mb-8 font-light text-muted-foreground">{t('login.tagline')}</p>

                <div className="rounded-2xl p-6 mb-8 text-left bg-card border border-border">
                    <h2 className="font-semibold mb-3">{t('login.howItWorks')}</h2>
                    <ol className="space-y-2 text-sm text-muted-foreground">
                        <li>1. {t('login.step1')}</li>
                        <li>2. {t('login.step2')}</li>
                        <li>3. {t('login.step3')}</li>
                        <li>4. {t('login.step4')}</li>
                    </ol>
                </div>

                <button
                    className="w-full py-3.5 px-6 rounded-xl font-semibold text-base text-primary-foreground bg-primary transition-all duration-200 hover:opacity-90 active:scale-95"
                    onClick={login}
                    type="button"
                >
                    {t('login.loginButton')}
                </button>

                <p className="mt-4 text-xs text-muted-foreground/60">{t('login.privacyNote')}</p>
            </div>
        </div>
    )
}

export const Route = createFileRoute('/')({ component: LoginPage })
