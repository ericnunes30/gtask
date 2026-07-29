import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useBackendServices } from "@/hooks/useBackendServices";
import { useAuth } from "@/contexts/adapters/AuthContextAdapter";

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  email: z.string().email({
    message: "Insira um email válido.",
  }),
});

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, {
      message: "Informe a senha atual.",
    }),
    newPassword: z.string().min(6, {
      message: "A nova senha deve ter pelo menos 6 caracteres.",
    }),
    confirmPassword: z.string().min(6, {
      message: "Confirme a nova senha.",
    }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem.",
  });

const Settings = () => {
  const [isDarkMode, setIsDarkMode] = useState(
    window.localStorage.getItem("theme") === "dark",
  );

  const services = useBackendServices();
  const { user } = useAuth();

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    profileForm.reset({
      name: user?.name || "",
      email: user?.email || "",
    });
  }, [user, profileForm]);

  const handleDarkModeToggle = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark");
      window.localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      window.localStorage.setItem("theme", "light");
    }
  };

  const updateProfile = services.profile.useUpdateProfile();
  const changePassword = services.profile.useChangePassword();

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "UN";

  async function onSubmit(data: z.infer<typeof profileFormSchema>) {
    if (!user?.id) {
      toast({
        title: "Erro",
        description:
          "Usuário não autenticado. Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateProfile.mutateAsync({ userId: user.id, data });
      toast({
        title: "Perfil atualizado",
        description: "As alterações no seu perfil foram salvas com sucesso.",
      });
    } catch {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    }
  }

  async function onSubmitPassword(data: z.infer<typeof passwordFormSchema>) {
    if (!user?.id) {
      toast({
        title: "Erro",
        description:
          "Usuário não autenticado. Não foi possível alterar a senha.",
        variant: "destructive",
      });
      return;
    }
    try {
      await changePassword.mutateAsync({
        userId: user.id,
        newPassword: data.newPassword,
      });
      toast({
        title: "Senha atualizada",
        description: "Sua senha foi alterada com sucesso.",
      });
      passwordForm.reset();
    } catch {
      toast({
        title: "Erro ao alterar senha",
        description: "Não foi possível alterar sua senha.",
        variant: "destructive",
      });
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header com Avatar */}
        <div className="flex items-center gap-4 mb-10">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {user?.name || "Usuário"}
            </h1>
            <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
          </div>
        </div>

        <div className="space-y-10">
          {/* Perfil */}
          <section>
            <div className="mb-5">
              <h2 className="text-base font-medium">Perfil</h2>
              <p className="text-sm text-muted-foreground">
                Atualize seus dados de perfil e informações de conta.
              </p>
            </div>
            <Form {...profileForm}>
              <form
                onSubmit={profileForm.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal text-muted-foreground">
                        Nome
                      </FormLabel>
                      <FormControl>
                        <Input {...field} className="h-10 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal text-muted-foreground">
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input {...field} className="h-10 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" size="sm" className="rounded-lg">
                  Salvar alterações
                </Button>
              </form>
            </Form>
          </section>

          <div className="border-t" />

          {/* Aparência */}
          <section>
            <div className="mb-5">
              <h2 className="text-base font-medium">Aparência</h2>
              <p className="text-sm text-muted-foreground">
                Personalize a aparência da interface.
              </p>
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                {isDarkMode ? (
                  <Moon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Sun className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm">Modo Escuro</p>
                  <p className="text-xs text-muted-foreground">
                    Ative o modo escuro para reduzir o cansaço visual.
                  </p>
                </div>
              </div>
              <Switch
                checked={isDarkMode}
                onCheckedChange={handleDarkModeToggle}
              />
            </div>
          </section>

          <div className="border-t" />

          {/* Segurança */}
          <section>
            <div className="mb-5">
              <h2 className="text-base font-medium">Segurança</h2>
              <p className="text-sm text-muted-foreground">
                Atualize sua senha de acesso para manter sua conta protegida.
              </p>
            </div>
            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
                className="space-y-4"
              >
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal text-muted-foreground">
                        Senha Atual
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          {...field}
                          className="h-10 rounded-lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-normal text-muted-foreground">
                          Nova Senha
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            {...field}
                            className="h-10 rounded-lg"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-normal text-muted-foreground">
                          Confirmar Nova Senha
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            {...field}
                            className="h-10 rounded-lg"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" size="sm" className="rounded-lg">
                  Alterar Senha
                </Button>
              </form>
            </Form>
          </section>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
