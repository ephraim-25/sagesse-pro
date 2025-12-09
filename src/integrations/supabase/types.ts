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
          auth_id: string
          created_at: string | null
          email: string
          fonction: string | null
          id: string
          nom: string
          photo_url: string | null
          postnom: string | null
          prenom: string
          service: string | null
          statut: Database["public"]["Enums"]["statut_utilisateur"] | null
          telephone: string | null
          updated_at: string | null
        }
        Insert: {
          auth_id: string
          created_at?: string | null
          email: string
          fonction?: string | null
          id?: string
          nom: string
          photo_url?: string | null
          postnom?: string | null
          prenom: string
          service?: string | null
          statut?: Database["public"]["Enums"]["statut_utilisateur"] | null
          telephone?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_id?: string
          created_at?: string | null
          email?: string
          fonction?: string | null
          id?: string
          nom?: string
          photo_url?: string | null
          postnom?: string | null
          prenom?: string
          service?: string | null
          statut?: Database["public"]["Enums"]["statut_utilisateur"] | null
          telephone?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      get_profile_id: { Args: { _auth_id: string }; Returns: string }
      get_user_service: { Args: { _auth_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
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
    }
    Enums: {
      app_role: "admin" | "president" | "chef_service" | "agent"
      niveau_competence: "1" | "2" | "3" | "4" | "5"
      priorite_tache: "faible" | "moyen" | "eleve" | "urgente"
      statut_tache: "a_faire" | "en_cours" | "en_pause" | "termine"
      statut_teletravail: "connecte" | "pause" | "hors_ligne"
      statut_utilisateur: "actif" | "suspendu"
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
      app_role: ["admin", "president", "chef_service", "agent"],
      niveau_competence: ["1", "2", "3", "4", "5"],
      priorite_tache: ["faible", "moyen", "eleve", "urgente"],
      statut_tache: ["a_faire", "en_cours", "en_pause", "termine"],
      statut_teletravail: ["connecte", "pause", "hors_ligne"],
      statut_utilisateur: ["actif", "suspendu"],
      type_presence: ["presentiel", "teletravail"],
    },
  },
} as const
