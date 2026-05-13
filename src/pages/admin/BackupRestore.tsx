import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, Upload, Loader2, AlertTriangle, Database, Users } from "lucide-react";
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

// Colunas que referenciam auth.users.id (user_id) e devem ser remapeadas
// table -> array de campos
const USER_FK_COLUMNS: Record<string, string[]> = {
  profiles: ["user_id"],
  user_roles: ["user_id"],
  user_module_permissions: ["user_id"],
  clients: ["created_by"],
  commission_rules: ["created_by"],
  commission_types: ["created_by"],
  demand_templates: ["created_by"],
  base_conhecimento_ia: ["created_by"],
  implementations: ["implementer_id", "created_by"],
  implementation_analysts: ["analyst_id"],
  implementation_commissions: ["created_by"],
  episodes: ["created_by"],
  conclusion_requests: ["requester_id", "approved_by"],
  demands: ["created_by"],
  demand_analysts: ["analyst_id"],
  demand_steps: ["completed_by"],
  demand_step_evidences: ["uploaded_by"],
  visitas: ["analista_id"],
  visita_interacoes: ["usuario_id"],
  ia_recommendations: ["created_by"],
  ia_recommendation_versions: ["edited_by"],
  ia_feedback: ["user_id"],
  ia_training_dataset: ["validated_by"],
  episode_audit_logs: ["edited_by"],
};

