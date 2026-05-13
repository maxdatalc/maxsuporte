import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Copy, Download, FileText, Upload, CheckCircle2, Send } from "lucide-react";
import { brl, maskCNPJ, maskCPF, maskPhone } from "@/lib/crm/format";
import { suggestPreImplantacao } from "@/lib/crm/rules";
import { SISTEMAS, MODULOS_ADICIONAIS, STAGE_LABELS } from "@/lib/crm/types";
import { generateProposalPDF } from "@/lib/crm/pdf";
import { logDealActivity } from "@/lib/crm/logActivity";
import { WebhookService } from "@/lib/webhookService";

const FORM_FIELDS = {
  empresa: ["razao_social", "nome_fantasia", "cnpj", "email_empresa", "telefone_fixo", "telefone_celular", "regime_tributario", "quantidade_computadores"],
  responsavel: ["responsavel_nome", "responsavel_cpf", "responsavel_rg", "responsavel_email", "responsavel_telefone_celular"],
  financeiro: ["nome_vendedor", "valor_implantacao", "valor_mensalidade", "sistema_contratado", "qtd_licencas_maquinas", "licencas_automax_mobile", "licencas_maxbip", "modulos_adicionais"],
  implantacao: ["sistema_atual", "migrar_banco_dados", "particularidades_identificadas"],
};

