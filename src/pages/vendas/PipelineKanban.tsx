import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Copy } from "lucide-react";
import { brl, maskPhone } from "@/lib/crm/format";
import { STAGE_LABELS, STAGE_ORDER, DealStage } from "@/lib/crm/types";

interface Deal {
  id: string; nome_negocio: string; valor_estimado: number; etapa: DealStage; status: string;
  vendedor_id: string; lead_id: string; form_token: string;
  lead?: { nome: string; empresa: string | null };
}

interface Lead { id: string; nome: string; empresa: string | null; }

export default function PipelineKanban() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [deals, setDeals] = useState<Deal[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ lead_id: "", nome_negocio: "", valor_estimado: "" });
  const [tab, setTab] = useState<"existente" | "novo">("existente");
  const [newLead, setNewLead] = useState({ nome: "", telefone: "", email: "", empresa: "", origem: "", observacoes: "" });
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [{ data: dData }, { data: lData }] = await Promise.all([
      supabase.from("deals").select("id,nome_negocio,valor_estimado,etapa,status,vendedor_id,lead_id,form_token,lead:leads(nome,empresa)").order("created_at", { ascending: false }),
      supabase.from("leads").select("id,nome,empresa").order("nome"),
    ]);
    setDeals((dData as any) || []);
    setLeads((lData as Lead[]) || []);
    setLoading(false);
  }

  function resetForm() {
    setForm({ lead_id: "", nome_negocio: "", valor_estimado: "" });
    setNewLead({ nome: "", telefone: "", email: "", empresa: "", origem: "", observacoes: "" });
    setTab("existente");
  }

  async function handleCreate() {
    if (!form.nome_negocio.trim()) {
      toast({ variant: "destructive", title: "Informe o nome do negócio" }); return;
    }
    setSaving(true);
    try {
      let leadId = form.lead_id;

      if (tab === "novo") {
        if (!newLead.nome.trim() || !newLead.telefone.trim()) {
          toast({ variant: "destructive", title: "Nome e telefone do lead são obrigatórios" });
          setSaving(false); return;
        }
        const { data: created, error: leadErr } = await supabase.from("leads").insert([{
          nome: newLead.nome.trim(),
          telefone: newLead.telefone.trim(),
          email: newLead.email.trim() || null,
          empresa: newLead.empresa.trim() || null,
          origem: newLead.origem.trim() || null,
          observacoes: newLead.observacoes.trim() || null,
          created_by: user!.id,
        }]).select("id").single();
        if (leadErr) throw leadErr;
        leadId = created.id;
      } else if (!leadId) {
        toast({ variant: "destructive", title: "Selecione um lead" });
        setSaving(false); return;
      }

      const { error } = await supabase.from("deals").insert([{
        lead_id: leadId, nome_negocio: form.nome_negocio,
        valor_estimado: Number(form.valor_estimado || 0), vendedor_id: user!.id,
      }]);
      if (error) throw error;
      toast({ title: "Negócio criado" });
      setOpen(false); resetForm(); fetchData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!e.over) return;
    const dealId = String(e.active.id);
    const newStage = String(e.over.id) as DealStage;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.etapa === newStage) return;

    setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, etapa: newStage } : d));
    const { error } = await supabase.from("deals").update({ etapa: newStage }).eq("id", dealId);
    if (error) {
      toast({ variant: "destructive", title: "Não foi possível mover", description: error.message });
      setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, etapa: deal.etapa } : d));
    }
  }

  function copyFormLink(deal: Deal) {
    const url = `${window.location.origin}/formulario/${deal.id}/${deal.form_token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado", description: url });
  }

  const activeDeal = deals.find((d) => d.id === activeId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pipeline</h1>
            <p className="text-sm text-muted-foreground">Arraste os negócios entre as etapas</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Novo Negócio</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo Negócio</DialogTitle></DialogHeader>
              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existente">Lead existente</TabsTrigger>
                  <TabsTrigger value="novo">Cadastrar novo lead</TabsTrigger>
                </TabsList>
                <TabsContent value="existente" className="space-y-3 pt-3">
                  <div>
                    <Label>Lead *</Label>
                    <Select value={form.lead_id} onValueChange={(v) => setForm({ ...form, lead_id: v })}>
                      <SelectTrigger><SelectValue placeholder={leads.length ? "Selecione" : "Nenhum lead cadastrado"} /></SelectTrigger>
                      <SelectContent>{leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}{l.empresa ? ` — ${l.empresa}` : ""}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                <TabsContent value="novo" className="space-y-3 pt-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2"><Label>Nome *</Label><Input value={newLead.nome} onChange={(e) => setNewLead({ ...newLead, nome: e.target.value })} /></div>
                    <div><Label>Telefone *</Label><Input value={newLead.telefone} onChange={(e) => setNewLead({ ...newLead, telefone: maskPhone(e.target.value) })} /></div>
                    <div><Label>Email</Label><Input type="email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} /></div>
                    <div><Label>Empresa</Label><Input value={newLead.empresa} onChange={(e) => setNewLead({ ...newLead, empresa: e.target.value })} /></div>
                    <div><Label>Origem</Label><Input value={newLead.origem} onChange={(e) => setNewLead({ ...newLead, origem: e.target.value })} placeholder="Ex.: Indicação, Site" /></div>
                    <div className="sm:col-span-2"><Label>Observações</Label><Textarea rows={2} value={newLead.observacoes} onChange={(e) => setNewLead({ ...newLead, observacoes: e.target.value })} /></div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="space-y-3 border-t pt-3">
                <div><Label>Nome do negócio *</Label><Input value={form.nome_negocio} onChange={(e) => setForm({ ...form, nome_negocio: e.target.value })} /></div>
                <div><Label>Valor estimado</Label><Input type="number" step="0.01" value={form.valor_estimado} onChange={(e) => setForm({ ...form, valor_estimado: e.target.value })} /></div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {tab === "novo" ? "Cadastrar lead e criar negócio" : "Criar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
          <DndContext sensors={sensors} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd}>
            <div className="flex gap-3 overflow-x-auto pb-4">
              {STAGE_ORDER.map((stage) => (
                <Column key={stage} stage={stage} deals={deals.filter((d) => d.etapa === stage)} onOpen={(id) => navigate(`/vendas/deals/${id}`)} onCopyLink={copyFormLink} />
              ))}
            </div>
            <DragOverlay>
              {activeDeal && <DealCard deal={activeDeal} dragging />}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </DashboardLayout>
  );
}

function Column({ stage, deals, onOpen, onCopyLink }: { stage: DealStage; deals: Deal[]; onOpen: (id: string) => void; onCopyLink: (d: Deal) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = deals.reduce((s, d) => s + Number(d.valor_estimado || 0), 0);
  return (
    <div ref={setNodeRef} className={`flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30 p-2 ${isOver ? "ring-2 ring-primary" : ""}`}>
      <div className="mb-2 px-2">
        <h3 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h3>
        <p className="text-xs text-muted-foreground">{deals.length} • {brl(total)}</p>
      </div>
      <div className="flex flex-col gap-2">
        {deals.map((d) => <DraggableCard key={d.id} deal={d} onOpen={onOpen} onCopyLink={onCopyLink} />)}
      </div>
    </div>
  );
}

function DraggableCard({ deal, onOpen, onCopyLink }: { deal: Deal; onOpen: (id: string) => void; onCopyLink: (d: Deal) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={isDragging ? "opacity-30" : ""}>
      <DealCard deal={deal} onOpen={onOpen} onCopyLink={onCopyLink} />
    </div>
  );
}

function DealCard({ deal, dragging, onOpen, onCopyLink }: { deal: Deal; dragging?: boolean; onOpen?: (id: string) => void; onCopyLink?: (d: Deal) => void }) {
  return (
    <Card className={dragging ? "shadow-lg" : ""}>
      <CardContent className="p-3">
        <p className="truncate text-sm font-medium">{deal.nome_negocio}</p>
        <p className="truncate text-xs text-muted-foreground">{deal.lead?.nome}{deal.lead?.empresa ? ` — ${deal.lead.empresa}` : ""}</p>
        <p className="mt-1 text-sm font-semibold text-primary">{brl(deal.valor_estimado)}</p>
        {!dragging && (
          <div className="mt-2 flex gap-1">
            <Button size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={() => onOpen?.(deal.id)}>Abrir</Button>
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onCopyLink?.(deal); }}><Copy className="h-3 w-3" /></Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
