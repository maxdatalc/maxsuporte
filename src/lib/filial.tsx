import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface FilialOption {
  id: string;
  nome: string;
  role: string;
  is_default: boolean;
}

interface FilialContextType {
  /** Filiais às quais o usuário pertence (admin vê todas) */
  filiais: FilialOption[];
  /** Filial selecionada atualmente; null = "Todas" (apenas admin) */
  currentFilialId: string | null;
  setCurrentFilialId: (id: string | null) => void;
  /** true quando admin escolhe visão global */
  isAllFiliais: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const FilialContext = createContext<FilialContextType | undefined>(undefined);
const STORAGE_KEY = "maxsuporte:current_filial";

export function FilialProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const [filiais, setFiliais] = useState<FilialOption[]>([]);
  const [currentFilialId, setCurrentFilialIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setCurrentFilialId = useCallback((id: string | null) => {
    setCurrentFilialIdState(id);
    if (id === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const load = useCallback(async () => {
    if (!user) {
      setFiliais([]);
      setCurrentFilialIdState(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    let options: FilialOption[] = [];

    if (role === "admin") {
      // Admin enxerga todas
      const { data } = await supabase
        .from("filiais")
        .select("id, nome, ativo")
        .order("nome");
      options = (data || []).map((f: any) => ({
        id: f.id,
        nome: f.nome,
        role: "admin",
        is_default: false,
      }));
    } else {
      const { data } = await supabase
        .from("user_filiais")
        .select("filial_id, role, is_default, filiais(id, nome)")
        .eq("user_id", user.id);
      options = (data || [])
        .filter((r: any) => r.filiais)
        .map((r: any) => ({
          id: r.filiais.id,
          nome: r.filiais.nome,
          role: r.role,
          is_default: r.is_default,
        }));
    }

    setFiliais(options);

    // Restore selection
    const stored = localStorage.getItem(STORAGE_KEY);
    if (role === "admin") {
      // Admin: null = todas; senão precisa estar entre as filiais
      if (stored && options.some((o) => o.id === stored)) {
        setCurrentFilialIdState(stored);
      } else {
        setCurrentFilialIdState(null); // todas
      }
    } else {
      const defaultOne = options.find((o) => o.is_default) || options[0];
      if (stored && options.some((o) => o.id === stored)) {
        setCurrentFilialIdState(stored);
      } else if (defaultOne) {
        setCurrentFilialIdState(defaultOne.id);
      } else {
        setCurrentFilialIdState(null);
      }
    }

    setLoading(false);
  }, [user, role]);

  useEffect(() => {
    load();
  }, [load]);

  const isAllFiliais = role === "admin" && currentFilialId === null;

  return (
    <FilialContext.Provider
      value={{ filiais, currentFilialId, setCurrentFilialId, isAllFiliais, loading, refresh: load }}
    >
      {children}
    </FilialContext.Provider>
  );
}

export function useFilial() {
  const ctx = useContext(FilialContext);
  if (!ctx) throw new Error("useFilial must be used within FilialProvider");
  return ctx;
}
