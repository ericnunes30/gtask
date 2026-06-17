import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Lock, Eye, EyeOff, User, Mail } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useSetup, authService } from '@/services/backend/auth';
import { useAuthStore } from '@/stores/authStore';
import { getCachedSetup, setCachedSetup } from '@/utils/setupStatus';

const setupSchema = z.object({
  name: z.string()
    .min(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
    .max(255, { message: 'Nome deve ter no máximo 255 caracteres' }),
  email: z.string()
    .min(1, { message: 'O email é obrigatório' })
    .email({ message: 'Email inválido' }),
  password: z.string()
    .min(6, { message: 'A senha deve ter no mínimo 6 caracteres' }),
  confirmPassword: z.string()
    .min(1, { message: 'Confirme a senha' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type SetupFormValues = z.infer<typeof setupSchema>;

const SetupPage = () => {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { mutate: setupMutation, isPending } = useSetup();
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuthStore();

  // Check setup status on mount: redirect to /login if setup already completed
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const cached = getCachedSetup();
      if (cached) {
        if (!cached.needsSetup && !cancelled) {
          navigate('/login', { replace: true });
        } else {
          setIsChecking(false);
        }
        return;
      }

      try {
        const status = await authService.checkSetupStatus();
        if (!cancelled) {
          setCachedSetup(status.needsSetup);
          if (!status.needsSetup) {
            navigate('/login', { replace: true });
          } else {
            setIsChecking(false);
          }
        }
      } catch {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    };

    check();
    return () => { cancelled = true; };
  }, [navigate]);

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: SetupFormValues) => {
    setError(null);

    setupMutation(
      {
        name: values.name,
        email: values.email,
        password: values.password,
      },
      {
        onSuccess: (data) => {
          setTokens(data.accessToken, data.refreshToken);
          setUser(data.user);
          setCachedSetup(false);
          navigate('/projects', { replace: true });
        },
        onError: (err: any) => {
          const message =
            err?.response?.data?.message ||
            err?.message ||
            'Erro ao criar conta de administrador.';
          setError(message);
        },
      }
    );
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Verificando status da instalação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Bem-vindo ao Manager Group</CardTitle>
          <CardDescription className="text-center">
            Configure sua conta de administrador para começar
          </CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          placeholder="Seu nome"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <User className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <Mail className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Mínimo 6 caracteres"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar senha</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showConfirm ? 'text' : 'password'}
                          placeholder="Repita a senha"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-8 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>

            <Separator />

            <CardFooter className="flex-col gap-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isPending}
              >
                {isPending ? 'Criando conta...' : 'Criar conta e entrar'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Já tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-primary hover:underline"
                >
                  Entrar
                </button>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default SetupPage;

