import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class PageErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PageErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // Aqui você pode enviar o erro para um serviço de monitoramento
    // como Sentry, LogRocket, etc.
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleGoHome = () => {
    window.location.href = '/projects';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  Ops! Algo deu errado
                </h1>
                <p className="text-gray-600">
                  Não foi possível carregar esta página. Isso pode ser um problema temporário.
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-gray-100 rounded-lg p-4 text-left">
                  <h3 className="font-mono text-sm font-semibold text-red-800 mb-2">
                    Erro detalhado:
                  </h3>
                  <p className="font-mono text-xs text-red-700 break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-red-600 hover:text-red-800">
                        Stack trace
                      </summary>
                      <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </Button>

              <Button
                onClick={this.handleGoHome}
                variant="default"
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Ir para Início
              </Button>

              <Button
                onClick={this.handleReload}
                variant="secondary"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Recarregar página
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook para criar um Error Boundary funcional
 */
export const usePageErrorBoundary = () => {
  const navigate = useNavigate();

  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    console.error('Error caught by boundary:', error, errorInfo);

    // Aqui você pode adicionar lógica adicional como:
    // - Enviar para serviço de monitoramento
    // - Registrar erros específicos
    // - Redirecionar para páginas específicas baseado no tipo de erro
  };

  return { handleError };
};

export default PageErrorBoundary;