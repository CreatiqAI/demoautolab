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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          country: string
          created_at: string
          id: string
          is_default: boolean | null
          label: string
          line1: string
          line2: string | null
          postcode: string
          state: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          label: string
          line1: string
          line2?: string | null
          postcode: string
          state: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string
          line1?: string
          line2?: string | null
          postcode?: string
          state?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          tenant_id: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          tenant_id?: string | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          tenant_id?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          guest_key: string | null
          id: string
          status: string
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          guest_key?: string | null
          id?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          guest_key?: string | null
          id?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          tenant_id: string | null
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity: number
          tenant_id?: string | null
          total_price: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          tenant_id?: string | null
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string
          created_at: string
          currency: string
          discount: number
          id: string
          notes: string | null
          order_no: string
          payment_state: Database["public"]["Enums"]["payment_state"]
          shipping_fee: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax: number
          tenant_id: string | null
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address_id: string
          created_at?: string
          currency?: string
          discount?: number
          id?: string
          notes?: string | null
          order_no: string
          payment_state?: Database["public"]["Enums"]["payment_state"]
          shipping_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax?: number
          tenant_id?: string | null
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address_id?: string
          created_at?: string
          currency?: string
          discount?: number
          id?: string
          notes?: string | null
          order_no?: string
          payment_state?: Database["public"]["Enums"]["payment_state"]
          shipping_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax?: number
          tenant_id?: string | null
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_proofs: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string
          original_filename: string | null
          result: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          tenant_id: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          original_filename?: string | null
          result?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tenant_id?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          original_filename?: string | null
          result?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tenant_id?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_proofs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          is_primary: boolean | null
          product_id: string
          sort_order: number | null
          tenant_id: string | null
          updated_at: string
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          product_id: string
          sort_order?: number | null
          tenant_id?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          product_id?: string
          sort_order?: number | null
          tenant_id?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          active: boolean | null
          components: string | null
          created_at: string
          id: string
          name: string
          price_merchant: number
          price_regular: number
          product_id: string
          sku: string
          sort_order: number | null
          stock_on_hand: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          components?: string | null
          created_at?: string
          id?: string
          name: string
          price_merchant: number
          price_regular: number
          product_id: string
          sku: string
          sort_order?: number | null
          stock_on_hand?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          components?: string | null
          created_at?: string
          id?: string
          name?: string
          price_merchant?: number
          price_regular?: number
          product_id?: string
          sku?: string
          sort_order?: number | null
          stock_on_hand?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean | null
          brand: string | null
          category_id: string | null
          created_at: string
          description: string | null
          dimensions_cm: string | null
          id: string
          keywords: string[] | null
          model: string | null
          name: string
          price_merchant: number
          price_regular: number
          reorder_level: number | null
          sku: string
          slug: string
          stock_on_hand: number
          tenant_id: string | null
          updated_at: string
          weight_kg: number | null
          year_from: number | null
          year_to: number | null
        }
        Insert: {
          active?: boolean | null
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          dimensions_cm?: string | null
          id?: string
          keywords?: string[] | null
          model?: string | null
          name: string
          price_merchant: number
          price_regular: number
          reorder_level?: number | null
          sku: string
          slug: string
          stock_on_hand?: number
          tenant_id?: string | null
          updated_at?: string
          weight_kg?: number | null
          year_from?: number | null
          year_to?: number | null
        }
        Update: {
          active?: boolean | null
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          dimensions_cm?: string | null
          id?: string
          keywords?: string[] | null
          model?: string | null
          name?: string
          price_merchant?: number
          price_regular?: number
          reorder_level?: number | null
          sku?: string
          slug?: string
          stock_on_hand?: number
          tenant_id?: string | null
          updated_at?: string
          weight_kg?: number | null
          year_from?: number | null
          year_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          credit_limit: number | null
          full_name: string
          id: string
          is_phone_verified: boolean | null
          phone_e164: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string | null
          updated_at: string
          whatsapp_opt_in: boolean | null
        }
        Insert: {
          created_at?: string
          credit_limit?: number | null
          full_name: string
          id: string
          is_phone_verified?: boolean | null
          phone_e164: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string
          whatsapp_opt_in?: boolean | null
        }
        Update: {
          created_at?: string
          credit_limit?: number | null
          full_name?: string
          id?: string
          is_phone_verified?: boolean | null
          phone_e164?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string
          whatsapp_opt_in?: boolean | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          reference: string | null
          tenant_id: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          reference?: string | null
          tenant_id?: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference?: string | null
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["stock_movement_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      debt_ledger_type: "INVOICE" | "PAYMENT" | "CREDIT_NOTE" | "ADJUSTMENT"
      delivery_status: "ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "FAILED"
      order_status:
        | "PLACED"
        | "PENDING_VERIFICATION"
        | "VERIFIED"
        | "PACKING"
        | "DISPATCHED"
        | "DELIVERED"
        | "COMPLETED"
        | "CANCELLED"
        | "REJECTED"
      payment_state:
        | "UNPAID"
        | "SUBMITTED"
        | "APPROVED"
        | "REJECTED"
        | "ON_CREDIT"
      stock_movement_type:
        | "RECEIPT"
        | "SALE"
        | "ADJUSTMENT"
        | "RESERVATION"
        | "RELEASE"
      user_role: "customer" | "merchant" | "staff" | "admin"
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
      debt_ledger_type: ["INVOICE", "PAYMENT", "CREDIT_NOTE", "ADJUSTMENT"],
      delivery_status: ["ASSIGNED", "IN_TRANSIT", "DELIVERED", "FAILED"],
      order_status: [
        "PLACED",
        "PENDING_VERIFICATION",
        "VERIFIED",
        "PACKING",
        "DISPATCHED",
        "DELIVERED",
        "COMPLETED",
        "CANCELLED",
        "REJECTED",
      ],
      payment_state: [
        "UNPAID",
        "SUBMITTED",
        "APPROVED",
        "REJECTED",
        "ON_CREDIT",
      ],
      stock_movement_type: [
        "RECEIPT",
        "SALE",
        "ADJUSTMENT",
        "RESERVATION",
        "RELEASE",
      ],
      user_role: ["customer", "merchant", "staff", "admin"],
    },
  },
} as const
