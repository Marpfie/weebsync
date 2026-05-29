import { redirect } from '@tanstack/react-router'

import { getIdentity } from '../store/identity'

/**
 * Use as a TanStack Router `beforeLoad` to gate routes that need a known user.
 * Identity may come from either an OAuth login or a guest username entry
 */
export const requireIdentity = (): void => {
    if (!getIdentity()) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw redirect({ to: '/' })
    }
}
