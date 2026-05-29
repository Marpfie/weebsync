import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react'

interface ErrorBoundaryProps extends PropsWithChildren {
    fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
    error: Error | null
}

const defaultFallback = (error: Error, reset: () => void): ReactNode => (
    <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
            <h1 className="text-xl font-bold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground break-words">{error.message}</p>
            <button
                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground"
                onClick={reset}
                type="button"
            >
                Try again
            </button>
        </div>
    </div>
)

/**
 * Last-resort UI safety net. Catches render-phase errors anywhere below it and
 * renders a recoverable fallback instead of leaving the user with a blank page.
 *
 * Error-boundary semantics still require this to be a class component as of
 * React 19 — there is no hook equivalent.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
    public override state: State = { error: null }

    public static getDerivedStateFromError(error: Error): State {
        return { error }
    }

    public override componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error('[ErrorBoundary]', error, info)
    }

    public override render(): ReactNode {
        if (this.state.error) {
            const render = this.props.fallback ?? defaultFallback
            return render(this.state.error, this.reset)
        }
        return this.props.children
    }

    private readonly reset = (): void => {
        this.setState({ error: null })
    }
}
