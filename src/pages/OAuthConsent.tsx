import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type OauthClient = { name?: string | null; redirect_uri?: string | null } | null;

type AuthorizationDetails = {
  client?: OauthClient;
  scope?: string | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
} | null;

// Local typed wrapper for the beta supabase.auth.oauth namespace.
const authOauth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails; error: { message: string } | null }>;
    approveAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
    denyAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
  };
}).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Parâmetro authorization_id ausente.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await authOauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await authOauth.approveAuthorization(authorizationId)
      : await authOauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("O servidor de autorização não retornou uma URL de redirecionamento.");
      return;
    }
    window.location.href = target;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            Conectar {details?.client?.name ?? "aplicativo externo"} ao MAX SUPORTE
          </CardTitle>
          <CardDescription>
            Este aplicativo poderá usar as ferramentas habilitadas do MAX SUPORTE em seu nome, respeitando suas permissões e RLS por filial.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive">
              {error}
            </div>
          )}
          {!details && !error && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          )}
          {details && (
            <>
              <div>
                <span className="font-medium">Cliente:</span> {details.client?.name ?? "—"}
              </div>
              {details.client?.redirect_uri && (
                <div className="break-all text-muted-foreground">
                  <span className="font-medium text-foreground">Redirecionamento:</span>{" "}
                  {details.client.redirect_uri}
                </div>
              )}
              {details.scope && (
                <div className="text-muted-foreground">
                  <span className="font-medium text-foreground">Escopo:</span> {details.scope}
                </div>
              )}
              <p className="text-muted-foreground">
                Isto não substitui as políticas do sistema — o acesso continua limitado ao que seu papel e filial permitem.
              </p>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full" disabled={busy || !details} onClick={() => decide(true)}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Aprovar
          </Button>
          <Button variant="outline" className="w-full" disabled={busy || !details} onClick={() => decide(false)}>
            Cancelar conexão
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
