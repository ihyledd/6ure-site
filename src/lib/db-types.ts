/** Request status (matches DB enum / string). */
export type RequestStatus = "pending" | "completed" | "rejected" | "cancelled";

export interface RequestData {
  id: number;
  user_id: string | null;
  creator_url: string;
  product_url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  price: string | null;
  status: RequestStatus;
  upvotes: number;
  views: number;
  comments_locked: boolean;
  anonymous: boolean;
  created_at: string;
  updated_at: string;
  username: string;
  avatar: string | null;
  avatar_decoration?: string | null;
  patreon_premium: boolean;
  has_priority: boolean;
  is_staff: boolean;
  comments_count: number;
  creator_name?: string | null;
  creator_avatar?: string | null;
  creator_platform?: string | null;
  leak_message_url?: string | null;
  cancel_requested_at?: string | null;
  cancel_reason?: string | null;
  cancel_approved_at?: string | null;
  cancel_rejected_at?: string | null;
  cancel_rejection_reason?: string | null;
}

export interface LeakInfo {
  name: string;
  editor?: string | null;
  place: string;
  premium?: boolean;
  discordMessageUrl?: string | null;
  thumbnail?: string | null;
}

export interface ProtectionCheckResult {
  protected: boolean;
  error?: string;
  group?: string;
  reason?: string;
  url?: string;
}
