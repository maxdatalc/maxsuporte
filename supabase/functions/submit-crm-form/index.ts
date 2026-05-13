import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { deal_id, token, data } = body || {};
    if (!deal_id || !token || !data) {
      return new Response(JSON.stringify({ error: "Parâmetros obrigatórios ausentes" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: deal, error: dErr } = await admin
      .from("deals").select("id, form_token, vendedor_id").eq("id", deal_id).maybeSingle();
    if (dErr || !deal) {
      return new Response(JSON.stringify({ error: "Negócio não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (deal.form_token !== token) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowed = [
      "razao_social","nome_fantasia","cnpj","email_empresa","telefone_fixo","telefone_celular",
      "regime_tributario","quantidade_computadores",
      "responsavel_nome","responsavel_cpf","responsavel_rg","responsavel_email","responsavel_telefone_celular",
      "nome_vendedor","valor_implantacao","valor_mensalidade","sistema_contratado",
      "qtd_licencas_maquinas","licencas_automax_mobile","licencas_maxbip","modulos_adicionais",
      "sistema_atual","migrar_banco_dados","particularidades_identificadas",
    ];
    const payload: Record<string, unknown> = { deal_id, submission_origin: "publico" };
    for (const k of allowed) if (k in data) payload[k] = data[k];

    const { data: existing } = await admin.from("form_responses").select("id").eq("deal_id", deal_id).maybeSingle();
    if (existing) {
      await admin.from("form_responses").update(payload).eq("deal_id", deal_id);
    } else {
      await admin.from("form_responses").insert(payload);
    }

    // Suggest pre-implementation
    const qtd = Number(data.quantidade_computadores ?? 0);
    let suggested_type: string | null = null, complexidade: string | null = null, horas_estimadas: number | null = null;
    if (qtd > 0) {
      if (qtd <= 5) { suggested_type = "basic"; complexidade = "baixa"; horas_estimadas = 5; }
      else if (qtd <= 15) { suggested_type = "manager"; complexidade = "media"; horas_estimadas = 10; }
      else { suggested_type = "web"; complexidade = "alta"; horas_estimadas = 20; }
    }

    await admin.from("deals").update({
      formulario_preenchido: true,
      etapa: "diagnostico",
      ...(suggested_type ? { suggested_type, complexidade, horas_estimadas } : {}),
    }).eq("id", deal_id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
