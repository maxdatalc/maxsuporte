export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      base_conhecimento_ia: {
        Row: {
          ativo: boolean
          categoria: Database["public"]["Enums"]["knowledge_category"]
          contexto: string
          created_at: string
          created_by: string | null
          diretriz_decisao: string | null
          id: string
          perfil_cliente: string | null
          sugestao_servico: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria: Database["public"]["Enums"]["knowledge_category"]
          contexto: string
          created_at?: string
          created_by?: string | null
          diretriz_decisao?: string | null
          id?: string
          perfil_cliente?: string | null
          sugestao_servico?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["knowledge_category"]
          contexto?: string
          created_at?: string
          created_by?: string | null
          diretriz_decisao?: string | null
          id?: string
          perfil_cliente?: string | null
          sugestao_servico?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      checklist_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          implementation_id: string
          is_completed: boolean
          observations: string | null
          order_index: number
          parent_id: string | null
          time_spent_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          implementation_id: string
          is_completed?: boolean
          observations?: string | null
          order_index: number
          parent_id?: string | null
          time_spent_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          implementation_id?: string
          is_completed?: boolean
          observations?: string | null
          order_index?: number
          parent_id?: string | null
          time_spent_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_implementation_id_fkey"
            columns: ["implementation_id"]
            isOneToOne: false
            referencedRelation: "implementations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          cnpj: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          observations: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          observations?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          observations?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      commission_rules: {
        Row: {
          commission_value: number
          created_at: string
          created_by: string | null
          id: string
          implementation_type: Database["public"]["Enums"]["implementation_type"]
          is_active: boolean
          updated_at: string
        }
        Insert: {
          commission_value?: number
          created_at?: string
          created_by?: string | null
          id?: string
          implementation_type: Database["public"]["Enums"]["implementation_type"]
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          commission_value?: number
          created_at?: string
          created_by?: string | null
          id?: string
          implementation_type?: Database["public"]["Enums"]["implementation_type"]
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      commission_types: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      conclusion_requests: {
        Row: {
          admin_observation: string | null
          approved_by: string | null
          created_at: string
          id: string
          implementation_id: string
          requester_id: string
          requester_observation: string | null
          status: Database["public"]["Enums"]["conclusion_request_status"]
          updated_at: string
        }
        Insert: {
          admin_observation?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          implementation_id: string
          requester_id: string
          requester_observation?: string | null
          status?: Database["public"]["Enums"]["conclusion_request_status"]
          updated_at?: string
        }
        Update: {
          admin_observation?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          implementation_id?: string
          requester_id?: string
          requester_observation?: string | null
          status?: Database["public"]["Enums"]["conclusion_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conclusion_requests_implementation_id_fkey"
            columns: ["implementation_id"]
            isOneToOne: false
            referencedRelation: "implementations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_settings: {
        Row: {
          contrato_instrucoes_padrao: string | null
          cor_primaria: string | null
          footer_html: string | null
          header_html: string | null
          id: string
          logo_url: string | null
          proposta_template_html: string | null
          singleton: boolean
          texto_condicoes_comerciais_padrao: string | null
          texto_observacoes_padrao: string | null
          texto_validade_proposta: string | null
          updated_at: string
        }
        Insert: {
          contrato_instrucoes_padrao?: string | null
          cor_primaria?: string | null
          footer_html?: string | null
          header_html?: string | null
          id?: string
          logo_url?: string | null
          proposta_template_html?: string | null
          singleton?: boolean
          texto_condicoes_comerciais_padrao?: string | null
          texto_observacoes_padrao?: string | null
          texto_validade_proposta?: string | null
          updated_at?: string
        }
        Update: {
          contrato_instrucoes_padrao?: string | null
          cor_primaria?: string | null
          footer_html?: string | null
          header_html?: string | null
          id?: string
          logo_url?: string | null
          proposta_template_html?: string | null
          singleton?: boolean
          texto_condicoes_comerciais_padrao?: string | null
          texto_observacoes_padrao?: string | null
          texto_validade_proposta?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      deal_activity_logs: {
        Row: {
          created_at: string
          deal_id: string
          descricao: string
          id: string
          payload: Json | null
          tipo: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deal_id: string
          descricao: string
          id?: string
          payload?: Json | null
          tipo: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string
          descricao?: string
          id?: string
          payload?: Json | null
          tipo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_activity_logs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_proposals: {
        Row: {
          condicoes_comerciais: string | null
          created_at: string
          deal_id: string
          escopo: string | null
          gerado_por: string | null
          id: string
          licencas_automax_mobile: number | null
          licencas_maxbip: number | null
          modulos_adicionais: string[] | null
          observacoes_comerciais: string | null
          pdf_path: string | null
          prazo_dias: number | null
          qtd_licencas_maquinas: number | null
          sistema_contratado: string[] | null
          validade_proposta_dias: number | null
          valor: number | null
          valor_implantacao: number | null
          valor_mensalidade: number | null
          version: number
        }
        Insert: {
          condicoes_comerciais?: string | null
          created_at?: string
          deal_id: string
          escopo?: string | null
          gerado_por?: string | null
          id?: string
          licencas_automax_mobile?: number | null
          licencas_maxbip?: number | null
          modulos_adicionais?: string[] | null
          observacoes_comerciais?: string | null
          pdf_path?: string | null
          prazo_dias?: number | null
          qtd_licencas_maquinas?: number | null
          sistema_contratado?: string[] | null
          validade_proposta_dias?: number | null
          valor?: number | null
          valor_implantacao?: number | null
          valor_mensalidade?: number | null
          version?: number
        }
        Update: {
          condicoes_comerciais?: string | null
          created_at?: string
          deal_id?: string
          escopo?: string | null
          gerado_por?: string | null
          id?: string
          licencas_automax_mobile?: number | null
          licencas_maxbip?: number | null
          modulos_adicionais?: string[] | null
          observacoes_comerciais?: string | null
          pdf_path?: string | null
          prazo_dias?: number | null
          qtd_licencas_maquinas?: number | null
          sistema_contratado?: string[] | null
          validade_proposta_dias?: number | null
          valor?: number | null
          valor_implantacao?: number | null
          valor_mensalidade?: number | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "deal_proposals_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_signature_documents: {
        Row: {
          created_at: string
          deal_id: string
          document_type: Database["public"]["Enums"]["signature_doc_type"]
          file_path: string
          form_response_id: string | null
          id: string
          notes: string | null
          sent_at: string | null
          sent_to_client: boolean
          signed: boolean
          signed_at: string | null
          status: Database["public"]["Enums"]["signature_doc_status"]
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          document_type?: Database["public"]["Enums"]["signature_doc_type"]
          file_path: string
          form_response_id?: string | null
          id?: string
          notes?: string | null
          sent_at?: string | null
          sent_to_client?: boolean
          signed?: boolean
          signed_at?: string | null
          status?: Database["public"]["Enums"]["signature_doc_status"]
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          document_type?: Database["public"]["Enums"]["signature_doc_type"]
          file_path?: string
          form_response_id?: string | null
          id?: string
          notes?: string | null
          sent_at?: string | null
          sent_to_client?: boolean
          signed?: boolean
          signed_at?: string | null
          status?: Database["public"]["Enums"]["signature_doc_status"]
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_signature_documents_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_signature_documents_form_response_id_fkey"
            columns: ["form_response_id"]
            isOneToOne: false
            referencedRelation: "form_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          closed_at: string | null
          complexidade: Database["public"]["Enums"]["deal_complexity"] | null
          created_at: string
          etapa: Database["public"]["Enums"]["deal_stage"]
          form_token: string
          formulario_preenchido: boolean
          horas_estimadas: number | null
          id: string
          implementation_id: string | null
          lead_id: string
          nome_negocio: string
          probabilidade: number
          status: Database["public"]["Enums"]["deal_status"]
          suggested_type:
            | Database["public"]["Enums"]["deal_suggested_type"]
            | null
          updated_at: string
          valor_estimado: number | null
          vendedor_id: string
        }
        Insert: {
          closed_at?: string | null
          complexidade?: Database["public"]["Enums"]["deal_complexity"] | null
          created_at?: string
          etapa?: Database["public"]["Enums"]["deal_stage"]
          form_token?: string
          formulario_preenchido?: boolean
          horas_estimadas?: number | null
          id?: string
          implementation_id?: string | null
          lead_id: string
          nome_negocio: string
          probabilidade?: number
          status?: Database["public"]["Enums"]["deal_status"]
          suggested_type?:
            | Database["public"]["Enums"]["deal_suggested_type"]
            | null
          updated_at?: string
          valor_estimado?: number | null
          vendedor_id: string
        }
        Update: {
          closed_at?: string | null
          complexidade?: Database["public"]["Enums"]["deal_complexity"] | null
          created_at?: string
          etapa?: Database["public"]["Enums"]["deal_stage"]
          form_token?: string
          formulario_preenchido?: boolean
          horas_estimadas?: number | null
          id?: string
          implementation_id?: string | null
          lead_id?: string
          nome_negocio?: string
          probabilidade?: number
          status?: Database["public"]["Enums"]["deal_status"]
          suggested_type?:
            | Database["public"]["Enums"]["deal_suggested_type"]
            | null
          updated_at?: string
          valor_estimado?: number | null
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_analysts: {
        Row: {
          analyst_id: string
          created_at: string
          demand_id: string
          id: string
        }
        Insert: {
          analyst_id: string
          created_at?: string
          demand_id: string
          id?: string
        }
        Update: {
          analyst_id?: string
          created_at?: string
          demand_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_analysts_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_oncenter_links: {
        Row: {
          created_at: string
          demand_id: string
          id: string
          linked_by: string | null
          oncenter_ticket_id: number
        }
        Insert: {
          created_at?: string
          demand_id: string
          id?: string
          linked_by?: string | null
          oncenter_ticket_id: number
        }
        Update: {
          created_at?: string
          demand_id?: string
          id?: string
          linked_by?: string | null
          oncenter_ticket_id?: number
        }
        Relationships: []
      }
      demand_step_evidences: {
        Row: {
          created_at: string
          demand_step_id: string
          file_name: string
          file_path: string
          id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          demand_step_id: string
          file_name: string
          file_path: string
          id?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          demand_step_id?: string
          file_name?: string
          file_path?: string
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_step_evidences_demand_step_id_fkey"
            columns: ["demand_step_id"]
            isOneToOne: false
            referencedRelation: "demand_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_steps: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          corrective_action: string | null
          created_at: string
          demand_id: string
          earned_score: number
          id: string
          instructions: string | null
          is_completed: boolean
          observation: string | null
          order_index: number
          response_type: Database["public"]["Enums"]["demand_step_response_type"]
          result: string | null
          score: number
          template_step_id: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          corrective_action?: string | null
          created_at?: string
          demand_id: string
          earned_score?: number
          id?: string
          instructions?: string | null
          is_completed?: boolean
          observation?: string | null
          order_index: number
          response_type?: Database["public"]["Enums"]["demand_step_response_type"]
          result?: string | null
          score?: number
          template_step_id: string
          title: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          corrective_action?: string | null
          created_at?: string
          demand_id?: string
          earned_score?: number
          id?: string
          instructions?: string | null
          is_completed?: boolean
          observation?: string | null
          order_index?: number
          response_type?: Database["public"]["Enums"]["demand_step_response_type"]
          result?: string | null
          score?: number
          template_step_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_steps_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_steps_template_step_id_fkey"
            columns: ["template_step_id"]
            isOneToOne: false
            referencedRelation: "demand_template_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_template_steps: {
        Row: {
          created_at: string
          id: string
          image_path: string | null
          instructions: string | null
          order_index: number
          response_type: Database["public"]["Enums"]["demand_step_response_type"]
          score: number
          template_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_path?: string | null
          instructions?: string | null
          order_index: number
          response_type?: Database["public"]["Enums"]["demand_step_response_type"]
          score?: number
          template_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string | null
          instructions?: string | null
          order_index?: number
          response_type?: Database["public"]["Enums"]["demand_step_response_type"]
          score?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_template_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "demand_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_templates: {
        Row: {
          base_score: number
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          base_score?: number
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          base_score?: number
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      demands: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          deadline: string | null
          description: string | null
          id: string
          max_score: number
          status: Database["public"]["Enums"]["demand_status"]
          template_id: string
          title: string
          total_score: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          deadline?: string | null
          description?: string | null
          id?: string
          max_score?: number
          status?: Database["public"]["Enums"]["demand_status"]
          template_id: string
          title: string
          total_score?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          deadline?: string | null
          description?: string | null
          id?: string
          max_score?: number
          status?: Database["public"]["Enums"]["demand_status"]
          template_id?: string
          title?: string
          total_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demands_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "demand_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      episode_audit_logs: {
        Row: {
          edited_at: string
          edited_by: string
          episode_id: string
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          edited_at?: string
          edited_by: string
          episode_id: string
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          edited_at?: string
          edited_by?: string
          episode_id?: string
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "episode_audit_logs_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      episodes: {
        Row: {
          created_at: string
          created_by: string | null
          end_time: string
          episode_date: string
          episode_type: Database["public"]["Enums"]["episode_type"]
          id: string
          implementation_id: string
          module: Database["public"]["Enums"]["module_type"]
          observations: string | null
          start_time: string
          time_spent_minutes: number
          trained_clients: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_time: string
          episode_date: string
          episode_type: Database["public"]["Enums"]["episode_type"]
          id?: string
          implementation_id: string
          module: Database["public"]["Enums"]["module_type"]
          observations?: string | null
          start_time: string
          time_spent_minutes: number
          trained_clients?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_time?: string
          episode_date?: string
          episode_type?: Database["public"]["Enums"]["episode_type"]
          id?: string
          implementation_id?: string
          module?: Database["public"]["Enums"]["module_type"]
          observations?: string | null
          start_time?: string
          time_spent_minutes?: number
          trained_clients?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_implementation_id_fkey"
            columns: ["implementation_id"]
            isOneToOne: false
            referencedRelation: "implementations"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          cnpj: string | null
          created_at: string
          deal_id: string
          email_empresa: string | null
          id: string
          licencas_automax_mobile: number | null
          licencas_maxbip: number | null
          migrar_banco_dados: string | null
          modulos_adicionais: string[] | null
          nome_fantasia: string | null
          nome_vendedor: string | null
          particularidades_identificadas: string | null
          qtd_licencas_maquinas: number | null
          quantidade_computadores: number | null
          razao_social: string | null
          regime_tributario: string | null
          responsavel_cpf: string | null
          responsavel_email: string | null
          responsavel_nome: string | null
          responsavel_rg: string | null
          responsavel_telefone_celular: string | null
          sistema_atual: string | null
          sistema_contratado: string[] | null
          submission_origin: string
          submitted_by: string | null
          telefone_celular: string | null
          telefone_fixo: string | null
          updated_at: string
          valor_implantacao: number | null
          valor_mensalidade: number | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          deal_id: string
          email_empresa?: string | null
          id?: string
          licencas_automax_mobile?: number | null
          licencas_maxbip?: number | null
          migrar_banco_dados?: string | null
          modulos_adicionais?: string[] | null
          nome_fantasia?: string | null
          nome_vendedor?: string | null
          particularidades_identificadas?: string | null
          qtd_licencas_maquinas?: number | null
          quantidade_computadores?: number | null
          razao_social?: string | null
          regime_tributario?: string | null
          responsavel_cpf?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_rg?: string | null
          responsavel_telefone_celular?: string | null
          sistema_atual?: string | null
          sistema_contratado?: string[] | null
          submission_origin?: string
          submitted_by?: string | null
          telefone_celular?: string | null
          telefone_fixo?: string | null
          updated_at?: string
          valor_implantacao?: number | null
          valor_mensalidade?: number | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          deal_id?: string
          email_empresa?: string | null
          id?: string
          licencas_automax_mobile?: number | null
          licencas_maxbip?: number | null
          migrar_banco_dados?: string | null
          modulos_adicionais?: string[] | null
          nome_fantasia?: string | null
          nome_vendedor?: string | null
          particularidades_identificadas?: string | null
          qtd_licencas_maquinas?: number | null
          quantidade_computadores?: number | null
          razao_social?: string | null
          regime_tributario?: string | null
          responsavel_cpf?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_rg?: string | null
          responsavel_telefone_celular?: string | null
          sistema_atual?: string | null
          sistema_contratado?: string[] | null
          submission_origin?: string
          submitted_by?: string | null
          telefone_celular?: string | null
          telefone_fixo?: string | null
          updated_at?: string
          valor_implantacao?: number | null
          valor_mensalidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: true
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_feedback: {
        Row: {
          created_at: string
          feedback_comment: string | null
          id: string
          rating: Database["public"]["Enums"]["feedback_rating"]
          recommendation_id: string
          suggested_correction: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_comment?: string | null
          id?: string
          rating: Database["public"]["Enums"]["feedback_rating"]
          recommendation_id: string
          suggested_correction?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_comment?: string | null
          id?: string
          rating?: Database["public"]["Enums"]["feedback_rating"]
          recommendation_id?: string
          suggested_correction?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ia_feedback_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "ia_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_recommendation_versions: {
        Row: {
          content: string
          created_at: string
          edit_reason: string | null
          edited_by: string
          id: string
          recommendation_id: string
          version_number: number
        }
        Insert: {
          content: string
          created_at?: string
          edit_reason?: string | null
          edited_by: string
          id?: string
          recommendation_id: string
          version_number: number
        }
        Update: {
          content?: string
          created_at?: string
          edit_reason?: string | null
          edited_by?: string
          id?: string
          recommendation_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "ia_recommendation_versions_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "ia_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_recommendations: {
        Row: {
          confidence_score: number | null
          created_at: string
          created_by: string
          current_version: number
          generated_text: string
          id: string
          implantacao_id: string | null
          status: Database["public"]["Enums"]["recommendation_status"]
          structured_output: Json | null
          visita_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          created_by: string
          current_version?: number
          generated_text: string
          id?: string
          implantacao_id?: string | null
          status?: Database["public"]["Enums"]["recommendation_status"]
          structured_output?: Json | null
          visita_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          created_by?: string
          current_version?: number
          generated_text?: string
          id?: string
          implantacao_id?: string | null
          status?: Database["public"]["Enums"]["recommendation_status"]
          structured_output?: Json | null
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ia_recommendations_implantacao_id_fkey"
            columns: ["implantacao_id"]
            isOneToOne: false
            referencedRelation: "implementations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ia_recommendations_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "visitas"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_training_dataset: {
        Row: {
          corrected_output: string
          created_at: string
          error_type: string | null
          id: string
          input_context: Json
          original_output: string
          validated_by: string
        }
        Insert: {
          corrected_output: string
          created_at?: string
          error_type?: string | null
          id?: string
          input_context: Json
          original_output: string
          validated_by: string
        }
        Update: {
          corrected_output?: string
          created_at?: string
          error_type?: string | null
          id?: string
          input_context?: Json
          original_output?: string
          validated_by?: string
        }
        Relationships: []
      }
      implementation_analysts: {
        Row: {
          analyst_id: string
          created_at: string
          id: string
          implementation_id: string
        }
        Insert: {
          analyst_id: string
          created_at?: string
          id?: string
          implementation_id: string
        }
        Update: {
          analyst_id?: string
          created_at?: string
          id?: string
          implementation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "implementation_analysts_implementation_id_fkey"
            columns: ["implementation_id"]
            isOneToOne: false
            referencedRelation: "implementations"
            referencedColumns: ["id"]
          },
        ]
      }
      implementation_commissions: {
        Row: {
          commission_name: string
          commission_type_id: string | null
          commission_value: number
          created_at: string
          created_by: string | null
          id: string
          implementation_id: string
        }
        Insert: {
          commission_name: string
          commission_type_id?: string | null
          commission_value: number
          created_at?: string
          created_by?: string | null
          id?: string
          implementation_id: string
        }
        Update: {
          commission_name?: string
          commission_type_id?: string | null
          commission_value?: number
          created_at?: string
          created_by?: string | null
          id?: string
          implementation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "implementation_commissions_commission_type_id_fkey"
            columns: ["commission_type_id"]
            isOneToOne: false
            referencedRelation: "commission_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "implementation_commissions_implementation_id_fkey"
            columns: ["implementation_id"]
            isOneToOne: false
            referencedRelation: "implementations"
            referencedColumns: ["id"]
          },
        ]
      }
      implementations: {
        Row: {
          actual_start_date: string | null
          client_id: string
          commission_paid: boolean
          commission_paid_at: string | null
          commission_type_id: string | null
          commission_value: number | null
          created_at: string
          created_by: string | null
          end_date: string | null
          has_data_migration: boolean
          id: string
          implementation_type:
            | Database["public"]["Enums"]["implementation_type"]
            | null
          implementer_id: string | null
          negotiated_time_minutes: number | null
          observations: string | null
          start_date: string
          status: Database["public"]["Enums"]["implementation_status"]
          total_time_minutes: number | null
          updated_at: string
        }
        Insert: {
          actual_start_date?: string | null
          client_id: string
          commission_paid?: boolean
          commission_paid_at?: string | null
          commission_type_id?: string | null
          commission_value?: number | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          has_data_migration?: boolean
          id?: string
          implementation_type?:
            | Database["public"]["Enums"]["implementation_type"]
            | null
          implementer_id?: string | null
          negotiated_time_minutes?: number | null
          observations?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["implementation_status"]
          total_time_minutes?: number | null
          updated_at?: string
        }
        Update: {
          actual_start_date?: string | null
          client_id?: string
          commission_paid?: boolean
          commission_paid_at?: string | null
          commission_type_id?: string | null
          commission_value?: number | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          has_data_migration?: boolean
          id?: string
          implementation_type?:
            | Database["public"]["Enums"]["implementation_type"]
            | null
          implementer_id?: string | null
          negotiated_time_minutes?: number | null
          observations?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["implementation_status"]
          total_time_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "implementations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "implementations_commission_type_id_fkey"
            columns: ["commission_type_id"]
            isOneToOne: false
            referencedRelation: "commission_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          created_by: string
          email: string | null
          empresa: string | null
          id: string
          nome: string
          observacoes: string | null
          origem: string | null
          telefone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          email?: string | null
          empresa?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          origem?: string | null
          telefone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string | null
          empresa?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string | null
          telefone?: string
          updated_at?: string
        }
        Relationships: []
      }
      oncenter_client_links: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          oncenter_contact_id: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          oncenter_contact_id: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          oncenter_contact_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      oncenter_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          last_synced_at: string | null
          name: string
          oncenter_contact_id: number
          phone: string | null
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          last_synced_at?: string | null
          name: string
          oncenter_contact_id: number
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          last_synced_at?: string | null
          name?: string
          oncenter_contact_id?: number
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      oncenter_ticket_cache: {
        Row: {
          attended_at_oncenter: string | null
          created_at: string
          created_at_oncenter: string | null
          department_name: string | null
          finish_motive: string | null
          finished_at_oncenter: string | null
          id: string
          last_message: string | null
          oncenter_contact_id: number | null
          oncenter_department_id: number | null
          oncenter_ticket_id: number
          oncenter_user_id: number | null
          protocol: string | null
          status: string
          synced_at: string
          updated_at_oncenter: string | null
        }
        Insert: {
          attended_at_oncenter?: string | null
          created_at?: string
          created_at_oncenter?: string | null
          department_name?: string | null
          finish_motive?: string | null
          finished_at_oncenter?: string | null
          id?: string
          last_message?: string | null
          oncenter_contact_id?: number | null
          oncenter_department_id?: number | null
          oncenter_ticket_id: number
          oncenter_user_id?: number | null
          protocol?: string | null
          status: string
          synced_at?: string
          updated_at_oncenter?: string | null
        }
        Update: {
          attended_at_oncenter?: string | null
          created_at?: string
          created_at_oncenter?: string | null
          department_name?: string | null
          finish_motive?: string | null
          finished_at_oncenter?: string | null
          id?: string
          last_message?: string | null
          oncenter_contact_id?: number | null
          oncenter_department_id?: number | null
          oncenter_ticket_id?: number
          oncenter_user_id?: number | null
          protocol?: string | null
          status?: string
          synced_at?: string
          updated_at_oncenter?: string | null
        }
        Relationships: []
      }
      oncenter_user_links: {
        Row: {
          chat_status: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          oncenter_email: string | null
          oncenter_photo_url: string | null
          oncenter_role: string | null
          oncenter_user_id: number
          oncenter_user_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_status?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          oncenter_email?: string | null
          oncenter_photo_url?: string | null
          oncenter_role?: string | null
          oncenter_user_id: number
          oncenter_user_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_status?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          oncenter_email?: string | null
          oncenter_photo_url?: string | null
          oncenter_role?: string | null
          oncenter_user_id?: number
          oncenter_user_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      oncenter_user_status_history: {
        Row: {
          id: string
          oncenter_user_id: number
          recorded_at: string
          status: string
        }
        Insert: {
          id?: string
          oncenter_user_id: number
          recorded_at?: string
          status: string
        }
        Update: {
          id?: string
          oncenter_user_id?: number
          recorded_at?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recomendacoes_visita: {
        Row: {
          conteudo: string
          created_at: string
          id: string
          origem: Database["public"]["Enums"]["recommendation_origin"]
          tipo: Database["public"]["Enums"]["recommendation_type"]
          visita_id: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          id?: string
          origem: Database["public"]["Enums"]["recommendation_origin"]
          tipo: Database["public"]["Enums"]["recommendation_type"]
          visita_id: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          id?: string
          origem?: Database["public"]["Enums"]["recommendation_origin"]
          tipo?: Database["public"]["Enums"]["recommendation_type"]
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recomendacoes_visita_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "visitas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_module_permissions: {
        Row: {
          created_at: string
          has_access: boolean
          id: string
          module: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          has_access?: boolean
          id?: string
          module: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          has_access?: boolean
          id?: string
          module?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visita_interacoes: {
        Row: {
          created_at: string
          id: string
          mensagem: string
          origem: Database["public"]["Enums"]["interaction_origin"]
          usuario_id: string | null
          visita_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mensagem: string
          origem?: Database["public"]["Enums"]["interaction_origin"]
          usuario_id?: string | null
          visita_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mensagem?: string
          origem?: Database["public"]["Enums"]["interaction_origin"]
          usuario_id?: string | null
          visita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visita_interacoes_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "visitas"
            referencedColumns: ["id"]
          },
        ]
      }
      visitas: {
        Row: {
          analista_id: string
          cliente_id: string
          created_at: string
          descricao_situacao: string
          id: string
          implantacao_id: string | null
          status: Database["public"]["Enums"]["visit_status"]
          tipo: Database["public"]["Enums"]["visit_type"]
          titulo: string
          updated_at: string
        }
        Insert: {
          analista_id: string
          cliente_id: string
          created_at?: string
          descricao_situacao: string
          id?: string
          implantacao_id?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
          tipo: Database["public"]["Enums"]["visit_type"]
          titulo: string
          updated_at?: string
        }
        Update: {
          analista_id?: string
          cliente_id?: string
          created_at?: string
          descricao_situacao?: string
          id?: string
          implantacao_id?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
          tipo?: Database["public"]["Enums"]["visit_type"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitas_implantacao_id_fkey"
            columns: ["implantacao_id"]
            isOneToOne: false
            referencedRelation: "implementations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string
          evento: string
          id: string
          payload: Json
          response: string | null
          status: string
        }
        Insert: {
          created_at?: string
          evento: string
          id?: string
          payload: Json
          response?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          evento?: string
          id?: string
          payload?: Json
          response?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_ai_quality_score: {
        Args: never
        Returns: {
          avg_score: number
          correction_rate: number
          incorrect_pct: number
          irrelevant_pct: number
          partially_useful_pct: number
          total_recommendations: number
          useful_pct: number
        }[]
      }
      create_default_checklist: {
        Args: { impl_id: string }
        Returns: undefined
      }
      get_active_commission: {
        Args: { impl_type: Database["public"]["Enums"]["implementation_type"] }
        Returns: number
      }
      get_public_profiles: {
        Args: { _user_ids?: string[] }
        Returns: {
          avatar_url: string
          name: string
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_analyst_on_deal_impl: { Args: { _deal_id: string }; Returns: boolean }
      update_scheduled_implementations: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "implantador" | "vendedor"
      conclusion_request_status: "pending" | "approved" | "rejected"
      deal_complexity: "baixa" | "media" | "alta"
      deal_stage:
        | "lead"
        | "contato"
        | "diagnostico"
        | "proposta"
        | "negociacao"
        | "ganho"
        | "perdido"
      deal_status: "ativo" | "ganho" | "perdido"
      deal_suggested_type: "basic" | "manager" | "web"
      demand_status: "pendente" | "em_andamento" | "concluida" | "atrasada"
      demand_step_response_type: "ok_falha" | "sim_nao" | "texto_livre"
      episode_type:
        | "treinamento"
        | "parametrizacao"
        | "ajuste_fiscal"
        | "migracao"
        | "instalacao"
      feedback_rating:
        | "useful"
        | "partially_useful"
        | "irrelevant"
        | "incorrect"
      implementation_status:
        | "em_andamento"
        | "pausada"
        | "concluida"
        | "cancelada"
        | "agendada"
      implementation_type: "web" | "manager" | "basic"
      interaction_origin: "usuario" | "ia"
      knowledge_category:
        | "produto"
        | "treinamento"
        | "comportamento"
        | "processo"
        | "comercial"
      module_type:
        | "vendas"
        | "financeiro"
        | "cadastros"
        | "relatorios"
        | "caixa"
        | "fiscal"
        | "geral"
      recommendation_origin: "ia" | "base_conhecimento"
      recommendation_status:
        | "generated"
        | "validated"
        | "corrected"
        | "rolled_back"
      recommendation_type: "resposta_ia" | "sugestao_servico" | "decisao"
      signature_doc_status: "pendente" | "anexado" | "enviado" | "assinado"
      signature_doc_type: "contrato_digitalizado" | "termo_assinatura" | "outro"
      visit_status: "aberta" | "analisada" | "resolvida"
      visit_type: "visita_tecnica" | "duvida" | "diagnostico" | "oportunidade"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "implantador", "vendedor"],
      conclusion_request_status: ["pending", "approved", "rejected"],
      deal_complexity: ["baixa", "media", "alta"],
      deal_stage: [
        "lead",
        "contato",
        "diagnostico",
        "proposta",
        "negociacao",
        "ganho",
        "perdido",
      ],
      deal_status: ["ativo", "ganho", "perdido"],
      deal_suggested_type: ["basic", "manager", "web"],
      demand_status: ["pendente", "em_andamento", "concluida", "atrasada"],
      demand_step_response_type: ["ok_falha", "sim_nao", "texto_livre"],
      episode_type: [
        "treinamento",
        "parametrizacao",
        "ajuste_fiscal",
        "migracao",
        "instalacao",
      ],
      feedback_rating: [
        "useful",
        "partially_useful",
        "irrelevant",
        "incorrect",
      ],
      implementation_status: [
        "em_andamento",
        "pausada",
        "concluida",
        "cancelada",
        "agendada",
      ],
      implementation_type: ["web", "manager", "basic"],
      interaction_origin: ["usuario", "ia"],
      knowledge_category: [
        "produto",
        "treinamento",
        "comportamento",
        "processo",
        "comercial",
      ],
      module_type: [
        "vendas",
        "financeiro",
        "cadastros",
        "relatorios",
        "caixa",
        "fiscal",
        "geral",
      ],
      recommendation_origin: ["ia", "base_conhecimento"],
      recommendation_status: [
        "generated",
        "validated",
        "corrected",
        "rolled_back",
      ],
      recommendation_type: ["resposta_ia", "sugestao_servico", "decisao"],
      signature_doc_status: ["pendente", "anexado", "enviado", "assinado"],
      signature_doc_type: [
        "contrato_digitalizado",
        "termo_assinatura",
        "outro",
      ],
      visit_status: ["aberta", "analisada", "resolvida"],
      visit_type: ["visita_tecnica", "duvida", "diagnostico", "oportunidade"],
    },
  },
} as const
