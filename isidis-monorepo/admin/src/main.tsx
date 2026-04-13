import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './lib/globals.css'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', color: '#ff4444', background: '#0a0a0a', minHeight: '100vh' }}>
          <h2 style={{ marginBottom: 16 }}>Runtime Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{this.state.error.message}</pre>
          <pre style={{ marginTop: 16, opacity: 0.5, fontSize: 12 }}>{this.state.error.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
