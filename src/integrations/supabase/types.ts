export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type SupabaseTable<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

type PropertyRow = {
  address: string | null;
  agent_name: string | null;
  agent_phone: string | null;
  amenities: string[];
  available: boolean;
  bathrooms: number | null;
  bedrooms: number | null;
  check_in_time: string;
  check_out_time: string;
  cleaning_fee: number;
  cover_image: string | null;
  created_at: string;
  currency: string;
  deposit: number | null;
  description: string | null;
  destination_id: string | null;
  featured: boolean;
  house_rules: string | null;
  id: string;
  images: string[];
  latitude: number | null;
  listing_status: string;
  location: string;
  longitude: number | null;
  max_guests: number;
  min_nights: number;
  nightly_rate: number | null;
  owner_id: string | null;
  owner_name: string | null;
  property_type: string;
  region: string;
  rent: number | null;
  size_sqm: number | null;
  slug: string;
  title: string;
  updated_at: string;
  verification_status: string;
  verified_at: string | null;
  view_count: number;
  viewing_fee: number;
};

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      contact_messages: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          message: string;
          phone: string | null;
          subject: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name: string;
          id?: string;
          message: string;
          phone?: string | null;
          subject?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          message?: string;
          phone?: string | null;
          subject?: string | null;
        };
        Relationships: [];
      };
      booking_cancellations: SupabaseTable<{
        booking_id: string;
        decided_at: string | null;
        decided_by: string | null;
        decision_note: string | null;
        id: string;
        reason: string;
        refund_amount: number | null;
        requested_at: string;
        requested_by: string;
        status: string;
      }>;
      booking_commissions: SupabaseTable<{
        bearer: string;
        booking_id: string;
        commission_amount: number;
        commission_bps: number;
        created_at: string;
        currency: string;
        gross_amount: number;
        id: string;
        status: string;
      }>;
      booking_conversations: SupabaseTable<{
        booking_id: string;
        created_at: string;
        guest_id: string;
        id: string;
        owner_id: string;
      }>;
      booking_messages: SupabaseTable<{
        body: string;
        conversation_id: string;
        created_at: string;
        id: string;
        read_at: string | null;
        sender_id: string;
      }>;
      booking_payments: SupabaseTable<{
        amount: number;
        booking_id: string;
        checkout_url: string | null;
        created_at: string;
        currency: string;
        id: string;
        method: string;
        paid_at: string | null;
        provider_message: string | null;
        provider_reference: string | null;
        status: string;
        updated_at: string;
      }>;
      booking_receipts: SupabaseTable<{
        amount_paid: number;
        balance_due: number;
        booking_id: string;
        currency: string;
        id: string;
        issued_at: string;
        receipt_data: Json;
        receipt_number: string;
      }>;
      booking_refunds: SupabaseTable<{
        admin_note: string | null;
        amount: number;
        booking_id: string;
        cancellation_id: string | null;
        created_at: string;
        id: string;
        payment_id: string;
        processed_at: string | null;
        processed_by: string | null;
        provider_reference: string | null;
        reason: string;
        status: string;
      }>;
      agents: SupabaseTable<{
        avatar_url: string | null;
        bio: string | null;
        created_at: string;
        email: string | null;
        id: string;
        is_active: boolean;
        name: string;
        phone: string | null;
        slug: string;
        specialties: string[];
        updated_at: string;
        whatsapp: string | null;
      }>;
      bookings: SupabaseTable<{
        amount_due: number;
        booking_reference: string;
        cancellation_policy_snapshot: Json;
        check_in: string;
        check_out: string;
        cleaning_fee: number;
        commission_amount: number;
        commission_bearer: string;
        created_at: string;
        currency: string;
        expires_at: string | null;
        guest_count: number;
        guest_id: string;
        id: string;
        nightly_subtotal: number;
        nights: number;
        owner_id: string;
        payment_method: string;
        property_id: string;
        special_requests: string | null;
        status: string;
        total_amount: number;
        updated_at: string;
      }>;
      destinations: SupabaseTable<{
        country_code: string;
        created_at: string;
        id: string;
        is_active: boolean;
        name: string;
        region: string;
        slug: string;
      }>;
      listing_verifications: SupabaseTable<{
        admin_note: string | null;
        evidence: Json;
        id: string;
        property_id: string;
        reviewed_at: string | null;
        reviewed_by: string | null;
        status: string;
        submitted_at: string;
        submitted_by: string;
      }>;
      notifications: SupabaseTable<{
        body: string;
        booking_id: string | null;
        channel: string;
        created_at: string;
        error_message: string | null;
        event_type: string;
        id: string;
        provider_reference: string | null;
        recipient: string | null;
        sent_at: string | null;
        status: string;
        subject: string | null;
        user_id: string;
      }>;
      listing_inquiries: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          location: string;
          message: string | null;
          phone: string;
          property_type: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name: string;
          id?: string;
          location: string;
          message?: string | null;
          phone: string;
          property_type?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          location?: string;
          message?: string | null;
          phone?: string;
          property_type?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      saved_properties: SupabaseTable<{
        created_at: string;
        property_id: string;
        user_id: string;
      }>;
      properties: SupabaseTable<PropertyRow>;
      viewing_payments: SupabaseTable<{
        amount: number;
        created_at: string;
        id: string;
        phone: string;
        property_id: string | null;
        provider: string;
        provider_message: string | null;
        reference: string;
        status: string;
        updated_at: string;
      }>;
      property_availability: SupabaseTable<{
        id: string;
        is_available: boolean;
        nightly_rate_override: number | null;
        note: string | null;
        property_id: string;
        stay_date: string;
        updated_at: string;
      }>;
      property_reviews: SupabaseTable<{
        booking_id: string;
        created_at: string;
        guest_id: string;
        id: string;
        is_published: boolean;
        owner_response: string | null;
        property_id: string;
        rating: number;
        review_text: string | null;
        updated_at: string;
      }>;
      platform_settings: SupabaseTable<{
        booking_payment_mode: string | null;
        booking_payment_percent: number | null;
        cancellation_policy: Json | null;
        commission_bearer: string | null;
        commission_bps: number | null;
        enabled_payment_methods: string[];
        singleton: boolean;
        updated_at: string;
        updated_by: string | null;
      }>;
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_review_listing: {
        Args: { p_note?: string | null; p_property_id: string; p_status: string };
        Returns: undefined;
      };
      admin_review_refund: {
        Args: { p_note?: string | null; p_refund_id: string; p_status: string };
        Returns: undefined;
      };
      complete_booking_payment: {
        Args: { p_paid_at?: string; p_payment_id: string; p_provider_reference: string };
        Returns: string;
      };
      create_booking: {
        Args: {
          p_check_in: string;
          p_check_out: string;
          p_guest_count: number;
          p_payment_method: string;
          p_property_id: string;
          p_special_requests?: string | null;
        };
        Returns: string;
      };
      guest_cancel_booking: {
        Args: { p_booking_id: string; p_reason: string };
        Returns: string;
      };
      get_public_platform_counts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          available: number;
          confirmed_bookings: number;
          destinations: number;
          listed: number;
        }[];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      owner_update_booking_status: {
        Args: { p_booking_id: string; p_status: string };
        Returns: undefined;
      };
      request_property_owner_role: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      submit_listing_verification: {
        Args: { p_property_id: string };
        Returns: string;
      };
      unavailable_property_ids: {
        Args: { p_check_in: string; p_check_out: string; p_property_ids: string[] };
        Returns: { property_id: string }[];
      };
    };
    Enums: {
      app_role: "admin" | "agent" | "property_owner" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "agent", "property_owner", "user"],
    },
  },
} as const;
