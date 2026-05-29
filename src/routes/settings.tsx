import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Checkbox } from '../components/ui/checkbox'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Switch } from '../components/ui/switch'
import { useAuth } from '../hooks/useAuth'
import { requireIdentity } from '../lib/route-guards'
import { clearIdentity, useIdentity } from '../store/identity'
import type { Preferences } from '../store/preferences'
import { mutate as mutatePrefs, setPreference, usePreferences } from '../store/preferences'

const updatePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]): void => {
    setPreference(key, value)
}

const ADDITIONAL_STATUSES = ['PAUSED', 'DROPPED', 'REPEATING'] as const

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

            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.sync.section')}</CardTitle>
                    <CardDescription>{t('settings.sync.sectionDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-border">
                    <SettingRow description={t('settings.sync.syncAnimeDesc')} title={t('settings.sync.syncAnime')}>
                        <Switch
                            aria-label={t('settings.sync.syncAnime')}
                            checked={prefs.syncAnime}
                            onCheckedChange={(v) => {
                                updatePreference('syncAnime', v)
                            }}
                        />
                    </SettingRow>
                    <SettingRow description={t('settings.sync.syncMangaDesc')} title={t('settings.sync.syncManga')}>
                        <Switch
                            aria-label={t('settings.sync.syncManga')}
                            checked={prefs.syncManga}
                            onCheckedChange={(v) => {
                                updatePreference('syncManga', v)
                            }}
                        />
                    </SettingRow>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.additionalStatuses.title')}</CardTitle>
                    <CardDescription>{t('settings.additionalStatuses.desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {(['anime', 'manga'] as const).map((scope) => {
                        const prefKey = scope === 'anime' ? 'additionalAnimeStatuses' : 'additionalMangaStatuses'
                        const current = prefs[prefKey]
                        const currentSet = new Set(current)
                        return (
                            <div className="space-y-2" key={scope}>
                                <p className="text-sm font-medium">{t(`settings.additionalStatuses.${scope}`)}</p>
                                <div className="flex flex-wrap gap-3">
                                    {ADDITIONAL_STATUSES.map((status) => {
                                        const id = `${scope}-${status}`
                                        return (
                                            <Label className="cursor-pointer" htmlFor={id} key={status}>
                                                <Checkbox
                                                    checked={currentSet.has(status)}
                                                    id={id}
                                                    onCheckedChange={(checked) => {
                                                        mutatePrefs((draft) => {
                                                            const list = draft[prefKey]
                                                            draft[prefKey] = checked
                                                                ? [...list, status]
                                                                : list.filter((s) => s !== status)
                                                            return draft
                                                        })
                                                    }}
                                                />
                                                <span className="text-muted-foreground font-normal">
                                                    {t(`settings.additionalStatuses.${status}`)}
                                                </span>
                                            </Label>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
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
