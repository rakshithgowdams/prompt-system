export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type FileType = 'image' | 'video' | 'audio' | 'document' | 'other';

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          icon: string;
          color: string;
          is_default: boolean;
          cover_image: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          icon?: string;
          color?: string;
          is_default?: boolean;
          cover_image?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          slug?: string;
          icon?: string;
          color?: string;
          is_default?: boolean;
          cover_image?: string | null;
          created_at?: string;
        };
      };
      folders: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
        };
      };
      project_files: {
        Row: {
          id: string;
          project_id: string;
          folder_id: string | null;
          user_id: string;
          file_path: string;
          file_name: string;
          file_type: FileType;
          file_size: number | null;
          mime_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          folder_id?: string | null;
          user_id: string;
          file_path: string;
          file_name: string;
          file_type: FileType;
          file_size?: number | null;
          mime_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          folder_id?: string | null;
          user_id?: string;
          file_path?: string;
          file_name?: string;
          file_type?: FileType;
          file_size?: number | null;
          mime_type?: string | null;
          created_at?: string;
        };
      };
      prompts: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          title: string;
          prompt_text: string;
          platform: string;
          notes: string | null;
          tags: string[];
          status: 'draft' | 'ready' | 'posted' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          title: string;
          prompt_text: string;
          platform: string;
          notes?: string | null;
          tags?: string[];
          status?: 'draft' | 'ready' | 'posted' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          title?: string;
          prompt_text?: string;
          platform?: string;
          notes?: string | null;
          tags?: string[];
          status?: 'draft' | 'ready' | 'posted' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
      };
      media_files: {
        Row: {
          id: string;
          prompt_id: string;
          file_path: string;
          file_type: FileType;
          file_name: string;
          file_size: number | null;
          mime_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          prompt_id: string;
          file_path: string;
          file_type: FileType;
          file_name: string;
          file_size?: number | null;
          mime_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          prompt_id?: string;
          file_path?: string;
          file_type?: FileType;
          file_name?: string;
          file_size?: number | null;
          mime_type?: string | null;
          created_at?: string;
        };
      };
      notion_pages: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          title: string;
          content: Json;
          icon: string;
          cover: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          title?: string;
          content?: Json;
          icon?: string;
          cover?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          title?: string;
          content?: Json;
          icon?: string;
          cover?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      file_shares: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          folder_id: string | null;
          file_id: string | null;
          share_name: string;
          password_hash: string | null;
          access_type: 'anyone' | 'can_edit' | 'password';
          allow_download: boolean;
          expires_at: string | null;
          view_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id: string;
          folder_id?: string | null;
          file_id?: string | null;
          share_name?: string;
          password_hash?: string | null;
          access_type?: 'anyone' | 'can_edit' | 'password';
          allow_download?: boolean;
          expires_at?: string | null;
          view_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string;
          folder_id?: string | null;
          file_id?: string | null;
          share_name?: string;
          password_hash?: string | null;
          access_type?: 'anyone' | 'can_edit' | 'password';
          allow_download?: boolean;
          expires_at?: string | null;
          view_count?: number;
          created_at?: string;
        };
      };
      todos: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          notes: string | null;
          due_at: string | null;
          priority: 'low' | 'medium' | 'high';
          completed: boolean;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          notes?: string | null;
          due_at?: string | null;
          priority?: 'low' | 'medium' | 'high';
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          notes?: string | null;
          due_at?: string | null;
          priority?: 'low' | 'medium' | 'high';
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
      };
      password_vault: {
        Row: {
          id: string;
          user_id: string;
          platform: string;
          site_url: string;
          username: string;
          encrypted_data: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          platform: string;
          site_url?: string;
          username: string;
          encrypted_data: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          platform?: string;
          site_url?: string;
          username?: string;
          encrypted_data?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export type Project    = Database['public']['Tables']['projects']['Row'];
export type NotionPage = Database['public']['Tables']['notion_pages']['Row'];
export type FileShare  = Database['public']['Tables']['file_shares']['Row'];
export type Folder = Database['public']['Tables']['folders']['Row'];
export type ProjectFile = Database['public']['Tables']['project_files']['Row'];
export type Prompt = Database['public']['Tables']['prompts']['Row'];
export type MediaFile = Database['public']['Tables']['media_files']['Row'];
export type Todo = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  due_at: string | null;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

export type PasswordVaultEntry = Database['public']['Tables']['password_vault']['Row'];

export const PLATFORMS = ['Veo 3', 'Seedance 2.0', 'Midjourney', 'ChatGPT', 'Claude', 'Other'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const STATUSES = ['draft', 'ready', 'posted', 'archived'] as const;
export type Status = (typeof STATUSES)[number];
