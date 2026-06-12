import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Building2, Plus, Trash2, UserPlus } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface Filial {
  id: string;
  nome: string;
  cnpj: string | null;
  ativo: boolean;
  created_at: string;
}

interface Profile {
  user_id: string;
  name: string | null;
  email: string | null;
}

interface UserFilial {
  id: string;
  user_id: string;
  filial_id: string;
  role: string;
  is_default: boolean;
  profile?: Profile;
}

const MATRIZ_ID = "00000000-0000-0000-0000-000000000001";

export default function FiliaisAdmin() {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<UserFilial[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [openCreate, setOpenCreate] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [newCnpj, setNewCnpj] = useState("");

  // Assign dialog
  const [openAssign, setOpenAssign] = useState<Filial | null>(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRole, setAssignRole] = useState("implantador");

  const load = async () => {
    setLoading(true);
    const [{ data: fs }, { data: us }, { data: ufs }] = await Promise.all([
      supabase.from("filiais").select("*").order("created_at"),
      supabase.from("profiles").select("user_id, name, email").order("name"),
      supabase.from("user_filiais").select("*"),
    ]);
    setFiliais((fs as Filial[]) || []);
    setUsers((us as Profile[]) || []);
    const profMap = new Map((us || []).map((u: any) => [u.user_id, u]));
    setAssignments(
      ((ufs as any[]) || []).map((u) => ({ ...u, profile: profMap.get(u.user_id) }))
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createFilial = async () => {
    if (!newNome.trim()) {
      toast({ title: "Informe o nome da filial", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("filiais").insert({
      nome: newNome.trim(),
      cnpj: newCnpj.trim() || null,
      ativo: true,
    });
    if (error) {
      toast({ title: "Erro ao criar filial", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Filial criada com sucesso" });
    setNewNome("");
    setNewCnpj("");
    setOpenCreate(false);
    load();
  };

  const toggleAtivo = async (f: Filial) => {
    if (f.id === MATRIZ_ID) {
      toast({ title: "A Matriz não pode ser desativada", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("filiais").update({ ativo: !f.ativo }).eq("id", f.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const deleteFilial = async (f: Filial) => {
    if (f.id === MATRIZ_ID) {
      toast({ title: "A Matriz não pode ser excluída", variant: "destructive" });
      return;
    }
    if (!confirm(`Excluir filial "${f.nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("filiais").delete().eq("id", f.id);
    if (error) {
      toast({
        title: "Não é possível excluir",
        description: "Existem registros vinculados a esta filial.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Filial excluída" });
    load();
  };

  const assignUser = async () => {
    if (!openAssign || !assignUserId) return;
    const { error } = await supabase.from("user_filiais").insert({
      user_id: assignUserId,
      filial_id: openAssign.id,
      role: assignRole as any,
      is_default: false,
    });
    if (error) {
      toast({ title: "Erro ao vincular usuário", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Usuário vinculado à filial" });
    setAssignUserId("");
    setOpenAssign(null);
    load();
  };

  const unassign = async (uf: UserFilial) => {
    if (!confirm(`Remover ${uf.profile?.name || uf.profile?.email} desta filial?`)) return;
    const { error } = await supabase.from("user_filiais").delete().eq("id", uf.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const usersByFilial = (filialId: string) =>
    assignments.filter((a) => a.filial_id === filialId);

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Filiais</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie as filiais e vincule usuários para isolamento de dados.
              </p>
            </div>
          </div>

          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Nova Filial
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Filial</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome *</Label>
                  <Input value={newNome} onChange={(e) => setNewNome(e.target.value)} placeholder="Ex: Filial Curitiba" />
                </div>
                <div>
                  <Label>CNPJ</Label>
                  <Input value={newCnpj} onChange={(e) => setNewCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
                <Button onClick={createFilial}>Criar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-12">Carregando...</div>
        ) : (
          <div className="grid gap-4">
            {filiais.map((f) => {
              const filialUsers = usersByFilial(f.id);
              return (
                <Card key={f.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle>{f.nome}</CardTitle>
                        {f.id === MATRIZ_ID && <Badge variant="secondary">Padrão</Badge>}
                        {!f.ativo && <Badge variant="destructive">Inativa</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 mr-3">
                          <Label className="text-xs">Ativa</Label>
                          <Switch checked={f.ativo} onCheckedChange={() => toggleAtivo(f)} disabled={f.id === MATRIZ_ID} />
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setOpenAssign(f)}>
                          <UserPlus className="mr-2 h-4 w-4" /> Vincular usuário
                        </Button>
                        {f.id !== MATRIZ_ID && (
                          <Button size="icon" variant="ghost" onClick={() => deleteFilial(f)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {f.cnpj && <p className="text-sm text-muted-foreground">CNPJ: {f.cnpj}</p>}
                  </CardHeader>
                  <CardContent>
                    {filialUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum usuário vinculado.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Papel</TableHead>
                            <TableHead>Padrão</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filialUsers.map((uf) => (
                            <TableRow key={uf.id}>
                              <TableCell>{uf.profile?.name || "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{uf.profile?.email}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{uf.role}</Badge>
                              </TableCell>
                              <TableCell>{uf.is_default ? <Badge>Sim</Badge> : "—"}</TableCell>
                              <TableCell>
                                <Button size="icon" variant="ghost" onClick={() => unassign(uf)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Assign dialog */}
        <Dialog open={!!openAssign} onOpenChange={(o) => !o && setOpenAssign(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vincular usuário a {openAssign?.nome}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Usuário</Label>
                <Select value={assignUserId} onValueChange={setAssignUserId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
                  <SelectContent>
                    {users
                      .filter((u) => !assignments.some((a) => a.user_id === u.user_id && a.filial_id === openAssign?.id))
                      .map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.name || u.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Papel na filial</Label>
                <Select value={assignRole} onValueChange={setAssignRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="implantador">Analista (implantador)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAssign(null)}>Cancelar</Button>
              <Button onClick={assignUser} disabled={!assignUserId}>Vincular</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
