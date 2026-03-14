'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: (error: Error, reset: () => void) => React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, () => this.setState({ hasError: false, error: null }))
      }

      return (
        <div className="min-h-screen bg-bg text-text-primary flex items-center justify-center px-4">
          <div className="max-w-md w-full space-y-6">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-display font-semibold">Er ging iets mis</h1>
              <p className="text-text-muted text-sm">{this.state.error.message}</p>
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="w-full bg-accent text-white rounded-lg px-4 py-2.5 font-medium hover:bg-accent/90 transition-colors"
            >
              Opnieuw proberen
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
