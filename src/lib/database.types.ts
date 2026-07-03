// AUTOGENERADO desde el esquema de PRODUCCIÓN (proyecto nyqkgorazkwcufkzxmhd).
// Fuente de verdad del esquema. NO editar a mano. Regenerar con el MCP
// generate_typescript_types o `supabase gen types typescript`.
// Ver docs/PROYECTO-C-fuente-de-verdad-esquema.md

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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_referrals: {
        Row: {
          created_at: string
          detected_via: string | null
          engine: string
          id: number
          landing_page: string | null
          path: string | null
          referrer: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          detected_via?: string | null
          engine: string
          id?: number
          landing_page?: string | null
          path?: string | null
          referrer?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          detected_via?: string | null
          engine?: string
          id?: number
          landing_page?: string | null
          path?: string | null
          referrer?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      alerta_logs: {
        Row: {
          alerta_id: string | null
          created_at: string | null
          delivered_at: string | null
          error: string | null
          event: string
          id: string
          payload: Json | null
          response_code: number | null
        }
        Insert: {
          alerta_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error?: string | null
          event: string
          id?: string
          payload?: Json | null
          response_code?: number | null
        }
        Update: {
          alerta_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error?: string | null
          event?: string
          id?: string
          payload?: Json | null
          response_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alerta_logs_alerta_id_fkey"
            columns: ["alerta_id"]
            isOneToOne: false
            referencedRelation: "alertas"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas: {
        Row: {
          api_key: string
          created_at: string | null
          events: string[] | null
          filters: Json | null
          frequency: string | null
          id: string
          last_triggered_at: string | null
          name: string
          status: string | null
          triggers_count: number | null
          updated_at: string | null
          user_id: string | null
          webhook_url: string
        }
        Insert: {
          api_key: string
          created_at?: string | null
          events?: string[] | null
          filters?: Json | null
          frequency?: string | null
          id?: string
          last_triggered_at?: string | null
          name: string
          status?: string | null
          triggers_count?: number | null
          updated_at?: string | null
          user_id?: string | null
          webhook_url: string
        }
        Update: {
          api_key?: string
          created_at?: string | null
          events?: string[] | null
          filters?: Json | null
          frequency?: string | null
          id?: string
          last_triggered_at?: string | null
          name?: string
          status?: string | null
          triggers_count?: number | null
          updated_at?: string | null
          user_id?: string | null
          webhook_url?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          allowed_ips: unknown[] | null
          created_at: string | null
          environment: string
          hash: string
          id: string
          last_used_at: string | null
          name: string
          prefix: string
          quota_alert_month: string | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          allowed_ips?: unknown[] | null
          created_at?: string | null
          environment: string
          hash: string
          id?: string
          last_used_at?: string | null
          name: string
          prefix: string
          quota_alert_month?: string | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          allowed_ips?: unknown[] | null
          created_at?: string | null
          environment?: string
          hash?: string
          id?: string
          last_used_at?: string | null
          name?: string
          prefix?: string
          quota_alert_month?: string | null
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      api_usage_daily: {
        Row: {
          api_key_id: string
          date: string
          request_count: number
        }
        Insert: {
          api_key_id: string
          date: string
          request_count?: number
        }
        Update: {
          api_key_id?: string
          date?: string
          request_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_daily_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_results: {
        Row: {
          auction_date: string
          auction_title: string
          average_price: number | null
          category_results: Json | null
          consignataria_slug: string
          created_at: string
          id: string
          location: string | null
          max_price: number | null
          min_price: number | null
          notes: string | null
          submitted_by: string
          total_heads_offered: number | null
          total_heads_sold: number | null
          updated_at: string
        }
        Insert: {
          auction_date: string
          auction_title: string
          average_price?: number | null
          category_results?: Json | null
          consignataria_slug: string
          created_at?: string
          id?: string
          location?: string | null
          max_price?: number | null
          min_price?: number | null
          notes?: string | null
          submitted_by: string
          total_heads_offered?: number | null
          total_heads_sold?: number | null
          updated_at?: string
        }
        Update: {
          auction_date?: string
          auction_title?: string
          average_price?: number | null
          category_results?: Json | null
          consignataria_slug?: string
          created_at?: string
          id?: string
          location?: string | null
          max_price?: number | null
          min_price?: number | null
          notes?: string | null
          submitted_by?: string
          total_heads_offered?: number | null
          total_heads_sold?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_results_consignataria_slug_fkey"
            columns: ["consignataria_slug"]
            isOneToOne: false
            referencedRelation: "consignatarias"
            referencedColumns: ["canonical_slug"]
          },
        ]
      }
      consignataria_auctions: {
        Row: {
          catalog_url: string | null
          consignataria_slug: string
          created_at: string | null
          created_by: string
          date: string
          description: string | null
          estimated_heads: number | null
          id: number
          location: string | null
          main_category: string | null
          province: string | null
          status: string | null
          time: string | null
          title: string
          type: string | null
          updated_at: string | null
          youtube_url: string | null
        }
        Insert: {
          catalog_url?: string | null
          consignataria_slug: string
          created_at?: string | null
          created_by: string
          date: string
          description?: string | null
          estimated_heads?: number | null
          id?: never
          location?: string | null
          main_category?: string | null
          province?: string | null
          status?: string | null
          time?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
          youtube_url?: string | null
        }
        Update: {
          catalog_url?: string | null
          consignataria_slug?: string
          created_at?: string | null
          created_by?: string
          date?: string
          description?: string | null
          estimated_heads?: number | null
          id?: never
          location?: string | null
          main_category?: string | null
          province?: string | null
          status?: string | null
          time?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      consignataria_claims: {
        Row: {
          admin_notes: string | null
          claimant_email: string
          claimant_name: string | null
          claimant_phone: string | null
          claimant_role: string | null
          consignataria_slug: string
          created_at: string
          cuit: string | null
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          claimant_email: string
          claimant_name?: string | null
          claimant_phone?: string | null
          claimant_role?: string | null
          consignataria_slug: string
          created_at?: string
          cuit?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          claimant_email?: string
          claimant_name?: string | null
          claimant_phone?: string | null
          claimant_role?: string | null
          consignataria_slug?: string
          created_at?: string
          cuit?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consignataria_claims_consignataria_slug_fkey"
            columns: ["consignataria_slug"]
            isOneToOne: false
            referencedRelation: "consignatarias"
            referencedColumns: ["canonical_slug"]
          },
        ]
      }
      consignataria_leads: {
        Row: {
          consignataria_slug: string
          created_at: string
          email: string | null
          id: number
          ip_hash: string | null
          message: string | null
          name: string
          phone: string | null
          remate_id: number | null
          source: string | null
          status: string | null
        }
        Insert: {
          consignataria_slug: string
          created_at?: string
          email?: string | null
          id?: never
          ip_hash?: string | null
          message?: string | null
          name: string
          phone?: string | null
          remate_id?: number | null
          source?: string | null
          status?: string | null
        }
        Update: {
          consignataria_slug?: string
          created_at?: string
          email?: string | null
          id?: never
          ip_hash?: string | null
          message?: string | null
          name?: string
          phone?: string | null
          remate_id?: number | null
          source?: string | null
          status?: string | null
        }
        Relationships: []
      }
      consignataria_reviews: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body: string
          consignataria_slug: string
          created_at: string
          id: string
          ip_hash: string | null
          rating: number
          rejection_reason: string | null
          status: string
          submitter_email: string
          submitter_name: string
          submitter_provincia: string | null
          submitter_role: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body: string
          consignataria_slug: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          rating: number
          rejection_reason?: string | null
          status?: string
          submitter_email: string
          submitter_name: string
          submitter_provincia?: string | null
          submitter_role?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          consignataria_slug?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          rating?: number
          rejection_reason?: string | null
          status?: string
          submitter_email?: string
          submitter_name?: string
          submitter_provincia?: string | null
          submitter_role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consignataria_reviews_consignataria_slug_fkey"
            columns: ["consignataria_slug"]
            isOneToOne: false
            referencedRelation: "consignatarias"
            referencedColumns: ["canonical_slug"]
          },
        ]
      }
      consignataria_slugs: {
        Row: {
          consignataria_id: string
          created_at: string
          id: string
          is_canonical: boolean
          slug: string
        }
        Insert: {
          consignataria_id: string
          created_at?: string
          id?: string
          is_canonical?: boolean
          slug: string
        }
        Update: {
          consignataria_id?: string
          created_at?: string
          id?: string
          is_canonical?: boolean
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "consignataria_slugs_consignataria_id_fkey"
            columns: ["consignataria_id"]
            isOneToOne: false
            referencedRelation: "consignatarias"
            referencedColumns: ["id"]
          },
        ]
      }
      consignataria_videos: {
        Row: {
          consignataria_id: string
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          is_featured: boolean | null
          published_at: string | null
          remate_id: string | null
          sort_order: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_type: string | null
          view_count: number | null
          youtube_video_id: string
        }
        Insert: {
          consignataria_id: string
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_featured?: boolean | null
          published_at?: string | null
          remate_id?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_type?: string | null
          view_count?: number | null
          youtube_video_id: string
        }
        Update: {
          consignataria_id?: string
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_featured?: boolean | null
          published_at?: string | null
          remate_id?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_type?: string | null
          view_count?: number | null
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consignataria_videos_consignataria_id_fkey"
            columns: ["consignataria_id"]
            isOneToOne: false
            referencedRelation: "consignatarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignataria_videos_remate_id_fkey"
            columns: ["remate_id"]
            isOneToOne: false
            referencedRelation: "remates"
            referencedColumns: ["id"]
          },
        ]
      }
      consignatarias: {
        Row: {
          anos_oficio: number | null
          bio_referente: string | null
          canonical_slug: string
          category: string | null
          claimed_at: string | null
          claimed_by_email: string | null
          created_at: string
          cuit: string | null
          description: string | null
          display_name: string
          email: string | null
          especialidad: string | null
          featured: boolean
          foto_referente_url: string | null
          id: string
          location: string | null
          logo_url: string | null
          matricula: string | null
          medios_pago: Json
          name: string | null
          onboarding_points: number | null
          phone: string | null
          points_redeemed_at: string | null
          province: string | null
          referente_cargo: string | null
          referente_nombre: string | null
          region_operativa: string | null
          updated_at: string
          verified: boolean
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          anos_oficio?: number | null
          bio_referente?: string | null
          canonical_slug: string
          category?: string | null
          claimed_at?: string | null
          claimed_by_email?: string | null
          created_at?: string
          cuit?: string | null
          description?: string | null
          display_name: string
          email?: string | null
          especialidad?: string | null
          featured?: boolean
          foto_referente_url?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          matricula?: string | null
          medios_pago?: Json
          name?: string | null
          onboarding_points?: number | null
          phone?: string | null
          points_redeemed_at?: string | null
          province?: string | null
          referente_cargo?: string | null
          referente_nombre?: string | null
          region_operativa?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          anos_oficio?: number | null
          bio_referente?: string | null
          canonical_slug?: string
          category?: string | null
          claimed_at?: string | null
          claimed_by_email?: string | null
          created_at?: string
          cuit?: string | null
          description?: string | null
          display_name?: string
          email?: string | null
          especialidad?: string | null
          featured?: boolean
          foto_referente_url?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          matricula?: string | null
          medios_pago?: Json
          name?: string | null
          onboarding_points?: number | null
          phone?: string | null
          points_redeemed_at?: string | null
          province?: string | null
          referente_cargo?: string | null
          referente_nombre?: string | null
          region_operativa?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      cron_runs: {
        Row: {
          finished_at: string | null
          id: number
          message: string | null
          metadata: Json
          started_at: string
          status: string
          workflow_name: string
        }
        Insert: {
          finished_at?: string | null
          id?: number
          message?: string | null
          metadata?: Json
          started_at?: string
          status?: string
          workflow_name: string
        }
        Update: {
          finished_at?: string | null
          id?: number
          message?: string | null
          metadata?: Json
          started_at?: string
          status?: string
          workflow_name?: string
        }
        Relationships: []
      }
      email_events: {
        Row: {
          bounce_type: string | null
          campaign: string | null
          created_at: string
          email_id: string | null
          id: string
          link: string | null
          occurred_at: string | null
          raw: Json | null
          recipient: string | null
          subject: string | null
          type: string
        }
        Insert: {
          bounce_type?: string | null
          campaign?: string | null
          created_at?: string
          email_id?: string | null
          id?: string
          link?: string | null
          occurred_at?: string | null
          raw?: Json | null
          recipient?: string | null
          subject?: string | null
          type: string
        }
        Update: {
          bounce_type?: string | null
          campaign?: string | null
          created_at?: string
          email_id?: string | null
          id?: string
          link?: string | null
          occurred_at?: string | null
          raw?: Json | null
          recipient?: string | null
          subject?: string | null
          type?: string
        }
        Relationships: []
      }
      email_tracking: {
        Row: {
          abierto_at: string | null
          aperturas: number | null
          cliente_nombre: string
          cliente_num: number
          email: string
          enviado_at: string | null
          id: number
          ip_apertura: string | null
          user_agent: string | null
        }
        Insert: {
          abierto_at?: string | null
          aperturas?: number | null
          cliente_nombre: string
          cliente_num: number
          email: string
          enviado_at?: string | null
          id?: number
          ip_apertura?: string | null
          user_agent?: string | null
        }
        Update: {
          abierto_at?: string | null
          aperturas?: number | null
          cliente_nombre?: string
          cliente_num?: number
          email?: string
          enviado_at?: string | null
          id?: number
          ip_apertura?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      featured_links: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: number
          sort_order: number
          title: string
          type: Database["public"]["Enums"]["featured_link_type"]
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: number
          sort_order?: number
          title: string
          type: Database["public"]["Enums"]["featured_link_type"]
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: number
          sort_order?: number
          title?: string
          type?: Database["public"]["Enums"]["featured_link_type"]
          url?: string
        }
        Relationships: []
      }
      form_abandonment: {
        Row: {
          captured_at: string | null
          converted_at: string | null
          email: string
          form_type: string | null
          id: string
          recovery_sent_at: string | null
          slug: string | null
        }
        Insert: {
          captured_at?: string | null
          converted_at?: string | null
          email: string
          form_type?: string | null
          id?: string
          recovery_sent_at?: string | null
          slug?: string | null
        }
        Update: {
          captured_at?: string | null
          converted_at?: string | null
          email?: string
          form_type?: string | null
          id?: string
          recovery_sent_at?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      fpt_approvals: {
        Row: {
          id: string
          note: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          id: string
          note?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          note?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      frigorifico_claims: {
        Row: {
          admin_notes: string | null
          claimant_email: string
          claimant_name: string | null
          claimant_phone: string | null
          claimant_role: string | null
          created_at: string
          frigorifico_cuit: string
          frigorifico_name: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          claimant_email: string
          claimant_name?: string | null
          claimant_phone?: string | null
          claimant_role?: string | null
          created_at?: string
          frigorifico_cuit: string
          frigorifico_name: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          claimant_email?: string
          claimant_name?: string | null
          claimant_phone?: string | null
          claimant_role?: string | null
          created_at?: string
          frigorifico_cuit?: string
          frigorifico_name?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      frigorifico_profiles: {
        Row: {
          claimed_at: string | null
          claimed_by_email: string | null
          created_at: string
          cuit: string
          description: string | null
          display_name: string
          email: string | null
          featured: boolean
          phone: string | null
          updated_at: string
          verified: boolean
          website: string | null
        }
        Insert: {
          claimed_at?: string | null
          claimed_by_email?: string | null
          created_at?: string
          cuit: string
          description?: string | null
          display_name: string
          email?: string | null
          featured?: boolean
          phone?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          claimed_at?: string | null
          claimed_by_email?: string | null
          created_at?: string
          cuit?: string
          description?: string | null
          display_name?: string
          email?: string | null
          featured?: boolean
          phone?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      frigorificos: {
        Row: {
          active: boolean
          created_at: string
          cuit: string
          id: string
          matricula: string | null
          name: string
          province: string
          stage: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cuit: string
          id?: string
          matricula?: string | null
          name: string
          province: string
          stage: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cuit?: string
          id?: string
          matricula?: string | null
          name?: string
          province?: string
          stage?: number
          updated_at?: string
        }
        Relationships: []
      }
      ganado_value_snapshots: {
        Row: {
          cabezas: number
          created_at: string | null
          id: string
          inmag_value: number | null
          kilos: number
          snapshot_date: string
          user_id: string
          value_ars: number
        }
        Insert: {
          cabezas: number
          created_at?: string | null
          id?: string
          inmag_value?: number | null
          kilos: number
          snapshot_date: string
          user_id: string
          value_ars: number
        }
        Update: {
          cabezas?: number
          created_at?: string | null
          id?: string
          inmag_value?: number | null
          kilos?: number
          snapshot_date?: string
          user_id?: string
          value_ars?: number
        }
        Relationships: []
      }
      live_remate_lot: {
        Row: {
          audio_t: number | null
          cabezas: number | null
          categoria: string | null
          created_at: string
          id: number
          precio: number | null
          session_id: string
        }
        Insert: {
          audio_t?: number | null
          cabezas?: number | null
          categoria?: string | null
          created_at?: string
          id?: number
          precio?: number | null
          session_id: string
        }
        Update: {
          audio_t?: number | null
          cabezas?: number | null
          categoria?: string | null
          created_at?: string
          id?: number
          precio?: number | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_remate_lot_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_remate_session"
            referencedColumns: ["id"]
          },
        ]
      }
      live_remate_session: {
        Row: {
          consignataria: string | null
          id: string
          last_seen: string
          location: string | null
          model: string | null
          started_at: string
          status: string
          youtube_url: string | null
        }
        Insert: {
          consignataria?: string | null
          id: string
          last_seen?: string
          location?: string | null
          model?: string | null
          started_at?: string
          status?: string
          youtube_url?: string | null
        }
        Update: {
          consignataria?: string | null
          id?: string
          last_seen?: string
          location?: string | null
          model?: string | null
          started_at?: string
          status?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      mag_consignataria_sales_lots: {
        Row: {
          category: string | null
          date: string
          head_count: number | null
          id: number
          kg_avg: number | null
          localidad: string | null
          mag_consignataria_id: number
          pesada: number | null
          price: number | null
          provincia: string | null
          remitente: string
          scraped_at: string
          tipo: string
          total_kgs: number | null
        }
        Insert: {
          category?: string | null
          date: string
          head_count?: number | null
          id?: number
          kg_avg?: number | null
          localidad?: string | null
          mag_consignataria_id: number
          pesada?: number | null
          price?: number | null
          provincia?: string | null
          remitente: string
          scraped_at?: string
          tipo: string
          total_kgs?: number | null
        }
        Update: {
          category?: string | null
          date?: string
          head_count?: number | null
          id?: number
          kg_avg?: number | null
          localidad?: string | null
          mag_consignataria_id?: number
          pesada?: number | null
          price?: number | null
          provincia?: string | null
          remitente?: string
          scraped_at?: string
          tipo?: string
          total_kgs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mag_consignataria_sales_lots_mag_consignataria_id_fkey"
            columns: ["mag_consignataria_id"]
            isOneToOne: false
            referencedRelation: "mag_consignatarias"
            referencedColumns: ["mag_id"]
          },
        ]
      }
      mag_consignatarias: {
        Row: {
          active: boolean
          consignataria_canonical_slug: string | null
          first_seen_at: string
          last_seen_at: string
          mag_id: number
          name: string
          slug: string | null
        }
        Insert: {
          active?: boolean
          consignataria_canonical_slug?: string | null
          first_seen_at?: string
          last_seen_at?: string
          mag_id: number
          name: string
          slug?: string | null
        }
        Update: {
          active?: boolean
          consignataria_canonical_slug?: string | null
          first_seen_at?: string
          last_seen_at?: string
          mag_id?: number
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      mag_inmag_history: {
        Row: {
          date: string
          head_count: number | null
          inmag_calculated: boolean
          inmag_value: number | null
          scraped_at: string
          source_url: string | null
          total_amount: number | null
          variation: number | null
        }
        Insert: {
          date: string
          head_count?: number | null
          inmag_calculated?: boolean
          inmag_value?: number | null
          scraped_at?: string
          source_url?: string | null
          total_amount?: number | null
          variation?: number | null
        }
        Update: {
          date?: string
          head_count?: number | null
          inmag_calculated?: boolean
          inmag_value?: number | null
          scraped_at?: string
          source_url?: string | null
          total_amount?: number | null
          variation?: number | null
        }
        Relationships: []
      }
      mag_prices_detailed: {
        Row: {
          category_group: string
          date: string
          head_count: number | null
          kg_avg: number | null
          price_avg: number | null
          price_max: number | null
          price_median: number | null
          price_min: number | null
          scraped_at: string
          source_url: string | null
          subcategory: string
          total_amount: number | null
          total_kgs: number | null
          weight_threshold: string | null
        }
        Insert: {
          category_group: string
          date: string
          head_count?: number | null
          kg_avg?: number | null
          price_avg?: number | null
          price_max?: number | null
          price_median?: number | null
          price_min?: number | null
          scraped_at?: string
          source_url?: string | null
          subcategory: string
          total_amount?: number | null
          total_kgs?: number | null
          weight_threshold?: string | null
        }
        Update: {
          category_group?: string
          date?: string
          head_count?: number | null
          kg_avg?: number | null
          price_avg?: number | null
          price_max?: number | null
          price_median?: number | null
          price_min?: number | null
          scraped_at?: string
          source_url?: string | null
          subcategory?: string
          total_amount?: number | null
          total_kgs?: number | null
          weight_threshold?: string | null
        }
        Relationships: []
      }
      mag_scrape_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          date: string
          enqueued_at: string
          id: number
          last_error: string | null
          mag_consignataria_id: number
          rows_inserted: number | null
          status: string
          tipo: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          date: string
          enqueued_at?: string
          id?: number
          last_error?: string | null
          mag_consignataria_id: number
          rows_inserted?: number | null
          status?: string
          tipo: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          date?: string
          enqueued_at?: string
          id?: number
          last_error?: string | null
          mag_consignataria_id?: number
          rows_inserted?: number | null
          status?: string
          tipo?: string
        }
        Relationships: []
      }
      market_category_prices: {
        Row: {
          category: string
          change_pct: number | null
          current_price: number
          id: string
          prev_price: number | null
          snapshot_id: string
        }
        Insert: {
          category: string
          change_pct?: number | null
          current_price: number
          id?: string
          prev_price?: number | null
          snapshot_id: string
        }
        Update: {
          category?: string
          change_pct?: number | null
          current_price?: number
          id?: string
          prev_price?: number | null
          snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_category_prices_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "market_price_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      market_price_series: {
        Row: {
          date: string
          id: string
          indicator: string
          unit: string
          value: number
        }
        Insert: {
          date: string
          id?: string
          indicator: string
          unit: string
          value: number
        }
        Update: {
          date?: string
          id?: string
          indicator?: string
          unit?: string
          value?: number
        }
        Relationships: []
      }
      market_price_snapshots: {
        Row: {
          corn_change_pct: number | null
          corn_prev: number | null
          corn_usd_tn: number | null
          created_at: string
          date: string
          id: string
          inmag_change_pct: number | null
          inmag_prev: number | null
          inmag_value: number | null
          raw_data: Json | null
          usd_blue: number | null
          usd_blue_prev: number | null
          usd_oficial: number | null
          usd_oficial_prev: number | null
        }
        Insert: {
          corn_change_pct?: number | null
          corn_prev?: number | null
          corn_usd_tn?: number | null
          created_at?: string
          date: string
          id?: string
          inmag_change_pct?: number | null
          inmag_prev?: number | null
          inmag_value?: number | null
          raw_data?: Json | null
          usd_blue?: number | null
          usd_blue_prev?: number | null
          usd_oficial?: number | null
          usd_oficial_prev?: number | null
        }
        Update: {
          corn_change_pct?: number | null
          corn_prev?: number | null
          corn_usd_tn?: number | null
          created_at?: string
          date?: string
          id?: string
          inmag_change_pct?: number | null
          inmag_prev?: number | null
          inmag_value?: number | null
          raw_data?: Json | null
          usd_blue?: number | null
          usd_blue_prev?: number | null
          usd_oficial?: number | null
          usd_oficial_prev?: number | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          capture_context: string | null
          created_at: string | null
          email: string
          id: string
          lease_hectareas: number | null
          lease_kg_ha: number | null
          source: string | null
          status: string | null
          subscribed_at: string | null
        }
        Insert: {
          capture_context?: string | null
          created_at?: string | null
          email: string
          id?: string
          lease_hectareas?: number | null
          lease_kg_ha?: number | null
          source?: string | null
          status?: string | null
          subscribed_at?: string | null
        }
        Update: {
          capture_context?: string | null
          created_at?: string | null
          email?: string
          id?: string
          lease_hectareas?: number | null
          lease_kg_ha?: number | null
          source?: string | null
          status?: string | null
          subscribed_at?: string | null
        }
        Relationships: []
      }
      ops_events: {
        Row: {
          api_key_id: string | null
          created_at: string
          event_type: string
          id: number
          latency_ms: number | null
          metadata: Json
          request_id: string | null
          route: string | null
          status: string
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          event_type: string
          id?: number
          latency_ms?: number | null
          metadata?: Json
          request_id?: string | null
          route?: string | null
          status: string
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          event_type?: string
          id?: number
          latency_ms?: number | null
          metadata?: Json
          request_id?: string | null
          route?: string | null
          status?: string
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      outreach_log: {
        Row: {
          auction_date: string | null
          auction_title: string | null
          consignataria_slug: string
          created_at: string | null
          email_sent_to: string
          id: string
          notes: string | null
          response_received_at: string | null
          response_type: string | null
          sent_at: string | null
          type: string
        }
        Insert: {
          auction_date?: string | null
          auction_title?: string | null
          consignataria_slug: string
          created_at?: string | null
          email_sent_to: string
          id?: string
          notes?: string | null
          response_received_at?: string | null
          response_type?: string | null
          sent_at?: string | null
          type: string
        }
        Update: {
          auction_date?: string | null
          auction_title?: string | null
          consignataria_slug?: string
          created_at?: string | null
          email_sent_to?: string
          id?: string
          notes?: string | null
          response_received_at?: string | null
          response_type?: string | null
          sent_at?: string | null
          type?: string
        }
        Relationships: []
      }
      pending_api_invites: {
        Row: {
          api_tier: string
          created_at: string
          email: string
          free_credits: boolean
          note: string | null
          redeemed_at: string | null
          redeemed_user_id: string | null
        }
        Insert: {
          api_tier: string
          created_at?: string
          email: string
          free_credits?: boolean
          note?: string | null
          redeemed_at?: string | null
          redeemed_user_id?: string | null
        }
        Update: {
          api_tier?: string
          created_at?: string
          email?: string
          free_credits?: boolean
          note?: string | null
          redeemed_at?: string | null
          redeemed_user_id?: string | null
        }
        Relationships: []
      }
      point_redemptions: {
        Row: {
          consignataria_slug: string
          id: string
          points_redeemed: number
          pro_expires_at: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          consignataria_slug: string
          id?: string
          points_redeemed?: number
          pro_expires_at: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          consignataria_slug?: string
          id?: string
          points_redeemed?: number
          pro_expires_at?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          action: string
          consignataria_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          points: number
        }
        Insert: {
          action: string
          consignataria_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          points: number
        }
        Update: {
          action?: string
          consignataria_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          points?: number
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_consignataria_id_fkey"
            columns: ["consignataria_id"]
            isOneToOne: false
            referencedRelation: "consignatarias"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_webhook_events: {
        Row: {
          event_id: string
          event_type: string
          metadata: Json | null
          processed_at: string
          source: string
        }
        Insert: {
          event_id: string
          event_type: string
          metadata?: Json | null
          processed_at?: string
          source: string
        }
        Update: {
          event_id?: string
          event_type?: string
          metadata?: Json | null
          processed_at?: string
          source?: string
        }
        Relationships: []
      }
      profile_views: {
        Row: {
          entity_slug: string
          entity_type: string
          id: number
          referrer: string | null
          user_agent: string | null
          viewed_at: string | null
        }
        Insert: {
          entity_slug: string
          entity_type: string
          id?: never
          referrer?: string | null
          user_agent?: string | null
          viewed_at?: string | null
        }
        Update: {
          entity_slug?: string
          entity_type?: string
          id?: never
          referrer?: string | null
          user_agent?: string | null
          viewed_at?: string | null
        }
        Relationships: []
      }
      rate_limit_hits: {
        Row: {
          bucket: string
          count: number
          window_start: string
        }
        Insert: {
          bucket: string
          count?: number
          window_start: string
        }
        Update: {
          bucket?: string
          count?: number
          window_start?: string
        }
        Relationships: []
      }
      remate_favorites: {
        Row: {
          consignataria_slug: string
          created_at: string
          id: number
          remate_id: number
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          consignataria_slug: string
          created_at?: string
          id?: number
          remate_id: number
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          consignataria_slug?: string
          created_at?: string
          id?: number
          remate_id?: number
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      remates: {
        Row: {
          auction_type: Database["public"]["Enums"]["auction_type"] | null
          catalog_url: string | null
          consignataria_id: string
          created_at: string
          date: string
          description: string | null
          estimated_heads: number | null
          featured: boolean
          id: string
          location: string
          main_category: Database["public"]["Enums"]["cattle_category"] | null
          province: string
          scraper_id: number | null
          source: Database["public"]["Enums"]["auction_source"] | null
          source_url: string | null
          status: Database["public"]["Enums"]["remate_status"]
          time: string | null
          title: string
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          auction_type?: Database["public"]["Enums"]["auction_type"] | null
          catalog_url?: string | null
          consignataria_id: string
          created_at?: string
          date: string
          description?: string | null
          estimated_heads?: number | null
          featured?: boolean
          id?: string
          location: string
          main_category?: Database["public"]["Enums"]["cattle_category"] | null
          province: string
          scraper_id?: number | null
          source?: Database["public"]["Enums"]["auction_source"] | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["remate_status"]
          time?: string | null
          title: string
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          auction_type?: Database["public"]["Enums"]["auction_type"] | null
          catalog_url?: string | null
          consignataria_id?: string
          created_at?: string
          date?: string
          description?: string | null
          estimated_heads?: number | null
          featured?: boolean
          id?: string
          location?: string
          main_category?: Database["public"]["Enums"]["cattle_category"] | null
          province?: string
          scraper_id?: number | null
          source?: Database["public"]["Enums"]["auction_source"] | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["remate_status"]
          time?: string | null
          title?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remates_consignataria_id_fkey"
            columns: ["consignataria_id"]
            isOneToOne: false
            referencedRelation: "consignatarias"
            referencedColumns: ["id"]
          },
        ]
      }
      remitente_entries: {
        Row: {
          cabezas: number
          categorias: Json | null
          consignataria_slug: string
          created_at: string
          id: string
          localidad: string | null
          mag_id: string | null
          period_end: string | null
          period_start: string | null
          provincia: string | null
          remate_date: string
          remitente: string
          scrape_date: string
        }
        Insert: {
          cabezas?: number
          categorias?: Json | null
          consignataria_slug: string
          created_at?: string
          id?: string
          localidad?: string | null
          mag_id?: string | null
          period_end?: string | null
          period_start?: string | null
          provincia?: string | null
          remate_date: string
          remitente: string
          scrape_date?: string
        }
        Update: {
          cabezas?: number
          categorias?: Json | null
          consignataria_slug?: string
          created_at?: string
          id?: string
          localidad?: string | null
          mag_id?: string | null
          period_end?: string | null
          period_start?: string | null
          provincia?: string | null
          remate_date?: string
          remitente?: string
          scrape_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "remitente_entries_consignataria_slug_fkey"
            columns: ["consignataria_slug"]
            isOneToOne: false
            referencedRelation: "consignatarias"
            referencedColumns: ["canonical_slug"]
          },
        ]
      }
      scraper_runs: {
        Row: {
          auctions_found: number | null
          auctions_new: number | null
          auctions_updated: number | null
          errors: Json | null
          finished_at: string | null
          id: string
          started_at: string
          status: string
        }
        Insert: {
          auctions_found?: number | null
          auctions_new?: number | null
          auctions_updated?: number | null
          errors?: Json | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
        }
        Update: {
          auctions_found?: number | null
          auctions_new?: number | null
          auctions_updated?: number | null
          errors?: Json | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      sell_zone_alerts: {
        Row: {
          categoria: string
          created_at: string
          email: string
          id: string
          last_sent_at: string | null
          last_sent_zone: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          categoria: string
          created_at?: string
          email: string
          id?: string
          last_sent_at?: string | null
          last_sent_zone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          email?: string
          id?: string
          last_sent_at?: string | null
          last_sent_zone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          entity_slug: string
          entity_type: string
          id: string
          plan_name: string
          rebill_customer_id: string | null
          rebill_subscription_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          entity_slug: string
          entity_type: string
          id?: string
          plan_name: string
          rebill_customer_id?: string | null
          rebill_subscription_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          entity_slug?: string
          entity_type?: string
          id?: string
          plan_name?: string
          rebill_customer_id?: string | null
          rebill_subscription_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      usd_blue_history: {
        Row: {
          compra: number | null
          date: string
          scraped_at: string
          source_url: string | null
          venta: number | null
        }
        Insert: {
          compra?: number | null
          date: string
          scraped_at?: string
          source_url?: string | null
          venta?: number | null
        }
        Update: {
          compra?: number | null
          date?: string
          scraped_at?: string
          source_url?: string | null
          venta?: number | null
        }
        Relationships: []
      }
      user_dtes: {
        Row: {
          cantidad_cabezas: number | null
          categorias: Json | null
          consignataria_id: string | null
          created_at: string | null
          especie: string | null
          establecimiento_destino: string | null
          establecimiento_origen: string | null
          fecha_emision: string | null
          fecha_movimiento: string | null
          id: string
          imagen_url: string | null
          motivo: string | null
          notas: string | null
          numero_dte: string | null
          ocr_confidence: number | null
          ocr_raw_text: string | null
          peso_total_kg: number | null
          renspa_destino: string | null
          renspa_origen: string | null
          titular_destino: string | null
          titular_origen: string | null
          updated_at: string | null
          user_edited: boolean | null
          user_id: string
        }
        Insert: {
          cantidad_cabezas?: number | null
          categorias?: Json | null
          consignataria_id?: string | null
          created_at?: string | null
          especie?: string | null
          establecimiento_destino?: string | null
          establecimiento_origen?: string | null
          fecha_emision?: string | null
          fecha_movimiento?: string | null
          id?: string
          imagen_url?: string | null
          motivo?: string | null
          notas?: string | null
          numero_dte?: string | null
          ocr_confidence?: number | null
          ocr_raw_text?: string | null
          peso_total_kg?: number | null
          renspa_destino?: string | null
          renspa_origen?: string | null
          titular_destino?: string | null
          titular_origen?: string | null
          updated_at?: string | null
          user_edited?: boolean | null
          user_id: string
        }
        Update: {
          cantidad_cabezas?: number | null
          categorias?: Json | null
          consignataria_id?: string | null
          created_at?: string | null
          especie?: string | null
          establecimiento_destino?: string | null
          establecimiento_origen?: string | null
          fecha_emision?: string | null
          fecha_movimiento?: string | null
          id?: string
          imagen_url?: string | null
          motivo?: string | null
          notas?: string | null
          numero_dte?: string | null
          ocr_confidence?: number | null
          ocr_raw_text?: string | null
          peso_total_kg?: number | null
          renspa_destino?: string | null
          renspa_origen?: string | null
          titular_destino?: string | null
          titular_origen?: string | null
          updated_at?: string | null
          user_edited?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_dtes_consignataria_id_fkey"
            columns: ["consignataria_id"]
            isOneToOne: false
            referencedRelation: "consignatarias"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          consignataria_slug: string
          created_at: string | null
          id: string
          notify_catalog: boolean | null
          notify_new_remate: boolean | null
          user_id: string | null
        }
        Insert: {
          consignataria_slug: string
          created_at?: string | null
          id?: string
          notify_catalog?: boolean | null
          notify_new_remate?: boolean | null
          user_id?: string | null
        }
        Update: {
          consignataria_slug?: string
          created_at?: string | null
          id?: string
          notify_catalog?: boolean | null
          notify_new_remate?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_ganado: {
        Row: {
          alerts_opt_in: boolean
          created_at: string | null
          id: string
          items: Json
          last_seen_at: string | null
          last_seen_value_ars: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alerts_opt_in?: boolean
          created_at?: string | null
          id?: string
          items?: Json
          last_seen_at?: string | null
          last_seen_value_ars?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alerts_opt_in?: boolean
          created_at?: string | null
          id?: string
          items?: Json
          last_seen_at?: string | null
          last_seen_value_ars?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_report_downloads: {
        Row: {
          downloaded_at: string
          id: number
          ip: unknown
          report_slug: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          downloaded_at?: string
          id?: number
          ip?: unknown
          report_slug: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          downloaded_at?: string
          id?: number
          ip?: unknown
          report_slug?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          email: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          api_tier: string
          api_tier_activated_at: string | null
          api_tier_cancelled_at: string | null
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          email: string
          id: string
          rebill_customer_id: string | null
          rebill_enterprise_subscription_id: string | null
          rebill_subscription_id: string | null
          status: string
          tier: string
          trial_nudge_3d_at: string | null
          trial_nudge_7d_at: string | null
          updated_at: string
          upgraded_at: string | null
          user_id: string
        }
        Insert: {
          api_tier?: string
          api_tier_activated_at?: string | null
          api_tier_cancelled_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          email: string
          id?: string
          rebill_customer_id?: string | null
          rebill_enterprise_subscription_id?: string | null
          rebill_subscription_id?: string | null
          status?: string
          tier?: string
          trial_nudge_3d_at?: string | null
          trial_nudge_7d_at?: string | null
          updated_at?: string
          upgraded_at?: string | null
          user_id: string
        }
        Update: {
          api_tier?: string
          api_tier_activated_at?: string | null
          api_tier_cancelled_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          email?: string
          id?: string
          rebill_customer_id?: string | null
          rebill_enterprise_subscription_id?: string | null
          rebill_subscription_id?: string | null
          status?: string
          tier?: string
          trial_nudge_3d_at?: string | null
          trial_nudge_7d_at?: string | null
          updated_at?: string
          upgraded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      value_events: {
        Row: {
          ai_engine: string | null
          created_at: string
          entity_slug: string | null
          entity_type: string | null
          event: string
          id: number
          meta: Json | null
          path: string | null
          session_id: string | null
          source: string | null
          weight: number
        }
        Insert: {
          ai_engine?: string | null
          created_at?: string
          entity_slug?: string | null
          entity_type?: string | null
          event: string
          id?: number
          meta?: Json | null
          path?: string | null
          session_id?: string | null
          source?: string | null
          weight?: number
        }
        Update: {
          ai_engine?: string | null
          created_at?: string
          entity_slug?: string | null
          entity_type?: string | null
          event?: string
          id?: number
          meta?: Json | null
          path?: string | null
          session_id?: string | null
          source?: string | null
          weight?: number
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          events: string[]
          failed_deliveries: number | null
          filters: Json | null
          id: string
          last_triggered_at: string | null
          owner_email: string | null
          secret: string
          total_deliveries: number | null
          url: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          events?: string[]
          failed_deliveries?: number | null
          filters?: Json | null
          id?: string
          last_triggered_at?: string | null
          owner_email?: string | null
          secret: string
          total_deliveries?: number | null
          url: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          events?: string[]
          failed_deliveries?: number | null
          filters?: Json | null
          id?: string
          last_triggered_at?: string | null
          owner_email?: string | null
          secret?: string
          total_deliveries?: number | null
          url?: string
        }
        Relationships: []
      }
      whatsapp_clicks: {
        Row: {
          clicked_at: string
          consignataria_slug: string
          created_at: string
          id: number
          source: string | null
        }
        Insert: {
          clicked_at?: string
          consignataria_slug: string
          created_at?: string
          id?: never
          source?: string | null
        }
        Update: {
          clicked_at?: string
          consignataria_slug?: string
          created_at?: string
          id?: never
          source?: string | null
        }
        Relationships: []
      }
      youtube_channels: {
        Row: {
          channel_id: string
          channel_title: string | null
          channel_url: string | null
          consignataria_id: string | null
          created_at: string | null
          id: string
          last_checked: string | null
          subscriber_count: number | null
        }
        Insert: {
          channel_id: string
          channel_title?: string | null
          channel_url?: string | null
          consignataria_id?: string | null
          created_at?: string | null
          id?: string
          last_checked?: string | null
          subscriber_count?: number | null
        }
        Update: {
          channel_id?: string
          channel_title?: string | null
          channel_url?: string | null
          consignataria_id?: string | null
          created_at?: string | null
          id?: string
          last_checked?: string | null
          subscriber_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "youtube_channels_consignataria_id_fkey"
            columns: ["consignataria_id"]
            isOneToOne: true
            referencedRelation: "consignatarias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      consignataria_followers: {
        Row: {
          consignataria_slug: string | null
          follower_count: number | null
        }
        Relationships: []
      }
      value_events_by_entity: {
        Row: {
          entity_slug: string | null
          entity_type: string | null
          events: number | null
          value: number | null
        }
        Relationships: []
      }
      value_events_daily: {
        Row: {
          ai_engine: string | null
          day: string | null
          event: string | null
          n: number | null
          source: string | null
          value: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      bump_rate_limit: {
        Args: { p_bucket: string; p_window_start: string }
        Returns: number
      }
      get_dashboard_counts: { Args: never; Returns: Json }
      get_remate_watchers: { Args: { p_remate_id: number }; Returns: number }
      get_top_localidades: {
        Args: { p_consig_slug: string; p_days?: number; p_limit?: number }
        Returns: {
          entry_count: number
          localidad: string
          provincia: string
          total_cabezas: number
        }[]
      }
      get_top_remitentes: {
        Args: { p_consig_slug: string; p_days?: number; p_limit?: number }
        Returns: {
          entry_count: number
          last_entry: string
          localidad: string
          provincia: string
          remitente: string
          total_cabezas: number
        }[]
      }
      get_top_viewed_entities: {
        Args: { days_back?: number }
        Returns: {
          entity_slug: string
          view_count: number
        }[]
      }
      get_user_emails: {
        Args: { p_ids: string[] }
        Returns: {
          email: string
          id: string
        }[]
      }
      get_user_report_stats: {
        Args: { p_user_id: string }
        Returns: {
          download_count: number
          first_downloaded_at: string
          last_downloaded_at: string
          report_slug: string
        }[]
      }
      get_volume_trends: {
        Args: { p_consig_slug: string; p_days?: number }
        Returns: {
          total_cabezas: number
          unique_localidades: number
          unique_remitentes: number
          week_start: string
        }[]
      }
      increment_aperturas: {
        Args: { p_cliente_num: number }
        Returns: undefined
      }
      increment_api_usage: { Args: { p_key_id: string }; Returns: number }
      record_report_download: {
        Args: {
          p_ip?: unknown
          p_report_slug: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: number
      }
    }
    Enums: {
      auction_source: "web" | "social" | "tv" | "manual"
      auction_type:
        | "invernada"
        | "cria"
        | "reproductores"
        | "general"
        | "especial"
      cattle_category:
        | "terneros"
        | "novillos"
        | "vaca_gorda"
        | "vaquillonas"
        | "toros"
        | "mixto"
      extraction_status: "pending" | "processing" | "completed" | "failed"
      featured_link_type: "video" | "pdf" | "nota" | "guia"
      remate_status: "draft" | "scheduled" | "live" | "completed" | "cancelled"
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
      auction_source: ["web", "social", "tv", "manual"],
      auction_type: [
        "invernada",
        "cria",
        "reproductores",
        "general",
        "especial",
      ],
      cattle_category: [
        "terneros",
        "novillos",
        "vaca_gorda",
        "vaquillonas",
        "toros",
        "mixto",
      ],
      extraction_status: ["pending", "processing", "completed", "failed"],
      featured_link_type: ["video", "pdf", "nota", "guia"],
      remate_status: ["draft", "scheduled", "live", "completed", "cancelled"],
    },
  },
} as const
