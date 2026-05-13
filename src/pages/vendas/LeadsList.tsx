import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Pencil, Trash2, Phone, Mail, Building2 } from "lucide-react";
import { maskPhone } from "@/lib/crm/format";

interface Lead {
  id: string; nome: string; telefone: string; email: string | null;
  empresa: string | null; origem: string | null; observacoes: string | null;
}

const empty: Omit<Lead, "id"> = { nome: "", telefone: "", email: "", empresa: "", origem: "", observacoes: "" };

export default function LeadsList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchLeads(); }, []);

  async function fetchLeads() {
    setLoading(true);
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    setLeads((data as Lead[]) || []);
    setLoading(false);
  }

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(l: Lead) {
    setEditing(l);
    setForm({ nome: l.nome, telefone: l.telefone, email: l.email || "", empresa: l.empresa || "", origem: l.origem || "", observacoes: l.observacoes || "" });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.nome.trim() || !form.telefone.trim()) {
      toast({ variant: "destructive", title: "Nome e telefone são obrigatórios" });
      return;
    }
    setSaving(true);
    if (!editing) {
      const { data: dup } = await supabase.from("leads").select("id").eq("telefone", form.telefone).eq("created_by", user!.id).maybeSingle();
      if (dup) {
        toast({ variant: "destructive", title: "Lead duplicado", description: "Já existe um lead com esse telefone." });
        setSaving(false); return;
      }
      const { error } = await supabase.from("leads").insert([{ ...form, created_by: user!.id }]);
      if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); setSaving(false); return; }
      toast({ title: "Lead criado" });
    } else {
      const { error } = await supabase.from("leads").update(form).eq("id", editing.id);
      if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); setSaving(false); return; }
      toast({ title: "Lead atualizado" });
    }
    setOpen(false); setSaving(false); fetchLeads();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este lead?")) return;
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); return; }
    toast({ title: "Lead excluído" });
    fetchLeads();
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Leads</h1>
            <p className="text-sm text-muted-foreground">Cadastro de prospects</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Novo Lead</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing ? "Editar Lead" : "Novo Lead"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                <div><Label>Telefone *</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: maskPhone(e.target.value) })} /></div>
                <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Empresa</Label><Input value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} /></div>
                <div><Label>Origem</Label><Input value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} placeholder="Indicação, site, ligação..." /></div>
                <div><Label>Observações</Label><Textarea rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : leads.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum lead cadastrado.</CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {leads.map((l) => (
              <Card key={l.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{l.nome}</h3>
                      {l.empresa && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Building2 className="h-3 w-3" />{l.empresa}</p>}
                      <p className="mt-2 flex items-center gap-1 text-sm"><Phone className="h-3 w-3" />{l.telefone}</p>
                      {l.email && <p className="flex items-center gap-1 text-sm text-muted-foreground"><Mail className="h-3 w-3" />{l.email}</p>}
                      {l.origem && <p className="mt-2 text-xs text-muted-foreground">Origem: {l.origem}</p>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
