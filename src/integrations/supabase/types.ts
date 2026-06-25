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
          slug?: string
          status?: string
          ultima_verificacao?: string | null
          updated_at?: string
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
          custo_real: number | null
          error_detail: string | null
          id: string
          instagram_user: string
          mercado_pago_id: string | null
          pacote: string
          quantidade: number
          rede_social: string
          status: string
          valor: number
        }
        Insert: {
          abandono_notificado_at?: string | null
          created_at?: string
          custo_real?: number | null
          error_detail?: string | null
          id?: string
          instagram_user: string
          mercado_pago_id?: string | null
          pacote: string
          quantidade: number
          rede_social?: string
          status?: string
          valor: number
        }
        Update: {
          abandono_notificado_at?: string | null
          created_at?: string
          custo_real?: number | null
          error_detail?: string | null
          id?: string
          instagram_user?: string
          mercado_pago_id?: string | null
          pacote?: string
          quantidade?: number
          rede_social?: string
          status?: string
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
