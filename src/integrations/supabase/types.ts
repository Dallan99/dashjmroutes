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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
