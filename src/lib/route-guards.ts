import { redirect } from '@tanstack/react-router'

import { getToken } from '../lib/anilist-auth'

/**
 * Use as a TanStack Router `beforeLoad` to gate protected routes.
 * Bounces unauthenticated visitors to `/`. Pages no longer need their own
 * `useEffect(() => { if (!token) navigate(...) })` dance.
 */
export const requireAuth = (): void => {
    if (!getToken()) {
        // `redirect` returns a non-Error sentinel that TanStack Router intercepts.
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw redirect({ to: '/' })
    }
}
