export type DealStage = "lead" | "contato" | "diagnostico" | "proposta" | "negociacao" | "ganho" | "perdido";
export type DealStatus = "ativo" | "ganho" | "perdido";
export type DealSuggestedType = "basic" | "manager" | "web";
export type DealComplexity = "baixa" | "media" | "alta";

export const STAGE_LABELS: Record<DealStage, string> = {
  lead: "Lead",
  contato: "Contato realizado",
  diagnostico: "Diagnóstico",
  proposta: "Proposta enviada",
  negociacao: "Negociação",
  ganho: "Fechado ganho",
  perdido: "Fechado perdido",
};

export const STAGE_ORDER: DealStage[] = ["lead", "contato", "diagnostico", "proposta", "negociacao", "ganho", "perdido"];

export const SISTEMAS = ["MaxWeb", "MaxBasic", "MaxManager SLIM", "MaxManager PRO"] as const;
export const MODULOS_ADICIONAIS = ["AutoMax", "MaxVet", "MaxFood", "MaxPDV", "MaxPDV Web"] as const;
