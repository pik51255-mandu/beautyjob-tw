import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-2">頁面發生問題</h2>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              請重新整理頁面。若使用瀏覽器的翻譯功能，關閉後再試一次通常可以解決。
            </p>

            {/* 스택 트레이스는 개발 환경에서만 노출한다 — 일반 방문자에게는 의미가 없고
                번역기가 그것까지 번역해 더 혼란스러워진다. */}
            {import.meta.env.DEV && this.state.error?.stack && (
              <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
                <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                  {this.state.error.stack}
                </pre>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-primary text-primary-foreground",
                  "hover:opacity-90 cursor-pointer"
                )}
              >
                <RotateCcw size={16} />
                重新整理
              </button>
              <a
                href="/"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border border-border",
                  "hover:bg-muted"
                )}
              >
                返回首頁
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
