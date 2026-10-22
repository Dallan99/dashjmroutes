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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      classification_rules: {
        Row: {
          active: boolean
          category: string
          classification: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          classification: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          classification?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      jm_column_mappings: {
        Row: {
          created_at: string
          id: string
          label: string | null
          mapping: Json
          signature: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          mapping?: Json
          signature: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          mapping?: Json
          signature?: string
          updated_at?: string
        }
        Relationships: []
      }
      jm_entries: {
        Row: {
          amount: number
          base: string
          category: string | null
          created_at: string
          description: string | null
          extra: Json
          id: string
          import_id: string | null
          note: string | null
          quantity: number | null
          updated_at: string
          week_label: string
          year: number
        }
        Insert: {
          amount?: number
          base: string
          category?: string | null
          created_at?: string
          description?: string | null
          extra?: Json
          id?: string
          import_id?: string | null
          note?: string | null
          quantity?: number | null
          updated_at?: string
          week_label: string
          year: number
        }
        Update: {
          amount?: number
          base?: string
          category?: string | null
          created_at?: string
          description?: string | null
          extra?: Json
          id?: string
          import_id?: string | null
          note?: string | null
          quantity?: number | null
          updated_at?: string
          week_label?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "jm_entries_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "jm_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      jm_imports: {
        Row: {
          created_at: string
          file_hash: string
          file_name: string
          id: string
          mapping: Json
          rejected_rows: number
          sheet_name: string | null
          updated_at: string
          valid_rows: number
          week_label: string
          year: number
        }
        Insert: {
          created_at?: string
          file_hash: string
          file_name: string
          id?: string
          mapping?: Json
          rejected_rows?: number
          sheet_name?: string | null
          updated_at?: string
          valid_rows?: number
          week_label: string
          year: number
        }
        Update: {
          created_at?: string
          file_hash?: string
          file_name?: string
          id?: string
          mapping?: Json
          rejected_rows?: number
          sheet_name?: string | null
          updated_at?: string
          valid_rows?: number
          week_label?: string
          year?: number
        }
        Relationships: []
      }
      jm_notes: {
        Row: {
          base: string | null
          created_at: string
          id: string
          note: string
          updated_at: string
          week_label: string
          year: number
        }
        Insert: {
          base?: string | null
          created_at?: string
          id?: string
          note?: string
          updated_at?: string
          week_label: string
          year: number
        }
        Update: {
          base?: string | null
          created_at?: string
          id?: string
          note?: string
          updated_at?: string
          week_label?: string
          year?: number
        }
        Relationships: []
      }
      real_savings_imports: {
        Row: {
          created_at: string
          file_hash: string
          file_name: string
          id: string
          imported_at: string
          mapping: Json
          rejected_rows: number
          sheet_name: string | null
          status: string
          valid_rows: number
          week_code: string | null
          week_number: number | null
          year: number | null
        }
        Insert: {
          created_at?: string
          file_hash: string
          file_name: string
          id?: string
          imported_at?: string
          mapping?: Json
          rejected_rows?: number
          sheet_name?: string | null
          status?: string
          valid_rows?: number
          week_code?: string | null
          week_number?: number | null
          year?: number | null
        }
        Update: {
          created_at?: string
          file_hash?: string
          file_name?: string
          id?: string
          imported_at?: string
          mapping?: Json
          rejected_rows?: number
          sheet_name?: string | null
          status?: string
          valid_rows?: number
          week_code?: string | null
          week_number?: number | null
          year?: number | null
        }
        Relationships: []
      }
      real_savings_items: {
        Row: {
          base: string | null
          charged_amount: number | null
          classification: string | null
          created_at: string
          extra_data: Json
          id: string
          import_id: string
          real_discount: number | null
          reference_date: string | null
          reversed_amount: number | null
          status: string | null
        }
        Insert: {
          base?: string | null
          charged_amount?: number | null
          classification?: string | null
          created_at?: string
          extra_data?: Json
          id?: string
          import_id: string
          real_discount?: number | null
          reference_date?: string | null
          reversed_amount?: number | null
          status?: string | null
        }
        Update: {
          base?: string | null
          charged_amount?: number | null
          classification?: string | null
          created_at?: string
          extra_data?: Json
          id?: string
          import_id?: string
          real_discount?: number | null
          reference_date?: string | null
          reversed_amount?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "real_savings_items_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "real_savings_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      service_base_mappings: {
        Row: {
          active: boolean
          base: string
          created_at: string
          id: string
          service: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base: string
          created_at?: string
          id?: string
          service: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base?: string
          created_at?: string
          id?: string
          service?: string
          updated_at?: string
        }
        Relationships: []
      }
      week_notes: {
        Row: {
          base: string | null
          created_at: string
          created_by: string | null
          id: string
          import_id: string
          note: string
        }
        Insert: {
          base?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          import_id: string
          note: string
        }
        Update: {
          base?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          import_id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "week_notes_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "weekly_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_imports: {
        Row: {
          file_hash: string
          file_name: string
          id: string
          imported_at: string | null
          imported_by: string | null
          is_current: boolean
          mapping_json: Json | null
          status: string | null
          superseded_at: string | null
          superseded_by: string | null
          week_code: string
          week_number: number
          year: number
        }
        Insert: {
          file_hash: string
          file_name: string
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          is_current?: boolean
          mapping_json?: Json | null
          status?: string | null
          superseded_at?: string | null
          superseded_by?: string | null
          week_code: string
          week_number: number
          year: number
        }
        Update: {
          file_hash?: string
          file_name?: string
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          is_current?: boolean
          mapping_json?: Json | null
          status?: string | null
          superseded_at?: string | null
          superseded_by?: string | null
          week_code?: string
          week_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_imports_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "weekly_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_items: {
        Row: {
          amount: number | null
          base: string | null
          classification: string | null
          decision: string | null
          description: string | null
          driver: string | null
          event_date: string | null
          evidence_url: string | null
          extra_data: Json
          id: string
          import_id: string
          operational_status: string | null
          package_id: string | null
          route_id: string | null
          service: string | null
        }
        Insert: {
          amount?: number | null
          base?: string | null
          classification?: string | null
          decision?: string | null
          description?: string | null
          driver?: string | null
          event_date?: string | null
          evidence_url?: string | null
          extra_data?: Json
          id?: string
          import_id: string
          operational_status?: string | null
          package_id?: string | null
          route_id?: string | null
          service?: string | null
        }
        Update: {
          amount?: number | null
          base?: string | null
          classification?: string | null
          decision?: string | null
          description?: string | null
          driver?: string | null
          event_date?: string | null
          evidence_url?: string | null
          extra_data?: Json
          id?: string
          import_id?: string
          operational_status?: string | null
          package_id?: string | null
          route_id?: string | null
          service?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_items_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "weekly_imports"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      concluir_importacao_semanal: {
        Args: { p_import_id: string }
        Returns: undefined
      }
      delete_weekly_import_safely: {
        Args: {
          p_file_name: string
          p_import_id: string
          p_items_count: number
          p_notes_count: number
          p_week_number: number
          p_year: number
        }
        Returns: Json
      }
      finalize_weekly_import: {
        Args: { p_import_id: string }
        Returns: undefined
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
