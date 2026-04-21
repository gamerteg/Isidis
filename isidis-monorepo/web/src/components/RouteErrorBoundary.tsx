import { Component, ReactNode } from 'react'

class RouteErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    state = { hasError: false }

    static getDerivedStateFromError() {
        return { hasError: true }
    }

    render() {
        if (this.state.hasError) return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
                <p className="text-muted-foreground">Algo deu errado. Tente recarregar a página.</p>
                <button
                    className="text-primary underline text-sm"
                    onClick={() => window.location.reload()}
                >
                    Recarregar
                </button>
            </div>
        )
        return this.props.children
    }
}

export default RouteErrorBoundary
