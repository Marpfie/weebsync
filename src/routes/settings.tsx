import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Switch } from '../components/ui/switch'
import { useAuth } from '../hooks/useAuth'
import { requireAuth } from '../lib/route-guards'
import type { Preferences } from '../store/preferences'
import { setPreference, usePreferences } from '../store/preferences'

const updatePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]): void => {
    setPreference(key, value)
}

const SettingsPage = () => {
    const { t } = useTranslation()
    const { logout } = useAuth()
    const prefs = usePreferences()

    const row = 'flex items-center justify-between py-3'
    const dividerRow = 'flex items-center justify-between py-3 border-b border-border'

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

            <section aria-labelledby="rec-settings">
                <h2
                    className="text-sm font-semibold uppercase tracking-wider mb-2 text-muted-foreground/60"
                    id="rec-settings"
                >
                    {t('settings.recSection')}
                </h2>
                <div className="rounded-xl overflow-hidden bg-card border border-border">
                    <div className="px-4">
                        <div className={dividerRow}>
                            <div>
                                <p className="text-sm font-medium">{t('settings.recMode')}</p>
                                <p className="text-xs text-muted-foreground">{t('settings.recModeDesc')}</p>
                            </div>
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
                                    <SelectItem value="friend-favourites">
                                        {t('settings.mode.friendFavourites')}
                                    </SelectItem>
                                    <SelectItem value="most-agreed">{t('settings.mode.mostAgreed')}</SelectItem>
                                    <SelectItem value="friends-only">{t('settings.mode.friendsOnly')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className={dividerRow}>
                            <div>
                                <p className="text-sm font-medium">{t('settings.includeWatching')}</p>
                                <p className="text-xs text-muted-foreground">{t('settings.includeWatchingDesc')}</p>
                            </div>
                            <Switch
                                aria-label={t('settings.includeWatching')}
                                checked={prefs.includeCurrentlyWatching}
                                onCheckedChange={(v) => {
                                    updatePreference('includeCurrentlyWatching', v)
                                }}
                            />
                        </div>

                        <div className={dividerRow}>
                            <div>
                                <p className="text-sm font-medium">{t('settings.includeReading')}</p>
                                <p className="text-xs text-muted-foreground">{t('settings.includeReadingDesc')}</p>
                            </div>
                            <Switch
                                aria-label={t('settings.includeReading')}
                                checked={prefs.includeCurrentlyReading}
                                onCheckedChange={(v) => {
                                    updatePreference('includeCurrentlyReading', v)
                                }}
                            />
                        </div>

                        <div className={row}>
                            <div>
                                <p className="text-sm font-medium">{t('settings.adultContent')}</p>
                                <p className="text-xs text-muted-foreground">{t('settings.adultContentDesc')}</p>
                            </div>
                            <Switch
                                aria-label={t('settings.adultContent')}
                                checked={prefs.includeAdultContent}
                                onCheckedChange={(v) => {
                                    updatePreference('includeAdultContent', v)
                                }}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {(prefs.dismissedAnimeIds.length > 0 || prefs.dismissedMangaIds.length > 0) && (
                <section aria-labelledby="dismissed-heading">
                    <h2
                        className="text-sm font-semibold uppercase tracking-wider mb-2 text-muted-foreground/60"
                        id="dismissed-heading"
                    >
                        {t('settings.dismissedSection')}
                    </h2>
                    <div className="rounded-xl p-4 bg-card border border-border">
                        <p className="text-sm mb-3 text-muted-foreground">
                            {t('settings.dismissedCount', {
                                anime: prefs.dismissedAnimeIds.length,
                                manga: prefs.dismissedMangaIds.length,
                            })}
                        </p>
                        <button
                            className="text-sm px-3 py-1.5 rounded-lg bg-secondary text-foreground"
                            onClick={() => {
                                updatePreference('dismissedAnimeIds', [])
                                updatePreference('dismissedMangaIds', [])
                            }}
                            type="button"
                        >
                            {t('settings.clearDismissed')}
                        </button>
                    </div>
                </section>
            )}

            <section aria-labelledby="account-heading">
                <h2
                    className="text-sm font-semibold uppercase tracking-wider mb-2 text-muted-foreground/60"
                    id="account-heading"
                >
                    {t('settings.accountSection')}
                </h2>
                <div className="rounded-xl p-4 bg-card border border-border">
                    <button
                        className="text-sm px-4 py-2 rounded-lg font-medium bg-destructive text-white"
                        onClick={logout}
                        type="button"
                    >
                        {t('settings.logout')}
                    </button>
                </div>
            </section>
        </div>
    )
}

export const Route = createFileRoute('/settings')({ beforeLoad: requireAuth, component: SettingsPage })
