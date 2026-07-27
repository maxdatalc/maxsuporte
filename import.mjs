#!/usr/bin/env node
// MAX SUPORTE — importador de backup.json para novo projeto Supabase.
// Uso:
//   export SUPABASE_URL=https://<ref>.supabase.co
//   export SUPABASE_SERVICE_ROLE_KEY=<service_role>
//   node import.mjs ../backup.json
//
// Remapeia user_id antigo -> novo casando por email em auth.users.
// Requer: os usuários já semeados (rode seed-users.sql antes).

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const [, , FILE = "../backup.json"] = process.argv;
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supa = createClient(URL, KEY, { auth: { persistSession: false } });

// Ordem de import (respeita FKs). Deve casar com backup.json.
const ORDER = [
  "filiais",
  "profiles", "user_roles", "user_filiais", "user_module_permissions",
  "clients", "commission_types", "commission_rules",
  "implementations", "implementation_analysts", "implementation_commissions",
  "checklist_items", "episodes", "episode_audit_logs", "conclusion_requests",
  "webhook_logs",
];

// Colunas que apontam para auth.users (por tabela).
const USER_FK = {
  profiles: ["user_id"],
  user_roles: ["user_id"],
  user_filiais: ["user_id"],
  user_module_permissions: ["user_id"],
  clients: ["created_by"],
  implementations: ["implementer_id", "created_by"],
  implementation_analysts: ["analyst_id"],
  implementation_commissions: ["created_by"],
  episodes: ["created_by"],
  episode_audit_logs: ["edited_by"],
  conclusion_requests: ["requester_id", "approved_by"],
};

async function buildUserMap(oldRows) {
  // Coleta emails do backup a partir de profiles.
  const emails = new Map(); // email -> old_user_id
  for (const p of oldRows.profiles || []) {
    if (p.email && p.user_id) emails.set(p.email.toLowerCase(), p.user_id);
  }
  // Lista todos os users do novo projeto (paginado).
  const map = new Map(); // old_user_id -> new_user_id
  let page = 1;
  while (true) {
    const { data, error } = await supa.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data.users) {
      const em = (u.email || "").toLowerCase();
      const oldId = emails.get(em);
      if (oldId) map.set(oldId, u.id);
    }
    if (data.users.length < 200) break;
    page++;
  }
  return map;
}

function remap(rows, table, userMap) {
  const cols = USER_FK[table] || [];
  if (!cols.length) return rows;
  return rows.map((r) => {
    const out = { ...r };
    for (const c of cols) {
      const v = out[c];
      if (v && userMap.has(v)) out[c] = userMap.get(v);
      else if (v && !userMap.has(v)) {
        // usuário não semeado — mantém, mas avisa
        // (pode falhar na FK; considere semear antes)
      }
    }
    return out;
  });
}

async function upsertChunked(table, rows) {
  if (!rows.length) return { ok: 0, fail: 0 };
  const chunk = 200;
  let ok = 0, fail = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error } = await supa.from(table).upsert(slice, { onConflict: "id" });
    if (error) {
      // fallback linha a linha
      for (const row of slice) {
        const { error: e2 } = await supa.from(table).upsert(row, { onConflict: "id" });
        if (e2) { fail++; console.warn(`  [${table}] falhou:`, e2.message, "id=", row.id); }
        else ok++;
      }
    } else ok += slice.length;
  }
  return { ok, fail };
}

(async () => {
  const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const tables = raw.tables || raw;
  console.log("Construindo mapa de usuários (email -> new uuid)...");
  const userMap = await buildUserMap(tables);
  console.log(`  ${userMap.size} usuários mapeados`);

  for (const t of ORDER) {
    const rows = tables[t];
    if (!rows) { console.log(`- ${t}: (ausente no backup)`); continue; }
    const remapped = remap(rows, t, userMap);
    process.stdout.write(`- ${t}: ${remapped.length} linhas... `);
    const { ok, fail } = await upsertChunked(t, remapped);
    console.log(`ok=${ok} fail=${fail}`);
  }
  console.log("Concluído.");
})().catch((e) => { console.error(e); process.exit(1); });
