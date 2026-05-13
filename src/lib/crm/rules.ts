import type { DealComplexity, DealSuggestedType } from "./types";

export interface PreImplantacaoSuggestion {
  suggested_type: DealSuggestedType;
  complexidade: DealComplexity;
  horas_estimadas: number;
}

export function suggestPreImplantacao(qtdComputadores?: number | null): PreImplantacaoSuggestion | null {
  if (!qtdComputadores || qtdComputadores <= 0) return null;
  if (qtdComputadores <= 5) return { suggested_type: "basic", complexidade: "baixa", horas_estimadas: 5 };
  if (qtdComputadores <= 15) return { suggested_type: "manager", complexidade: "media", horas_estimadas: 10 };
  return { suggested_type: "web", complexidade: "alta", horas_estimadas: 20 };
}
