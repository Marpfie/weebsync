import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Picks the most natural unit ("minute", "hour", "day") for a relative timestamp.
 */
export function formatRelative(
    timestampMs: number,
    now: number = Date.now()
): {
    unit: 'day' | 'hour' | 'minute'
    value: number
} {
    const diffMs = now - timestampMs
    const minutes = Math.round(diffMs / 60_000)

    if (Math.abs(minutes) < 60) {
        return { unit: 'minute', value: minutes }
    }

    const hours = Math.round(diffMs / 3_600_000)

    if (Math.abs(hours) < 24) {
        return { unit: 'hour', value: hours }
    }

    const days = Math.round(diffMs / 86_400_000)

    return { unit: 'day', value: days }
}
