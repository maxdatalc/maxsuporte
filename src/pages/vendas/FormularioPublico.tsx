import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";
import { maskCNPJ, maskCPF, maskPhone } from "@/lib/crm/format";
import { SISTEMAS, MODULOS_ADICIONAIS } from "@/lib/crm/types";

export default function FormularioPublico() {
  const { dealId, token } = useParams<{ dealId: string; token: string }>();
  const { toast } = useToast();
  const [data, setData] = useState<any>({ sistema_contratado: [], modulos_adicionais: [] });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!data.razao_social || !data.cnpj || !data.responsavel_nome) {
      toast({ variant: "destructive", title: "Preencha os campos obrigatórios" }); return;
    }
    setSubmitting(true);
    const { data: res, error: err } = await supabase.functions.invoke("submit-crm-form", {
      body: { deal_id: dealId, token, data },
    });
    setSubmitting(false);
    if (err || (res as any)?.error) { setError((res as any)?.error || err?.message || "Erro ao enviar"); return; }
    setDone(true);
  }

  if (done) return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md text-center">
        <CardContent className="space-y-3 p-8">
          <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
          <h1 className="text-2xl font-bold">Obrigado!</h1>
          <p className="text-muted-foreground">Seus dados foram enviados com sucesso. Em breve nossa equipe entrará em contato.</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Formulário de Cadastro</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados para iniciarmos sua implantação</p>
        </div>

        {error && <Card className="border-destructive"><CardContent className="p-4 text-destructive">{error}</CardContent></Card>}

        <Card>
          <CardHeader><CardTitle>Dados da Empresa</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <F label="Razão Social *" k="razao_social" data={data} setData={setData} />
            <F label="Nome Fantasia" k="nome_fantasia" data={data} setData={setData} />
            <F label="CNPJ *" k="cnpj" data={data} setData={setData} mask={maskCNPJ} />
            <F label="E-mail" k="email_empresa" data={data} setData={setData} type="email" />
            <F label="Telefone Fixo" k="telefone_fixo" data={data} setData={setData} mask={maskPhone} />
            <F label="Telefone Celular" k="telefone_celular" data={data} setData={setData} mask={maskPhone} />
            <F label="Regime tributário" k="regime_tributario" data={data} setData={setData} />
            <F label="Qtd. computadores" k="quantidade_computadores" data={data} setData={setData} type="number" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Responsável pela Assinatura</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <F label="Nome *" k="responsavel_nome" data={data} setData={setData} />
            <F label="CPF" k="responsavel_cpf" data={data} setData={setData} mask={maskCPF} />
            <F label="RG" k="responsavel_rg" data={data} setData={setData} />
            <F label="E-mail" k="responsavel_email" data={data} setData={setData} type="email" />
            <F label="Telefone Celular" k="responsavel_telefone_celular" data={data} setData={setData} mask={maskPhone} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Implantação</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <F label="Sistema atual" k="sistema_atual" data={data} setData={setData} />
            <div>
              <Label>Migrar banco de dados</Label>
              <Select value={data.migrar_banco_dados || ""} onValueChange={(v) => setData({ ...data, migrar_banco_dados: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem><SelectItem value="nao">Não</SelectItem><SelectItem value="a_definir">A definir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Multi label="Sistema de interesse" options={SISTEMAS as any} value={data.sistema_contratado || []} onChange={(v) => setData({ ...data, sistema_contratado: v })} />
            <Multi label="Módulos adicionais" options={MODULOS_ADICIONAIS as any} value={data.modulos_adicionais || []} onChange={(v) => setData({ ...data, modulos_adicionais: v })} />
            <div className="md:col-span-2"><Label>Particularidades / Observações</Label><Textarea rows={4} value={data.particularidades_identificadas || ""} onChange={(e) => setData({ ...data, particularidades_identificadas: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar</Button>
      </form>
    </div>
  );
}

function F({ label, k, data, setData, type, mask }: { label: string; k: string; data: any; setData: (v: any) => void; type?: string; mask?: (v: string) => string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type || "text"} value={data[k] ?? ""} onChange={(e) => setData({ ...data, [k]: mask ? mask(e.target.value) : (type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value) })} />
    </div>
  );
}

function Multi({ label, options, value, onChange }: { label: string; options: readonly string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="md:col-span-2">
      <Label>{label}</Label>
      <div className="mt-2 flex flex-wrap gap-3">
        {options.map((o) => {
          const checked = value.includes(o);
          return (
            <label key={o} className="flex cursor-pointer items-center gap-2 rounded border bg-background px-3 py-1.5 text-sm">
              <Checkbox checked={checked} onCheckedChange={(c) => onChange(c ? [...value, o] : value.filter((x) => x !== o))} />
              {o}
            </label>
          );
        })}
      </div>
    </div>
  );
}
