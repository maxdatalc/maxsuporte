import { useFilial } from "@/lib/filial";
import { useAuth } from "@/lib/auth";
import { Building2, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function FilialSelector() {
  const { filiais, currentFilialId, setCurrentFilialId, isAllFiliais, loading } = useFilial();
  const { role } = useAuth();

  // Não mostra para usuários comuns com apenas uma filial
  if (loading) return null;
  if (role !== "admin" && filiais.length <= 1) return null;
  if (filiais.length === 0) return null;

  const current = filiais.find((f) => f.id === currentFilialId);
  const label = isAllFiliais ? "Todas as filiais" : current?.nome || "Selecionar filial";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 max-w-[220px]">
          <Building2 className="h-4 w-4 text-primary shrink-0" />
          <span className="truncate text-sm">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Filial ativa</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {role === "admin" && (
          <DropdownMenuItem onClick={() => setCurrentFilialId(null)} className="gap-2">
            {isAllFiliais && <Check className="h-4 w-4 text-primary" />}
            <span className={isAllFiliais ? "font-medium" : "ml-6"}>Todas as filiais</span>
          </DropdownMenuItem>
        )}
        {filiais.map((f) => {
          const active = currentFilialId === f.id;
          return (
            <DropdownMenuItem key={f.id} onClick={() => setCurrentFilialId(f.id)} className="gap-2">
              {active && <Check className="h-4 w-4 text-primary" />}
              <span className={active ? "font-medium" : "ml-6"}>{f.nome}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
