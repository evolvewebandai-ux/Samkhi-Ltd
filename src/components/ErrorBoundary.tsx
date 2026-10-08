import React, { ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Home, MessageSquare } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });
    console.error('Uncaught boundary error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden font-sans">
          {/* Visual ambience background */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="max-w-xl w-full text-center relative z-10 space-y-8 bg-slate-950/60 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-[2rem] shadow-2xl">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                <AlertOctagon size={36} />
              </div>
              <p className="text-xs font-black tracking-widest text-rose-500 uppercase mt-2">Application Boundary Fault</p>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Something went unexpected</h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                An internal state conflict occurred. If this remains persistent, please contact Samkhi tech support.
              </p>
            </div>

            {/* Error Detail Diagnostic Panel */}
            {this.state.error && (
              <div className="overflow-x-auto text-left bg-black/40 border border-white/5 rounded-xl p-4 max-h-40 no-scrollbar">
                <p className="text-xs font-bold text-rose-400 font-mono">Error: {this.state.error.message}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[10px] text-slate-500 font-mono mt-2 whitespace-pre-wrap leading-tight">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-6 py-3 border border-white/10 hover:bg-white/5 hover:border-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
              >
                <Home size={14} />
                Return Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-[#121212] rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                <RotateCcw size={14} strokeWidth={2.5} />
                Reload Page
              </button>
            </div>

            <div className="pt-2">
              <a 
                href="/contact" 
                className="text-xs text-slate-500 hover:text-white transition-colors inline-flex items-center gap-1 font-semibold"
              >
                <MessageSquare size={12} />
                Report this issue to support desk
              </a>
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-600 font-mono font-bold">
            Samkhi Limited Quality Guarantee
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
