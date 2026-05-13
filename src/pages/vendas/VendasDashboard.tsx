import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Briefcase, DollarSign, TrendingUp, Trophy } from "lucide-react";
import { brl } from "@/lib/crm/format";
import { STAGE_LABELS } from "@/lib/crm/types";

export default function VendasDashboard() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ ativos: 0, valor: 0, ganho: 0, perdido: 0, total: 0 });
  const [byStage, setByStage] = useState<Record<string, number>>({});

  useEffect(() => { if (user) fetchData(); }, [user]);

  async function fetchData() {
    setLoading(true);
    let q = supabase.from("deals").select("id, status, etapa, valor_estimado, vendedor_id");
    if (role === "vendedor") q = q.eq("vendedor_id", user!.id);
    const { data } = await q;
    const list = data || [];
    const ativos = list.filter((d) => d.status === "ativo");
    const ganho = list.filter((d) => d.status === "ganho").length;
    const perdido = list.filter((d) => d.status === "perdido").length;
    const valor = ativos.reduce((s, d) => s + Number(d.valor_estimado || 0), 0);
    const stage: Record<string, number> = {};
    list.forEach((d) => { stage[d.etapa] = (stage[d.etapa] || 0) + 1; });
    setStats({ ativos: ativos.length, valor, ganho, perdido, total: list.length });
    setByStage(stage);
    setLoading(false);
  }

  const conv = stats.total > 0 ? Math.round((stats.ganho / stats.total) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Vendas</h1>
          <p className="text-sm text-muted-foreground">Acompanhe sua performance comercial</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard icon={<Briefcase />} label="Negócios ativos" value={stats.ativos} />
              <StatCard icon={<DollarSign />} label="Valor em negociação" value={brl(stats.valor)} />
              <StatCard icon={<TrendingUp />} label="Taxa de conversão" value={`${conv}%`} />
              <StatCard icon={<Trophy />} label="Ganhos / Perdidos" value={`${stats.ganho} / ${stats.perdido}`} />
            </div>
            <Card>
              <CardHeader><CardTitle>Por etapa</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
                  {Object.entries(STAGE_LABELS).map(([k, label]) => (
                    <div key={k} className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-1 text-2xl font-bold">{byStage[k] || 0}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
