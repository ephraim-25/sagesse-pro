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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_matricules: {
        Row: {
          created_at: string | null
          id: string
          is_used: boolean | null
          matricule: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_used?: boolean | null
          matricule: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_used?: boolean | null
          matricule?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_matricules_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          acted_at: string | null
          approver_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          ref_id: string | null
          ref_table: string | null
          status: Database["public"]["Enums"]["approval_status"] | null
          target_user_id: string
          type: Database["public"]["Enums"]["approval_type"]
        }
        Insert: {
          acted_at?: string | null
          approver_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          ref_id?: string | null
          ref_table?: string | null
          status?: Database["public"]["Enums"]["approval_status"] | null
          target_user_id: string
          type: Database["public"]["Enums"]["approval_type"]
        }
        Update: {
          acted_at?: string | null
          approver_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          ref_id?: string | null
          ref_table?: string | null
          status?: Database["public"]["Enums"]["approval_status"] | null
          target_user_id?: string
          type?: Database["public"]["Enums"]["approval_type"]
        }
        Relationships: [
          {
            foreignKeyName: "approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          ancienne_valeur: Json | null
          created_at: string | null
          device: string | null
          id: string
          ip_address: string | null
          nouvelle_valeur: Json | null
          table_cible: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          ancienne_valeur?: Json | null
          created_at?: string | null
          device?: string | null
          id?: string
          ip_address?: string | null
          nouvelle_valeur?: Json | null
          table_cible?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          ancienne_valeur?: Json | null
          created_at?: string | null
          device?: string | null
          id?: string
          ip_address?: string | null
          nouvelle_valeur?: Json | null
          table_cible?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competences: {
        Row: {
          competence: string
          created_at: string | null
          date_evaluation: string | null
          id: string
          justification: string | null
          niveau: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          competence: string
          created_at?: string | null
          date_evaluation?: string | null
          id?: string
          justification?: string | null
          niveau?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          competence?: string
          created_at?: string | null
          date_evaluation?: string | null
          id?: string
          justification?: string | null
          niveau?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exports: {
        Row: {
          created_at: string | null
          error_message: string | null
          file_hash: string | null
          file_path: string | null
          id: string
          params: Json | null
          ready_at: string | null
          requested_by: string
          status: Database["public"]["Enums"]["export_status"] | null
          type: Database["public"]["Enums"]["export_type"]
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          file_hash?: string | null
          file_path?: string | null
          id?: string
          params?: Json | null
          ready_at?: string | null
          requested_by: string
          status?: Database["public"]["Enums"]["export_status"] | null
          type: Database["public"]["Enums"]["export_type"]
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          file_hash?: string | null
          file_path?: string | null
          id?: string
          params?: Json | null
          ready_at?: string | null
          requested_by?: string
          status?: Database["public"]["Enums"]["export_status"] | null
          type?: Database["public"]["Enums"]["export_type"]
        }
        Relationships: [
          {
            foreignKeyName: "exports_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          can_approve_accounts: boolean | null
          can_export_reports: boolean | null
          can_force_checkout: boolean | null
          can_manage_team: boolean | null
          can_view_all_data: boolean | null
          code: Database["public"]["Enums"]["grade_hierarchique"]
          created_at: string | null
          description: string | null
          id: string
          label: string
          rank_order: number
          updated_at: string | null
        }
        Insert: {
          can_approve_accounts?: boolean | null
          can_export_reports?: boolean | null
          can_force_checkout?: boolean | null
          can_manage_team?: boolean | null
          can_view_all_data?: boolean | null
          code: Database["public"]["Enums"]["grade_hierarchique"]
          created_at?: string | null
          description?: string | null
          id?: string
          label: string
          rank_order: number
          updated_at?: string | null
        }
        Update: {
          can_approve_accounts?: boolean | null
          can_export_reports?: boolean | null
          can_force_checkout?: boolean | null
          can_manage_team?: boolean | null
          can_view_all_data?: boolean | null
          code?: Database["public"]["Enums"]["grade_hierarchique"]
          created_at?: string | null
          description?: string | null
          id?: string
          label?: string
          rank_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          meta: Json | null
          read: boolean | null
          read_at: string | null
          sender_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          meta?: Json | null
          read?: boolean | null
          read_at?: string | null
          sender_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          meta?: Json | null
          read?: boolean | null
          read_at?: string | null
          sender_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performances: {
        Row: {
          created_at: string | null
          evaluations_automatiques: Json | null
          id: string
          nombre_taches_terminees: number | null
          periode: string
          score_productivite: number | null
          taux_presence: number | null
          taux_teletravail_actif: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          evaluations_automatiques?: Json | null
          id?: string
          nombre_taches_terminees?: number | null
          periode: string
          score_productivite?: number | null
          taux_presence?: number | null
          taux_teletravail_actif?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          evaluations_automatiques?: Json | null
          id?: string
          nombre_taches_terminees?: number | null
          periode?: string
          score_productivite?: number | null
          taux_presence?: number | null
          taux_teletravail_actif?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      presences: {
        Row: {
          appareil: string | null
          created_at: string | null
          date: string
          heure_entree: string | null
          heure_sortie: string | null
          id: string
          justification_retard: string | null
          localisation_generale: string | null
          type: Database["public"]["Enums"]["type_presence"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          appareil?: string | null
          created_at?: string | null
          date?: string
          heure_entree?: string | null
          heure_sortie?: string | null
          id?: string
          justification_retard?: string | null
          localisation_generale?: string | null
          type?: Database["public"]["Enums"]["type_presence"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          appareil?: string | null
          created_at?: string | null
          date?: string
          heure_entree?: string | null
          heure_sortie?: string | null
          id?: string
          justification_retard?: string | null
          localisation_generale?: string | null
          type?: Database["public"]["Enums"]["type_presence"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"] | null
          auth_id: string
          created_at: string | null
          custom_grade: string | null
          email: string
          fonction: string | null
          grade_id: string | null
          id: string
          last_activity_at: string | null
          last_status: Database["public"]["Enums"]["telework_status"] | null
          manager_id: string | null
          nom: string
          photo_url: string | null
          postnom: string | null
          prenom: string
          service: string | null
          statut: Database["public"]["Enums"]["statut_utilisateur"] | null
          team_id: string | null
          telephone: string | null
          updated_at: string | null
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"] | null
          auth_id: string
          created_at?: string | null
          custom_grade?: string | null
          email: string
          fonction?: string | null
          grade_id?: string | null
          id?: string
          last_activity_at?: string | null
          last_status?: Database["public"]["Enums"]["telework_status"] | null
          manager_id?: string | null
          nom: string
          photo_url?: string | null
          postnom?: string | null
          prenom: string
          service?: string | null
          statut?: Database["public"]["Enums"]["statut_utilisateur"] | null
          team_id?: string | null
          telephone?: string | null
          updated_at?: string | null
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"] | null
          auth_id?: string
          created_at?: string | null
          custom_grade?: string | null
          email?: string
          fonction?: string | null
          grade_id?: string | null
          id?: string
          last_activity_at?: string | null
          last_status?: Database["public"]["Enums"]["telework_status"] | null
          manager_id?: string | null
          nom?: string
          photo_url?: string | null
          postnom?: string | null
          prenom?: string
          service?: string | null
          statut?: Database["public"]["Enums"]["statut_utilisateur"] | null
          team_id?: string | null
          telephone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      roles_organisationnels: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          niveau_responsabilite: number | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          niveau_responsabilite?: number | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          niveau_responsabilite?: number | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_organisationnels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      taches: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          date_debut: string | null
          date_fin: string | null
          date_limite: string | null
          description: string | null
          documents_lies: string[] | null
          id: string
          priorite: Database["public"]["Enums"]["priorite_tache"] | null
          progression: number | null
          statut: Database["public"]["Enums"]["statut_tache"] | null
          titre: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          date_debut?: string | null
          date_fin?: string | null
          date_limite?: string | null
          description?: string | null
          documents_lies?: string[] | null
          id?: string
          priorite?: Database["public"]["Enums"]["priorite_tache"] | null
          progression?: number | null
          statut?: Database["public"]["Enums"]["statut_tache"] | null
          titre: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          date_debut?: string | null
          date_fin?: string | null
          date_limite?: string | null
          description?: string | null
          documents_lies?: string[] | null
          id?: string
          priorite?: Database["public"]["Enums"]["priorite_tache"] | null
          progression?: number | null
          statut?: Database["public"]["Enums"]["statut_tache"] | null
          titre?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taches_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          description: string | null
          division: string | null
          id: string
          name: string
          parent_team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          division?: string | null
          id?: string
          name: string
          parent_team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          division?: string | null
          id?: string
          name?: string
          parent_team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_parent_team_id_fkey"
            columns: ["parent_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teletravail_logs: {
        Row: {
          activite_declaree: string | null
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          duree_active_minutes: number | null
          id: string
          localisation_generale: string | null
          statut: Database["public"]["Enums"]["statut_teletravail"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activite_declaree?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          duree_active_minutes?: number | null
          id?: string
          localisation_generale?: string | null
          statut?: Database["public"]["Enums"]["statut_teletravail"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activite_declaree?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          duree_active_minutes?: number | null
          id?: string
          localisation_generale?: string | null
          statut?: Database["public"]["Enums"]["statut_teletravail"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teletravail_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      telework_sessions: {
        Row: {
          active_seconds: number | null
          activities: Json | null
          check_in: string
          check_out: string | null
          country: string | null
          created_at: string | null
          current_status: Database["public"]["Enums"]["telework_status"] | null
          device: string | null
          forced_by: string | null
          forced_checkout: boolean | null
          id: string
          ip_address: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_seconds?: number | null
          activities?: Json | null
          check_in?: string
          check_out?: string | null
          country?: string | null
          created_at?: string | null
          current_status?: Database["public"]["Enums"]["telework_status"] | null
          device?: string | null
          forced_by?: string | null
          forced_checkout?: boolean | null
          id?: string
          ip_address?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_seconds?: number | null
          activities?: Json | null
          check_in?: string
          check_out?: string | null
          country?: string | null
          created_at?: string | null
          current_status?: Database["public"]["Enums"]["telework_status"] | null
          device?: string | null
          forced_by?: string | null
          forced_checkout?: boolean | null
          id?: string
          ip_address?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telework_sessions_forced_by_fkey"
            columns: ["forced_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telework_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          break_minutes: number | null
          created_at: string | null
          date: string
          details: Json | null
          id: string
          presence_hours: number | null
          status: Database["public"]["Enums"]["approval_status"] | null
          telework_hours: number | null
          updated_at: string | null
          user_id: string
          worked_hours: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          break_minutes?: number | null
          created_at?: string | null
          date: string
          details?: Json | null
          id?: string
          presence_hours?: number | null
          status?: Database["public"]["Enums"]["approval_status"] | null
          telework_hours?: number | null
          updated_at?: string | null
          user_id: string
          worked_hours?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          break_minutes?: number | null
          created_at?: string | null
          date?: string
          details?: Json | null
          id?: string
          presence_hours?: number | null
          status?: Database["public"]["Enums"]["approval_status"] | null
          telework_hours?: number | null
          updated_at?: string | null
          user_id?: string
          worked_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_user: { Args: { p_user_id: string }; Returns: undefined }
      admin_update_profile: {
        Args: { p_updates: Json; p_user_id: string }
        Returns: undefined
      }
      can_assign_task_to: {
        Args: { _auth_id: string; _target_user_id: string }
        Returns: boolean
      }
      can_manage_user: {
        Args: { _auth_id: string; _target_user_id: string }
        Returns: boolean
      }
      enroll_agent: { Args: { p_agent_id: string }; Returns: undefined }
      get_profile_id: { Args: { _auth_id: string }; Returns: string }
      get_user_grade_rank: { Args: { _user_id: string }; Returns: number }
      get_user_service: { Args: { _auth_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager_of: {
        Args: { _manager_auth_id: string; _target_user_id: string }
        Returns: boolean
      }
      is_same_service: {
        Args: { _auth_id: string; _target_user_id: string }
        Returns: boolean
      }
      log_audit_action: {
        Args: {
          p_action: string
          p_ancienne_valeur?: Json
          p_nouvelle_valeur?: Json
          p_table_cible: string
        }
        Returns: string
      }
      set_user_grade_and_role: {
        Args: { p_grade_id: string; p_user_id: string }
        Returns: undefined
      }
      unenroll_agent: { Args: { p_agent_id: string }; Returns: undefined }
      validate_admin_matricule: {
        Args: { p_matricule: string; p_profile_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_status: "pending_approval" | "active" | "suspended" | "rejected"
      app_role: "admin" | "president" | "chef_service" | "agent"
      approval_status: "pending" | "approved" | "rejected"
      approval_type:
        | "account_creation"
        | "timesheet"
        | "telework_session"
        | "grade_change"
        | "leave_request"
      export_status: "pending" | "processing" | "completed" | "failed"
      export_type: "presence" | "performance" | "telework" | "timesheet"
      grade_hierarchique:
        | "president_conseil"
        | "secretaire_permanent"
        | "chef_division"
        | "chef_bureau"
        | "ata_1"
        | "ata_2"
        | "aga_1"
        | "aga_2"
        | "huissier"
        | "custom"
      niveau_competence: "1" | "2" | "3" | "4" | "5"
      priorite_tache: "faible" | "moyen" | "eleve" | "urgente"
      statut_tache: "a_faire" | "en_cours" | "en_pause" | "termine"
      statut_teletravail: "connecte" | "pause" | "hors_ligne"
      statut_utilisateur: "actif" | "suspendu"
      telework_status: "connecte" | "pause" | "reunion" | "hors_ligne"
      type_presence: "presentiel" | "teletravail"
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
      account_status: ["pending_approval", "active", "suspended", "rejected"],
      app_role: ["admin", "president", "chef_service", "agent"],
      approval_status: ["pending", "approved", "rejected"],
      approval_type: [
        "account_creation",
        "timesheet",
        "telework_session",
        "grade_change",
        "leave_request",
      ],
      export_status: ["pending", "processing", "completed", "failed"],
      export_type: ["presence", "performance", "telework", "timesheet"],
      grade_hierarchique: [
        "president_conseil",
        "secretaire_permanent",
        "chef_division",
        "chef_bureau",
        "ata_1",
        "ata_2",
        "aga_1",
        "aga_2",
        "huissier",
        "custom",
      ],
      niveau_competence: ["1", "2", "3", "4", "5"],
      priorite_tache: ["faible", "moyen", "eleve", "urgente"],
      statut_tache: ["a_faire", "en_cours", "en_pause", "termine"],
      statut_teletravail: ["connecte", "pause", "hors_ligne"],
      statut_utilisateur: ["actif", "suspendu"],
      telework_status: ["connecte", "pause", "reunion", "hors_ligne"],
      type_presence: ["presentiel", "teletravail"],
    },
  },
} as const
