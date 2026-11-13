// Escrito a mano desde supabase/migrations. Regenerar con `npm run db:types` cuando haya base.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          accent_color: string
          app_name: string
          dispatch_check_enabled: boolean
          id: number
          logo_path: string | null
          primary_color: string
          timezone: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          app_name?: string
          dispatch_check_enabled?: boolean
          id?: number
          logo_path?: string | null
          primary_color?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          app_name?: string
          dispatch_check_enabled?: boolean
          id?: number
          logo_path?: string | null
          primary_color?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          code: string | null
          created_at: string
          id: number
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: number
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      imports: {
        Row: {
          created_at: string
          created_by: string | null
          file_name: string | null
          file_path: string | null
          id: number
          kind: string
          summary: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: number
          kind: string
          summary?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: number
          kind?: string
          summary?: Json
        }
        Relationships: []
      }
      order_lines: {
        Row: {
          created_at: string
          id: number
          location: string | null
          order_id: number
          package_checked: number
          package_scanned: number
          package_total: number
          product_id: number
          unit_checked: number
          unit_scanned: number
          unit_total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          location?: string | null
          order_id: number
          package_checked?: number
          package_scanned?: number
          package_total?: number
          product_id: number
          unit_checked?: number
          unit_scanned?: number
          unit_total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          location?: string | null
          order_id?: number
          package_checked?: number
          package_scanned?: number
          package_total?: number
          product_id?: number
          unit_checked?: number
          unit_scanned?: number
          unit_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          assembled_at: string | null
          assembled_by: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          customer_id: number
          dispatched_at: string | null
          dispatched_by: string | null
          due_date: string | null
          id: number
          import_id: number | null
          notes: string | null
          order_number: string
          priority: string
          started_at: string | null
          started_by: string | null
          status: string
          total_package: number
          total_unit: number
          updated_at: string
        }
        Insert: {
          assembled_at?: string | null
          assembled_by?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: number
          dispatched_at?: string | null
          dispatched_by?: string | null
          due_date?: string | null
          id?: number
          import_id?: number | null
          notes?: string | null
          order_number?: string
          priority?: string
          started_at?: string | null
          started_by?: string | null
          status?: string
          total_package?: number
          total_unit?: number
          updated_at?: string
        }
        Update: {
          assembled_at?: string | null
          assembled_by?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: number
          dispatched_at?: string | null
          dispatched_by?: string | null
          due_date?: string | null
          id?: number
          import_id?: number | null
          notes?: string | null
          order_number?: string
          priority?: string
          started_at?: string | null
          started_by?: string | null
          status?: string
          total_package?: number
          total_unit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          }
        ]
      }
      product_barcodes: {
        Row: {
          code: string
          kind: string
          product_id: number
        }
        Insert: {
          code: string
          kind: string
          product_id: number
        }
        Update: {
          code?: string
          kind?: string
          product_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_barcodes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          created_at: string
          description: string
          id: number
          is_active: boolean
          location: string | null
          package_barcode: string | null
          sku: string
          unit_barcode: string | null
          units_per_package: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: number
          is_active?: boolean
          location?: string | null
          package_barcode?: string | null
          sku: string
          unit_barcode?: string | null
          units_per_package?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: number
          is_active?: boolean
          location?: string | null
          package_barcode?: string | null
          sku?: string
          unit_barcode?: string | null
          units_per_package?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          is_active?: boolean
          name?: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      scan_events: {
        Row: {
          client_event_id: string
          code: string | null
          created_at: string
          delta: number
          id: number
          kind: string
          order_line_id: number
          stage: string
          user_id: string | null
        }
        Insert: {
          client_event_id: string
          code?: string | null
          created_at?: string
          delta: number
          id?: number
          kind: string
          order_line_id: number
          stage: string
          user_id?: string | null
        }
        Update: {
          client_event_id?: string
          code?: string | null
          created_at?: string
          delta?: number
          id?: number
          kind?: string
          order_line_id?: number
          stage?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_events_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "order_lines"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      api_complete_dispatch: {
        Args: {
          p_order_id: number
        }
        Returns: Json
      }
      api_complete_picking: {
        Args: {
          p_order_id: number
        }
        Returns: Json
      }
      api_find_line_by_code: {
        Args: {
          p_order_id: number
          p_code: string
        }
        Returns: Json
      }
      api_import_orders: {
        Args: {
          p_rows: Json
          p_release?: boolean
          p_dry_run?: boolean
          p_import_id?: number | null
        }
        Returns: Json
      }
      api_import_products: {
        Args: {
          p_rows: Json
          p_dry_run?: boolean
        }
        Returns: Json
      }
      api_report_orders: {
        Args: {
          p_from: string
          p_to: string
        }
        Returns: Json
      }
      api_save_order: {
        Args: {
          p_order: Json
        }
        Returns: Json
      }
      api_scan: {
        Args: {
          p_order_line_id: number
          p_stage: string
          p_kind: string
          p_delta: number
          p_client_event_id: string
          p_code?: string | null
        }
        Returns: Json
      }
      api_set_order_status: {
        Args: {
          p_order_id: number
          p_status: string
          p_reason?: string | null
        }
        Returns: Json
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'] & Database['public']['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database['public']['Tables'] &
        Database['public']['Views'])
    ? (Database['public']['Tables'] &
        Database['public']['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never
