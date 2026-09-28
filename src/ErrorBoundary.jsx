import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: '#e74c3c', direction: 'ltr', textAlign: 'left', background: '#f8d7da', minHeight: '100vh' }}>
          <h2>عذراً، حدث خطأ غير متوقع!</h2>
          <p>يرجى تصوير هذه الشاشة وإرسالها للمطور:</p>
          <hr />
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px', background: '#fff', padding: '15px', borderRadius: '8px' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
