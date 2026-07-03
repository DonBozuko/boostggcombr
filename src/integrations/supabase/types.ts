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
      pedidos: {
        Row: {
          abandono_notificado_at: string | null
          created_at: string
          cupom: string | null
          custo_real: number | null
          error_detail: string | null
          id: string
          instagram_user: string
          mercado_pago_id: string | null
          pacote: string
          quantidade: number
          rede_social: string
          status: string
          utm_source: string | null
          valor: number
        }
        Insert: {
          abandono_notificado_at?: string | null
          created_at?: string
          cupom?: string | null
          custo_real?: number | null
          error_detail?: string | null
          id?: string
          instagram_user: string
          mercado_pago_id?: string | null
          pacote: string
          quantidade: number
          rede_social?: string
          status?: string
          utm_source?: string | null
          valor: number
        }
        Update: {
          abandono_notificado_at?: string | null
          created_at?: string
          cupom?: string | null
          custo_real?: number | null
          error_detail?: string | null
          id?: string
          instagram_user?: string
          mercado_pago_id?: string | null
          pacote?: string
          quantidade?: number
          rede_social?: string
          status?: string
          utm_source?: string | null
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
          category: string
          cost_brl: number
          pacote: string
          price_brl: number
          provider_service_id: number | null
          quantidade: number
          smmhype_service_id: string | null
          smmpanel_service_id: string | null
          source: string
          synced_at: string
          verified_service_id: string | null
        }
        Insert: {
          category: string
          cost_brl?: number
          pacote: string
          price_brl?: number
          provider_service_id?: number | null
          quantidade: number
          smmhype_service_id?: string | null
          smmpanel_service_id?: string | null
          source?: string
          synced_at?: string
          verified_service_id?: string | null
        }
        Update: {
          category?: string
          cost_brl?: number
          pacote?: string
          price_brl?: number
          provider_service_id?: number | null
          quantidade?: number
          smmhype_service_id?: string | null
          smmpanel_service_id?: string | null
          source?: string
          synced_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      is_director: { Args: never; Returns: boolean }
      wallet_credit: {
        Args: { _amount: number; _wallet_key: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
