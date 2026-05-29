import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Switch } from '../components/ui/switch'
import { useAuth } from '../hooks/useAuth'
import { requireIdentity } from '../lib/route-guards'
import { clearIdentity, useIdentity } from '../store/identity'
import type { Preferences } from '../store/preferences'
import { setPreference, usePreferences } from '../store/preferences'

const updatePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]): void => {
    setPreference(key, value)
}

interface SettingRowProps {
    children: React.ReactNode
    description: string
    title: string
}

const SettingRow: React.FC<SettingRowProps> = ({ children, description, title }) => (
    <div className="flex items-center justify-between gap-4 py-3">
        <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {children}
    </div>
)

const SettingsPage = () => {
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
    const prefs = usePreferences()

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.recSection')}</CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-border">
                    <SettingRow description={t('settings.recModeDesc')} title={t('settings.recMode')}>
                        <Select
                            onValueChange={(value) => {
                                updatePreference('recommendationMode', value as Preferences['recommendationMode'])
                            }}
                            value={prefs.recommendationMode}
                        >
                            <SelectTrigger aria-label={t('settings.recModeAriaLabel')}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="friend-favourites">{t('settings.mode.friendFavourites')}</SelectItem>
                                <SelectItem value="most-agreed">{t('settings.mode.mostAgreed')}</SelectItem>
                                <SelectItem value="friends-only">{t('settings.mode.friendsOnly')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </SettingRow>
                    <SettingRow description={t('settings.includeWatchingDesc')} title={t('settings.includeWatching')}>
                        <Switch
                            aria-label={t('settings.includeWatching')}
                            checked={prefs.includeCurrentlyWatching}
                            onCheckedChange={(v) => {
                                updatePreference('includeCurrentlyWatching', v)
                            }}
                        />
                    </SettingRow>
                    <SettingRow description={t('settings.includeReadingDesc')} title={t('settings.includeReading')}>
                        <Switch
                            aria-label={t('settings.includeReading')}
                            checked={prefs.includeCurrentlyReading}
                            onCheckedChange={(v) => {
                                updatePreference('includeCurrentlyReading', v)
                            }}
                        />
                    </SettingRow>
                    <SettingRow description={t('settings.adultContentDesc')} title={t('settings.adultContent')}>
                        <Switch
                            aria-label={t('settings.adultContent')}
                            checked={prefs.includeAdultContent}
                            onCheckedChange={(v) => {
                                updatePreference('includeAdultContent', v)
                            }}
                        />
                    </SettingRow>
                </CardContent>
            </Card>

            {(prefs.dismissedAnimeIds.length > 0 || prefs.dismissedMangaIds.length > 0) && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('settings.dismissedSection')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            {t('settings.dismissedCount', {
                                anime: prefs.dismissedAnimeIds.length,
                                manga: prefs.dismissedMangaIds.length,
                            })}
                        </p>
                        <Button
                            onClick={() => {
                                updatePreference('dismissedAnimeIds', [])
                                updatePreference('dismissedMangaIds', [])
                            }}
                            size="sm"
                            variant="secondary"
                        >
                            {t('settings.clearDismissed')}
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.accountSection')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleSignOut} variant="destructive">
                        {identity?.mode === 'guest' ? t('settings.switchUser') : t('settings.logout')}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}

export const Route = createFileRoute('/settings')({ beforeLoad: requireIdentity, component: SettingsPage })