export default function BackupRestore() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [remapStats, setRemapStats] = useState<{ matched: number; missing: string[] } | null>(null);

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
        version: 2,
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

  /**
   * Constrói o mapa user_id_antigo -> user_id_novo cruzando emails do
   * profiles antigo (no backup) com o profiles atual deste projeto.
   */
  const buildUserIdMap = async (
    backupProfiles: any[]
  ): Promise<{ map: Map<string, string>; missing: string[] }> => {
    const map = new Map<string, string>();
    const missing: string[] = [];

    const { data: currentProfiles, error } = await supabase
      .from("profiles")
      .select("user_id, email");

    if (error) throw new Error(`Falha ao ler profiles atuais: ${error.message}`);

    const emailToNewId = new Map<string, string>();
    (currentProfiles || []).forEach((p: any) => {
      if (p.email) emailToNewId.set(p.email.toLowerCase().trim(), p.user_id);
    });

    for (const oldP of backupProfiles) {
      const email = (oldP.email || "").toLowerCase().trim();
      const newId = email ? emailToNewId.get(email) : undefined;
      if (newId && oldP.user_id) {
        map.set(oldP.user_id, newId);
      } else {
        missing.push(oldP.email || oldP.user_id);
      }
    }

    return { map, missing };
  };

  /**
   * Aplica o remapeamento user_id_antigo -> user_id_novo em todas as
   * colunas referenciando usuário, em todas as tabelas do backup.
   * Também atualiza o `id` do registro em `profiles` (que aponta para o user antigo)
   * para que `profiles.user_id` reflita o novo usuário do auth.
   */
  const remapUserIds = (
    tables: Record<string, any[]>,
    userMap: Map<string, string>
  ) => {
    for (const [tableName, rows] of Object.entries(tables)) {
      const fkCols = USER_FK_COLUMNS[tableName];
      if (!fkCols || !Array.isArray(rows)) continue;
      for (const row of rows) {
        for (const col of fkCols) {
          const oldVal = row[col];
          if (oldVal && userMap.has(oldVal)) {
            row[col] = userMap.get(oldVal);
          }
        }
      }
    }
  };

  const handleImport = async (file: File) => {
    if (!confirm(
      "ATENÇÃO: A restauração irá inserir os dados deste backup no projeto atual.\n\n" +
      "IMPORTANTE: Cadastre primeiro TODOS os usuários no novo projeto com os MESMOS e-mails do projeto antigo.\n\n" +
      "O sistema fará o remapeamento automático: e-mail antigo -> novo user_id.\n\n" +
      "Registros com IDs já existentes serão ignorados.\n\n" +
      "Deseja continuar?"
    )) return;

    setImporting(true);
    setProgress("");
    setRemapStats(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const tables: Record<string, any[]> = parsed.tables || parsed;

      // 1. Construir mapa de remapeamento de usuários
      setProgress("Cruzando e-mails para remapear usuários...");
      const backupProfiles = tables["profiles"] || [];
      const { map: userMap, missing } = await buildUserIdMap(backupProfiles);

      setRemapStats({ matched: userMap.size, missing });

      if (userMap.size === 0 && backupProfiles.length > 0) {
        if (!confirm(
          "Nenhum e-mail do backup foi encontrado entre os usuários atuais.\n\n" +
          "Isso significa que NENHUMA implantação/demanda/comissão será vinculada a um analista.\n\n" +
          "Recomendado: cancele, cadastre os usuários com os mesmos e-mails e tente novamente.\n\n" +
          "Deseja continuar mesmo assim?"
        )) {
          setImporting(false);
          setProgress("");
          return;
        }
      }

      // 2. Aplicar remapeamento em todas as tabelas
      setProgress(`Remapeando ${userMap.size} usuários em todas as tabelas...`);
      remapUserIds(tables, userMap);

      // 3. Tratamento especial: profiles
      // O `id` (PK) do profile antigo pode ser irrelevante; o que importa é user_id.
      // Se um profile com mesmo user_id (novo) já existe, o upsert por id-conflict pulará.
      // Forçamos remoção do `id` para deixar gen_random_uuid() criar novo, evitando
      // colisão com profiles já criados pelo trigger handle_new_user.
      if (tables["profiles"]) {
        tables["profiles"] = tables["profiles"]
          .filter((p) => userMap.has(Object.keys(userMap).length ? p.user_id || "" : ""))
          .map((p) => {
            const { id, ...rest } = p;
            return rest;
          });
      }
      // user_roles: idem, deixa o id ser regenerado e só importa quem foi remapeado
      if (tables["user_roles"]) {
        tables["user_roles"] = tables["user_roles"]
          .filter((r) => userMap.has(r.user_id) || !backupProfiles.length)
          .map((r) => {
            const { id, ...rest } = r;
            return rest;
          });
      }

      let totalInserted = 0;
      const errors: string[] = [];

      for (const table of TABLES) {
        const rows = tables[table];
        if (!rows || !Array.isArray(rows) || rows.length === 0) continue;
        setProgress(`Restaurando: ${table} (${rows.length} registros)...`);

        const batchSize = 500;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          // profiles e user_roles sem id -> insert simples ignorando duplicados via try/catch por linha não vale a pena;
          // usamos upsert quando há id
          const hasId = batch[0] && "id" in batch[0];
          const query = hasId
            ? (supabase as any).from(table).upsert(batch, { onConflict: "id", ignoreDuplicates: true, count: "exact" })
            : (supabase as any).from(table).insert(batch, { count: "exact" });
          const { error, count } = await query;
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
          description: `${totalInserted} registros restaurados. ${errors.length} erros (veja console).`,
        });
      } else {
        toast({
          title: "Restauração concluída!",
          description: `${totalInserted} registros importados. ${userMap.size} usuários remapeados.`,
        });
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
          <AlertTitle>Como funciona o remix com remapeamento automático</AlertTitle>
          <AlertDescription className="space-y-2">
            <ol className="ml-4 list-decimal space-y-1 text-sm">
              <li>Faça o <strong>backup</strong> neste projeto (gera o JSON).</li>
              <li>Faça o <strong>remix</strong> e abra o novo projeto.</li>
              <li>No projeto novo, <strong>cadastre todos os usuários com os MESMOS e-mails</strong> do projeto antigo (qualquer senha).</li>
              <li>Volte aqui (Backup) no projeto novo e importe o JSON.</li>
              <li>O sistema cruza os e-mails e <strong>remapeia automaticamente</strong> todos os IDs de usuário em implantações, demandas, comissões, episódios, visitas, etc.</li>
            </ol>
            <p className="text-sm">
              Arquivos de storage (avatares, evidências) precisam ser migrados separadamente.
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
                Restauração com Remapeamento
              </CardTitle>
              <CardDescription>
                Importa o JSON e remapeia usuários por e-mail automaticamente
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

        {remapStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" />
                Resultado do remapeamento de usuários
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>{remapStats.matched}</strong> usuário(s) remapeado(s) com sucesso (e-mails encontrados no projeto atual).
              </p>
              {remapStats.missing.length > 0 && (
                <div>
                  <p className="text-destructive font-medium">
                    {remapStats.missing.length} usuário(s) NÃO encontrado(s) — registros vinculados a eles continuarão órfãos:
                  </p>
                  <ul className="ml-4 list-disc text-muted-foreground">
                    {remapStats.missing.slice(0, 20).map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                    {remapStats.missing.length > 20 && <li>... e mais {remapStats.missing.length - 20}</li>}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
