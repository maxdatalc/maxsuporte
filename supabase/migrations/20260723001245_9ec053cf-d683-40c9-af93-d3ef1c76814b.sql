
-- clients: remove permissive true SELECT (rely on filial_isolation_select RESTRICTIVE + admin)
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
CREATE POLICY "Filial members or admin can view clients" ON public.clients FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR user_has_filial(auth.uid(), filial_id));

-- demand_oncenter_links: admin or user assigned to demand
DROP POLICY IF EXISTS "Authenticated users can view demand_oncenter_links" ON public.demand_oncenter_links;
CREATE POLICY "Admin or demand-scoped users view demand_oncenter_links" ON public.demand_oncenter_links FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.demands d
    WHERE d.id = demand_oncenter_links.demand_id
      AND user_has_filial(auth.uid(), d.filial_id)
  )
);

-- demand_template_steps: scope to parent template filial
DROP POLICY IF EXISTS "Authenticated users can view template steps" ON public.demand_template_steps;
CREATE POLICY "Filial members or admin can view template steps" ON public.demand_template_steps FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.demand_templates t
    WHERE t.id = demand_template_steps.template_id
      AND user_has_filial(auth.uid(), t.filial_id)
  )
);

-- ia_recommendations: creator, admin, or filial member on the parent visita
DROP POLICY IF EXISTS "Authenticated users can view recommendations" ON public.ia_recommendations;
CREATE POLICY "Owner admin or filial members view recommendations" ON public.ia_recommendations FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM public.visitas v
    WHERE v.id = ia_recommendations.visita_id
      AND (v.analista_id = auth.uid() OR user_has_filial(auth.uid(), v.filial_id))
  )
);

-- ia_recommendation_versions: scope via parent ia_recommendations
DROP POLICY IF EXISTS "Authenticated users can view versions" ON public.ia_recommendation_versions;
CREATE POLICY "Scoped view of recommendation versions" ON public.ia_recommendation_versions FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.ia_recommendations r
    LEFT JOIN public.visitas v ON v.id = r.visita_id
    WHERE r.id = ia_recommendation_versions.recommendation_id
      AND (
        r.created_by = auth.uid()
        OR v.analista_id = auth.uid()
        OR (v.filial_id IS NOT NULL AND user_has_filial(auth.uid(), v.filial_id))
      )
  )
);

-- oncenter_client_links: admin only
DROP POLICY IF EXISTS "Authenticated users can view oncenter_client_links" ON public.oncenter_client_links;
CREATE POLICY "Admins can view oncenter_client_links" ON public.oncenter_client_links FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- oncenter_contacts: admin only
DROP POLICY IF EXISTS "Authenticated users can view oncenter_contacts" ON public.oncenter_contacts;
CREATE POLICY "Admins can view oncenter_contacts" ON public.oncenter_contacts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- oncenter_ticket_cache: admin only
DROP POLICY IF EXISTS "Authenticated users can view oncenter_ticket_cache" ON public.oncenter_ticket_cache;
CREATE POLICY "Admins can view oncenter_ticket_cache" ON public.oncenter_ticket_cache FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- oncenter_user_status_history: admin only
DROP POLICY IF EXISTS "Authenticated users can view status history" ON public.oncenter_user_status_history;
CREATE POLICY "Admins can view oncenter_user_status_history" ON public.oncenter_user_status_history FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- visita_interacoes: admin, visit analyst, or filial member of the visit
DROP POLICY IF EXISTS "Authenticated users can view interactions" ON public.visita_interacoes;
CREATE POLICY "Admin analyst or filial members view interactions" ON public.visita_interacoes FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.visitas v
    WHERE v.id = visita_interacoes.visita_id
      AND (v.analista_id = auth.uid() OR user_has_filial(auth.uid(), v.filial_id))
  )
);

-- visitas: remove permissive true, keep admin/analyst/filial member scoping
DROP POLICY IF EXISTS "Authenticated users can view visitas" ON public.visitas;
CREATE POLICY "Admin analyst or filial members view visitas" ON public.visitas FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR analista_id = auth.uid()
  OR user_has_filial(auth.uid(), filial_id)
);
