import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        // Could also log to a service
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', color: '#fff', textAlign: 'center', marginTop: '50px' }}>
                    <h2>😞 游戏遇到了一点问题</h2>
                    <p style={{ color: '#aaa' }}>{this.state.error && this.state.error.toString()}</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '10px 20px', background: '#d32f2f', color: 'white', border: 'none',
                            borderRadius: '4px', cursor: 'pointer', marginTop: '20px'
                        }}
                    >
                        重新加载
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
