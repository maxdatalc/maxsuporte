import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

export default function ConfiguracoesCRM() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState<any>({
    cor_primaria: "#C4161C", logo_url: "", header_html: "", footer_html: "",
    proposta_template_html: "", contrato_instrucoes_padrao: "",
    texto_validade_proposta: "Esta proposta tem validade de 15 dias.",
    texto_condicoes_comerciais_padrao: "", texto_observacoes_padrao: "",
  });

  useEffect(() => { fetch(); }, []);

  async function fetch() {
    setLoading(true);
    const { data } = await supabase.from("crm_settings").select("*").maybeSingle();
    if (data) setS(data);
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    const { data: existing } = await supabase.from("crm_settings").select("id").maybeSingle();
    const payload = { ...s }; delete payload.id; delete payload.updated_at;
    const { error } = existing
      ? await supabase.from("crm_settings").update(payload).eq("id", existing.id)
      : await supabase.from("crm_settings").insert([payload]);
    setSaving(false);
    if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); return; }
    toast({ title: "Configurações salvas" });
  }

  async function uploadLogo(file: File) {
    const path = `logo/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("crm-assets").upload(path, file, { upsert: true });
    if (error) { toast({ variant: "destructive", title: "Erro no upload", description: error.message }); return; }
    const { data: { publicUrl } } = supabase.storage.from("crm-assets").getPublicUrl(path);
    setS({ ...s, logo_url: publicUrl });
    toast({ title: "Logo enviado" });
  }

  if (loading) return <DashboardLayout><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Configurações do CRM</h1>
          <p className="text-sm text-muted-foreground">Personalize a proposta comercial e textos padrão</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Identidade da proposta</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div><Label>Cor primária</Label><Input type="color" value={s.cor_primaria || "#C4161C"} onChange={(e) => setS({ ...s, cor_primaria: e.target.value })} /></div>
              <div>
                <Label>Logo</Label>
                <div className="flex items-center gap-2">
                  <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                  {s.logo_url && <img src={s.logo_url} alt="logo" className="h-10" />}
                </div>
              </div>
            </div>
            <div><Label>Cabeçalho (HTML/texto)</Label><Textarea rows={2} value={s.header_html || ""} onChange={(e) => setS({ ...s, header_html: e.target.value })} /></div>
            <div><Label>Rodapé (HTML/texto)</Label><Textarea rows={2} value={s.footer_html || ""} onChange={(e) => setS({ ...s, footer_html: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Textos padrão da proposta</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Validade da proposta</Label><Input value={s.texto_validade_proposta || ""} onChange={(e) => setS({ ...s, texto_validade_proposta: e.target.value })} /></div>
            <div><Label>Condições comerciais padrão</Label><Textarea rows={3} value={s.texto_condicoes_comerciais_padrao || ""} onChange={(e) => setS({ ...s, texto_condicoes_comerciais_padrao: e.target.value })} /></div>
            <div><Label>Observações padrão</Label><Textarea rows={3} value={s.texto_observacoes_padrao || ""} onChange={(e) => setS({ ...s, texto_observacoes_padrao: e.target.value })} /></div>
            <div><Label>Template HTML (opcional)</Label><Textarea rows={4} value={s.proposta_template_html || ""} onChange={(e) => setS({ ...s, proposta_template_html: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Documento de assinatura</CardTitle></CardHeader>
          <CardContent>
            <div><Label>Instruções padrão</Label><Textarea rows={3} value={s.contrato_instrucoes_padrao || ""} onChange={(e) => setS({ ...s, contrato_instrucoes_padrao: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar configurações</Button>
      </div>
    </DashboardLayout>
  );
}
