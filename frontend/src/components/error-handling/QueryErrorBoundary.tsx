import React from 'react'
import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'

interface ErrorFallbackProps {
  error: Error
  resetError: () => void
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  React.useEffect(() => {
    // Logar erro para monitoramento
    console.error('Query Error:', error)

    // Exibir toast para erros de rede
    if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      toast({
        title: 'Erro de Conexão',
        description: 'Verifique sua conexão com a internet',
        variant: 'destructive',
      })
    }
  }, [error])

  const isNetworkError = error.message.includes('Network Error') || error.message.includes('fetch')
  const isAuthError = error.message.includes('401') || error.message.includes('Unauthorized')

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <CardTitle className="text-lg">
          {isNetworkError ? 'Erro de Conexão' : isAuthError ? 'Sessão Expirada' : 'Ocorreu um Erro'}
        </CardTitle>
        <CardDescription className="text-sm">
          {isNetworkError
            ? 'Não foi possível conectar ao servidor. Verifique sua conexão.'
            : isAuthError
            ? 'Sua sessão expirou. Por favor, faça login novamente.'
            : error.message || 'Não foi possível carregar os dados.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isAuthError && (
          <Button
            className="w-full"
            onClick={() => {
              // Redirecionar para login
              window.location.href = '/login'
            }}
          >
            Fazer Login Novamente
          </Button>
        )}
        <Button
          variant="outline"
          className="w-full"
          onClick={resetError}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar Novamente
        </Button>
      </CardContent>
    </Card>
  )
}

interface QueryErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
}

export const QueryErrorBoundary: React.FC<QueryErrorBoundaryProps> = ({
  children,
  fallback: FallbackComponent = ErrorFallback,
}) => {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          FallbackComponent={FallbackComponent}
          onReset={reset}
          onError={(error, info) => {
            // Enviar erro para serviço de monitoramento (ex: Sentry)
            console.error('Query Error Boundary caught:', error, info)
          }}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}

// Componente para erros específicos de query
interface QueryErrorProps {
  error: unknown
  reset?: () => void
  className?: string
}

export const QueryError: React.FC<QueryErrorProps> = ({ error, reset, className }) => {
  if (!error) return null

  const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
  const isNetworkError = errorMessage.includes('Network Error') || errorMessage.includes('fetch')
  const isAuthError = errorMessage.includes('401') || errorMessage.includes('Unauthorized')

  return (
    <div className={`p-4 rounded-md border border-destructive/20 bg-destructive/5 ${className}`}>
      <div className="flex items-center space-x-2 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">
          {isNetworkError
            ? 'Erro de conexão'
            : isAuthError
            ? 'Sessão expirada'
            : 'Erro ao carregar dados'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {isNetworkError
          ? 'Verifique sua conexão com a internet'
          : isAuthError
          ? 'Por favor, faça login novamente'
          : errorMessage}
      </p>
      {reset && (
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          className="mt-2 h-6 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

// Hook personalizado para tratamento de erros
export const useQueryErrorHandler = () => {
  const handleError = React.useCallback((error: unknown) => {
    if (error instanceof Error) {
      // Tratamento específico por tipo de erro
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        // Redirecionar para login
        window.location.href = '/login'
        return
      }

      if (error.message.includes('Network Error') || error.message.includes('fetch')) {
        toast({
          title: 'Erro de Conexão',
          description: 'Verifique sua conexão com a internet',
          variant: 'destructive',
        })
        return
      }

      // Erro genérico
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro inesperado',
        variant: 'destructive',
      })
    }
  }, [])

  return { handleError }
}