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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_email: string
          created_at: string
          detail: Json | null
          id: string
        }
        Insert: {
          action: string
          admin_email: string
          created_at?: string
          detail?: Json | null
          id?: string
        }
        Update: {
          action?: string
          admin_email?: string
          created_at?: string
          detail?: Json | null
          id?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      admin_treasury: {
        Row: {
          created_at: string
          custo_api: number
          faturamento: number
          id: string
          lucro_liquido: number
          net_profit_percentage: number | null
          network: string | null
          occurred_at: string
          pedido_id: string | null
          provider_selected: string | null
          supplier_cost: number | null
          taxa_pix: number
        }
        Insert: {
          created_at?: string
          custo_api?: number
          faturamento?: number
          id?: string
          lucro_liquido?: number
          net_profit_percentage?: number | null
          network?: string | null
          occurred_at?: string
          pedido_id?: string | null
          provider_selected?: string | null
          supplier_cost?: number | null
          taxa_pix?: number
        }
        Update: {
          created_at?: string
          custo_api?: number
          faturamento?: number
          id?: string
          lucro_liquido?: number
          net_profit_percentage?: number | null
          network?: string | null
          occurred_at?: string
          pedido_id?: string | null
          provider_selected?: string | null
          supplier_cost?: number | null
          taxa_pix?: number
        }
        Relationships: [
          {
            foreignKeyName: "admin_treasury_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string
          id: string
          mensagem: string
          nivel: number
          status: string
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          mensagem: string
          nivel?: number
          status?: string
          tipo: string
        }
        Update: {
          created_at?: string
          id?: string
          mensagem?: string
          nivel?: number
          status?: string
          tipo?: string
        }
        Relationships: []
      }
      auto_resolver_failures: {
        Row: {
          fail_count: number
          first_failed_at: string
          last_alerted_at: string | null
          last_failed_at: string
          pacote: string
          provider: string
        }
        Insert: {
          fail_count?: number
          first_failed_at?: string
          last_alerted_at?: string | null
          last_failed_at?: string
          pacote: string
          provider: string
        }
        Update: {
          fail_count?: number
          first_failed_at?: string
          last_alerted_at?: string | null
          last_failed_at?: string
          pacote?: string
          provider?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          created_at: string
          id: string
          nome: string
          saldo_atual: number
          saldo_minimo_seguranca: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          saldo_atual?: number
          saldo_minimo_seguranca?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          saldo_atual?: number
          saldo_minimo_seguranca?: number
          updated_at?: string
        }
        Relationships: []
      }
      checkout_attempts: {
        Row: {
          categoria: string | null
          created_at: string
          id: number
          instagram_user: string
          network: string | null
          plan_id: string | null
          quantidade: number | null
          recovered_at: string | null
          recovered_pedido_id: string | null
          url: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          valor: number | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          id?: number
          instagram_user: string
          network?: string | null
          plan_id?: string | null
          quantidade?: number | null
          recovered_at?: string | null
          recovered_pedido_id?: string | null
          url?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          valor?: number | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          id?: number
          instagram_user?: string
          network?: string | null
          plan_id?: string | null
          quantidade?: number | null
          recovered_at?: string | null
          recovered_pedido_id?: string | null
          url?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      connection_tests: {
        Row: {
          created_at: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      financial_ledger: {
        Row: {
          buyer_ip: string | null
          created_at: string
          destino: string
          fornecedor_slug: string | null
          id: string
          origem: string
          pedido_id: string | null
          telemetry: Json
          ts_utc: string
          valor_brl: number
        }
        Insert: {
          buyer_ip?: string | null
          created_at?: string
          destino: string
          fornecedor_slug?: string | null
          id?: string
          origem: string
          pedido_id?: string | null
          telemetry?: Json
          ts_utc?: string
          valor_brl: number
        }
        Update: {
          buyer_ip?: string | null
          created_at?: string
          destino?: string
          fornecedor_slug?: string | null
          id?: string
          origem?: string
          pedido_id?: string | null
          telemetry?: Json
          ts_utc?: string
          valor_brl?: number
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          api_key_secret: string
          api_url: string
          ativo: boolean
          cotacao_brl: number
          created_at: string
          falhas_consecutivas: number
          id: string
          moeda: string
          nome: string
          prioridade: number
          rede_social: string
          saldo_atual: number | null
          saldo_atual_backup: number | null
          slug: string
          status: string
          ultima_verificacao: string | null
          updated_at: string
        }
        Insert: {
          api_key_secret: string
          api_url: string
          ativo?: boolean
          cotacao_brl?: number
          created_at?: string
          falhas_consecutivas?: number
          id?: string
          moeda?: string
          nome: string
          prioridade?: number
          rede_social?: string
          saldo_atual?: number | null
          saldo_atual_backup?: number | null
          slug: string
          status?: string
          ultima_verificacao?: string | null
          updated_at?: string
        }
        Update: {
          api_key_secret?: string
          api_url?: string
          ativo?: boolean
          cotacao_brl?: number
          created_at?: string
          falhas_consecutivas?: number
          id?: string
          moeda?: string
          nome?: string
          prioridade?: number
          rede_social?: string
          saldo_atual?: number | null
          saldo_atual_backup?: number | null
          slug?: string
          status?: string
          ultima_verificacao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      jarvis_alerts: {
        Row: {
          created_at: string
          detalhe: string | null
          id: string
          mensagem: string
          origem: string
          severidade: string
        }
        Insert: {
          created_at?: string
          detalhe?: string | null
          id?: string
          mensagem: string
          origem?: string
          severidade: string
        }
        Update: {
          created_at?: string
          detalhe?: string | null
          id?: string
          mensagem?: string
          origem?: string
          severidade?: string
        }
        Relationships: []
      }
      lgpd_requests: {
        Row: {
          client_ip: string | null
          created_at: string
          id: string
          mercado_pago_id: string | null
          outcome: string
          pedido_id: string | null
        }
        Insert: {
          client_ip?: string | null
          created_at?: string
          id?: string
          mercado_pago_id?: string | null
          outcome: string
          pedido_id?: string | null
        }
        Update: {
          client_ip?: string | null
          created_at?: string
          id?: string
          mercado_pago_id?: string | null
          outcome?: string
          pedido_id?: string | null
        }
        Relationships: []
      }
      monitoramento_saldo: {
        Row: {
          data_hora: string
          erro_retornado: string | null
          fornecedor_id: string
          id: string
          saldo: number | null
          status: string
          tempo_resposta_ms: number | null
        }
        Insert: {
          data_hora?: string
          erro_retornado?: string | null
          fornecedor_id: string
          id?: string
          saldo?: number | null
          status: string
          tempo_resposta_ms?: number | null
        }
        Update: {
          data_hora?: string
          erro_retornado?: string | null
          fornecedor_id?: string
          id?: string
          saldo?: number | null
          status?: string
          tempo_resposta_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoramento_saldo_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          country: string | null
          created_at: string
          device_id: string | null
          id: number
          path: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          device_id?: string | null
          id?: number
          path: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          device_id?: string | null
          id?: number
          path?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          abandono_notificado_at: string | null
          alerted_at: string | null
          bump_accepted: boolean
          bump_offered: boolean
          created_at: string
          cupom: string | null
          custo_real: number | null
          dispatched_at: string | null
          drop_checked_at: string | null
          email_contato: string | null
          error_detail: string | null
          id: string
          instagram_user: string
          last_reconciled_at: string | null
          last_remains: number | null
          last_remains_at: string | null
          mercado_pago_id: string | null
          pacote: string
          provider_order_id: string | null
          provider_slug: string | null
          quantidade: number
          reconcile_attempts: number
          recovery_email_sent_at: string | null
          rede_social: string
          refill_requested_at: string | null
          refill_result: string | null
          reseller_id: string | null
          reseller_valor: number | null
          review_email_sent_at: string | null
          sla_deadline: string | null
          status: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          valor: number
        }
        Insert: {
          abandono_notificado_at?: string | null
          alerted_at?: string | null
          bump_accepted?: boolean
          bump_offered?: boolean
          created_at?: string
          cupom?: string | null
          custo_real?: number | null
          dispatched_at?: string | null
          drop_checked_at?: string | null
          email_contato?: string | null
          error_detail?: string | null
          id?: string
          instagram_user: string
          last_reconciled_at?: string | null
          last_remains?: number | null
          last_remains_at?: string | null
          mercado_pago_id?: string | null
          pacote: string
          provider_order_id?: string | null
          provider_slug?: string | null
          quantidade: number
          reconcile_attempts?: number
          recovery_email_sent_at?: string | null
          rede_social?: string
          refill_requested_at?: string | null
          refill_result?: string | null
          reseller_id?: string | null
          reseller_valor?: number | null
          review_email_sent_at?: string | null
          sla_deadline?: string | null
          status?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          valor: number
        }
        Update: {
          abandono_notificado_at?: string | null
          alerted_at?: string | null
          bump_accepted?: boolean
          bump_offered?: boolean
          created_at?: string
          cupom?: string | null
          custo_real?: number | null
          dispatched_at?: string | null
          drop_checked_at?: string | null
          email_contato?: string | null
          error_detail?: string | null
          id?: string
          instagram_user?: string
          last_reconciled_at?: string | null
          last_remains?: number | null
          last_remains_at?: string | null
          mercado_pago_id?: string | null
          pacote?: string
          provider_order_id?: string | null
          provider_slug?: string | null
          quantidade?: number
          reconcile_attempts?: number
          recovery_email_sent_at?: string | null
          rede_social?: string
          refill_requested_at?: string | null
          refill_result?: string | null
          reseller_id?: string | null
          reseller_valor?: number | null
          review_email_sent_at?: string | null
          sla_deadline?: string | null
          status?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          valor?: number
        }
        Relationships: []
      }
      pedidos_legacy: {
        Row: {
          criado_em: string
          id: string
          link_instagram: string
          pacote_selecionado: string
          status_pagamento: string
          whatsapp_contato: string
        }
        Insert: {
          criado_em?: string
          id?: string
          link_instagram: string
          pacote_selecionado: string
          status_pagamento?: string
          whatsapp_contato: string
        }
        Update: {
          criado_em?: string
          id?: string
          link_instagram?: string
          pacote_selecionado?: string
          status_pagamento?: string
          whatsapp_contato?: string
        }
        Relationships: []
      }
      pix_recovery_queue: {
        Row: {
          attempts: number
          contacted_at: string | null
          created_at: string
          first_seen_at: string
          id: number
          instagram_user: string | null
          mercado_pago_id: string | null
          next_action_at: string
          notes: string | null
          pacote: string | null
          pedido_id: string
          rede_social: string | null
          status: string
          updated_at: string
          valor: number
          whatsapp: string | null
        }
        Insert: {
          attempts?: number
          contacted_at?: string | null
          created_at?: string
          first_seen_at?: string
          id?: number
          instagram_user?: string | null
          mercado_pago_id?: string | null
          next_action_at?: string
          notes?: string | null
          pacote?: string | null
          pedido_id: string
          rede_social?: string | null
          status?: string
          updated_at?: string
          valor?: number
          whatsapp?: string | null
        }
        Update: {
          attempts?: number
          contacted_at?: string | null
          created_at?: string
          first_seen_at?: string
          id?: number
          instagram_user?: string | null
          mercado_pago_id?: string | null
          next_action_at?: string
          notes?: string | null
          pacote?: string | null
          pedido_id?: string
          rede_social?: string | null
          status?: string
          updated_at?: string
          valor?: number
          whatsapp?: string | null
        }
        Relationships: []
      }
      pricing_cache: {
        Row: {
          category: string
          cost_per_1k_brl: number
          source: string
          synced_at: string
        }
        Insert: {
          category: string
          cost_per_1k_brl: number
          source?: string
          synced_at?: string
        }
        Update: {
          category?: string
          cost_per_1k_brl?: number
          source?: string
          synced_at?: string
        }
        Relationships: []
      }
      pricing_items: {
        Row: {
          auto_resolved_at: string | null
          category: string
          cost_brl: number
          is_sellable: boolean
          last_dry_run: string | null
          pacote: string
          price_brl: number
          provider_service_id: number | null
          provider4_auto_id: string | null
          provider4_service_id: string | null
          quantidade: number
          refill_checked_at: string | null
          refill_supported: boolean | null
          sellable_reason: string | null
          smmhype_auto_id: string | null
          smmhype_service_id: string | null
          smmpanel_auto_id: string | null
          smmpanel_service_id: string | null
          source: string
          synced_at: string
          verified_auto_id: string | null
          verified_service_id: string | null
        }
        Insert: {
          auto_resolved_at?: string | null
          category: string
          cost_brl?: number
          is_sellable?: boolean
          last_dry_run?: string | null
          pacote: string
          price_brl?: number
          provider_service_id?: number | null
          provider4_auto_id?: string | null
          provider4_service_id?: string | null
          quantidade: number
          refill_checked_at?: string | null
          refill_supported?: boolean | null
          sellable_reason?: string | null
          smmhype_auto_id?: string | null
          smmhype_service_id?: string | null
          smmpanel_auto_id?: string | null
          smmpanel_service_id?: string | null
          source?: string
          synced_at?: string
          verified_auto_id?: string | null
          verified_service_id?: string | null
        }
        Update: {
          auto_resolved_at?: string | null
          category?: string
          cost_brl?: number
          is_sellable?: boolean
          last_dry_run?: string | null
          pacote?: string
          price_brl?: number
          provider_service_id?: number | null
          provider4_auto_id?: string | null
          provider4_service_id?: string | null
          quantidade?: number
          refill_checked_at?: string | null
          refill_supported?: boolean | null
          sellable_reason?: string | null
          smmhype_auto_id?: string | null
          smmhype_service_id?: string | null
          smmpanel_auto_id?: string | null
          smmpanel_service_id?: string | null
          source?: string
          synced_at?: string
          verified_auto_id?: string | null
          verified_service_id?: string | null
        }
        Relationships: []
      }
      provider_health: {
        Row: {
          failure_count: number
          last_error: string | null
          last_failure_at: string | null
          slug: string
          unstable_until: string | null
          updated_at: string
        }
        Insert: {
          failure_count?: number
          last_error?: string | null
          last_failure_at?: string | null
          slug: string
          unstable_until?: string | null
          updated_at?: string
        }
        Update: {
          failure_count?: number
          last_error?: string | null
          last_failure_at?: string | null
          slug?: string
          unstable_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_rates_cache: {
        Row: {
          provider_service_id: string
          provider_slug: string
          rate_usd: number
          updated_at: string
        }
        Insert: {
          provider_service_id: string
          provider_slug: string
          rate_usd: number
          updated_at?: string
        }
        Update: {
          provider_service_id?: string
          provider_slug?: string
          rate_usd?: number
          updated_at?: string
        }
        Relationships: []
      }
      provider4_services_cache: {
        Row: {
          category: string
          max: number
          min: number
          name: string
          provider_service_id: number
          rate: number
          refill: boolean
          updated_at: string
        }
        Insert: {
          category: string
          max?: number
          min?: number
          name: string
          provider_service_id: number
          rate?: number
          refill?: boolean
          updated_at?: string
        }
        Update: {
          category?: string
          max?: number
          min?: number
          name?: string
          provider_service_id?: number
          rate?: number
          refill?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_hits: {
        Row: {
          bucket_key: string
          created_at: string
          id: number
        }
        Insert: {
          bucket_key: string
          created_at?: string
          id?: number
        }
        Update: {
          bucket_key?: string
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      reseller_applications: {
        Row: {
          canal: string | null
          client_ip: string | null
          created_at: string
          email: string | null
          id: string
          mensagem: string | null
          nome: string
          nota_interna: string | null
          status: string
          updated_at: string
          volume_mes: string | null
          whatsapp: string
        }
        Insert: {
          canal?: string | null
          client_ip?: string | null
          created_at?: string
          email?: string | null
          id?: string
          mensagem?: string | null
          nome: string
          nota_interna?: string | null
          status?: string
          updated_at?: string
          volume_mes?: string | null
          whatsapp: string
        }
        Update: {
          canal?: string | null
          client_ip?: string | null
          created_at?: string
          email?: string | null
          id?: string
          mensagem?: string | null
          nome?: string
          nota_interna?: string | null
          status?: string
          updated_at?: string
          volume_mes?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      reseller_ledger: {
        Row: {
          created_at: string
          detalhe: string | null
          id: string
          pedido_id: string | null
          reseller_id: string
          saldo_depois: number | null
          tipo: string
          valor_brl: number
        }
        Insert: {
          created_at?: string
          detalhe?: string | null
          id?: string
          pedido_id?: string | null
          reseller_id: string
          saldo_depois?: number | null
          tipo: string
          valor_brl: number
        }
        Update: {
          created_at?: string
          detalhe?: string | null
          id?: string
          pedido_id?: string | null
          reseller_id?: string
          saldo_depois?: number | null
          tipo?: string
          valor_brl?: number
        }
        Relationships: [
          {
            foreignKeyName: "reseller_ledger_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_topups: {
        Row: {
          created_at: string
          credited_at: string | null
          id: string
          mercado_pago_id: string | null
          reseller_id: string
          status: string
          updated_at: string
          valor_brl: number
        }
        Insert: {
          created_at?: string
          credited_at?: string | null
          id?: string
          mercado_pago_id?: string | null
          reseller_id: string
          status?: string
          updated_at?: string
          valor_brl: number
        }
        Update: {
          created_at?: string
          credited_at?: string | null
          id?: string
          mercado_pago_id?: string | null
          reseller_id?: string
          status?: string
          updated_at?: string
          valor_brl?: number
        }
        Relationships: [
          {
            foreignKeyName: "reseller_topups_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      resellers: {
        Row: {
          api_key_hash: string
          api_key_prefix: string
          ativo: boolean
          created_at: string
          desconto_pct: number
          email: string
          id: string
          nome: string
          notas: string | null
          saldo_brl: number
          updated_at: string
        }
        Insert: {
          api_key_hash: string
          api_key_prefix: string
          ativo?: boolean
          created_at?: string
          desconto_pct?: number
          email: string
          id?: string
          nome: string
          notas?: string | null
          saldo_brl?: number
          updated_at?: string
        }
        Update: {
          api_key_hash?: string
          api_key_prefix?: string
          ativo?: boolean
          created_at?: string
          desconto_pct?: number
          email?: string
          id?: string
          nome?: string
          notas?: string | null
          saldo_brl?: number
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          approval_token: string | null
          approved: boolean
          caption_text: string
          created_at: string
          created_by: string | null
          format: string
          id: string
          image_url: string | null
          logs: Json
          network: string
          post_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approval_token?: string | null
          approved?: boolean
          caption_text?: string
          created_at?: string
          created_by?: string | null
          format?: string
          id?: string
          image_url?: string | null
          logs?: Json
          network?: string
          post_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          approval_token?: string | null
          approved?: boolean
          caption_text?: string
          created_at?: string
          created_by?: string | null
          format?: string
          id?: string
          image_url?: string | null
          logs?: Json
          network?: string
          post_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_id_matrix: {
        Row: {
          created_at: string
          id: string
          max_qty: number
          min_qty: number
          network: string
          notes: string | null
          service_id: number
          service_type: string
          tier_label: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_qty?: number
          min_qty?: number
          network: string
          notes?: string | null
          service_id: number
          service_type: string
          tier_label?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_qty?: number
          min_qty?: number
          network?: string
          notes?: string | null
          service_id?: number
          service_type?: string
          tier_label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_id_overrides: {
        Row: {
          approved_at: string
          bloqueado: boolean
          bloqueado_motivo: string | null
          network: string
          previous_rate: number | null
          previous_service_id: number | null
          rate: number | null
          service_id: number
          service_type: string
        }
        Insert: {
          approved_at?: string
          bloqueado?: boolean
          bloqueado_motivo?: string | null
          network: string
          previous_rate?: number | null
          previous_service_id?: number | null
          rate?: number | null
          service_id: number
          service_type: string
        }
        Update: {
          approved_at?: string
          bloqueado?: boolean
          bloqueado_motivo?: string | null
          network?: string
          previous_rate?: number | null
          previous_service_id?: number | null
          rate?: number | null
          service_id?: number
          service_type?: string
        }
        Relationships: []
      }
      services_cache: {
        Row: {
          category: string
          id: string
          max: number
          min: number
          name: string
          provider_service_id: number
          rate: number
          refill: boolean
          updated_at: string
        }
        Insert: {
          category: string
          id?: string
          max?: number
          min?: number
          name: string
          provider_service_id: number
          rate: number
          refill?: boolean
          updated_at?: string
        }
        Update: {
          category?: string
          id?: string
          max?: number
          min?: number
          name?: string
          provider_service_id?: number
          rate?: number
          refill?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      smmpanel_services_cache: {
        Row: {
          category: string
          max: number
          min: number
          name: string
          provider_service_id: number
          rate: number
          refill: boolean
          updated_at: string
        }
        Insert: {
          category?: string
          max?: number
          min?: number
          name?: string
          provider_service_id: number
          rate?: number
          refill?: boolean
          updated_at?: string
        }
        Update: {
          category?: string
          max?: number
          min?: number
          name?: string
          provider_service_id?: number
          rate?: number
          refill?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          created_at: string
          id: string
          meta_ideal: number
          nome: string
          saldo_atual: number
          saldo_minimo: number
          ultimo_update: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta_ideal?: number
          nome: string
          saldo_atual?: number
          saldo_minimo?: number
          ultimo_update?: string
        }
        Update: {
          created_at?: string
          id?: string
          meta_ideal?: number
          nome?: string
          saldo_atual?: number
          saldo_minimo?: number
          ultimo_update?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      verified_services_cache: {
        Row: {
          category: string
          max: number
          min: number
          name: string
          provider_service_id: number
          rate: number
          refill: boolean
          updated_at: string
        }
        Insert: {
          category?: string
          max?: number
          min?: number
          name?: string
          provider_service_id: number
          rate?: number
          refill?: boolean
          updated_at?: string
        }
        Update: {
          category?: string
          max?: number
          min?: number
          name?: string
          provider_service_id?: number
          rate?: number
          refill?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      virtual_wallets: {
        Row: {
          created_at: string
          fornecedor_slug: string | null
          id: string
          label: string
          reserved_brl: number
          saldo_brl: number
          updated_at: string
          wallet_key: string
        }
        Insert: {
          created_at?: string
          fornecedor_slug?: string | null
          id?: string
          label: string
          reserved_brl?: number
          saldo_brl?: number
          updated_at?: string
          wallet_key: string
        }
        Update: {
          created_at?: string
          fornecedor_slug?: string | null
          id?: string
          label?: string
          reserved_brl?: number
          saldo_brl?: number
          updated_at?: string
          wallet_key?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          client_ip: string | null
          error_detail: string | null
          event_id: string
          id: string
          pedido_id: string | null
          processed_at: string | null
          processed_ok: boolean
          provider: string
          raw_payload: Json | null
          received_at: string
          topic: string | null
        }
        Insert: {
          client_ip?: string | null
          error_detail?: string | null
          event_id: string
          id?: string
          pedido_id?: string | null
          processed_at?: string | null
          processed_ok?: boolean
          provider: string
          raw_payload?: Json | null
          received_at?: string
          topic?: string | null
        }
        Update: {
          client_ip?: string | null
          error_detail?: string | null
          event_id?: string
          id?: string
          pedido_id?: string | null
          processed_at?: string | null
          processed_ok?: boolean
          provider?: string
          raw_payload?: Json | null
          received_at?: string
          topic?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      smmhype_services_cache: {
        Row: {
          category: string | null
          max: number | null
          min: number | null
          name: string | null
          provider_service_id: number | null
          rate: number | null
          refill: boolean | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          max?: number | null
          min?: number | null
          name?: string | null
          provider_service_id?: number | null
          rate?: number | null
          refill?: boolean | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          max?: number | null
          min?: number | null
          name?: string | null
          provider_service_id?: number | null
          rate?: number | null
          refill?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      anonimizar_pedidos_antigos: { Args: never; Returns: number }
      cancel_orphan_pending: { Args: never; Returns: number }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_cron_status: {
        Args: { _jobname?: string }
        Returns: {
          active: boolean
          jobname: string
          last_end: string
          last_return: string
          last_start: string
          last_status: string
          schedule: string
        }[]
      }
      get_public_schema: {
        Args: never
        Returns: {
          column_default: string
          column_name: string
          constraint_type: string
          data_type: string
          is_nullable: string
          table_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_director: { Args: never; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      ops_forensics: { Args: never; Returns: Json }
      ops_http_health: { Args: { _hours?: number }; Returns: Json }
      ops_http_recent_failures: { Args: { _minutes?: number }; Returns: Json }
      purge_telemetry_retention: { Args: never; Returns: Json }
      rate_limit_check: {
        Args: { _key: string; _limit: number; _window_seconds: number }
        Returns: {
          allowed: boolean
          hits: number
          retry_after_seconds: number
        }[]
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reseller_balance_move: {
        Args: {
          _amount: number
          _detalhe?: string
          _pedido_id?: string
          _reseller_id: string
          _tipo: string
        }
        Returns: {
          motivo: string
          ok: boolean
          saldo: number
        }[]
      }
      solicitar_exclusao_pedido: {
        Args: { _client_ip?: string; _mp_id: string }
        Returns: {
          message: string
          ok: boolean
        }[]
      }
      wallet_credit: {
        Args: { _amount: number; _wallet_key: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
