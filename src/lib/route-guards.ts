import { redirect } from '@tanstack/react-router'

import { getToken } from './anilist-auth'
import { getIdentity } from '../store/identity'

/**
 * Use as a TanStack Router `beforeLoad` to gate routes that need a known user.
 * Identity may come from either an OAuth login or a guest username entry.
 *
 * A token in sessionStorage means the Viewer query is still in-flight —
 * let the route render so RootLayout's useViewer() can resolve identity
 * without an unnecessary redirect loop.
 */
export const requireIdentity = (): void => {
    if (!getIdentity() && !getToken()) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw redirect({ to: '/' })
    }
}
