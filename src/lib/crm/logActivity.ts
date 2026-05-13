import { supabase } from "@/integrations/supabase/client";

export async function logDealActivity(
  dealId: string,
  tipo: string,
  descricao: string,
  payload?: Record<string, unknown>
) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("deal_activity_logs").insert({
    deal_id: dealId,
    tipo,
    descricao,
    payload: payload ?? null,
    user_id: user?.id ?? null,
  });
}
