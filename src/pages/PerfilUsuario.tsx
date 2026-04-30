import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AvatarUpload } from "@/components/AvatarUpload";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function PerfilUsuario() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  if (!user || !profile) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const handleSaveName = async () => {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Nome inválido" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name: name.trim() })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: "Nome atualizado!" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações de contato e foto de perfil</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Foto de Perfil</CardTitle>
            <CardDescription>JPG ou PNG, até 5MB</CardDescription>
          </CardHeader>
          <CardContent>
            <AvatarUpload
              userId={user.id}
              currentUrl={profile.avatar_url}
              name={profile.name}
              size="lg"
              onUploaded={() => refreshProfile()}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados de Contato</CardTitle>
            <CardDescription>Atualize seu nome de exibição</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" value={profile.email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome de contato</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveName} disabled={saving || name === profile.name}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar alterações
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
