import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, Upload, Loader2, AlertTriangle, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Ordem importa para restauração (respeita dependências lógicas)
const TABLES = [
  "profiles",
  "user_roles",
  "user_module_permissions",
  "clients",
  "commission_rules",
  "commission_types",
  "demand_templates",
  "demand_template_steps",
  "base_conhecimento_ia",
  "implementations",
  "implementation_analysts",
  "implementation_commissions",
  "checklist_items",
  "episodes",
  "conclusion_requests",
  "demands",
  "demand_analysts",
  "demand_steps",
  "demand_step_evidences",
  "visitas",
  "visita_interacoes",
  "recomendacoes_visita",
  "ia_recommendations",
  "ia_recommendation_versions",
  "ia_feedback",
  "ia_training_dataset",
  "episode_audit_logs",
  "webhook_logs",
] as const;

export default function BackupRestore() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const handleExport = async () => {
    setExporting(true);
    setProgress("");
    const backup: Record<string, any[]> = {};
    try {
      for (const table of TABLES) {
        setProgress(`Exportando: ${table}...`);
        let all: any[] = [];
        let from = 0;
        const pageSize = 1000;
        while (true) {
          const { data, error } = await (supabase as any)
            .from(table)
            .select("*")
            .range(from, from + pageSize - 1);
          if (error) {
            console.warn(`Erro ao exportar ${table}:`, error.message);
            break;
          }
          if (!data || data.length === 0) break;
          all = all.concat(data);
          if (data.length < pageSize) break;
          from += pageSize;
        }
        backup[table] = all;
      }

      const payload = {
        version: 1,
        exported_at: new Date().toISOString(),
        source_project: import.meta.env.VITE_SUPABASE_PROJECT_ID,
        tables: backup,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      a.download = `maxsuporte-backup-${ts}.json`;
      a.click();
      URL.revokeObjectURL(url);

      const total = Object.values(backup).reduce((s, arr) => s + arr.length, 0);
      toast({ title: "Backup gerado!", description: `${total} registros em ${TABLES.length} tabelas.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro no backup", description: e.message });
    } finally {
      setExporting(false);
      setProgress("");
    }
  };

  const handleImport = async (file: File) => {
    if (!confirm(
      "ATENÇÃO: A restauração irá INSERIR os dados do backup neste projeto.\n\n" +
      "Recomendado: use em um projeto NOVO (vazio).\n\n" +
      "Registros com IDs já existentes serão ignorados (conflito).\n\n" +
      "Deseja continuar?"
    )) return;

    setImporting(true);
    setProgress("");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const tables = parsed.tables || parsed;

      let totalInserted = 0;
      const errors: string[] = [];

      for (const table of TABLES) {
        const rows = tables[table];
        if (!rows || !Array.isArray(rows) || rows.length === 0) continue;
        setProgress(`Restaurando: ${table} (${rows.length} registros)...`);

        // Insere em lotes para não estourar limites
        const batchSize = 500;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          const { error, count } = await (supabase as any)
            .from(table)
            .upsert(batch, { onConflict: "id", ignoreDuplicates: true, count: "exact" });
          if (error) {
            errors.push(`${table}: ${error.message}`);
            console.error(`Erro em ${table}:`, error);
          } else {
            totalInserted += count || batch.length;
          }
        }
      }

      if (errors.length > 0) {
        toast({
          variant: "destructive",
          title: "Restauração concluída com avisos",
          description: `${totalInserted} registros restaurados. ${errors.length} tabelas com erros (veja console).`,
        });
      } else {
        toast({ title: "Restauração concluída!", description: `${totalInserted} registros importados.` });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro na restauração", description: e.message });
    } finally {
      setImporting(false);
      setProgress("");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Backup e Restauração</h1>
          <p className="text-muted-foreground">Exporte e importe todos os dados do sistema</p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Importante sobre o remix</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Este backup inclui todos os dados das tabelas, mas <strong>NÃO inclui usuários de autenticação</strong>{" "}
              (auth). Após o remix, você precisará:
            </p>
            <ol className="ml-4 list-decimal space-y-1 text-sm">
              <li>Criar manualmente os usuários no novo projeto (com os mesmos e-mails)</li>
              <li>Atualizar os <code>user_id</code> nas tabelas <code>profiles</code> e <code>user_roles</code> se necessário</li>
              <li>Ou ignorar tabelas de usuários e cadastrar tudo do zero</li>
            </ol>
            <p className="text-sm">
              Arquivos de storage (avatares, evidências) também precisam ser migrados separadamente.
            </p>
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Backup Completo
              </CardTitle>
              <CardDescription>
                Baixa um arquivo JSON com todos os dados do banco
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                <Database className="mb-2 h-4 w-4" />
                {TABLES.length} tabelas serão exportadas
              </div>
              <Button onClick={handleExport} disabled={exporting} className="w-full">
                {exporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Gerar Backup
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Restauração Completa
              </CardTitle>
              <CardDescription>
                Carrega um arquivo de backup JSON gerado anteriormente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                <input
                  type="file"
                  accept="application/json,.json"
                  id="backup-file"
                  className="hidden"
                  disabled={importing}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImport(f);
                    e.target.value = "";
                  }}
                />
                <label htmlFor="backup-file">
                  <Button asChild disabled={importing} className="w-full" variant="outline">
                    <span>
                      {importing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Restaurando...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Selecionar Arquivo
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {progress && (
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">{progress}</span>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
