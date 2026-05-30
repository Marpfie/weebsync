import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAuth } from '../hooks/useAuth'
import { useUserByName } from '../hooks/useUserByName'
import { getToken } from '../lib/anilist-auth'
import { getIdentity, setGuestIdentity } from '../store/identity'

/** Debounce ms before firing the AniList username lookup. */
const LOOKUP_DEBOUNCE_MS = 600

const useDebouncedValue = <T,>(value: T, delay: number): T => {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const id = setTimeout(() => {
            setDebounced(value)
        }, delay)
        return () => {
            clearTimeout(id)
        }
    }, [value, delay])
    return debounced
}

const LandingPage = () => {
    const { t } = useTranslation()
    const { login } = useAuth()
    const navigate = useNavigate()

    const [username, setUsername] = useState('')
    const debouncedName = useDebouncedValue(username, LOOKUP_DEBOUNCE_MS)
    const lookup = useUserByName(debouncedName)

    const trimmed = username.trim()
    const showLookup = trimmed.length > 0 && debouncedName.trim() === trimmed
    const matchedUser = lookup.data ?? null
    // AniList's User(search:) does fuzzy matching, so "marpf" might return "marpfie".
    // Only treat it as a real match when the typed name equals the result (case-
    // insensitive). Otherwise we surface it as a clickable suggestion instead.
    const isExactMatch = matchedUser != null && matchedUser.name.toLowerCase() === trimmed.toLowerCase()
    const lookupFailed = showLookup && !lookup.loading && !lookup.error && matchedUser == null

    const handleContinue = () => {
        if (!matchedUser || !isExactMatch) return
        setGuestIdentity({
            avatarUrl: matchedUser.avatar?.medium ?? null,
            name: matchedUser.name,
            userId: matchedUser.id,
        })
        void navigate({ to: '/dashboard' })
    }

    const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault()
        handleContinue()
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
            <div aria-hidden="true" className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20 bg-primary" />
                <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-10 bg-primary" />
            </div>

            <div className="relative z-10 max-w-lg w-full">
                <h1 className="text-5xl font-bold tracking-tight mb-2">
                    {t('nav.title1')}
                    <span className="text-primary">{t('nav.title2')}</span>
                </h1>
                <p className="text-xl mb-8 font-light text-muted-foreground">{t('login.tagline')}</p>

                <form className="rounded-2xl p-6 mb-4 text-left bg-card border border-border" onSubmit={handleSubmit}>
                    <Label className="mb-2" htmlFor="anilist-username">
                        {t('login.usernameLabel')}
                    </Label>
                    <Input
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                        className="h-11 text-base"
                        id="anilist-username"
                        onChange={(event) => {
                            setUsername(event.target.value)
                        }}
                        placeholder={t('login.usernamePlaceholder')}
                        spellCheck={false}
                        type="text"
                        value={username}
                    />

                    <div aria-live="polite" className="min-h-12 mt-3 text-sm">
                        {showLookup && lookup.loading ? (
                            <p className="text-muted-foreground">{t('login.lookupLoading')}</p>
                        ) : null}
                        {matchedUser && isExactMatch ? (
                            <div className="flex items-center gap-3">
                                <Avatar size="lg">
                                    {matchedUser.avatar?.medium && (
                                        <AvatarImage alt="" src={matchedUser.avatar.medium} />
                                    )}
                                    <AvatarFallback>{matchedUser.name[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{matchedUser.name}</span>
                            </div>
                        ) : null}
                        {matchedUser && !isExactMatch ? (
                            <Button
                                aria-label={t('login.useSuggestion', { name: matchedUser.name })}
                                className="h-auto w-full justify-start p-1 -m-1"
                                onClick={() => {
                                    setUsername(matchedUser.name)
                                }}
                                variant="ghost"
                            >
                                <Avatar size="lg">
                                    {matchedUser.avatar?.medium && (
                                        <AvatarImage alt="" src={matchedUser.avatar.medium} />
                                    )}
                                    <AvatarFallback>{matchedUser.name[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="flex flex-col">
                                    <span className="font-medium">{matchedUser.name}</span>
                                    <span className="text-xs text-muted-foreground">{t('login.didYouMean')}</span>
                                </span>
                            </Button>
                        ) : null}
                        {lookupFailed ? <p className="text-destructive">{t('login.lookupNotFound')}</p> : null}
                        {lookup.error ? <p className="text-destructive">{t('login.lookupError')}</p> : null}
                    </div>

                    <Button className="w-full mt-2 h-11 text-base" disabled={!isExactMatch} type="submit">
                        {t('login.continueAsGuest')}
                    </Button>
                </form>

                <Button className="text-sm text-muted-foreground" onClick={login} variant="link">
                    {t('login.loginInstead')}
                </Button>

                <Card className="mt-8 p-6 text-left">
                    <h2 className="font-semibold mb-3">{t('login.howItWorks')}</h2>
                    <ol className="space-y-2 text-sm text-muted-foreground">
                        <li>1. {t('login.step1')}</li>
                        <li>2. {t('login.step2')}</li>
                        <li>3. {t('login.step3')}</li>
                        <li>4. {t('login.step4')}</li>
                    </ol>
                </Card>

                <p className="mt-4 text-xs text-muted-foreground/60">{t('login.privacyNote')}</p>
            </div>
        </div>
    )
}

export const Route = createFileRoute('/')({
    beforeLoad: () => {
        // If a session already exists, skip the landing page entirely.
        if (getIdentity() || getToken()) {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw redirect({ to: '/dashboard' })
        }
    },
    component: LandingPage,
})
