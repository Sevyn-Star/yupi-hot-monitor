import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050510] flex items-center justify-center p-6">
          <div className="max-w-md text-center p-8 rounded-2xl border border-red-500/20 bg-red-500/5">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" />
            <h1 className="text-lg font-medium text-white mb-2">页面出错了</h1>
            <p className="text-sm text-slate-500 mb-4">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
