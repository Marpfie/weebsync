import { Link } from '@tanstack/react-router'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../../hooks/useAuth'
import { clearIdentity, useIdentity } from '../../store/identity'

export const AppHeader: FC = () => {
    const { t } = useTranslation()
    const { logout } = useAuth()
    const identity = useIdentity()

    const handleSignOut = () => {
        if (identity?.mode === 'authed') {
            logout()
        } else {
            clearIdentity()
        }
    }

    return (
        <header className="flex items-center justify-between px-4 py-3 shrink-0 bg-card border-b border-border">
            <Link className="text-lg font-bold tracking-tight" to="/dashboard">
                {t('nav.title1')}
                <span className="text-primary">{t('nav.title2')}</span>
            </Link>

            <div className="flex items-center gap-3">
                {identity && (
                    <div className="flex items-center gap-2">
                        {identity.avatarUrl && (
                            <img
                                alt={t('header.avatarAlt', { name: identity.name })}
                                className="rounded-full"
                                height={28}
                                src={identity.avatarUrl}
                                width={28}
                            />
                        )}
                        <span className="text-sm hidden sm:block text-muted-foreground">{identity.name}</span>
                        {identity.mode === 'guest' && (
                            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                                {t('header.guestBadge')}
                            </span>
                        )}
                    </div>
                )}
                <button
                    className="text-xs px-2.5 py-1.5 rounded-lg transition-colors bg-secondary text-muted-foreground"
                    onClick={handleSignOut}
                    type="button"
                >
                    {identity?.mode === 'guest' ? t('header.switchUser') : t('header.logout')}
                </button>
            </div>
        </header>
    )
}