export default function DealDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [deal, setDeal] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [proposals, setProposals] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});

  // Proposal editor state
  const [propEdit, setPropEdit] = useState<any>({});

  // Signature doc upload state
  const [docForm, setDocForm] = useState({ document_type: "contrato_digitalizado", title: "", notes: "", file: null as File | null });

  useEffect(() => { if (id) load(); }, [id]);

  async function load() {
    setLoading(true);
    const [{ data: d }, { data: f }, { data: p }, { data: dc }, { data: lg }, { data: st }] = await Promise.all([
      supabase.from("deals").select("*, lead:leads(*)").eq("id", id!).maybeSingle(),
      supabase.from("form_responses").select("*").eq("deal_id", id!).maybeSingle(),
      supabase.from("deal_proposals").select("*").eq("deal_id", id!).order("version", { ascending: false }),
      supabase.from("deal_signature_documents").select("*").eq("deal_id", id!).order("created_at", { ascending: false }),
      supabase.from("deal_activity_logs").select("*").eq("deal_id", id!).order("created_at", { ascending: false }),
      supabase.from("crm_settings").select("*").maybeSingle(),
    ]);
    setDeal(d); setForm(f || {});
    if (f && !f.nome_vendedor && profile?.name) setForm({ ...f, nome_vendedor: profile.name });
    setProposals(p || []); setDocs(dc || []); setLogs(lg || []); setSettings(st || {});
    setLoading(false);
  }

  async function saveForm() {
    const payload = { ...form, deal_id: id, submission_origin: "vendedor" };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    const { data: existing } = await supabase.from("form_responses").select("id").eq("deal_id", id!).maybeSingle();
    const { error } = existing
      ? await supabase.from("form_responses").update(payload).eq("deal_id", id!)
      : await supabase.from("form_responses").insert([payload]);
    if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); return; }

    // Update suggestion in deal
    const sug = suggestPreImplantacao(Number(form.quantidade_computadores));
    const dealUpdate: any = { formulario_preenchido: true };
    if (sug) Object.assign(dealUpdate, sug);
    await supabase.from("deals").update(dealUpdate).eq("id", id!);
    toast({ title: "Formulário salvo" });
    load();
  }

  function copyFormLink() {
    const url = `${window.location.origin}/formulario/${deal.id}/${deal.form_token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado" });
  }

  function startNewProposal() {
    setPropEdit({
      valor_implantacao: form.valor_implantacao || 0,
      valor_mensalidade: form.valor_mensalidade || 0,
      sistema_contratado: form.sistema_contratado || [],
      modulos_adicionais: form.modulos_adicionais || [],
      qtd_licencas_maquinas: form.qtd_licencas_maquinas || 0,
      licencas_automax_mobile: form.licencas_automax_mobile || 0,
      licencas_maxbip: form.licencas_maxbip || 0,
      escopo: "",
      prazo_dias: 30,
      condicoes_comerciais: settings.texto_condicoes_comerciais_padrao || "",
      observacoes_comerciais: settings.texto_observacoes_padrao || "",
      validade_proposta_dias: 15,
    });
  }

  async function generateProposal() {
    if (!propEdit) return;
    const version = (proposals[0]?.version || 0) + 1;
    const valor = Number(propEdit.valor_implantacao || 0) + Number(propEdit.valor_mensalidade || 0);
    const numero = `${deal.id.slice(0, 8).toUpperCase()}-V${version}`;

    const blob = await generateProposalPDF(
      {
        numero,
        cliente: { razao_social: form.razao_social, nome_fantasia: form.nome_fantasia, cnpj: form.cnpj },
        ...propEdit,
        vendedor: form.nome_vendedor || profile?.name,
      },
      settings,
    );
    const path = `${deal.id}/v${version}.pdf`;
    const { error: upErr } = await supabase.storage.from("crm-proposals").upload(path, blob, { upsert: true, contentType: "application/pdf" });
    if (upErr) { toast({ variant: "destructive", title: "Erro upload PDF", description: upErr.message }); return; }

    const { error } = await supabase.from("deal_proposals").insert([{
      deal_id: deal.id, version, valor, ...propEdit, pdf_path: path, gerado_por: user!.id,
    }]);
    if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); return; }
    WebhookService.send("proposta_gerada", { deal_id: deal.id, version, valor });
    toast({ title: `Proposta v${version} gerada` });
    setPropEdit({});
    load();
  }

  async function downloadProposal(p: any) {
    const { data, error } = await supabase.storage.from("crm-proposals").createSignedUrl(p.pdf_path, 60);
    if (error || !data) { toast({ variant: "destructive", title: "Erro", description: error?.message }); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function uploadDoc() {
    if (!docForm.file || !docForm.title.trim()) { toast({ variant: "destructive", title: "Título e arquivo são obrigatórios" }); return; }
    const path = `${deal.id}/${Date.now()}-${docForm.file.name}`;
    const { error: upErr } = await supabase.storage.from("crm-contracts").upload(path, docForm.file);
    if (upErr) { toast({ variant: "destructive", title: "Erro upload", description: upErr.message }); return; }
    const { error } = await supabase.from("deal_signature_documents").insert([{
      deal_id: deal.id, document_type: docForm.document_type as any, title: docForm.title, notes: docForm.notes,
      file_path: path, uploaded_by: user!.id,
    }]);
    if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); return; }
    toast({ title: "Documento anexado" });
    setDocForm({ document_type: "contrato_digitalizado", title: "", notes: "", file: null });
    load();
  }

  async function downloadDoc(d: any) {
    const { data, error } = await supabase.storage.from("crm-contracts").createSignedUrl(d.file_path, 60);
    if (error || !data) { toast({ variant: "destructive", title: "Erro", description: error?.message }); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function markDoc(d: any, field: "sent_to_client" | "signed") {
    const update: any = { [field]: true };
    if (field === "sent_to_client") { update.sent_at = new Date().toISOString(); update.status = "enviado"; }
    if (field === "signed") { update.signed_at = new Date().toISOString(); update.status = "assinado"; }
    const { error } = await supabase.from("deal_signature_documents").update(update).eq("id", d.id);
    if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); return; }
    load();
  }

  async function changeStage(newStage: string) {
    const { error } = await supabase.from("deals").update({ etapa: newStage as any }).eq("id", deal.id);
    if (error) { toast({ variant: "destructive", title: "Não foi possível mudar a etapa", description: error.message }); return; }
    if (newStage === "ganho") {
      // Convert to implementation
      const { data: client, error: cErr } = await supabase.from("clients").insert([{ name: form.razao_social || form.nome_fantasia || deal.nome_negocio, cnpj: form.cnpj }]).select().single();
      if (cErr) { toast({ variant: "destructive", title: "Erro ao criar cliente", description: cErr.message }); return; }
      const { data: impl, error: iErr } = await supabase.from("implementations").insert([{
        client_id: client.id, implementer_id: null, status: "agendada", observations: `Origem CRM — ${deal.nome_negocio}`,
      }]).select().single();
      if (iErr) { toast({ variant: "destructive", title: "Erro ao criar implantação", description: iErr.message }); return; }
      await supabase.from("deals").update({ implementation_id: impl.id }).eq("id", deal.id);
      WebhookService.send("deal_ganho", { deal_id: deal.id, implementation_id: impl.id });
      toast({ title: "Convertido em implantação" });
    }
    if (newStage === "perdido") WebhookService.send("deal_perdido", { deal_id: deal.id });
    load();
  }

  if (loading || !deal) return <DashboardLayout><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;

  const sug = suggestPreImplantacao(Number(form.quantidade_computadores));

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>

        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <h1 className="text-xl font-bold">{deal.nome_negocio}</h1>
              <p className="text-sm text-muted-foreground">{deal.lead?.nome}{deal.lead?.empresa ? ` — ${deal.lead.empresa}` : ""}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge>{STAGE_LABELS[deal.etapa as keyof typeof STAGE_LABELS]}</Badge>
                <Badge variant="outline">{deal.status}</Badge>
                {deal.formulario_preenchido ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {form?.submission_origin === "publico" ? "Formulário enviado pelo lead" : "Formulário preenchido"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-dashed text-muted-foreground">Formulário pendente</Badge>
                )}
                {form?.created_at && deal.formulario_preenchido && (
                  <span className="text-xs text-muted-foreground">
                    {form?.submission_origin === "publico" ? "Enviado em " : "Atualizado em "}
                    {new Date(form.updated_at || form.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyFormLink}><Copy className="mr-2 h-4 w-4" />Copiar link do formulário</Button>
              <Select value={deal.etapa} onValueChange={changeStage}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STAGE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="resumo">
          <TabsList className="flex-wrap">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="form">Formulário</TabsTrigger>
            <TabsTrigger value="sug">Sugestão</TabsTrigger>
            <TabsTrigger value="prop">Proposta</TabsTrigger>
            <TabsTrigger value="doc">Doc. Assinatura</TabsTrigger>
            <TabsTrigger value="hist">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo">
            <Card><CardContent className="grid gap-3 p-4 md:grid-cols-2">
              <Field label="Razão social" v={form.razao_social} />
              <Field label="Nome fantasia" v={form.nome_fantasia} />
              <Field label="CNPJ" v={form.cnpj} />
              <Field label="Vendedor" v={form.nome_vendedor || profile?.name} />
              <Field label="Sistema(s)" v={(form.sistema_contratado || []).join(", ")} />
              <Field label="Módulos adicionais" v={(form.modulos_adicionais || []).join(", ")} />
              <Field label="Valor implantação" v={brl(form.valor_implantacao)} />
              <Field label="Mensalidade" v={brl(form.valor_mensalidade)} />
              <Field label="Licenças máquinas" v={form.qtd_licencas_maquinas} />
              <Field label="AutoMax Mobile" v={form.licencas_automax_mobile} />
              <Field label="MaxBip" v={form.licencas_maxbip} />
              <Field label="Status proposta" v={proposals[0] ? `v${proposals[0].version}` : "—"} />
              <Field label="Status documento" v={docs[0]?.status || "—"} />
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="form" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Dados da Empresa</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Inp label="Razão Social" k="razao_social" form={form} setForm={setForm} />
                <Inp label="Nome Fantasia" k="nome_fantasia" form={form} setForm={setForm} />
                <Inp label="CNPJ" k="cnpj" form={form} setForm={setForm} mask={maskCNPJ} />
                <Inp label="E-mail" k="email_empresa" form={form} setForm={setForm} type="email" />
                <Inp label="Telefone Fixo" k="telefone_fixo" form={form} setForm={setForm} mask={maskPhone} />
                <Inp label="Telefone Celular" k="telefone_celular" form={form} setForm={setForm} mask={maskPhone} />
                <Inp label="Regime tributário" k="regime_tributario" form={form} setForm={setForm} />
                <Inp label="Qtd. computadores" k="quantidade_computadores" form={form} setForm={setForm} type="number" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Responsável pela Assinatura</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Inp label="Nome" k="responsavel_nome" form={form} setForm={setForm} />
                <Inp label="CPF" k="responsavel_cpf" form={form} setForm={setForm} mask={maskCPF} />
                <Inp label="RG" k="responsavel_rg" form={form} setForm={setForm} />
                <Inp label="E-mail" k="responsavel_email" form={form} setForm={setForm} type="email" />
                <Inp label="Telefone Celular" k="responsavel_telefone_celular" form={form} setForm={setForm} mask={maskPhone} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Informações Financeiras</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Inp label="Nome do Vendedor" k="nome_vendedor" form={form} setForm={setForm} />
                <Inp label="Valor Implantação" k="valor_implantacao" form={form} setForm={setForm} type="number" />
                <Inp label="Valor Mensalidade" k="valor_mensalidade" form={form} setForm={setForm} type="number" />
                <MultiCheck label="Sistema Contratado" options={SISTEMAS as any} value={form.sistema_contratado || []} onChange={(v) => setForm({ ...form, sistema_contratado: v })} />
                <Inp label="Qtd. Licenças Máquinas" k="qtd_licencas_maquinas" form={form} setForm={setForm} type="number" />
                <Inp label="AutoMax Mobile" k="licencas_automax_mobile" form={form} setForm={setForm} type="number" />
                <Inp label="MaxBip" k="licencas_maxbip" form={form} setForm={setForm} type="number" />
                <MultiCheck label="Módulos adicionais" options={MODULOS_ADICIONAIS as any} value={form.modulos_adicionais || []} onChange={(v) => setForm({ ...form, modulos_adicionais: v })} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Implantação</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Inp label="Sistema atual" k="sistema_atual" form={form} setForm={setForm} />
                <div>
                  <Label>Migrar banco de dados</Label>
                  <Select value={form.migrar_banco_dados || ""} onValueChange={(v) => setForm({ ...form, migrar_banco_dados: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem><SelectItem value="nao">Não</SelectItem><SelectItem value="a_definir">A definir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2"><Label>Particularidades identificadas</Label><Textarea rows={4} value={form.particularidades_identificadas || ""} onChange={(e) => setForm({ ...form, particularidades_identificadas: e.target.value })} /></div>
              </CardContent>
            </Card>
            <Button onClick={saveForm}>Salvar formulário</Button>
          </TabsContent>

          <TabsContent value="sug">
            <Card><CardContent className="p-4">
              {sug ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Tipo sugerido" v={sug.suggested_type.toUpperCase()} />
                  <Field label="Complexidade" v={sug.complexidade} />
                  <Field label="Horas estimadas" v={`${sug.horas_estimadas}h`} />
                </div>
              ) : <p className="text-sm text-muted-foreground">Preencha "Quantidade de computadores" no formulário para ver a sugestão.</p>}
              <p className="mt-3 text-xs text-muted-foreground">* Apenas informativo. Não altera o tipo da implantação.</p>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="prop" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Propostas geradas</h3>
              <Button onClick={startNewProposal} size="sm"><FileText className="mr-2 h-4 w-4" />Nova proposta</Button>
            </div>
            {Object.keys(propEdit).length > 0 && (
              <Card>
                <CardHeader><CardTitle>Editar nova proposta</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div><Label>Valor implantação</Label><Input type="number" value={propEdit.valor_implantacao} onChange={(e) => setPropEdit({ ...propEdit, valor_implantacao: Number(e.target.value) })} /></div>
                    <div><Label>Mensalidade</Label><Input type="number" value={propEdit.valor_mensalidade} onChange={(e) => setPropEdit({ ...propEdit, valor_mensalidade: Number(e.target.value) })} /></div>
                    <div><Label>Prazo (dias)</Label><Input type="number" value={propEdit.prazo_dias} onChange={(e) => setPropEdit({ ...propEdit, prazo_dias: Number(e.target.value) })} /></div>
                    <div><Label>Validade (dias)</Label><Input type="number" value={propEdit.validade_proposta_dias} onChange={(e) => setPropEdit({ ...propEdit, validade_proposta_dias: Number(e.target.value) })} /></div>
                  </div>
                  <div><Label>Escopo</Label><Textarea rows={3} value={propEdit.escopo} onChange={(e) => setPropEdit({ ...propEdit, escopo: e.target.value })} /></div>
                  <div><Label>Condições comerciais</Label><Textarea rows={3} value={propEdit.condicoes_comerciais} onChange={(e) => setPropEdit({ ...propEdit, condicoes_comerciais: e.target.value })} /></div>
                  <div><Label>Observações</Label><Textarea rows={2} value={propEdit.observacoes_comerciais} onChange={(e) => setPropEdit({ ...propEdit, observacoes_comerciais: e.target.value })} /></div>
                  <div className="flex gap-2">
                    <Button onClick={generateProposal}><FileText className="mr-2 h-4 w-4" />Gerar PDF</Button>
                    <Button variant="outline" onClick={() => setPropEdit({})}>Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {proposals.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma proposta gerada.</CardContent></Card> :
              proposals.map((p) => (
                <Card key={p.id}><CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">Versão {p.version} — {brl(p.valor)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => downloadProposal(p)}><Download className="mr-2 h-4 w-4" />Baixar</Button>
                </CardContent></Card>
              ))}
          </TabsContent>

          <TabsContent value="doc" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Anexar documento</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div><Label>Tipo</Label>
                    <Select value={docForm.document_type} onValueChange={(v) => setDocForm({ ...docForm, document_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contrato_digitalizado">Contrato digitalizado</SelectItem>
                        <SelectItem value="termo_assinatura">Termo de assinatura</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Título *</Label><Input value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} /></div>
                </div>
                <div><Label>Observações</Label><Textarea rows={2} value={docForm.notes} onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })} /></div>
                <div><Label>Arquivo *</Label><Input type="file" onChange={(e) => setDocForm({ ...docForm, file: e.target.files?.[0] || null })} /></div>
                <Button onClick={uploadDoc}><Upload className="mr-2 h-4 w-4" />Anexar</Button>
              </CardContent>
            </Card>

            {docs.map((d) => (
              <Card key={d.id}><CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="font-medium">{d.title} <Badge variant="outline" className="ml-2">{d.status}</Badge></p>
                  <p className="text-xs text-muted-foreground">{d.document_type} • {new Date(d.created_at).toLocaleString("pt-BR")}</p>
                  {d.notes && <p className="mt-1 text-sm">{d.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => downloadDoc(d)}><Download className="mr-2 h-4 w-4" />Baixar</Button>
                  {!d.sent_to_client && <Button size="sm" variant="outline" onClick={() => markDoc(d, "sent_to_client")}><Send className="mr-2 h-4 w-4" />Enviado</Button>}
                  {!d.signed && <Button size="sm" onClick={() => markDoc(d, "signed")}><CheckCircle2 className="mr-2 h-4 w-4" />Assinado</Button>}
                </div>
              </CardContent></Card>
            ))}
          </TabsContent>

          <TabsContent value="hist">
            <Card><CardContent className="p-4">
              {logs.length === 0 ? <p className="text-sm text-muted-foreground">Sem registros.</p> :
                <ul className="space-y-2">
                  {logs.map((l) => (
                    <li key={l.id} className="border-l-2 border-primary/40 pl-3 text-sm">
                      <p>{l.descricao}</p>
                      <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")} • {l.tipo}</p>
                    </li>
                  ))}
                </ul>}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, v }: { label: string; v: any }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{v ?? "—"}</p></div>;
}

function Inp({ label, k, form, setForm, type, mask }: { label: string; k: string; form: any; setForm: (v: any) => void; type?: string; mask?: (v: string) => string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type || "text"} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: mask ? mask(e.target.value) : (type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value) })} />
    </div>
  );
}

function MultiCheck({ label, options, value, onChange }: { label: string; options: readonly string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="md:col-span-2">
      <Label>{label}</Label>
      <div className="mt-2 flex flex-wrap gap-3">
        {options.map((o) => {
          const checked = value.includes(o);
          return (
            <label key={o} className="flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm">
              <Checkbox checked={checked} onCheckedChange={(c) => onChange(c ? [...value, o] : value.filter((x) => x !== o))} />
              {o}
            </label>
          );
        })}
      </div>
    </div>
  );
}
