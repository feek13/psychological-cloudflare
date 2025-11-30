/**
 * Item Bank Type Definitions
 * 题库管理类型定义
 */

// Import QuestionOption from scale types to avoid duplication
import type { QuestionOption } from './scale';

// ==================== Type Definitions ====================

// Re-export QuestionOption for convenience
export type { QuestionOption };

// Item Types (string literal union types)
export type ItemType = 'likert' | 'multiple_choice' | 'true_false' | 'open_ended' | 'scale';

// Difficulty Levels
export type DifficultyLevel = 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard';

// Item Status
export type ItemStatus = 'draft' | 'review' | 'approved' | 'active' | 'retired';

// Tag Category
export type TagCategory = 'dimension' | 'topic' | 'population' | 'clinical';

// ==================== Item Tag ====================

export interface ItemTag {
  id: string;
  name: string;
  category?: TagCategory;
  description?: string;
  created_at: string;
}

export interface ItemTagCreate {
  name: string;
  category?: TagCategory;
  description?: string;
}

// ==================== Item Bank ====================

export interface ItemBankBase {
  content: string;
  item_type: ItemType;
  options: QuestionOption[];
  domain?: string | null;
  subdomain?: string | null;
  construct?: string | null;
  cognitive_level?: string | null;
  difficulty_level: DifficultyLevel;
  estimated_difficulty?: number | null;
  discrimination_index?: number | null;
  reverse_scored: boolean;
  default_weight: number;
}

export interface ItemBankCreate extends ItemBankBase {
  tag_ids?: string[];
}

export interface ItemBankUpdate {
  content?: string;
  item_type?: ItemType;
  options?: QuestionOption[];
  domain?: string | null;
  subdomain?: string | null;
  construct?: string | null;
  cognitive_level?: string | null;
  difficulty_level?: DifficultyLevel;
  estimated_difficulty?: number | null;
  discrimination_index?: number | null;
  reverse_scored?: boolean;
  default_weight?: number;
  status?: ItemStatus;
  tag_ids?: string[];
  revision_reason?: string;
}

export interface ItemBankResponse extends ItemBankBase {
  id: string;
  created_by?: string | null;
  reviewed_by?: string | null;
  status: ItemStatus;
  version: number;
  parent_item_id?: string | null;
  usage_count: number;
  last_used_at?: string | null;
  created_at: string;
  updated_at: string;
  approved_at?: string | null;
  retired_at?: string | null;
  tags?: ItemTag[];
}

export interface ItemBankDetailResponse extends ItemBankResponse {
  statistics?: ItemStatisticsResponse;
}

// ==================== Item Statistics ====================

export interface ItemStatisticsResponse {
  id: string;
  item_id: string;
  total_responses: number;
  difficulty_index?: number | null;
  discrimination_index_ctt?: number | null;
  item_total_correlation?: number | null;
  irt_difficulty?: number | null;
  irt_discrimination?: number | null;
  irt_guessing?: number | null;
  response_distribution?: Record<string, number> | null;
  calculated_at: string;
  sample_size?: number | null;
}

// ==================== Scale Item (Mapping) ====================

export interface ScaleItem {
  id: string;
  scale_id: string;
  item_id: string;
  order_num: number;
  custom_weight?: number | null;
  custom_dimension?: string | null;
  added_at: string;
  added_by?: string | null;
  item?: ItemBankResponse;
}

export interface ScaleItemCreate {
  item_id: string;
  order_num: number;
  custom_weight?: number | null;
  custom_dimension?: string | null;
}

export interface ScaleItemUpdate {
  order_num?: number;
  custom_weight?: number | null;
  custom_dimension?: string | null;
}

// ==================== Scale Item Reorder ====================

export interface ScaleItemReorderItem {
  item_id: string;
  order_num: number;
}

export interface ScaleItemsReorderRequest {
  items: ScaleItemReorderItem[];
}

// ==================== Item Revision ====================

export interface ItemRevision {
  id: string;
  item_id: string;
  version: number;
  revision_reason: string;
  changes_made?: string | null;
  content_snapshot: Record<string, any>;
  revised_by?: string | null;
  created_at: string;
}

// ==================== Item Collection ====================

export interface ItemCollection {
  id: string;
  name: string;
  description?: string | null;
  collection_type?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

export interface ItemCollectionCreate {
  name: string;
  description?: string | null;
  collection_type?: string | null;
  item_ids?: string[];
}

export interface ItemCollectionUpdate {
  name?: string;
  description?: string | null;
  collection_type?: string | null;
}

export interface ItemCollectionDetail extends ItemCollection {
  items: ItemBankResponse[];
}

// ==================== Query Parameters ====================

export interface ItemBankListQuery {
  domain?: string;
  subdomain?: string;
  difficulty_level?: DifficultyLevel;
  status?: ItemStatus;
  item_type?: ItemType;
  tag_ids?: string[];
  created_by?: string;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  skip?: number;
  limit?: number;
}

export interface ScaleItemPoolQuery {
  domain?: string;
  subdomain?: string;
  difficulty_level?: DifficultyLevel;
  tag_ids?: string[];
  search?: string;
  exclude_scale_id?: string;
  scale_id?: string;
  min_discrimination?: number;
  skip?: number;
  limit?: number;
}

// ==================== Batch Operations ====================

export interface ItemBankBatchCreate {
  items: ItemBankCreate[];
}

export interface ItemBankBatchResponse {
  success_count?: number;
  failed_count?: number;
  created_count?: number;
  created_items?: ItemBankResponse[];
  items?: ItemBankResponse[];
  errors?: Array<Record<string, any>>;
}

// ==================== Workflow Actions ====================

export interface ItemSubmitReviewRequest {
  notes?: string;
}

export interface ItemApproveRequest {
  notes?: string;
}

export interface ItemRejectRequest {
  reason: string;
}

export interface ItemRetireRequest {
  reason: string;
}

// ==================== Statistics ====================

export interface ItemBankStats {
  total_items?: number;
  total?: number;
  status_distribution?: Record<string, number>;
  by_status?: {
    active?: number;
    draft?: number;
    review?: number;
    retired?: number;
  };
  type_distribution?: Record<string, number>;
  by_domain?: Record<string, number>;
  usage_stats?: Array<{
    id: string;
    content: string;
    domain?: string;
    subdomain?: string;
    status: ItemStatus;
    difficulty_level: DifficultyLevel;
    used_in_scales: number;
    usage_count: number;
    created_at: string;
    last_used_at?: string | null;
    difficulty_index: number;
    discrimination_index: number;
  }>;
}

// ==================== API Responses ====================

export interface ItemBankListResponse {
  items: ItemBankResponse[];
  total: number;
  skip?: number;
  limit?: number;
}

export interface ItemTagListResponse extends Array<ItemTag> {}
