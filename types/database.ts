import { PostgrestError } from "@supabase/supabase-js";

export type Json = | string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      agendamentos: {
        Row: {
          created_at: string;
          description: string | null;
          end_time: string | null;
          event_type: string | null;
          id: string;
          is_recurring: boolean | null;
          location_url: string | null;
          notifications_enabled: boolean | null;
          recurrence_rule: string | null;
          related_content_id: string | null;
          start_time: string;
          status: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          end_time?: string | null;
          event_type?: string | null;
          id?: string;
          is_recurring?: boolean | null;
          location_url?: string | null;
          notifications_enabled?: boolean | null;
          recurrence_rule?: string | null;
          related_content_id?: string | null;
          start_time: string;
          status?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          end_time?: string | null;
          event_type?: string | null;
          id?: string;
          is_recurring?: boolean | null;
          location_url?: string | null;
          notifications_enabled?: boolean | null;
          recurrence_rule?: string | null;
          related_content_id?: string | null;
          start_time?: string;
          status?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agendamentos_related_content_id_fkey";
            columns: ["related_content_id"];
            isOneToOne: false;
            referencedRelation: "conteudos_educacionais";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agendamentos_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      chatbot_conversas: {
        Row: {
          created_at: string;
          id: string;
          last_message: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_message?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_message?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chatbot_conversas_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      chats_forum: {
        Row: {
          created_at: string;
          id: string;
          last_message_content: string | null;
          last_message_timestamp: string | null;
          topic_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_message_content?: string | null;
          last_message_timestamp?: string | null;
          topic_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_message_content?: string | null;
          last_message_timestamp?: string | null;
          topic_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chats_forum_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "forum_topicos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chats_forum_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      conteudos: {
        Row: {
          author: string | null;
          created_at: string;
          description: string | null;
          id: string;
          publication_date: string | null;
          source_url: string | null;
          tags: string[] | null;
          title: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          author?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          publication_date?: string | null;
          source_url?: string | null;
          tags?: string[] | null;
          title: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          author?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          publication_date?: string | null;
          source_url?: string | null;
          tags?: string[] | null;
          title?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conteudos_educacionais: {
        Row: {
          author: string | null;
          created_at: string;
          description: string | null;
          id: string;
          publication_date: string | null;
          source_url: string | null;
          tags: string[] | null;
          title: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          author?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          publication_date?: string | null;
          source_url?: string | null;
          tags?: string[] | null;
          title: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          author?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          publication_date?: string | null;
          source_url?: string | null;
          tags?: string[] | null;
          title?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      diario_anexos: {
        Row: {
          anexo_url: string;
          created_at: string;
          diario_id: string;
          id: string;
          tipo_anexo: string;
          user_id: string;
        };
        Insert: {
          anexo_url: string;
          created_at?: string;
          diario_id: string;
          id?: string;
          tipo_anexo: string;
          user_id: string;
        };
        Update: {
          anexo_url?: string;
          created_at?: string;
          diario_id?: string;
          id?: string;
          tipo_anexo?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diario_anexos_diario_id_fkey";
            columns: ["diario_id"];
            isOneToOne: false;
            referencedRelation: "diarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diario_anexos_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      diarios: {
        Row: {
          data_registro: string;
          id: string;
          sentimento_analisado: string | null;
          texto: string | null;
          user_id: string;
        };
        Insert: {
          data_registro?: string;
          id?: string;
          sentimento_analisado?: string | null;
          texto?: string | null;
          user_id: string;
        };
        Update: {
          data_registro?: string;
          id?: string;
          sentimento_analisado?: string | null;
          texto?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diarios_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      forum_mensagens: {
        Row: {
          chat_id: string;
          content: string;
          created_at: string;
          id: string;
          media_url: string | null;
          user_id: string;
        };
        Insert: {
          chat_id: string;
          content: string;
          created_at?: string;
          id?: string;
          media_url?: string | null;
          user_id: string;
        };
        Update: {
          chat_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          media_url?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "forum_mensagens_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats_forum";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "forum_mensagens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      forum_topicos: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          title: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          title?: string;
        };
        Relationships: [];
      };
      metas: {
        Row: {
          created_at: string;
          description: string | null;
          due_date: string | null;
          id: string;
          is_completed: boolean | null;
          priority: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          is_completed?: boolean | null;
          priority?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          is_completed?: boolean | null;
          priority?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "metas_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      pontos: {
        Row: {
          created_at: string;
          id: string;
          last_earned_date: string | null;
          streak_days: number | null;
          total_points: number | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_earned_date?: string | null;
          streak_days?: number | null;
          total_points?: number | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_earned_date?: string | null;
          streak_days?: number | null;
          total_points?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pontos_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          auth_user_id: string;
          avatar_url: string | null;
          created_at: string;
          id: string;
          nome: string | null;
          updated_at: string;
        };
        Insert: {
          auth_user_id: string;
          avatar_url?: string | null;
          created_at?: string;
          id?: string;
          nome?: string | null;
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string;
          avatar_url?: string | null;
          created_at?: string;
          id?: string;
          nome?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_auth_user_id_fkey";
            columns: ["auth_user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];

export type DbResult<T> = T extends PromiseLike<infer U> ? U : never;
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? Exclude<U, null> : never;
export type DbResultErr = PostgrestError;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
