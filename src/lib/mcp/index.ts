import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoami from "./tools/whoami";
import listImplementations from "./tools/list-implementations";
import listDemands from "./tools/list-demands";
import listVisitas from "./tools/list-visitas";
import listDeals from "./tools/list-deals";

// The OAuth issuer MUST be the direct Supabase host, built from the project ref
// (which Vite inlines at build time — keeps this file import-safe).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "max-suporte-mcp",
  title: "MAX SUPORTE",
  version: "0.1.0",
  instructions:
    "Ferramentas do MAX SUPORTE. Cada chamada executa como o usuário autenticado e respeita RLS por filial e papel (admin, analista, vendedor). Use `whoami` para checar identidade e as ferramentas `list_*` para consultar implantações, demandas, visitas e negócios do CRM.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoami, listImplementations, listDemands, listVisitas, listDeals],
});
