import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught runtime error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '28px',
          margin: '24px auto',
          maxWidth: '640px',
          background: '#FFFBEB',
          border: '1.5px solid #F59E0B',
          borderRadius: '12px',
          color: '#92400E',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginTop: 0, marginBottom: '8px' }}>
            Application Encountered an Error
          </h3>
          <p style={{ fontSize: '13px', lineHeight: 1.5, marginBottom: '16px' }}>
            {this.state.error?.message || String(this.state.error)}
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                padding: '9px 18px',
                borderRadius: '6px',
                border: 'none',
                background: '#B88B4A',
                color: '#FFFFFF',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: '9px 18px',
                borderRadius: '6px',
                border: '1px solid #D97706',
                background: '#FFFFFF',
                color: '#92400E',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
