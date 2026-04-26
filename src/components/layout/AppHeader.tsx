import { Link } from '@tanstack/react-router'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../../hooks/useAuth'

export const AppHeader: FC = () => {
    const { t } = useTranslation()
    const { logout, user } = useAuth()

    return (
        <header className="flex items-center justify-between px-4 py-3 shrink-0 bg-card border-b border-border">
            <Link className="text-lg font-bold tracking-tight" to="/dashboard">
                {t('nav.title1')}
                <span className="text-primary">{t('nav.title2')}</span>
            </Link>

            <div className="flex items-center gap-3">
                {user && (
                    <div className="flex items-center gap-2">
                        {user.avatar?.medium && (
                            <img
                                alt={t('header.avatarAlt', { name: user.name })}
                                className="rounded-full"
                                height={28}
                                src={user.avatar.medium}
                                width={28}
                            />
                        )}
                        <span className="text-sm hidden sm:block text-muted-foreground">{user.name}</span>
                    </div>
                )}
                <button
                    className="text-xs px-2.5 py-1.5 rounded-lg transition-colors bg-secondary text-muted-foreground"
                    onClick={logout}
                    type="button"
                >
                    {t('header.logout')}
                </button>
            </div>
        </header>
    )
}
