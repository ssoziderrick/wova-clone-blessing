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
      activity_logs: {
        Row: {
          action: string
          buyer_id: number | null
          created_at: string
          description: string | null
          id: number
          owner_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          buyer_id?: number | null
          created_at?: string
          description?: string | null
          id?: number
          owner_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          buyer_id?: number | null
          created_at?: string
          description?: string | null
          id?: number
          owner_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          body: string
          buyer_id: number | null
          created_at: string
          id: number
          title: string
          user_id: string
        }
        Insert: {
          body: string
          buyer_id?: number | null
          created_at?: string
          id?: number
          title: string
          user_id: string
        }
        Update: {
          body?: string
          buyer_id?: number | null
          created_at?: string
          id?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      buyer_documents: {
        Row: {
          buyer_id: number
          created_at: string
          file_path: string
          hp_id: number | null
          id: number
          mime_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          buyer_id: number
          created_at?: string
          file_path: string
          hp_id?: number | null
          id?: number
          mime_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          buyer_id?: number
          created_at?: string
          file_path?: string
          hp_id?: number | null
          id?: number
          mime_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_documents_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_invites: {
        Row: {
          buyer_id: number
          created_at: string
          email: string | null
          expires_at: string
          id: number
          phone: string | null
          redeemed_at: string | null
          redeemed_by: string | null
          token: string
          user_id: string
        }
        Insert: {
          buyer_id: number
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: number
          phone?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          token?: string
          user_id: string
        }
        Update: {
          buyer_id?: number
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: number
          phone?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_invites_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_notifications: {
        Row: {
          body: string | null
          buyer_id: number
          created_at: string
          hp_id: number | null
          id: number
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          buyer_id: number
          created_at?: string
          hp_id?: number | null
          id?: number
          kind?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          buyer_id?: number
          created_at?: string
          hp_id?: number | null
          id?: number
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_notifications_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
        ]
      }
      buyers: {
        Row: {
          address: string | null
          auth_user_id: string | null
          created_at: string
          email: string | null
          emergency_contact: string | null
          full_name: string
          id: number
          nin: string | null
          occupation: string | null
          phone: string
          photo: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          full_name: string
          id?: number
          nin?: string | null
          occupation?: string | null
          phone: string
          photo?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          full_name?: string
          id?: number
          nin?: string | null
          occupation?: string | null
          phone?: string
          photo?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cars: {
        Row: {
          buying_price: number
          color: string
          created_at: string
          date_purchased: string
          date_sold: string | null
          engine_number: string | null
          id: number
          make: string
          model: string
          notes: string | null
          photos: Json | null
          plate: string
          selling_price: number
          status: string
          user_id: string
          vin: string | null
          year: number
        }
        Insert: {
          buying_price?: number
          color?: string
          created_at?: string
          date_purchased?: string
          date_sold?: string | null
          engine_number?: string | null
          id?: number
          make: string
          model: string
          notes?: string | null
          photos?: Json | null
          plate: string
          selling_price?: number
          status?: string
          user_id: string
          vin?: string | null
          year: number
        }
        Update: {
          buying_price?: number
          color?: string
          created_at?: string
          date_purchased?: string
          date_sold?: string | null
          engine_number?: string | null
          id?: number
          make?: string
          model?: string
          notes?: string | null
          photos?: Json | null
          plate?: string
          selling_price?: number
          status?: string
          user_id?: string
          vin?: string | null
          year?: number
        }
        Relationships: []
      }
      hp: {
        Row: {
          buyer_id: number
          car_id: number
          created_at: string
          deposit: number
          end_date: string | null
          frequency: string
          id: number
          installment_amount: number
          interest: number
          number_of_installments: number
          selling_price: number
          share_token: string
          start_date: string
          status: string
          user_id: string
        }
        Insert: {
          buyer_id: number
          car_id: number
          created_at?: string
          deposit?: number
          end_date?: string | null
          frequency?: string
          id?: number
          installment_amount?: number
          interest?: number
          number_of_installments?: number
          selling_price?: number
          share_token?: string
          start_date?: string
          status?: string
          user_id: string
        }
        Update: {
          buyer_id?: number
          car_id?: number
          created_at?: string
          deposit?: number
          end_date?: string | null
          frequency?: string
          id?: number
          installment_amount?: number
          interest?: number
          number_of_installments?: number
          selling_price?: number
          share_token?: string
          start_date?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_proofs: {
        Row: {
          amount: number
          created_at: string
          date: string
          hp_id: number
          id: number
          image_path: string | null
          method: string
          notes: string | null
          reference: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          hp_id: number
          id?: number
          image_path?: string | null
          method?: string
          notes?: string | null
          reference?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          hp_id?: number
          id?: number
          image_path?: string | null
          method?: string
          notes?: string | null
          reference?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_hp_id_fkey"
            columns: ["hp_id"]
            isOneToOne: false
            referencedRelation: "hp"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          date: string
          hp_id: number
          id: number
          method: string
          notes: string | null
          reference: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          hp_id: number
          id?: number
          method?: string
          notes?: string | null
          reference?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          hp_id?: number
          id?: number
          method?: string
          notes?: string | null
          reference?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          buyer_id: number | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          buyer_id?: number | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: number | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          balance_after: number
          buyer_id: number | null
          created_at: string
          date: string
          hp_id: number
          id: number
          method: string
          notes: string | null
          payment_id: number
          receipt_number: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number
          buyer_id?: number | null
          created_at?: string
          date?: string
          hp_id: number
          id?: number
          method?: string
          notes?: string | null
          payment_id: number
          receipt_number: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          buyer_id?: number | null
          created_at?: string
          date?: string
          hp_id?: number
          id?: number
          method?: string
          notes?: string | null
          payment_id?: number
          receipt_number?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_hp_id_fkey"
            columns: ["hp_id"]
            isOneToOne: false
            referencedRelation: "hp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          buyer_id: number
          created_at: string
          created_by: string | null
          hp_id: number | null
          id: number
          message: string | null
          scheduled_date: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          buyer_id: number
          created_at?: string
          created_by?: string | null
          hp_id?: number | null
          id?: number
          message?: string | null
          scheduled_date?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          buyer_id?: number
          created_at?: string
          created_by?: string | null
          hp_id?: number | null
          id?: number
          message?: string | null
          scheduled_date?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_buyer_id: { Args: never; Returns: number }
      get_hp_by_token: { Args: { _token: string }; Returns: Json }
      get_invite_by_token: { Args: { _token: string }; Returns: Json }
      submit_payment_proof: {
        Args: {
          _amount: number
          _date: string
          _image_path: string
          _method: string
          _notes: string
          _reference: string
          _token: string
        }
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
