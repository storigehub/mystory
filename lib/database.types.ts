// @ts-nocheck
export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          id: string;
          title: string;
          author: string;
          created_at: string;
          updated_at: string;
          settings: Record<string, unknown>;
        };
        Insert: Omit<Database["public"]["Tables"]["books"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["books"]["Insert"]>;
      };
      chapters: {
        Row: {
          id: string;
          book_id: string;
          topic_id: string;
          title: string;
          sort_order: number;
          is_custom: boolean;
          mode: "chat" | "normal";
          prose: string;
          is_done: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["chapters"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["chapters"]["Insert"]>;
      };
      messages: {
        Row: {
          id: string;
          chapter_id: string;
          type: "ai" | "user" | "photo" | "system";
          text: string;
          photo_url: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["messages"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
      };
      photos: {
        Row: {
          id: string;
          chapter_id: string;
          url: string;
          caption: string;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["photos"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["photos"]["Insert"]>;
      };
    };
  };
}
