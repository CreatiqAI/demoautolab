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
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_admin_id: string | null
          actor_username: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          id: string
          notes: string | null
        }
        Insert: {
          action: string
          actor_admin_id?: string | null
          actor_username?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          id?: string
          notes?: string | null
        }
        Update: {
          action?: string
          actor_admin_id?: string | null
          actor_username?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_actor_admin_id_fkey"
            columns: ["actor_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_actor_admin_id_fkey"
            columns: ["actor_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          password_hash: string | null
          role: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          password_hash?: string | null
          role?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          password_hash?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      bulk_import_logs: {
        Row: {
          admin_id: string | null
          entity: string
          failed: number
          id: string
          mode: string
          result_json: Json
          run_at: string
          succeeded: number
          total_rows: number
        }
        Insert: {
          admin_id?: string | null
          entity: string
          failed: number
          id?: string
          mode: string
          result_json: Json
          run_at?: string
          succeeded: number
          total_rows: number
        }
        Update: {
          admin_id?: string | null
          entity?: string
          failed?: number
          id?: string
          mode?: string
          result_json?: Json
          run_at?: string
          succeeded?: number
          total_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "bulk_import_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_import_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_pricing_tiers: {
        Row: {
          component_id: string
          created_at: string
          discount_percentage: number | null
          id: string
          is_active: boolean | null
          max_quantity: number | null
          min_quantity: number
          price: number
          updated_at: string
        }
        Insert: {
          component_id: string
          created_at?: string
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          max_quantity?: number | null
          min_quantity: number
          price: number
          updated_at?: string
        }
        Update: {
          component_id?: string
          created_at?: string
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          max_quantity?: number | null
          min_quantity?: number
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_pricing_tiers_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "component_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_pricing_tiers_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "component_library_with_usage"
            referencedColumns: ["id"]
          },
        ]
      }
      car_makes: {
        Row: {
          country: string | null
          created_at: string | null
          id: string
          is_popular: boolean | null
          logo_url: string | null
          name: string
          sort_order: number | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          id?: string
          is_popular?: boolean | null
          logo_url?: string | null
          name: string
          sort_order?: number | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          id?: string
          is_popular?: boolean | null
          logo_url?: string | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      car_models: {
        Row: {
          body_type: string | null
          created_at: string | null
          id: string
          make_id: string
          name: string
          sort_order: number | null
          year_end: number | null
          year_start: number | null
        }
        Insert: {
          body_type?: string | null
          created_at?: string | null
          id?: string
          make_id: string
          name: string
          sort_order?: number | null
          year_end?: number | null
          year_start?: number | null
        }
        Update: {
          body_type?: string | null
          created_at?: string | null
          id?: string
          make_id?: string
          name?: string
          sort_order?: number | null
          year_end?: number | null
          year_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "car_models_make_id_fkey"
            columns: ["make_id"]
            isOneToOne: false
            referencedRelation: "car_makes"
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
      component_images: {
        Row: {
          alt_text: string | null
          component_id: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          sort_order: number | null
          url: string
        }
        Insert: {
          alt_text?: string | null
          component_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          sort_order?: number | null
          url: string
        }
        Update: {
          alt_text?: string | null
          component_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          sort_order?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "component_images_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "component_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_images_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "component_library_with_usage"
            referencedColumns: ["id"]
          },
        ]
      }
      component_library: {
        Row: {
          approval_status: string
          component_sku: string
          component_type: string
          component_value: string | null
          created_at: string | null
          created_by: string | null
          default_image_url: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_restocked: string | null
          max_stock_level: number | null
          merchant_price: number | null
          min_stock_level: number | null
          name: string
          normal_price: number | null
          reorder_point: number | null
          stock_level: number | null
          supplier_id: string | null
          updated_at: string | null
          vendor_id: string | null
          video_url: string | null
          warehouse_location: string | null
        }
        Insert: {
          approval_status?: string
          component_sku: string
          component_type: string
          component_value?: string | null
          created_at?: string | null
          created_by?: string | null
          default_image_url?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_restocked?: string | null
          max_stock_level?: number | null
          merchant_price?: number | null
          min_stock_level?: number | null
          name: string
          normal_price?: number | null
          reorder_point?: number | null
          stock_level?: number | null
          supplier_id?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          video_url?: string | null
          warehouse_location?: string | null
        }
        Update: {
          approval_status?: string
          component_sku?: string
          component_type?: string
          component_value?: string | null
          created_at?: string | null
          created_by?: string | null
          default_image_url?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_restocked?: string | null
          max_stock_level?: number | null
          merchant_price?: number | null
          min_stock_level?: number | null
          name?: string
          normal_price?: number | null
          reorder_point?: number | null
          stock_level?: number | null
          supplier_id?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          video_url?: string | null
          warehouse_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "component_library_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_library_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          confidence: number | null
          conversation_text: string
          created_at: string | null
          customer_phone: string
          customer_profile_id: string | null
          id: string
          intent: string | null
          media_type: string | null
          media_url: string | null
          message_timestamp: string
          session_id: string
          tools_used: string[] | null
        }
        Insert: {
          confidence?: number | null
          conversation_text: string
          created_at?: string | null
          customer_phone: string
          customer_profile_id?: string | null
          id?: string
          intent?: string | null
          media_type?: string | null
          media_url?: string | null
          message_timestamp?: string
          session_id: string
          tools_used?: string[] | null
        }
        Update: {
          confidence?: number | null
          conversation_text?: string
          created_at?: string | null
          customer_phone?: string
          customer_profile_id?: string | null
          id?: string
          intent?: string | null
          media_type?: string | null
          media_url?: string | null
          message_timestamp?: string
          session_id?: string
          tools_used?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
        ]
      }
      customer_cars: {
        Row: {
          car_make_id: string | null
          car_make_name: string
          car_model_id: string | null
          car_model_name: string | null
          created_at: string | null
          customer_id: string
          id: string
          is_primary: boolean | null
          sort_order: number | null
        }
        Insert: {
          car_make_id?: string | null
          car_make_name: string
          car_model_id?: string | null
          car_model_name?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          is_primary?: boolean | null
          sort_order?: number | null
        }
        Update: {
          car_make_id?: string | null
          car_make_name?: string
          car_model_id?: string | null
          car_model_name?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          is_primary?: boolean | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_cars_car_make_id_fkey"
            columns: ["car_make_id"]
            isOneToOne: false
            referencedRelation: "car_makes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_cars_car_model_id_fkey"
            columns: ["car_model_id"]
            isOneToOne: false
            referencedRelation: "car_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_cars_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_cars_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_cars_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_cars_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
        ]
      }
      customer_points_ledger: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          description: string | null
          expires_at: string | null
          id: string
          order_id: string | null
          points_amount: number
          redemption_id: string | null
          reward_item_id: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          description?: string | null
          expires_at?: string | null
          id?: string
          order_id?: string | null
          points_amount: number
          redemption_id?: string | null
          reward_item_id?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          order_id?: string | null
          points_amount?: number
          redemption_id?: string | null
          reward_item_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_points_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_points_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_points_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_points_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_points_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_points_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
          {
            foreignKeyName: "customer_points_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_orders_enhanced"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_points_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_redemption"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "point_redemptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reward_item"
            columns: ["reward_item_id"]
            isOneToOne: false
            referencedRelation: "reward_items"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profiles: {
        Row: {
          address: Json | null
          auth_email: string | null
          auth_phone: string | null
          auto_approve_orders: boolean | null
          car_make_id: string | null
          car_make_name: string | null
          car_model_id: string | null
          car_model_name: string | null
          created_at: string | null
          credit_limit: number | null
          current_month_spending: number | null
          customer_type: string | null
          date_of_birth: string | null
          demoted_at: string | null
          demoted_from: string | null
          demotion_reason: string | null
          email: string | null
          email_confirmed_at: string | null
          full_name: string | null
          gender: string | null
          id: string
          is_active: boolean | null
          is_panel_customer: boolean
          last_sign_in_at: string | null
          last_spending_reset_date: string | null
          lifetime_spending: number | null
          merchant_tier: string | null
          phone: string | null
          phone_confirmed_at: string | null
          points_rate: number | null
          preferences: Json | null
          pricing_type: string | null
          registered_at: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          tier_achieved_at: string | null
          tier_id: string | null
          total_orders_count: number | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          address?: Json | null
          auth_email?: string | null
          auth_phone?: string | null
          auto_approve_orders?: boolean | null
          car_make_id?: string | null
          car_make_name?: string | null
          car_model_id?: string | null
          car_model_name?: string | null
          created_at?: string | null
          credit_limit?: number | null
          current_month_spending?: number | null
          customer_type?: string | null
          date_of_birth?: string | null
          demoted_at?: string | null
          demoted_from?: string | null
          demotion_reason?: string | null
          email?: string | null
          email_confirmed_at?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_panel_customer?: boolean
          last_sign_in_at?: string | null
          last_spending_reset_date?: string | null
          lifetime_spending?: number | null
          merchant_tier?: string | null
          phone?: string | null
          phone_confirmed_at?: string | null
          points_rate?: number | null
          preferences?: Json | null
          pricing_type?: string | null
          registered_at?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          tier_achieved_at?: string | null
          tier_id?: string | null
          total_orders_count?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          address?: Json | null
          auth_email?: string | null
          auth_phone?: string | null
          auto_approve_orders?: boolean | null
          car_make_id?: string | null
          car_make_name?: string | null
          car_model_id?: string | null
          car_model_name?: string | null
          created_at?: string | null
          credit_limit?: number | null
          current_month_spending?: number | null
          customer_type?: string | null
          date_of_birth?: string | null
          demoted_at?: string | null
          demoted_from?: string | null
          demotion_reason?: string | null
          email?: string | null
          email_confirmed_at?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_panel_customer?: boolean
          last_sign_in_at?: string | null
          last_spending_reset_date?: string | null
          lifetime_spending?: number | null
          merchant_tier?: string | null
          phone?: string | null
          phone_confirmed_at?: string | null
          points_rate?: number | null
          preferences?: Json | null
          pricing_type?: string | null
          registered_at?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          tier_achieved_at?: string | null
          tier_id?: string | null
          total_orders_count?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_car_make_id_fkey"
            columns: ["car_make_id"]
            isOneToOne: false
            referencedRelation: "car_makes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_profiles_car_model_id_fkey"
            columns: ["car_model_id"]
            isOneToOne: false
            referencedRelation: "car_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_profiles_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "customer_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_subscription_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          notes: string | null
          payment_slip_url: string
          period_end: string
          period_start: string
          subscription_type: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          payment_slip_url: string
          period_end: string
          period_start: string
          subscription_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          payment_slip_url?: string
          period_end?: string
          period_start?: string
          subscription_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_subscription_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_subscription_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_subscription_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_subscription_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
        ]
      }
      customer_tiers: {
        Row: {
          badge_color: string | null
          badge_icon: string | null
          created_at: string | null
          description: string | null
          discount_percentage: number | null
          display_order: number | null
          free_shipping_threshold: number | null
          has_early_access: boolean | null
          has_priority_support: boolean | null
          id: string
          is_active: boolean | null
          min_monthly_spending: number | null
          points_multiplier: number | null
          tier_level: number
          tier_name: string
          updated_at: string | null
        }
        Insert: {
          badge_color?: string | null
          badge_icon?: string | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          display_order?: number | null
          free_shipping_threshold?: number | null
          has_early_access?: boolean | null
          has_priority_support?: boolean | null
          id?: string
          is_active?: boolean | null
          min_monthly_spending?: number | null
          points_multiplier?: number | null
          tier_level: number
          tier_name: string
          updated_at?: string | null
        }
        Update: {
          badge_color?: string | null
          badge_icon?: string | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          display_order?: number | null
          free_shipping_threshold?: number | null
          has_early_access?: boolean | null
          has_priority_support?: boolean | null
          id?: string
          is_active?: boolean | null
          min_monthly_spending?: number | null
          points_multiplier?: number | null
          tier_level?: number
          tier_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      guide_comments: {
        Row: {
          comment_text: string
          created_at: string | null
          guide_id: string
          id: string
          is_helpful: boolean | null
          merchant_id: string
          updated_at: string | null
        }
        Insert: {
          comment_text: string
          created_at?: string | null
          guide_id: string
          id?: string
          is_helpful?: boolean | null
          merchant_id: string
          updated_at?: string | null
        }
        Update: {
          comment_text?: string
          created_at?: string | null
          guide_id?: string
          id?: string
          is_helpful?: boolean | null
          merchant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guide_comments_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "installation_guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_comments_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_comments_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_comments_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_comments_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
        ]
      }
      guide_likes: {
        Row: {
          guide_id: string
          id: string
          liked_at: string | null
          merchant_id: string
        }
        Insert: {
          guide_id: string
          id?: string
          liked_at?: string | null
          merchant_id: string
        }
        Update: {
          guide_id?: string
          id?: string
          liked_at?: string | null
          merchant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_likes_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "installation_guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_likes_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_likes_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_likes_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_likes_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
        ]
      }
      guide_views: {
        Row: {
          completed: boolean | null
          guide_id: string
          id: string
          merchant_id: string
          viewed_at: string | null
          watch_duration_seconds: number | null
        }
        Insert: {
          completed?: boolean | null
          guide_id: string
          id?: string
          merchant_id: string
          viewed_at?: string | null
          watch_duration_seconds?: number | null
        }
        Update: {
          completed?: boolean | null
          guide_id?: string
          id?: string
          merchant_id?: string
          viewed_at?: string | null
          watch_duration_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "guide_views_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "installation_guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_views_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_views_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_views_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_views_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
        ]
      }
      installation_guides: {
        Row: {
          car_brand: string | null
          car_model: string | null
          car_year_end: number | null
          car_year_start: number | null
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          estimated_time_minutes: number | null
          id: string
          installation_price: number | null
          instructions_steps: Json | null
          is_published: boolean | null
          likes_count: number | null
          pdf_url: string | null
          recommended_installation_price_max: number | null
          recommended_installation_price_min: number | null
          recommended_time: string | null
          required_materials: Json | null
          required_tools: Json | null
          requires_enterprise_plan: boolean | null
          safety_warnings: string[] | null
          search_keywords: string | null
          steps: Json | null
          tags: Json | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_duration: string | null
          video_url: string | null
          views_count: number | null
          workman_power: number | null
        }
        Insert: {
          car_brand?: string | null
          car_model?: string | null
          car_year_end?: number | null
          car_year_start?: number | null
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_time_minutes?: number | null
          id?: string
          installation_price?: number | null
          instructions_steps?: Json | null
          is_published?: boolean | null
          likes_count?: number | null
          pdf_url?: string | null
          recommended_installation_price_max?: number | null
          recommended_installation_price_min?: number | null
          recommended_time?: string | null
          required_materials?: Json | null
          required_tools?: Json | null
          requires_enterprise_plan?: boolean | null
          safety_warnings?: string[] | null
          search_keywords?: string | null
          steps?: Json | null
          tags?: Json | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_duration?: string | null
          video_url?: string | null
          views_count?: number | null
          workman_power?: number | null
        }
        Update: {
          car_brand?: string | null
          car_model?: string | null
          car_year_end?: number | null
          car_year_start?: number | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_time_minutes?: number | null
          id?: string
          installation_price?: number | null
          instructions_steps?: Json | null
          is_published?: boolean | null
          likes_count?: number | null
          pdf_url?: string | null
          recommended_installation_price_max?: number | null
          recommended_installation_price_min?: number | null
          recommended_time?: string | null
          required_materials?: Json | null
          required_tools?: Json | null
          requires_enterprise_plan?: boolean | null
          safety_warnings?: string[] | null
          search_keywords?: string | null
          steps?: Json | null
          tags?: Json | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_duration?: string | null
          video_url?: string | null
          views_count?: number | null
          workman_power?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "installation_guides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_guides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_guides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_guides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
        ]
      }
      kb_ai_processing_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: string | null
          document_id: string
          error_message: string | null
          estimated_cost: number | null
          id: string
          openai_model: string | null
          processing_config: Json | null
          progress: number | null
          status: Database["public"]["Enums"]["ai_processing_status"] | null
          total_tokens_used: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          document_id: string
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          openai_model?: string | null
          processing_config?: Json | null
          progress?: number | null
          status?: Database["public"]["Enums"]["ai_processing_status"] | null
          total_tokens_used?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          document_id?: string
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          openai_model?: string | null
          processing_config?: Json | null
          progress?: number | null
          status?: Database["public"]["Enums"]["ai_processing_status"] | null
          total_tokens_used?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_ai_processing_jobs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_documents: {
        Row: {
          ai_processing_error: string | null
          ai_processing_status:
            | Database["public"]["Enums"]["ai_processing_status"]
            | null
          created_at: string
          description: string | null
          extracted_text: string | null
          file_data: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          title: string
          total_pages: number | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          ai_processing_error?: string | null
          ai_processing_status?:
            | Database["public"]["Enums"]["ai_processing_status"]
            | null
          created_at?: string
          description?: string | null
          extracted_text?: string | null
          file_data?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type?: string
          title: string
          total_pages?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          ai_processing_error?: string | null
          ai_processing_status?:
            | Database["public"]["Enums"]["ai_processing_status"]
            | null
          created_at?: string
          description?: string | null
          extracted_text?: string | null
          file_data?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          title?: string
          total_pages?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          ai_generated: boolean | null
          category: string
          confidence_score: number | null
          content: string
          created_at: string
          id: string
          is_approved: boolean | null
          original_text: string | null
          page_number: number | null
          source: Database["public"]["Enums"]["kb_entry_source"] | null
          source_document_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean | null
          category: string
          confidence_score?: number | null
          content: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          original_text?: string | null
          page_number?: number | null
          source?: Database["public"]["Enums"]["kb_entry_source"] | null
          source_document_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean | null
          category?: string
          confidence_score?: number | null
          content?: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          original_text?: string | null
          page_number?: number | null
          source?: Database["public"]["Enums"]["kb_entry_source"] | null
          source_document_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturers: {
        Row: {
          country: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      merchant_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          current_uses: number | null
          description: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_favorites: {
        Row: {
          component_id: string
          created_at: string
          custom_note: string | null
          customer_id: string
          id: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          component_id: string
          created_at?: string
          custom_note?: string | null
          customer_id: string
          id?: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          component_id?: string
          created_at?: string
          custom_note?: string | null
          customer_id?: string
          id?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_favorites_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "component_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_favorites_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "component_library_with_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
        ]
      }
      merchant_promotions: {
        Row: {
          applicable_to: string | null
          category_ids: string[] | null
          code: string | null
          component_ids: string[] | null
          created_at: string
          current_uses: number | null
          description: string | null
          discount_value: number | null
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          max_uses: number | null
          max_uses_per_merchant: number | null
          min_purchase_amount: number | null
          name: string
          type: Database["public"]["Enums"]["promotion_type"]
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_to?: string | null
          category_ids?: string[] | null
          code?: string | null
          component_ids?: string[] | null
          created_at?: string
          current_uses?: number | null
          description?: string | null
          discount_value?: number | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          max_uses?: number | null
          max_uses_per_merchant?: number | null
          min_purchase_amount?: number | null
          name: string
          type: Database["public"]["Enums"]["promotion_type"]
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_to?: string | null
          category_ids?: string[] | null
          code?: string | null
          component_ids?: string[] | null
          created_at?: string
          current_uses?: number | null
          description?: string | null
          discount_value?: number | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          max_uses?: number | null
          max_uses_per_merchant?: number | null
          min_purchase_amount?: number | null
          name?: string
          type?: Database["public"]["Enums"]["promotion_type"]
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      merchant_purchase_history: {
        Row: {
          average_quantity: number | null
          component_id: string
          created_at: string
          customer_id: string
          id: string
          last_purchase_date: string | null
          purchase_count: number | null
          total_amount: number | null
          total_quantity: number | null
          updated_at: string
        }
        Insert: {
          average_quantity?: number | null
          component_id: string
          created_at?: string
          customer_id: string
          id?: string
          last_purchase_date?: string | null
          purchase_count?: number | null
          total_amount?: number | null
          total_quantity?: number | null
          updated_at?: string
        }
        Update: {
          average_quantity?: number | null
          component_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          last_purchase_date?: string | null
          purchase_count?: number | null
          total_amount?: number | null
          total_quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_purchase_history_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "component_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_purchase_history_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "component_library_with_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_purchase_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_purchase_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_purchase_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_purchase_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
        ]
      }
      merchant_registrations: {
        Row: {
          address: string | null
          approved_at: string | null
          approved_by: string | null
          bank_proof_url: string | null
          business_registration_no: string | null
          business_type: string | null
          code_id: string | null
          company_name: string
          company_profile_url: string | null
          created_at: string
          customer_id: string
          email: string | null
          id: string
          payment_slip_url: string | null
          referral_code: string | null
          referred_by_salesman_id: string | null
          rejection_reason: string | null
          social_media_links: Json | null
          ssm_document_url: string | null
          status: string | null
          tax_id: string | null
          updated_at: string
          workshop_photos: Json | null
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bank_proof_url?: string | null
          business_registration_no?: string | null
          business_type?: string | null
          code_id?: string | null
          company_name: string
          company_profile_url?: string | null
          created_at?: string
          customer_id: string
          email?: string | null
          id?: string
          payment_slip_url?: string | null
          referral_code?: string | null
          referred_by_salesman_id?: string | null
          rejection_reason?: string | null
          social_media_links?: Json | null
          ssm_document_url?: string | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string
          workshop_photos?: Json | null
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bank_proof_url?: string | null
          business_registration_no?: string | null
          business_type?: string | null
          code_id?: string | null
          company_name?: string
          company_profile_url?: string | null
          created_at?: string
          customer_id?: string
          email?: string | null
          id?: string
          payment_slip_url?: string | null
          referral_code?: string | null
          referred_by_salesman_id?: string | null
          rejection_reason?: string | null
          social_media_links?: Json | null
          ssm_document_url?: string | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string
          workshop_photos?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_registrations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_registrations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_registrations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_registrations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_registrations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_registrations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
          {
            foreignKeyName: "merchant_registrations_referred_by_salesman_id_fkey"
            columns: ["referred_by_salesman_id"]
            isOneToOne: false
            referencedRelation: "salesmen"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_wallets: {
        Row: {
          created_at: string
          credit_balance: number | null
          customer_id: string
          id: string
          points_balance: number | null
          total_earned_points: number | null
          total_spent_points: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_balance?: number | null
          customer_id: string
          id?: string
          points_balance?: number | null
          total_earned_points?: number | null
          total_spent_points?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_balance?: number | null
          customer_id?: string
          id?: string
          points_balance?: number | null
          total_earned_points?: number | null
          total_spent_points?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_wallets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_wallets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_wallets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_wallets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          channel: string
          created_at: string | null
          error_message: string | null
          id: string
          message: string
          notification_type: string
          recipient: string
          sent_at: string | null
          status: string
          subject: string | null
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          notification_type: string
          recipient: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          notification_type?: string
          recipient?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          notify_car_news: boolean | null
          notify_new_products: boolean | null
          notify_order_status: boolean | null
          notify_promotions: boolean | null
          phone_number: string | null
          updated_at: string | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          notify_car_news?: boolean | null
          notify_new_products?: boolean | null
          notify_order_status?: boolean | null
          notify_promotions?: boolean | null
          phone_number?: string | null
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          notify_car_news?: boolean | null
          notify_new_products?: boolean | null
          notify_order_status?: boolean | null
          notify_promotions?: boolean | null
          phone_number?: string | null
          updated_at?: string | null
          whatsapp_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
        ]
      }
      order_history_access: {
        Row: {
          customer_id: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          payment_status: string | null
          pricing_plan_id: string
          purchased_at: string | null
        }
        Insert: {
          customer_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          payment_status?: string | null
          pricing_plan_id: string
          purchased_at?: string | null
        }
        Update: {
          customer_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          payment_status?: string | null
          pricing_plan_id?: string
          purchased_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_history_access_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_history_access_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_history_access_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_history_access_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
          {
            foreignKeyName: "order_history_access_pricing_plan_id_fkey"
            columns: ["pricing_plan_id"]
            isOneToOne: false
            referencedRelation: "order_history_access_pricing"
            referencedColumns: ["id"]
          },
        ]
      }
      order_history_access_pricing: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          duration_months: number | null
          id: string
          is_active: boolean | null
          plan_name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_months?: number | null
          id?: string
          is_active?: boolean | null
          plan_name: string
          price: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_months?: number | null
          id?: string
          is_active?: boolean | null
          plan_name?: string
          price?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          component_id: string | null
          component_name: string
          component_sku: string
          created_at: string | null
          id: string
          order_id: string
          product_context: string | null
          quantity: number
          total_price: number
          unit_price: number
          vendor_id: string | null
        }
        Insert: {
          component_id?: string | null
          component_name: string
          component_sku: string
          created_at?: string | null
          id?: string
          order_id: string
          product_context?: string | null
          quantity: number
          total_price: number
          unit_price: number
          vendor_id?: string | null
        }
        Update: {
          component_id?: string | null
          component_name?: string
          component_sku?: string
          created_at?: string | null
          id?: string
          order_id?: string
          product_context?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "component_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "component_library_with_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_orders_enhanced"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          new_status: Database["public"]["Enums"]["order_status_enum"]
          notes: string | null
          order_id: string | null
          previous_status:
            | Database["public"]["Enums"]["order_status_enum"]
            | null
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["order_status_enum"]
          notes?: string | null
          order_id?: string | null
          previous_status?:
            | Database["public"]["Enums"]["order_status_enum"]
            | null
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["order_status_enum"]
          notes?: string | null
          order_id?: string | null
          previous_status?:
            | Database["public"]["Enums"]["order_status_enum"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_orders_enhanced"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          courier_cost: number | null
          courier_created_at: string | null
          courier_label_url: string | null
          courier_provider: string | null
          courier_shipment_id: string | null
          courier_status: string | null
          courier_tracking_number: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          customer_profile_id: string | null
          delivered_at: string | null
          delivery_address: Json | null
          delivery_fee: number | null
          delivery_instructions: string | null
          delivery_method: string
          delivery_proof_url: string | null
          discount: number | null
          dispatched_at: string | null
          estimated_delivery_date: string | null
          id: string
          internal_notes: string | null
          invoice_printed_at: string | null
          notes: string | null
          order_group_id: string | null
          order_no: string
          packed_at: string | null
          payment_gateway_response: Json | null
          payment_method: string
          payment_state: string | null
          payment_verification_notes: string | null
          payment_verified_at: string | null
          payment_verified_by: string | null
          picked_at: string | null
          points_used: number | null
          processing_notes: string | null
          processing_started_at: string | null
          promotion_code: string | null
          promotion_discount: number | null
          ready_at: string | null
          seller_letter: string | null
          seller_vendor_id: string | null
          shipment_created_at: string | null
          shipping_fee: number | null
          status: string | null
          subtotal: number
          tax: number | null
          total: number
          updated_at: string | null
          user_id: string | null
          voucher_code: string | null
          voucher_discount: number | null
          voucher_id: string | null
          warehouse_assigned_at: string | null
          warehouse_assigned_to: string | null
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          courier_cost?: number | null
          courier_created_at?: string | null
          courier_label_url?: string | null
          courier_provider?: string | null
          courier_shipment_id?: string | null
          courier_status?: string | null
          courier_tracking_number?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          customer_profile_id?: string | null
          delivered_at?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_instructions?: string | null
          delivery_method: string
          delivery_proof_url?: string | null
          discount?: number | null
          dispatched_at?: string | null
          estimated_delivery_date?: string | null
          id?: string
          internal_notes?: string | null
          invoice_printed_at?: string | null
          notes?: string | null
          order_group_id?: string | null
          order_no: string
          packed_at?: string | null
          payment_gateway_response?: Json | null
          payment_method: string
          payment_state?: string | null
          payment_verification_notes?: string | null
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          picked_at?: string | null
          points_used?: number | null
          processing_notes?: string | null
          processing_started_at?: string | null
          promotion_code?: string | null
          promotion_discount?: number | null
          ready_at?: string | null
          seller_letter?: string | null
          seller_vendor_id?: string | null
          shipment_created_at?: string | null
          shipping_fee?: number | null
          status?: string | null
          subtotal: number
          tax?: number | null
          total: number
          updated_at?: string | null
          user_id?: string | null
          voucher_code?: string | null
          voucher_discount?: number | null
          voucher_id?: string | null
          warehouse_assigned_at?: string | null
          warehouse_assigned_to?: string | null
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          courier_cost?: number | null
          courier_created_at?: string | null
          courier_label_url?: string | null
          courier_provider?: string | null
          courier_shipment_id?: string | null
          courier_status?: string | null
          courier_tracking_number?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          customer_profile_id?: string | null
          delivered_at?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_instructions?: string | null
          delivery_method?: string
          delivery_proof_url?: string | null
          discount?: number | null
          dispatched_at?: string | null
          estimated_delivery_date?: string | null
          id?: string
          internal_notes?: string | null
          invoice_printed_at?: string | null
          notes?: string | null
          order_group_id?: string | null
          order_no?: string
          packed_at?: string | null
          payment_gateway_response?: Json | null
          payment_method?: string
          payment_state?: string | null
          payment_verification_notes?: string | null
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          picked_at?: string | null
          points_used?: number | null
          processing_notes?: string | null
          processing_started_at?: string | null
          promotion_code?: string | null
          promotion_discount?: number | null
          ready_at?: string | null
          seller_letter?: string | null
          seller_vendor_id?: string | null
          shipment_created_at?: string | null
          shipping_fee?: number | null
          status?: string | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string | null
          user_id?: string | null
          voucher_code?: string | null
          voucher_discount?: number | null
          voucher_id?: string | null
          warehouse_assigned_at?: string | null
          warehouse_assigned_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
          {
            foreignKeyName: "orders_payment_verified_by_fkey"
            columns: ["payment_verified_by"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payment_verified_by_fkey"
            columns: ["payment_verified_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_vendor_id_fkey"
            columns: ["seller_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_vendor_id_fkey"
            columns: ["seller_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_warehouse_assigned_to_fkey"
            columns: ["warehouse_assigned_to"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_warehouse_assigned_to_fkey"
            columns: ["warehouse_assigned_to"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_inquiries: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          id: string
          inquiry_type: string | null
          message: string | null
          partnership_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          inquiry_type?: string | null
          message?: string | null
          partnership_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          inquiry_type?: string | null
          message?: string | null
          partnership_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_inquiries_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "premium_partners_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_inquiries_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "premium_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_renewal_history: {
        Row: {
          admin_notes: string | null
          amount_paid: number | null
          created_at: string | null
          id: string
          months_extended: number
          new_end_date: string
          new_status: string
          partnership_id: string
          payment_method: string | null
          payment_reference: string | null
          previous_end_date: string | null
          previous_status: string | null
          renewal_type: string
          renewed_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount_paid?: number | null
          created_at?: string | null
          id?: string
          months_extended: number
          new_end_date: string
          new_status: string
          partnership_id: string
          payment_method?: string | null
          payment_reference?: string | null
          previous_end_date?: string | null
          previous_status?: string | null
          renewal_type: string
          renewed_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount_paid?: number | null
          created_at?: string | null
          id?: string
          months_extended?: number
          new_end_date?: string
          new_status?: string
          partnership_id?: string
          payment_method?: string | null
          payment_reference?: string | null
          previous_end_date?: string | null
          previous_status?: string | null
          renewal_type?: string
          renewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partnership_renewal_history_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "premium_partners_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_renewal_history_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "premium_partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_renewal_history_renewed_by_fkey"
            columns: ["renewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
        Relationships: []
      }
      phone_otp_verifications: {
        Row: {
          attempts: number | null
          code: string
          created_at: string | null
          expires_at: string
          id: string
          phone: string
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          phone: string
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      point_redemptions: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          customer_id: string
          fulfilled_at: string | null
          fulfilled_by: string | null
          fulfillment_notes: string | null
          generated_voucher_id: string | null
          id: string
          points_spent: number
          reward_item_id: string
          shipping_address: Json | null
          status: string
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          customer_id: string
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          fulfillment_notes?: string | null
          generated_voucher_id?: string | null
          id?: string
          points_spent: number
          reward_item_id: string
          shipping_address?: Json | null
          status?: string
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          customer_id?: string
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          fulfillment_notes?: string | null
          generated_voucher_id?: string | null
          id?: string
          points_spent?: number
          reward_item_id?: string
          shipping_address?: Json | null
          status?: string
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "point_redemptions_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_redemptions_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
          {
            foreignKeyName: "point_redemptions_fulfilled_by_fkey"
            columns: ["fulfilled_by"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_redemptions_fulfilled_by_fkey"
            columns: ["fulfilled_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_redemptions_generated_voucher_id_fkey"
            columns: ["generated_voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_redemptions_reward_item_id_fkey"
            columns: ["reward_item_id"]
            isOneToOne: false
            referencedRelation: "reward_items"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_partnerships: {
        Row: {
          address: string | null
          admin_approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          billing_cycle: string | null
          business_name: string
          business_registration_no: string | null
          business_type: string | null
          city: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          display_priority: number | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          is_admin_invited: boolean | null
          is_featured: boolean | null
          is_publicly_listed: boolean
          last_payment_amount: number | null
          last_payment_date: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          merchant_id: string
          next_billing_date: string | null
          operating_hours: Json | null
          panel_slot_number: number | null
          payment_method: string | null
          payment_slip_url: string | null
          postcode: string | null
          rejection_reason: string | null
          services_offered: string[] | null
          shop_photos: string[] | null
          state: string | null
          subscription_end_date: string | null
          subscription_plan: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          total_clicks: number | null
          total_inquiries: number | null
          total_views: number | null
          updated_at: string | null
          website_url: string | null
          yearly_fee: number | null
        }
        Insert: {
          address?: string | null
          admin_approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          billing_cycle?: string | null
          business_name: string
          business_registration_no?: string | null
          business_type?: string | null
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          display_priority?: number | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_admin_invited?: boolean | null
          is_featured?: boolean | null
          is_publicly_listed?: boolean
          last_payment_amount?: number | null
          last_payment_date?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          merchant_id: string
          next_billing_date?: string | null
          operating_hours?: Json | null
          panel_slot_number?: number | null
          payment_method?: string | null
          payment_slip_url?: string | null
          postcode?: string | null
          rejection_reason?: string | null
          services_offered?: string[] | null
          shop_photos?: string[] | null
          state?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          total_clicks?: number | null
          total_inquiries?: number | null
          total_views?: number | null
          updated_at?: string | null
          website_url?: string | null
          yearly_fee?: number | null
        }
        Update: {
          address?: string | null
          admin_approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          billing_cycle?: string | null
          business_name?: string
          business_registration_no?: string | null
          business_type?: string | null
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          display_priority?: number | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_admin_invited?: boolean | null
          is_featured?: boolean | null
          is_publicly_listed?: boolean
          last_payment_amount?: number | null
          last_payment_date?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          merchant_id?: string
          next_billing_date?: string | null
          operating_hours?: Json | null
          panel_slot_number?: number | null
          payment_method?: string | null
          payment_slip_url?: string | null
          postcode?: string | null
          rejection_reason?: string | null
          services_offered?: string[] | null
          shop_photos?: string[] | null
          state?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          total_clicks?: number | null
          total_inquiries?: number | null
          total_views?: number | null
          updated_at?: string | null
          website_url?: string | null
          yearly_fee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "premium_partnerships_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_partnerships_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_partnerships_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_partnerships_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_partnerships_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
        ]
      }
      product_components: {
        Row: {
          component_id: string
          created_at: string | null
          display_order: number | null
          foc_quantity: number
          id: string
          is_default: boolean | null
          is_foc: boolean
          is_foc_trigger: boolean
          is_required: boolean | null
          product_id: string
          remark: string | null
        }
        Insert: {
          component_id: string
          created_at?: string | null
          display_order?: number | null
          foc_quantity?: number
          id?: string
          is_default?: boolean | null
          is_foc?: boolean
          is_foc_trigger?: boolean
          is_required?: boolean | null
          product_id: string
          remark?: string | null
        }
        Update: {
          component_id?: string
          created_at?: string | null
          display_order?: number | null
          foc_quantity?: number
          id?: string
          is_default?: boolean | null
          is_foc?: boolean
          is_foc_trigger?: boolean
          is_required?: boolean | null
          product_id?: string
          remark?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "component_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "component_library_with_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_components_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_new"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images_new: {
        Row: {
          alt_text: string | null
          created_at: string | null
          file_name: string | null
          file_size: number | null
          id: string
          is_primary: boolean | null
          media_type: string
          mime_type: string | null
          product_id: string
          sort_order: number | null
          tenant_id: string | null
          thumbnail_url: string | null
          updated_at: string | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_primary?: boolean | null
          media_type?: string
          mime_type?: string | null
          product_id: string
          sort_order?: number | null
          tenant_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_primary?: boolean | null
          media_type?: string
          mime_type?: string | null
          product_id?: string
          sort_order?: number | null
          tenant_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_new_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_new"
            referencedColumns: ["id"]
          },
        ]
      }
      product_installation_guides: {
        Row: {
          created_at: string | null
          dealer_price: number | null
          difficulty_level: string | null
          id: string
          installation_price: number | null
          installation_videos: Json | null
          notes: string | null
          product_id: string
          recommended_time: string | null
          rsp: number | null
          updated_at: string | null
          workman_power: number | null
        }
        Insert: {
          created_at?: string | null
          dealer_price?: number | null
          difficulty_level?: string | null
          id?: string
          installation_price?: number | null
          installation_videos?: Json | null
          notes?: string | null
          product_id: string
          recommended_time?: string | null
          rsp?: number | null
          updated_at?: string | null
          workman_power?: number | null
        }
        Update: {
          created_at?: string | null
          dealer_price?: number | null
          difficulty_level?: string | null
          id?: string
          installation_price?: number | null
          installation_videos?: Json | null
          notes?: string | null
          product_id?: string
          recommended_time?: string | null
          rsp?: number | null
          updated_at?: string | null
          workman_power?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_installation_guides_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products_new"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          comment: string
          created_at: string
          customer_email: string
          customer_name: string
          helpful_count: number
          id: string
          product_id: string
          rating: number
          status: string
          title: string | null
          updated_at: string
          user_id: string | null
          verified_purchase: boolean
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          comment: string
          created_at?: string
          customer_email: string
          customer_name: string
          helpful_count?: number
          id?: string
          product_id: string
          rating: number
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
          verified_purchase?: boolean
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          comment?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          helpful_count?: number
          id?: string
          product_id?: string
          rating?: number
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
          verified_purchase?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_new"
            referencedColumns: ["id"]
          },
        ]
      }
      products_new: {
        Row: {
          active: boolean | null
          approval_status: string
          brand: string | null
          category_id: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          dimensions_cm: string | null
          featured: boolean | null
          id: string
          keywords: string[] | null
          manufacturer_brand: string | null
          manufacturer_id: string | null
          model: string | null
          name: string
          new_arrival_at: string | null
          rejection_reason: string | null
          screen_size: string[] | null
          slug: string
          tags: string[] | null
          tenant_id: string | null
          updated_at: string | null
          vendor_id: string | null
          weight_kg: number | null
          year: number | null
          year_from: number | null
          year_to: number | null
        }
        Insert: {
          active?: boolean | null
          approval_status?: string
          brand?: string | null
          category_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          dimensions_cm?: string | null
          featured?: boolean | null
          id?: string
          keywords?: string[] | null
          manufacturer_brand?: string | null
          manufacturer_id?: string | null
          model?: string | null
          name: string
          new_arrival_at?: string | null
          rejection_reason?: string | null
          screen_size?: string[] | null
          slug: string
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          weight_kg?: number | null
          year?: number | null
          year_from?: number | null
          year_to?: number | null
        }
        Update: {
          active?: boolean | null
          approval_status?: string
          brand?: string | null
          category_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          dimensions_cm?: string | null
          featured?: boolean | null
          id?: string
          keywords?: string[] | null
          manufacturer_brand?: string | null
          manufacturer_id?: string | null
          model?: string | null
          name?: string
          new_arrival_at?: string | null
          rejection_reason?: string | null
          screen_size?: string[] | null
          slug?: string
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          weight_kg?: number | null
          year?: number | null
          year_from?: number | null
          year_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_new_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_new_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_new_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_new_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_usage: {
        Row: {
          created_at: string
          customer_id: string
          discount_amount: number
          id: string
          order_id: string | null
          promotion_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          discount_amount: number
          id?: string
          order_id?: string | null
          promotion_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          discount_amount?: number
          id?: string
          order_id?: string | null
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
          {
            foreignKeyName: "promotion_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_orders_enhanced"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_usage_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "merchant_promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      return_images: {
        Row: {
          description: string | null
          id: string
          image_url: string
          return_id: string
          uploaded_at: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          image_url: string
          return_id: string
          uploaded_at?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          image_url?: string
          return_id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "return_images_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "pending_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_images_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          component_name: string
          component_sku: string
          created_at: string | null
          id: string
          item_condition: string | null
          order_item_id: string
          quantity: number
          return_id: string
          unit_price: number
        }
        Insert: {
          component_name: string
          component_sku: string
          created_at?: string | null
          id?: string
          item_condition?: string | null
          order_item_id: string
          quantity?: number
          return_id: string
          unit_price: number
        }
        Update: {
          component_name?: string
          component_sku?: string
          created_at?: string | null
          id?: string
          item_condition?: string | null
          order_item_id?: string
          quantity?: number
          return_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "return_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "pending_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string | null
          created_by_admin: boolean | null
          customer_id: string
          exchange_order_id: string | null
          id: string
          item_received_at: string | null
          item_shipped_at: string | null
          order_id: string
          reason: string
          reason_details: string | null
          refund_amount: number | null
          refund_method: string
          refund_processed_at: string | null
          refund_reference: string | null
          refund_status: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          resolution_type: string | null
          restocked: boolean | null
          restocked_at: string | null
          restocked_by: string | null
          return_address: string | null
          return_courier: string | null
          return_instructions: string | null
          return_no: string | null
          return_shipping_free: boolean | null
          return_shipping_paid_by: string | null
          return_tracking_number: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by_admin?: boolean | null
          customer_id: string
          exchange_order_id?: string | null
          id?: string
          item_received_at?: string | null
          item_shipped_at?: string | null
          order_id: string
          reason: string
          reason_details?: string | null
          refund_amount?: number | null
          refund_method: string
          refund_processed_at?: string | null
          refund_reference?: string | null
          refund_status?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          resolution_type?: string | null
          restocked?: boolean | null
          restocked_at?: string | null
          restocked_by?: string | null
          return_address?: string | null
          return_courier?: string | null
          return_instructions?: string | null
          return_no?: string | null
          return_shipping_free?: boolean | null
          return_shipping_paid_by?: string | null
          return_tracking_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by_admin?: boolean | null
          customer_id?: string
          exchange_order_id?: string | null
          id?: string
          item_received_at?: string | null
          item_shipped_at?: string | null
          order_id?: string
          reason?: string
          reason_details?: string | null
          refund_amount?: number | null
          refund_method?: string
          refund_processed_at?: string | null
          refund_reference?: string | null
          refund_status?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          resolution_type?: string | null
          restocked?: boolean | null
          restocked_at?: string | null
          restocked_by?: string | null
          return_address?: string | null
          return_courier?: string | null
          return_instructions?: string | null
          return_no?: string | null
          return_shipping_free?: boolean | null
          return_shipping_paid_by?: string | null
          return_tracking_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "returns_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_exchange_order_id_fkey"
            columns: ["exchange_order_id"]
            isOneToOne: false
            referencedRelation: "admin_orders_enhanced"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_exchange_order_id_fkey"
            columns: ["exchange_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_orders_enhanced"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_helpful_votes: {
        Row: {
          created_at: string
          id: string
          review_id: string
          user_identifier: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          user_identifier: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          user_identifier?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_helpful_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          review_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          review_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_images_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_items: {
        Row: {
          available_from: string | null
          available_until: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          estimated_delivery_days: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          item_type: string
          max_redemptions_per_customer: number | null
          name: string
          points_required: number
          shipping_required: boolean | null
          stock_quantity: number | null
          total_redeemed: number | null
          total_redemption_limit: number | null
          updated_at: string | null
          updated_by: string | null
          voucher_code_prefix: string | null
          voucher_discount_type: string | null
          voucher_discount_value: number | null
          voucher_min_purchase: number | null
          voucher_validity_days: number | null
        }
        Insert: {
          available_from?: string | null
          available_until?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          estimated_delivery_days?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          item_type: string
          max_redemptions_per_customer?: number | null
          name: string
          points_required: number
          shipping_required?: boolean | null
          stock_quantity?: number | null
          total_redeemed?: number | null
          total_redemption_limit?: number | null
          updated_at?: string | null
          updated_by?: string | null
          voucher_code_prefix?: string | null
          voucher_discount_type?: string | null
          voucher_discount_value?: number | null
          voucher_min_purchase?: number | null
          voucher_validity_days?: number | null
        }
        Update: {
          available_from?: string | null
          available_until?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          estimated_delivery_days?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          item_type?: string
          max_redemptions_per_customer?: number | null
          name?: string
          points_required?: number
          shipping_required?: boolean | null
          stock_quantity?: number | null
          total_redeemed?: number | null
          total_redemption_limit?: number | null
          updated_at?: string | null
          updated_by?: string | null
          voucher_code_prefix?: string | null
          voucher_discount_type?: string | null
          voucher_discount_value?: number | null
          voucher_min_purchase?: number | null
          voucher_validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      route_assignments: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          departure_time: string
          driver_id: string
          driver_name: string
          estimated_fuel_cost: number | null
          id: string
          notes: string | null
          optimization_method: string | null
          route_date: string
          route_efficiency: number | null
          status: string
          total_distance: number | null
          total_driving_time: number | null
          total_duration: number | null
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          departure_time: string
          driver_id: string
          driver_name: string
          estimated_fuel_cost?: number | null
          id?: string
          notes?: string | null
          optimization_method?: string | null
          route_date: string
          route_efficiency?: number | null
          status?: string
          total_distance?: number | null
          total_driving_time?: number | null
          total_duration?: number | null
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          departure_time?: string
          driver_id?: string
          driver_name?: string
          estimated_fuel_cost?: number | null
          id?: string
          notes?: string | null
          optimization_method?: string | null
          route_date?: string
          route_efficiency?: number | null
          status?: string
          total_distance?: number | null
          total_driving_time?: number | null
          total_duration?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      route_orders: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string | null
          delivered_at: string | null
          delivery_notes: string | null
          delivery_status: string
          id: string
          order_id: string
          order_number: string
          route_assignment_id: string
          route_stop_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_notes?: string | null
          delivery_status?: string
          id?: string
          order_id: string
          order_number: string
          route_assignment_id: string
          route_stop_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_notes?: string | null
          delivery_status?: string
          id?: string
          order_id?: string
          order_number?: string
          route_assignment_id?: string
          route_stop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_orders_route_assignment_id_fkey"
            columns: ["route_assignment_id"]
            isOneToOne: false
            referencedRelation: "route_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      salesmen: {
        Row: {
          commission_rate: number | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          referral_code: string
          total_commission: number | null
          total_referrals: number | null
          updated_at: string | null
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          referral_code: string
          total_commission?: number | null
          total_referrals?: number | null
          updated_at?: string | null
        }
        Update: {
          commission_rate?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          referral_code?: string
          total_commission?: number | null
          total_referrals?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      screen_sizes: {
        Row: {
          created_at: string | null
          id: string
          size_display: string
          size_value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          size_display: string
          size_value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          size_display?: string
          size_value?: string
        }
        Relationships: []
      }
      secondhand_inquiries: {
        Row: {
          buyer_email: string | null
          buyer_name: string
          buyer_phone: string
          created_at: string | null
          id: string
          listing_id: string
          message: string | null
          status: string
        }
        Insert: {
          buyer_email?: string | null
          buyer_name: string
          buyer_phone: string
          created_at?: string | null
          id?: string
          listing_id: string
          message?: string | null
          status?: string
        }
        Update: {
          buyer_email?: string | null
          buyer_name?: string
          buyer_phone?: string
          created_at?: string | null
          id?: string
          listing_id?: string
          message?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "secondhand_inquiries_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "secondhand_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      secondhand_listings: {
        Row: {
          category: string
          compatible_cars: string[] | null
          condition: string
          created_at: string | null
          description: string
          expires_at: string | null
          id: string
          images: string[] | null
          inquiry_count: number | null
          location: string | null
          original_price: number | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          seller_id: string
          selling_price: number
          status: string
          title: string
          updated_at: string | null
          usage_history: string | null
          view_count: number | null
        }
        Insert: {
          category: string
          compatible_cars?: string[] | null
          condition: string
          created_at?: string | null
          description: string
          expires_at?: string | null
          id?: string
          images?: string[] | null
          inquiry_count?: number | null
          location?: string | null
          original_price?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_id: string
          selling_price: number
          status?: string
          title: string
          updated_at?: string | null
          usage_history?: string | null
          view_count?: number | null
        }
        Update: {
          category?: string
          compatible_cars?: string[] | null
          condition?: string
          created_at?: string | null
          description?: string
          expires_at?: string | null
          id?: string
          images?: string[] | null
          inquiry_count?: number | null
          location?: string | null
          original_price?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_id?: string
          selling_price?: number
          status?: string
          title?: string
          updated_at?: string | null
          usage_history?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "secondhand_listings_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondhand_listings_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondhand_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondhand_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondhand_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondhand_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
        ]
      }
      site_settings: {
        Row: {
          address_city: string
          address_line1: string
          address_postcode: string
          address_state: string
          description: string
          email: string
          facebook_url: string
          free_return_shipping: boolean
          id: number
          instagram_url: string
          legal_name: string
          office_hours: Json
          phone: string
          privacy_policy: string
          return_policy_intro: string
          return_window_days: number
          terms_conditions: string
          trading_name: string
          updated_at: string
          updated_by: string | null
          whatsapp: string
        }
        Insert: {
          address_city?: string
          address_line1?: string
          address_postcode?: string
          address_state?: string
          description?: string
          email?: string
          facebook_url?: string
          free_return_shipping?: boolean
          id?: number
          instagram_url?: string
          legal_name?: string
          office_hours?: Json
          phone?: string
          privacy_policy?: string
          return_policy_intro?: string
          return_window_days?: number
          terms_conditions?: string
          trading_name?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string
        }
        Update: {
          address_city?: string
          address_line1?: string
          address_postcode?: string
          address_state?: string
          description?: string
          email?: string
          facebook_url?: string
          free_return_shipping?: boolean
          id?: number
          instagram_url?: string
          legal_name?: string
          office_hours?: Json
          phone?: string
          privacy_policy?: string
          return_policy_intro?: string
          return_window_days?: number
          terms_conditions?: string
          trading_name?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      stock_alerts: {
        Row: {
          alert_level: string
          alert_type: string
          created_at: string | null
          id: string
          inventory_id: string
          is_resolved: boolean | null
          message: string
          resolved_at: string | null
          resolved_by: string | null
          suggested_action: string | null
        }
        Insert: {
          alert_level: string
          alert_type: string
          created_at?: string | null
          id?: string
          inventory_id: string
          is_resolved?: boolean | null
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          suggested_action?: string | null
        }
        Update: {
          alert_level?: string
          alert_type?: string
          created_at?: string | null
          id?: string
          inventory_id?: string
          is_resolved?: boolean | null
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          suggested_action?: string | null
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
        Relationships: []
      }
      subscription_payments: {
        Row: {
          amount: number
          billing_period_end: string
          billing_period_start: string
          created_at: string | null
          id: string
          notes: string | null
          partnership_id: string
          payment_date: string | null
          payment_method: string
          payment_status: string | null
          receipt_url: string | null
          transaction_reference: string | null
        }
        Insert: {
          amount: number
          billing_period_end: string
          billing_period_start: string
          created_at?: string | null
          id?: string
          notes?: string | null
          partnership_id: string
          payment_date?: string | null
          payment_method: string
          payment_status?: string | null
          receipt_url?: string | null
          transaction_reference?: string | null
        }
        Update: {
          amount?: number
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          partnership_id?: string
          payment_date?: string | null
          payment_method?: string
          payment_status?: string | null
          receipt_url?: string | null
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "premium_partners_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "premium_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_upgrade_history: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          customer_id: string
          id: string
          new_tier_id: string
          previous_tier_id: string | null
          triggered_by: string | null
          upgrade_date: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          new_tier_id: string
          previous_tier_id?: string | null
          triggered_by?: string | null
          upgrade_date?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          new_tier_id?: string
          previous_tier_id?: string | null
          triggered_by?: string | null
          upgrade_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tier_upgrade_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_upgrade_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_upgrade_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_upgrade_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
          {
            foreignKeyName: "tier_upgrade_history_new_tier_id_fkey"
            columns: ["new_tier_id"]
            isOneToOne: false
            referencedRelation: "customer_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_upgrade_history_previous_tier_id_fkey"
            columns: ["previous_tier_id"]
            isOneToOne: false
            referencedRelation: "customer_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cart: {
        Row: {
          component_id: string | null
          component_name: string
          component_sku: string
          created_at: string | null
          guest_session: string | null
          id: string
          is_foc: boolean
          is_foc_trigger: boolean
          product_context: string | null
          quantity: number
          total_price: number | null
          unit_price: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          component_id?: string | null
          component_name: string
          component_sku: string
          created_at?: string | null
          guest_session?: string | null
          id?: string
          is_foc?: boolean
          is_foc_trigger?: boolean
          product_context?: string | null
          quantity?: number
          total_price?: number | null
          unit_price: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          component_id?: string | null
          component_name?: string
          component_sku?: string
          created_at?: string | null
          guest_session?: string | null
          id?: string
          is_foc?: boolean
          is_foc_trigger?: boolean
          product_context?: string | null
          quantity?: number
          total_price?: number | null
          unit_price?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_cart_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "component_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cart_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "component_library_with_usage"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_fingerprint: string
          device_info: Json | null
          id: string
          is_active: boolean | null
          last_activity_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_fingerprint: string
          device_info?: Json | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string
          device_info?: Json | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_fulfilments: {
        Row: {
          created_at: string
          delivered_at: string | null
          id: string
          notes: string | null
          order_id: string
          shipped_at: string | null
          shipping_fee: number
          status: string
          tracking_number: string | null
          tracking_provider: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          id?: string
          notes?: string | null
          order_id: string
          shipped_at?: string | null
          shipping_fee?: number
          status?: string
          tracking_number?: string | null
          tracking_provider?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          shipped_at?: string | null
          shipping_fee?: number
          status?: string
          tracking_number?: string | null
          tracking_provider?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_fulfilments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_orders_enhanced"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_fulfilments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_fulfilments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_fulfilments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_payouts: {
        Row: {
          commission_amount: number
          created_at: string
          gross_sales: number
          id: string
          net_payable: number
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_reference: string | null
          payment_slip_url: string | null
          period_end: string
          period_start: string
          refund_deductions: number
          status: string
          vendor_id: string
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          gross_sales?: number
          id?: string
          net_payable?: number
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_reference?: string | null
          payment_slip_url?: string | null
          period_end: string
          period_start: string
          refund_deductions?: number
          status?: string
          vendor_id: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          gross_sales?: number
          id?: string
          net_payable?: number
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_reference?: string | null
          payment_slip_url?: string | null
          period_end?: string
          period_start?: string
          refund_deductions?: number
          status?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_payouts_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payouts_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payouts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payouts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_sales_ledger: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string
          created_by: string | null
          gross_amount: number
          id: string
          net_amount: number
          notes: string | null
          order_id: string | null
          order_item_id: string | null
          payout_id: string | null
          reversal_return_id: string | null
          type: string
          vendor_id: string
        }
        Insert: {
          commission_amount: number
          commission_rate: number
          created_at?: string
          created_by?: string | null
          gross_amount: number
          id?: string
          net_amount: number
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          payout_id?: string | null
          reversal_return_id?: string | null
          type: string
          vendor_id: string
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          created_by?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          payout_id?: string | null
          reversal_return_id?: string | null
          type?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_sales_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_orders_enhanced"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_sales_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_sales_ledger_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_sales_ledger_payout_fk"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "vendor_payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_sales_ledger_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_sales_ledger_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          applied_at: string
          approved_at: string | null
          approved_by: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          business_name: string
          business_registration_no: string | null
          city: string | null
          commission_rate: number
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          default_shipping_fee: number
          description: string | null
          id: string
          is_sst_registered: boolean
          logo_url: string | null
          notes: string | null
          postcode: string | null
          rejection_reason: string | null
          state: string | null
          status: string
          tax_id: string | null
          updated_at: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          address?: string | null
          applied_at?: string
          approved_at?: string | null
          approved_by?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          business_name: string
          business_registration_no?: string | null
          city?: string | null
          commission_rate?: number
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          default_shipping_fee?: number
          description?: string | null
          id?: string
          is_sst_registered?: boolean
          logo_url?: string | null
          notes?: string | null
          postcode?: string | null
          rejection_reason?: string | null
          state?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          address?: string | null
          applied_at?: string
          approved_at?: string | null
          approved_by?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          business_name?: string
          business_registration_no?: string | null
          city?: string | null
          commission_rate?: number
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          default_shipping_fee?: number
          description?: string | null
          id?: string
          is_sst_registered?: boolean
          logo_url?: string | null
          notes?: string | null
          postcode?: string | null
          rejection_reason?: string | null
          state?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_usage: {
        Row: {
          customer_id: string
          discount_applied: number
          id: string
          order_amount: number
          order_id: string | null
          used_at: string | null
          voucher_id: string
        }
        Insert: {
          customer_id: string
          discount_applied: number
          id?: string
          order_amount: number
          order_id?: string | null
          used_at?: string | null
          voucher_id: string
        }
        Update: {
          customer_id?: string
          discount_applied?: number
          id?: string
          order_amount?: number
          order_id?: string | null
          used_at?: string | null
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
          {
            foreignKeyName: "voucher_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_orders_enhanced"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_usage_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          admin_notes: string | null
          assigned_to_customer_id: string | null
          code: string
          created_at: string | null
          created_by: string | null
          current_usage_count: number | null
          customer_type_restriction: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          max_usage_per_user: number | null
          max_usage_total: number | null
          min_purchase_amount: number | null
          name: string
          specific_customer_ids: string[] | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          admin_notes?: string | null
          assigned_to_customer_id?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          current_usage_count?: number | null
          customer_type_restriction?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          max_usage_per_user?: number | null
          max_usage_total?: number | null
          min_purchase_amount?: number | null
          name: string
          specific_customer_ids?: string[] | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          admin_notes?: string | null
          assigned_to_customer_id?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_usage_count?: number | null
          customer_type_restriction?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          max_usage_per_user?: number | null
          max_usage_total?: number | null
          min_purchase_amount?: number | null
          name?: string
          specific_customer_ids?: string[] | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_assigned_to_customer_id_fkey"
            columns: ["assigned_to_customer_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_assigned_to_customer_id_fkey"
            columns: ["assigned_to_customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_assigned_to_customer_id_fkey"
            columns: ["assigned_to_customer_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_assigned_to_customer_id_fkey"
            columns: ["assigned_to_customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
          {
            foreignKeyName: "vouchers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type?: Database["public"]["Enums"]["wallet_transaction_type"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "merchant_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_list: {
        Row: {
          auth_email: string | null
          auth_phone: string | null
          created_at: string | null
          created_by_email: string | null
          email_confirmed_at: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          last_login_at: string | null
          last_sign_in_at: string | null
          phone_confirmed_at: string | null
          registered_at: string | null
          role: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          auth_email?: never
          auth_phone?: never
          created_at?: string | null
          created_by_email?: never
          email_confirmed_at?: never
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          last_login_at?: string | null
          last_sign_in_at?: string | null
          phone_confirmed_at?: never
          registered_at?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          auth_email?: never
          auth_phone?: never
          created_at?: string | null
          created_by_email?: never
          email_confirmed_at?: never
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          last_login_at?: string | null
          last_sign_in_at?: string | null
          phone_confirmed_at?: never
          registered_at?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      admin_orders_enhanced: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          courier_cost: number | null
          courier_created_at: string | null
          courier_label_url: string | null
          courier_provider: string | null
          courier_shipment_id: string | null
          courier_status: string | null
          courier_tracking_number: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_profile_id: string | null
          delivered_at: string | null
          delivery_address: Json | null
          delivery_fee: number | null
          delivery_instructions: string | null
          delivery_method: string | null
          delivery_proof_url: string | null
          discount: number | null
          dispatched_at: string | null
          estimated_delivery_date: string | null
          id: string | null
          internal_notes: string | null
          items: Json | null
          notes: string | null
          order_no: string | null
          packed_at: string | null
          payment_gateway_response: Json | null
          payment_method: string | null
          payment_state: string | null
          payment_verification_notes: string | null
          payment_verified_at: string | null
          payment_verified_by: string | null
          picked_at: string | null
          points_used: number | null
          processing_notes: string | null
          processing_started_at: string | null
          promotion_code: string | null
          promotion_discount: number | null
          ready_at: string | null
          shipping_fee: number | null
          status: string | null
          subtotal: number | null
          tax: number | null
          total: number | null
          updated_at: string | null
          user_id: string | null
          voucher_code: string | null
          voucher_discount: number | null
          voucher_id: string | null
          warehouse_assigned_at: string | null
          warehouse_assigned_to: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
          {
            foreignKeyName: "orders_payment_verified_by_fkey"
            columns: ["payment_verified_by"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payment_verified_by_fkey"
            columns: ["payment_verified_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_warehouse_assigned_to_fkey"
            columns: ["warehouse_assigned_to"]
            isOneToOne: false
            referencedRelation: "admin_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_warehouse_assigned_to_fkey"
            columns: ["warehouse_assigned_to"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      component_library_with_usage: {
        Row: {
          component_sku: string | null
          component_type: string | null
          component_value: string | null
          created_at: string | null
          created_by: string | null
          default_image_url: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          merchant_price: number | null
          name: string | null
          normal_price: number | null
          products_used_in: number | null
          stock_level: number | null
          total_allocated_stock: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      customer_list: {
        Row: {
          address: Json | null
          auth_email: string | null
          auth_phone: string | null
          created_at: string | null
          customer_type: string | null
          date_of_birth: string | null
          email: string | null
          email_confirmed_at: string | null
          full_name: string | null
          gender: string | null
          id: string | null
          is_active: boolean | null
          last_sign_in_at: string | null
          phone: string | null
          phone_confirmed_at: string | null
          preferences: Json | null
          pricing_type: string | null
          registered_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: Json | null
          auth_email?: string | null
          auth_phone?: string | null
          created_at?: never
          customer_type?: string | null
          date_of_birth?: string | null
          email?: string | null
          email_confirmed_at?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string | null
          is_active?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_confirmed_at?: string | null
          preferences?: Json | null
          pricing_type?: never
          registered_at?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: Json | null
          auth_email?: string | null
          auth_phone?: string | null
          created_at?: never
          customer_type?: string | null
          date_of_birth?: string | null
          email?: string | null
          email_confirmed_at?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string | null
          is_active?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_confirmed_at?: string | null
          preferences?: Json | null
          pricing_type?: never
          registered_at?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tier_status: {
        Row: {
          amount_needed_for_next_tier: number | null
          current_discount: number | null
          current_month_spending: number | null
          current_points_multiplier: number | null
          current_tier_level: number | null
          current_tier_name: string | null
          customer_type: string | null
          id: string | null
          last_spending_reset_date: string | null
          lifetime_spending: number | null
          next_tier_level: number | null
          next_tier_monthly_requirement: number | null
          next_tier_name: string | null
          tier_achieved_at: string | null
          total_orders_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_returns: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string | null
          item_count: number | null
          order_id: string | null
          order_no: string | null
          reason: string | null
          reason_details: string | null
          refund_amount: number | null
          refund_method: string | null
          return_no: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_orders_enhanced"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_partners_public: {
        Row: {
          address: string | null
          admin_approved: boolean | null
          business_name: string | null
          business_type: string | null
          city: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          display_priority: number | null
          facebook_url: string | null
          id: string | null
          instagram_url: string | null
          is_featured: boolean | null
          is_publicly_listed: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          merchant_id: string | null
          operating_hours: Json | null
          panel_slot_number: number | null
          postcode: string | null
          services_offered: string[] | null
          shop_photos: string[] | null
          state: string | null
          subscription_end_date: string | null
          subscription_plan: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          total_clicks: number | null
          total_inquiries: number | null
          total_views: number | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          admin_approved?: boolean | null
          business_name?: string | null
          business_type?: string | null
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          display_priority?: number | null
          facebook_url?: string | null
          id?: string | null
          instagram_url?: string | null
          is_featured?: boolean | null
          is_publicly_listed?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          merchant_id?: string | null
          operating_hours?: Json | null
          panel_slot_number?: number | null
          postcode?: string | null
          services_offered?: string[] | null
          shop_photos?: string[] | null
          state?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          total_clicks?: number | null
          total_inquiries?: number | null
          total_views?: number | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          admin_approved?: boolean | null
          business_name?: string | null
          business_type?: string | null
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          display_priority?: number | null
          facebook_url?: string | null
          id?: string | null
          instagram_url?: string | null
          is_featured?: boolean | null
          is_publicly_listed?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          merchant_id?: string | null
          operating_hours?: Json | null
          panel_slot_number?: number | null
          postcode?: string | null
          services_offered?: string[] | null
          shop_photos?: string[] | null
          state?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          total_clicks?: number | null
          total_inquiries?: number | null
          total_views?: number | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "premium_partnerships_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "customer_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_partnerships_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_partnerships_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "customer_tier_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_partnerships_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["customer_profile_id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          customer_profile_id: string | null
          email: string | null
          email_confirmed_at: string | null
          full_name: string | null
          id: string | null
          last_sign_in_at: string | null
          phone: string | null
          phone_confirmed_at: string | null
          raw_user_meta_data: Json | null
          role: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      vendors_public: {
        Row: {
          business_name: string | null
          id: string | null
          logo_url: string | null
        }
        Insert: {
          business_name?: string | null
          id?: string | null
          logo_url?: string | null
        }
        Update: {
          business_name?: string | null
          id?: string | null
          logo_url?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _chatbot_find_user_id: { Args: { p_phone: string }; Returns: string }
      add_item_to_cart: {
        Args: {
          p_component_id: string
          p_component_name: string
          p_component_sku: string
          p_guest_session?: string
          p_is_foc?: boolean
          p_is_foc_trigger?: boolean
          p_product_context: string
          p_quantity: number
          p_unit_price: number
          p_user_id?: string
        }
        Returns: Json
      }
      admin_delete_account: { Args: { p_id: string }; Returns: Json }
      admin_delete_customer: { Args: { p_customer_id: string }; Returns: Json }
      admin_delete_customer_impl: {
        Args: { p_customer_id: string }
        Returns: Json
      }
      admin_delete_order_simple: { Args: { p_order_id: string }; Returns: Json }
      admin_delete_order_simple_impl: {
        Args: { p_order_id: string }
        Returns: Json
      }
      admin_delete_record: {
        Args: { record_id: string; table_name: string }
        Returns: Json
      }
      admin_delete_record_impl: {
        Args: { record_id: string; table_name: string }
        Returns: Json
      }
      admin_generate_vendor_payout: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_vendor_id: string
        }
        Returns: string
      }
      admin_generate_vendor_payout_impl: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_vendor_id: string
        }
        Returns: string
      }
      admin_list_vendor_payouts: {
        Args: { p_limit?: number }
        Returns: {
          commission_amount: number
          created_at: string
          gross_sales: number
          id: string
          net_payable: number
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_reference: string | null
          payment_slip_url: string | null
          period_end: string
          period_start: string
          refund_deductions: number
          status: string
          vendor_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "vendor_payouts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_login: {
        Args: { p_password: string; p_username: string }
        Returns: Json
      }
      admin_mark_vendor_payout_paid: {
        Args: {
          p_notes: string
          p_paid_by: string
          p_payout_id: string
          p_reference: string
          p_slip_url: string
        }
        Returns: {
          commission_amount: number
          created_at: string
          gross_sales: number
          id: string
          net_payable: number
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_reference: string | null
          payment_slip_url: string | null
          period_end: string
          period_start: string
          refund_deductions: number
          status: string
          vendor_id: string
        }
        SetofOptions: {
          from: "*"
          to: "vendor_payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_mark_vendor_payout_paid_impl: {
        Args: {
          p_notes?: string
          p_paid_by?: string
          p_payout_id: string
          p_reference: string
          p_slip_url?: string
        }
        Returns: {
          commission_amount: number
          created_at: string
          gross_sales: number
          id: string
          net_payable: number
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_reference: string | null
          payment_slip_url: string | null
          period_end: string
          period_start: string
          refund_deductions: number
          status: string
          vendor_id: string
        }
        SetofOptions: {
          from: "*"
          to: "vendor_payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_reactivate_customer: {
        Args: { p_customer_id: string }
        Returns: Json
      }
      admin_reactivate_customer_impl: {
        Args: { p_customer_id: string }
        Returns: Json
      }
      admin_register: {
        Args: {
          p_full_name: string
          p_password: string
          p_role?: string
          p_username: string
        }
        Returns: Json
      }
      admin_suspend_customer: { Args: { p_customer_id: string }; Returns: Json }
      admin_suspend_customer_impl: {
        Args: { p_customer_id: string }
        Returns: Json
      }
      admin_vendor_pending_balances: {
        Args: never
        Returns: {
          pending_net: number
          vendor_id: string
        }[]
      }
      admin_verify_payment: {
        Args: {
          p_approved: boolean
          p_estimated_delivery_date?: string
          p_order_id: string
          p_processing_notes?: string
          p_verification_notes?: string
        }
        Returns: Json
      }
      ai_search_knowledge_base: {
        Args: {
          category_filter?: string
          limit_count?: number
          search_term: string
        }
        Returns: {
          category: string
          confidence_score: number
          content: string
          created_at: string
          id: string
          relevance_score: number
          source: string
          tags: string[]
          title: string
        }[]
      }
      ai_search_products: {
        Args: {
          customer_type?: string
          limit_count?: number
          search_term: string
        }
        Returns: {
          brand: string
          category_name: string
          description: string
          id: string
          model: string
          name: string
          product_url: string
          relevance_score: number
          year_from: number
          year_to: number
        }[]
      }
      ai_search_products_with_components: {
        Args: { limit_count?: number; search_term: string }
        Returns: Json
      }
      apply_voucher_to_order: {
        Args: {
          p_customer_id: string
          p_discount_amount: number
          p_order_amount: number
          p_order_id: string
          p_voucher_code: string
        }
        Returns: boolean
      }
      assign_to_warehouse: {
        Args: {
          p_notes?: string
          p_order_id: string
          p_warehouse_admin_id: string
        }
        Returns: Json
      }
      calculate_return_refund: {
        Args: { p_return_id: string }
        Returns: number
      }
      cancel_order_with_inventory_restoration: {
        Args: {
          p_admin_id?: string
          p_cancellation_reason?: string
          p_order_id: string
        }
        Returns: Json
      }
      cancel_point_redemption: {
        Args: {
          p_cancelled_by: string
          p_reason: string
          p_redemption_id: string
        }
        Returns: Json
      }
      catalog_search_products: {
        Args: {
          p_brand?: string
          p_category?: string
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_sort?: string
        }
        Returns: {
          brand: string
          category_id: string
          category_name: string
          component_count: number
          featured: boolean
          full_count: number
          id: string
          image_type: string
          image_url: string
          is_full_match: boolean
          is_new_arrival: boolean
          match_score: number
          model: string
          name: string
          slug: string
          total_count: number
          vendor_name: string
          year_from: number
          year_to: number
        }[]
      }
      chatbot_add_to_cart: {
        Args: { p_component_sku: string; p_phone: string; p_quantity?: number }
        Returns: {
          cart_item_count: number
          message: string
          success: boolean
        }[]
      }
      chatbot_clear_cart: {
        Args: { p_phone: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      chatbot_get_cart: {
        Args: { p_phone: string }
        Returns: {
          cart_total: number
          component_name: string
          component_sku: string
          line_total: number
          quantity: number
          unit_price: number
        }[]
      }
      chatbot_get_cart_summary: {
        Args: { p_phone: string }
        Returns: {
          address_line: string
          customer_email: string
          customer_name: string
          customer_phone: string
          has_default_address: boolean
          item_count: number
          subtotal: number
          total_qty: number
        }[]
      }
      chatbot_get_customer_orders: {
        Args: { p_phone: string }
        Returns: {
          courier_provider: string
          created_at: string
          delivery_method: string
          item_count: number
          order_id: string
          order_no: string
          payment_state: string
          status: string
          total: number
          tracking_number: string
        }[]
      }
      chatbot_get_latest_order_status: {
        Args: { p_phone: string }
        Returns: {
          courier_provider: string
          created_at: string
          delivery_method: string
          order_no: string
          payment_state: string
          status: string
          total: number
          tracking_number: string
        }[]
      }
      chatbot_get_order_details: {
        Args: { p_order_no: string }
        Returns: {
          courier_provider: string
          created_at: string
          delivery_fee: number
          delivery_method: string
          items: Json
          order_id: string
          order_no: string
          payment_state: string
          status: string
          subtotal: number
          total: number
          tracking_number: string
        }[]
      }
      chatbot_get_product_components: {
        Args: { p_product_id: string }
        Returns: {
          component_id: string
          component_name: string
          component_sku: string
          component_type: string
          image_url: string
          in_stock: boolean
          merchant_price: number
          normal_price: number
          remark: string
          stock_level: number
        }[]
      }
      chatbot_list_car_makes: {
        Args: never
        Returns: {
          id: string
          is_popular: boolean
          logo_url: string
          name: string
        }[]
      }
      chatbot_list_popular_categories: {
        Args: never
        Returns: {
          id: string
          name: string
          product_count: number
          slug: string
        }[]
      }
      chatbot_lookup_customer: {
        Args: { p_phone: string }
        Returns: {
          customer_id: string
          customer_name: string
          customer_type: string
          is_registered: boolean
          pricing_label: string
        }[]
      }
      chatbot_lookup_customer_impl: {
        Args: { p_phone: string }
        Returns: {
          customer_id: string
          customer_name: string
          customer_type: string
          is_registered: boolean
          pricing_label: string
        }[]
      }
      chatbot_place_order: {
        Args: {
          p_delivery_method?: string
          p_notes?: string
          p_payment_method?: string
          p_phone: string
        }
        Returns: {
          checkout_url: string
          delivery_method: string
          message: string
          order_no: string
          payment_method: string
          success: boolean
          total: number
        }[]
      }
      chatbot_remove_from_cart: {
        Args: { p_component_sku: string; p_phone: string; p_quantity?: number }
        Returns: {
          cart_item_count: number
          message: string
          success: boolean
        }[]
      }
      chatbot_search_car_makes: {
        Args: { p_query: string }
        Returns: {
          id: string
          logo_url: string
          name: string
          similarity_score: number
        }[]
      }
      chatbot_search_car_models: {
        Args: { p_make_name: string; p_model_query?: string }
        Returns: {
          body_type: string
          id: string
          name: string
          similarity_score: number
          year_end: number
          year_start: number
        }[]
      }
      chatbot_search_categories: {
        Args: { p_query: string }
        Returns: {
          description: string
          id: string
          name: string
          similarity_score: number
          slug: string
        }[]
      }
      chatbot_search_products: {
        Args: {
          p_car_brand?: string
          p_car_model?: string
          p_category_name?: string
          p_limit?: number
          p_max_price?: number
          p_query?: string
        }
        Returns: {
          brand: string
          category_name: string
          components: Json
          image_url: string
          max_merchant_price: number
          max_normal_price: number
          min_merchant_price: number
          min_normal_price: number
          model: string
          product_description: string
          product_id: string
          product_name: string
          product_slug: string
          relevance_score: number
          stock_available: boolean
          year_from: number
          year_to: number
        }[]
      }
      chatbot_smart_search: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          category_name: string
          components: Json
          image_url: string
          match_score: number
          max_merchant_price: number
          max_normal_price: number
          min_merchant_price: number
          min_normal_price: number
          product_description: string
          product_id: string
          product_name: string
          product_slug: string
          stock_available: boolean
          year_from: number
          year_to: number
        }[]
      }
      check_inventory_availability: {
        Args: { items_data: Json[] }
        Returns: Json
      }
      check_phone_exists: { Args: { p_phone: string }; Returns: boolean }
      check_return_eligibility: {
        Args: { p_order_id: string }
        Returns: {
          days_remaining: number
          delivery_date: string
          eligible: boolean
          order_status: string
          reason: string
        }[]
      }
      clear_user_cart: {
        Args: { p_guest_session?: string; p_user_id?: string }
        Returns: Json
      }
      confirm_order_history_access_payment: {
        Args: {
          p_access_id: string
          p_payment_reference?: string
          p_payment_success: boolean
        }
        Returns: Json
      }
      confirm_payment_for_order_group: {
        Args: { p_gateway_response?: Json; p_order_id: string; p_state: string }
        Returns: Json
      }
      create_admin_profile: {
        Args: {
          p_department?: string
          p_email: string
          p_full_name: string
          p_phone?: string
          p_role?: string
          p_username: string
        }
        Returns: string
      }
      create_order_with_items: {
        Args: { items_data: Json; order_data: Json }
        Returns: Json
      }
      create_order_with_items_impl: {
        Args: { items_data: Json; order_data: Json }
        Returns: Json
      }
      current_customer_id: { Args: never; Returns: string }
      current_vendor_id: { Args: never; Returns: string }
      current_vendor_owns_order: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      deduct_inventory_for_order: {
        Args: { items_data: Json[] }
        Returns: Json
      }
      delete_component: { Args: { component_id: string }; Returns: Json }
      delete_order: { Args: { p_order_id: string }; Returns: Json }
      delete_order_simple: { Args: { p_order_id: string }; Returns: Json }
      delete_product: { Args: { product_id: string }; Returns: Json }
      force_delete_component: { Args: { component_id: string }; Returns: Json }
      generate_rma_number: { Args: never; Returns: string }
      generate_unique_sku: {
        Args: { base_name: string; component_type?: string }
        Returns: string
      }
      generate_unique_slug: {
        Args: { base_name: string; table_name?: string }
        Returns: string
      }
      get_active_components: {
        Args: never
        Returns: {
          approval_status: string
          component_sku: string
          component_type: string
          component_value: string | null
          created_at: string | null
          created_by: string | null
          default_image_url: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_restocked: string | null
          max_stock_level: number | null
          merchant_price: number | null
          min_stock_level: number | null
          name: string
          normal_price: number | null
          reorder_point: number | null
          stock_level: number | null
          supplier_id: string | null
          updated_at: string | null
          vendor_id: string | null
          video_url: string | null
          warehouse_location: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "component_library"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_active_partnerships: {
        Args: { p_city?: string; p_service_type?: string; p_state?: string }
        Returns: {
          address: string
          business_name: string
          business_type: string
          city: string
          contact_email: string
          contact_phone: string
          cover_image_url: string
          description: string
          display_priority: number
          facebook_url: string
          id: string
          instagram_url: string
          is_featured: boolean
          latitude: number
          logo_url: string
          longitude: number
          operating_hours: Json
          postcode: string
          services_offered: string[]
          shop_photos: string[]
          state: string
          subscription_plan: string
          total_views: number
          website_url: string
        }[]
      }
      get_admin_context: { Args: never; Returns: Json }
      get_admin_orders: {
        Args: never
        Returns: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address: Json
          delivery_instructions: string
          delivery_method: string
          estimated_delivery_date: string
          id: string
          internal_notes: string
          item_count: number
          order_items: Json
          order_no: string
          payment_gateway_response: Json
          payment_method: string
          payment_state: string
          payment_verification_notes: string
          payment_verified_at: string
          payment_verified_by: string
          processing_notes: string
          status: string
          total: number
          total_quantity: number
          updated_at: string
          verified_by_admin: string
          warehouse_admin_name: string
          warehouse_assigned_at: string
          warehouse_assigned_to: string
        }[]
      }
      get_admin_users: {
        Args: never
        Returns: {
          auth_email: string | null
          auth_phone: string | null
          created_at: string | null
          created_by_email: string | null
          email_confirmed_at: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          last_login_at: string | null
          last_sign_in_at: string | null
          phone_confirmed_at: string | null
          registered_at: string | null
          role: string | null
          updated_at: string | null
          username: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "admin_list"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_all_customer_profiles: {
        Args: never
        Returns: {
          address: Json
          car_make_id: string
          car_make_name: string
          car_model_id: string
          car_model_name: string
          customer_type: string
          date_of_birth: string
          demoted_at: string
          demoted_from: string
          demotion_reason: string
          email: string
          full_name: string
          gender: string
          id: string
          is_active: boolean
          is_panel_customer: boolean
          last_sign_in_at: string
          phone: string
          preferences: Json
          subscription_end_date: string
          subscription_start_date: string
          updated_at: string
          user_id: string
        }[]
      }
      get_all_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          is_confirmed: boolean
          last_sign_in_at: string
          phone: string
          role: string
          user_id: string
        }[]
      }
      get_available_vouchers_for_checkout: {
        Args: { p_customer_id: string; p_order_amount?: number }
        Returns: {
          can_use: boolean
          code: string
          description: string
          discount_type: string
          discount_value: number
          id: string
          max_discount_amount: number
          max_usage_per_user: number
          min_purchase_amount: number
          name: string
          times_used_by_customer: number
          valid_until: string
        }[]
      }
      get_available_vouchers_for_customer: {
        Args: { p_customer_id: string }
        Returns: {
          can_still_use: boolean
          code: string
          description: string
          discount_type: string
          discount_value: number
          id: string
          max_discount_amount: number
          max_usage_per_user: number
          min_purchase_amount: number
          name: string
          times_used: number
          valid_until: string
        }[]
      }
      get_component_for_cart: { Args: { component_sku: string }; Returns: Json }
      get_component_library_types: {
        Args: never
        Returns: {
          component_type: string
        }[]
      }
      get_component_price: {
        Args: {
          p_component_id: string
          p_customer_id: string
          p_quantity: number
        }
        Returns: number
      }
      get_components_with_pricing: {
        Args: { customer_user_id?: string }
        Returns: {
          brand: string
          category: string
          created_at: string
          customer_type: string
          description: string
          id: string
          image_url: string
          is_active: boolean
          merchant_price: number
          model: string
          name: string
          normal_price: number
          price: number
          stock_quantity: number
          updated_at: string
        }[]
      }
      get_components_with_usage: {
        Args: never
        Returns: {
          component_sku: string | null
          component_type: string | null
          component_value: string | null
          created_at: string | null
          created_by: string | null
          default_image_url: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          merchant_price: number | null
          name: string | null
          normal_price: number | null
          products_used_in: number | null
          stock_level: number | null
          total_allocated_stock: number | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "component_library_with_usage"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_customer_lifetime_points: {
        Args: { p_customer_id: string }
        Returns: number
      }
      get_customer_lifetime_points_impl: {
        Args: { p_customer_id: string }
        Returns: number
      }
      get_customer_orders: {
        Args: { customer_user_id: string }
        Returns: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address: Json
          delivery_fee: number
          delivery_method: string
          discount: number
          id: string
          notes: string
          order_items: Json
          order_no: string
          payment_method: string
          payment_state: string
          shipping_fee: number
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }[]
      }
      get_customer_points_balance: {
        Args: { p_customer_id: string }
        Returns: number
      }
      get_customer_points_balance_impl: {
        Args: { p_customer_id: string }
        Returns: number
      }
      get_customer_points_redeemed: {
        Args: { p_customer_id: string }
        Returns: number
      }
      get_customer_points_redeemed_impl: {
        Args: { p_customer_id: string }
        Returns: number
      }
      get_customer_price: {
        Args: { component_id: string; customer_user_id?: string }
        Returns: number
      }
      get_customer_profiles_by_ids: {
        Args: { customer_ids: string[] }
        Returns: {
          email: string
          full_name: string
          id: string
          phone: string
        }[]
      }
      get_document_processing_status: {
        Args: { doc_id: string }
        Returns: {
          current_step: string
          document_id: string
          document_title: string
          entries_generated: number
          error_message: string
          estimated_cost: number
          processing_status: Database["public"]["Enums"]["ai_processing_status"]
          progress: number
        }[]
      }
      get_expiring_subscriptions: {
        Args: { p_days_ahead?: number }
        Returns: {
          customer_id: string
          customer_name: string
          days_remaining: number
          email: string
          is_expired: boolean
          phone: string
          subscription_end_date: string
          subscription_type: string
        }[]
      }
      get_failed_payment_orders: {
        Args: never
        Returns: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id: string
          order_no: string
          payment_gateway_response: Json
          payment_method: string
          payment_state: string
          total: number
        }[]
      }
      get_my_orders: {
        Args: never
        Returns: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address: Json
          delivery_fee: number
          delivery_method: string
          discount: number
          id: string
          notes: string
          order_items: Json
          order_no: string
          payment_method: string
          payment_state: string
          shipping_fee: number
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }[]
      }
      get_my_profile: { Args: never; Returns: Json }
      get_new_arrivals: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          brand: string
          category_id: string
          category_name: string
          component_count: number
          featured: boolean
          id: string
          image_type: string
          image_url: string
          is_new_arrival: boolean
          model: string
          name: string
          new_arrival_at: string
          slug: string
          total_count: number
          vendor_name: string
          year_from: number
          year_to: number
        }[]
      }
      get_order_history_access_expiry: {
        Args: { p_customer_id: string }
        Returns: string
      }
      get_order_statistics: { Args: never; Returns: Json }
      get_orders_by_status: {
        Args: { p_status: string }
        Returns: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address: Json
          delivery_instructions: string
          delivery_method: string
          estimated_delivery_date: string
          id: string
          internal_notes: string
          item_count: number
          order_items: Json
          order_no: string
          payment_gateway_response: Json
          payment_method: string
          payment_state: string
          payment_verification_notes: string
          payment_verified_at: string
          payment_verified_by: string
          processing_notes: string
          status: string
          total: number
          total_quantity: number
          updated_at: string
          verified_by_admin: string
          warehouse_admin_name: string
          warehouse_assigned_at: string
          warehouse_assigned_to: string
        }[]
      }
      get_orders_summary: {
        Args: never
        Returns: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_method: string
          id: string
          item_count: number
          order_no: string
          payment_method: string
          payment_state: string
          status: string
          total: number
          updated_at: string
        }[]
      }
      get_product_brands: {
        Args: never
        Returns: {
          brand: string
        }[]
      }
      get_product_review_stats: {
        Args: { p_product_id: string }
        Returns: {
          average_rating: number
          rating_1_count: number
          rating_2_count: number
          rating_3_count: number
          rating_4_count: number
          rating_5_count: number
          total_reviews: number
        }[]
      }
      get_product_reviews: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_product_id: string
          p_sort_by?: string
        }
        Returns: {
          comment: string
          created_at: string
          customer_name: string
          helpful_count: number
          id: string
          images: Json
          product_id: string
          rating: number
          title: string
          verified_purchase: boolean
        }[]
      }
      get_user_cart_items: {
        Args: { p_guest_session?: string; p_user_id?: string }
        Returns: {
          component_name: string
          component_sku: string
          id: string
          is_foc: boolean
          is_foc_trigger: boolean
          product_context: string
          quantity: number
          total_price: number
          unit_price: number
        }[]
      }
      get_user_pricing_context: { Args: { p_user_id: string }; Returns: Json }
      get_warehouse_orders:
        | {
            Args: never
            Returns: {
              created_at: string
              customer_email: string
              customer_name: string
              customer_phone: string
              delivery_address: Json
              delivery_method: string
              estimated_delivery_date: string
              id: string
              internal_notes: string
              item_count: number
              order_items: Json
              order_no: string
              payment_method: string
              payment_state: string
              processing_notes: string
              status: string
              total: number
              total_quantity: number
              updated_at: string
              warehouse_admin_name: string
              warehouse_assigned_at: string
              warehouse_assigned_to: string
            }[]
          }
        | {
            Args: { warehouse_status?: string }
            Returns: {
              created_at: string
              customer_email: string
              customer_name: string
              customer_phone: string
              delivery_address: Json
              delivery_method: string
              id: string
              order_items: Json
              order_no: string
              payment_state: string
              processing_started_at: string
              status: string
              total: number
            }[]
          }
      has_active_partnership: {
        Args: { p_merchant_id: string }
        Returns: boolean
      }
      has_extended_history_access: {
        Args: { p_customer_id: string }
        Returns: boolean
      }
      has_extended_order_history_access: {
        Args: { p_customer_id: string }
        Returns: boolean
      }
      increment_partnership_clicks: {
        Args: { p_partnership_id: string }
        Returns: undefined
      }
      increment_partnership_inquiries: {
        Args: { p_partnership_id: string }
        Returns: undefined
      }
      increment_partnership_views: {
        Args: { p_partnership_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_master_admin: { Args: never; Returns: boolean }
      lookup_account_by_phone: { Args: { p_phone: string }; Returns: Json }
      manage_cart:
        | {
            Args: {
              action: string
              component_id?: string
              customer_phone: string
              quantity?: number
            }
            Returns: Json
          }
        | {
            Args: {
              action: string
              component_id?: string
              quantity?: number
              user_id: string
            }
            Returns: Json
          }
      mark_review_helpful: {
        Args: { p_review_id: string; p_user_identifier: string }
        Returns: boolean
      }
      process_payment_response:
        | {
            Args: {
              p_gateway_response?: Json
              p_order_id: string
              p_payment_success: boolean
            }
            Returns: Json
          }
        | {
            Args: {
              p_order_id: string
              p_payment_details?: Json
              p_status: string
            }
            Returns: Json
          }
      purchase_order_history_access: {
        Args: {
          p_customer_id: string
          p_payment_reference?: string
          p_pricing_plan_id: string
        }
        Returns: Json
      }
      record_vendor_sale_for_order: {
        Args: { p_order_id: string }
        Returns: number
      }
      redeem_reward_item: {
        Args: {
          p_customer_id: string
          p_reward_item_id: string
          p_shipping_address: Json
        }
        Returns: Json
      }
      redeem_reward_item_impl: {
        Args: {
          p_customer_id: string
          p_reward_item_id: string
          p_shipping_address?: Json
        }
        Returns: Json
      }
      remove_item_from_cart: {
        Args: {
          p_component_id: string
          p_guest_session?: string
          p_is_foc?: boolean
          p_product_context?: string
          p_user_id?: string
        }
        Returns: Json
      }
      reset_monthly_spending: { Args: never; Returns: undefined }
      restock_return_items: {
        Args: { p_return_id: string }
        Returns: undefined
      }
      restore_inventory_for_order: {
        Args: { p_order_id: string }
        Returns: Json
      }
      reverse_vendor_sales_for_order: {
        Args: { p_order_id: string; p_reason?: string }
        Returns: number
      }
      reverse_vendor_sales_for_return: {
        Args: { p_return_id: string }
        Returns: number
      }
      search_components: {
        Args: { search_term: string }
        Returns: {
          component_sku: string
          component_type: string
          default_image_url: string
          description: string
          id: string
          merchant_price: number
          name: string
          normal_price: number
          relevance_score: number
          stock_level: number
        }[]
      }
      search_knowledge_base: {
        Args: { match_limit?: number; search_query: string }
        Returns: {
          category: string
          content: string
          created_at: string
          id: string
          relevance_rank: number
          tags: string[]
          title: string
          updated_at: string
        }[]
      }
      search_knowledge_base_enhanced: {
        Args: {
          approved_only?: boolean
          include_ai_generated?: boolean
          match_limit?: number
          search_query: string
        }
        Returns: {
          ai_generated: boolean
          category: string
          confidence_score: number
          content: string
          created_at: string
          document_title: string
          id: string
          is_approved: boolean
          page_number: number
          relevance_rank: number
          source: Database["public"]["Enums"]["kb_entry_source"]
          source_document_id: string
          tags: string[]
          title: string
          updated_at: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      test_component_operations: {
        Args: { test_component_id: string }
        Returns: Json
      }
      update_customer_type: {
        Args: {
          admin_id: string
          customer_profile_id: string
          new_customer_type: string
        }
        Returns: Json
      }
      update_order_status:
        | {
            Args: {
              admin_notes?: string
              new_payment_state?: string
              new_status: string
              order_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_admin_id: string
              p_new_status: Database["public"]["Enums"]["order_status_enum"]
              p_notes?: string
              p_order_id: string
            }
            Returns: Json
          }
      validate_merchant_code: { Args: { p_code: string }; Returns: Json }
      validate_referral_code: {
        Args: { p_code: string }
        Returns: {
          salesman_id: string
          salesman_name: string
          valid: boolean
        }[]
      }
      validate_voucher: {
        Args: {
          p_customer_id: string
          p_order_amount: number
          p_voucher_code: string
        }
        Returns: {
          discount_amount: number
          message: string
          valid: boolean
          voucher_id: string
        }[]
      }
      verify_payment: {
        Args: {
          p_admin_id: string
          p_approved: boolean
          p_estimated_delivery_date?: string
          p_order_id: string
          p_processing_notes?: string
          p_verification_notes?: string
        }
        Returns: Json
      }
      verify_payment_direct: {
        Args: {
          p_approved: boolean
          p_estimated_delivery_date?: string
          p_order_id: string
          p_processing_notes?: string
          p_verification_notes?: string
        }
        Returns: Json
      }
      verify_payment_simple: {
        Args: {
          p_approved: boolean
          p_estimated_delivery_date?: string
          p_order_id: string
          p_processing_notes?: string
          p_verification_notes?: string
        }
        Returns: Json
      }
    }
    Enums: {
      ai_processing_status: "pending" | "processing" | "completed" | "failed"
      debt_ledger_type: "INVOICE" | "PAYMENT" | "CREDIT_NOTE" | "ADJUSTMENT"
      delivery_status: "ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "FAILED"
      kb_entry_source: "manual" | "pdf_ai_generated" | "imported"
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
        | "PROCESSING"
      order_status_enum:
        | "PENDING_PAYMENT"
        | "PAYMENT_PROCESSING"
        | "PAYMENT_FAILED"
        | "PENDING_PAYMENT_VERIFICATION"
        | "PAYMENT_VERIFIED"
        | "PAYMENT_REJECTED"
        | "PROCESSING"
        | "WAREHOUSE_ASSIGNED"
        | "PICKING"
        | "PACKING"
        | "READY_FOR_DELIVERY"
        | "OUT_FOR_DELIVERY"
        | "DELIVERED"
        | "CANCELLED"
        | "REFUNDED"
        | "COMPLETED"
      payment_state:
        | "UNPAID"
        | "SUBMITTED"
        | "APPROVED"
        | "REJECTED"
        | "ON_CREDIT"
      promotion_type:
        | "PERCENTAGE_DISCOUNT"
        | "FIXED_AMOUNT"
        | "BUY_X_GET_Y"
        | "FREE_SHIPPING"
        | "BUNDLE"
      refund_method: "ORIGINAL_PAYMENT" | "EXCHANGE"
      return_reason: "DEFECTIVE" | "WRONG_ITEM"
      return_status:
        | "PENDING"
        | "APPROVED"
        | "REJECTED"
        | "ITEM_SHIPPED"
        | "ITEM_RECEIVED"
        | "INSPECTING"
        | "REFUND_PROCESSING"
        | "EXCHANGE_PROCESSING"
        | "COMPLETED"
        | "CANCELLED"
      stock_movement_type:
        | "RECEIPT"
        | "SALE"
        | "ADJUSTMENT"
        | "RESERVATION"
        | "RELEASE"
      user_role: "customer" | "merchant" | "staff" | "admin"
      wallet_transaction_type:
        | "EARN_PURCHASE"
        | "EARN_BONUS"
        | "EARN_REFERRAL"
        | "SPEND_PURCHASE"
        | "SPEND_DEDUCTION"
        | "CREDIT_DEPOSIT"
        | "CREDIT_PAYMENT"
        | "ADJUSTMENT"
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
      ai_processing_status: ["pending", "processing", "completed", "failed"],
      debt_ledger_type: ["INVOICE", "PAYMENT", "CREDIT_NOTE", "ADJUSTMENT"],
      delivery_status: ["ASSIGNED", "IN_TRANSIT", "DELIVERED", "FAILED"],
      kb_entry_source: ["manual", "pdf_ai_generated", "imported"],
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
        "PROCESSING",
      ],
      order_status_enum: [
        "PENDING_PAYMENT",
        "PAYMENT_PROCESSING",
        "PAYMENT_FAILED",
        "PENDING_PAYMENT_VERIFICATION",
        "PAYMENT_VERIFIED",
        "PAYMENT_REJECTED",
        "PROCESSING",
        "WAREHOUSE_ASSIGNED",
        "PICKING",
        "PACKING",
        "READY_FOR_DELIVERY",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
        "REFUNDED",
        "COMPLETED",
      ],
      payment_state: [
        "UNPAID",
        "SUBMITTED",
        "APPROVED",
        "REJECTED",
        "ON_CREDIT",
      ],
      promotion_type: [
        "PERCENTAGE_DISCOUNT",
        "FIXED_AMOUNT",
        "BUY_X_GET_Y",
        "FREE_SHIPPING",
        "BUNDLE",
      ],
      refund_method: ["ORIGINAL_PAYMENT", "EXCHANGE"],
      return_reason: ["DEFECTIVE", "WRONG_ITEM"],
      return_status: [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "ITEM_SHIPPED",
        "ITEM_RECEIVED",
        "INSPECTING",
        "REFUND_PROCESSING",
        "EXCHANGE_PROCESSING",
        "COMPLETED",
        "CANCELLED",
      ],
      stock_movement_type: [
        "RECEIPT",
        "SALE",
        "ADJUSTMENT",
        "RESERVATION",
        "RELEASE",
      ],
      user_role: ["customer", "merchant", "staff", "admin"],
      wallet_transaction_type: [
        "EARN_PURCHASE",
        "EARN_BONUS",
        "EARN_REFERRAL",
        "SPEND_PURCHASE",
        "SPEND_DEDUCTION",
        "CREDIT_DEPOSIT",
        "CREDIT_PAYMENT",
        "ADJUSTMENT",
      ],
    },
  },
} as const
