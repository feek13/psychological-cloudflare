/**
 * Item Bank API Client
 * 题库管理 API 客户端
 *
 * Uses Supabase directly for all database operations
 */

import supabase, { getCurrentUser, getUserProfile } from './supabase';
import type { APIResponse } from '@/types';
import type {
  ItemBankResponse,
  ItemBankDetailResponse,
  ItemBankCreate,
  ItemBankUpdate,
  ItemBankListQuery,
  ItemBankListResponse,
  ItemBankStats,
  ItemTag,
  ItemTagCreate,
  ItemCollection,
  ItemCollectionCreate,
  ItemCollectionUpdate,
  ItemCollectionDetail,
  ScaleItem,
  ScaleItemCreate,
  ScaleItemUpdate,
  ScaleItemPoolQuery,
  ItemSubmitReviewRequest,
  ItemApproveRequest,
  ItemRejectRequest,
  ItemRetireRequest,
  ItemBankBatchCreate,
  ItemBankBatchResponse,
  ItemRevision,
} from '@/types/item-bank';

// Helper to format response
const formatResponse = <T>(data: T): APIResponse<T> => ({
  success: true,
  data
});

export const itemBankAPI = {
  // ==================== Item CRUD Operations ====================

  /**
   * List items with filters and pagination
   * 列出题目（带筛选和分页）
   */
  list: async (query?: ItemBankListQuery): Promise<APIResponse<ItemBankListResponse>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    let dbQuery = supabase
      .from('item_bank')
      .select('*', { count: 'exact' });

    // Apply filters
    if (query?.status) {
      dbQuery = dbQuery.eq('status', query.status);
    }
    if (query?.domain) {
      dbQuery = dbQuery.eq('domain', query.domain);
    }
    if (query?.difficulty_level) {
      dbQuery = dbQuery.eq('difficulty_level', query.difficulty_level);
    }
    if (query?.item_type) {
      dbQuery = dbQuery.eq('item_type', query.item_type);
    }
    if (query?.search) {
      dbQuery = dbQuery.ilike('content', `%${query.search}%`);
    }
    if (query?.created_by) {
      dbQuery = dbQuery.eq('created_by', query.created_by);
    }

    // Pagination
    const skip = query?.skip || 0;
    const limit = query?.limit || 20;
    dbQuery = dbQuery.range(skip, skip + limit - 1);
    dbQuery = dbQuery.order('created_at', { ascending: false });

    const { data: items, count, error } = await dbQuery;
    if (error) throw error;

    // Get tags for items
    const itemsWithTags = await enrichItemsWithTags(items || []);

    return formatResponse({
      items: itemsWithTags,
      total: count || 0
    });
  },

  /**
   * Get a single item by ID
   * 获取单个题目详情
   */
  get: async (id: string): Promise<APIResponse<ItemBankDetailResponse>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data: item, error } = await supabase
      .from('item_bank')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!item) throw new Error('Item not found');

    // Get tags
    const [enriched] = await enrichItemsWithTags([item]);

    // Get usage statistics
    const { count: scaleCount } = await supabase
      .from('scale_items')
      .select('*', { count: 'exact', head: true })
      .eq('item_id', id);

    return formatResponse({
      ...enriched,
      usage_count: scaleCount || 0
    } as ItemBankDetailResponse);
  },

  /**
   * Create a new item
   * 创建新题目
   */
  create: async (data: ItemBankCreate): Promise<APIResponse<ItemBankResponse>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const profile = await getUserProfile();
    if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
      throw new Error('Only teachers and admins can create items');
    }

    const itemData = {
      content: data.content,
      item_type: data.item_type || 'likert',
      options: data.options,
      domain: data.domain || null,
      subdomain: data.subdomain || null,
      difficulty_level: data.difficulty_level || 'medium',
      default_weight: data.default_weight || 1.0,
      reverse_scored: data.reverse_scored || false,
      cognitive_level: data.cognitive_level || null,
      created_by: user.id,
      status: 'draft',
      created_at: new Date().toISOString()
    };

    const { data: item, error } = await supabase
      .from('item_bank')
      .insert(itemData)
      .select()
      .single();

    if (error) throw error;

    // Add tags if provided
    if (data.tag_ids && data.tag_ids.length > 0) {
      const tagMappings = data.tag_ids.map(tagId => ({
        item_id: item.id,
        tag_id: tagId
      }));
      await supabase.from('item_tag_mappings').insert(tagMappings);
    }

    return formatResponse(item as ItemBankResponse);
  },

  /**
   * Update an existing item
   * 更新题目
   */
  update: async (id: string, data: ItemBankUpdate): Promise<APIResponse<ItemBankResponse>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Check ownership
    const { data: existing, error: fetchError } = await supabase
      .from('item_bank')
      .select('created_by, status')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!existing) throw new Error('Item not found');

    const profile = await getUserProfile();
    if (existing.created_by !== user.id && profile?.role !== 'admin') {
      throw new Error('Not authorized to update this item');
    }

    // Build update data
    const updateData: any = {};
    if (data.content !== undefined) updateData.content = data.content;
    if (data.options !== undefined) updateData.options = data.options;
    if (data.domain !== undefined) updateData.domain = data.domain;
    if (data.subdomain !== undefined) updateData.subdomain = data.subdomain;
    if (data.difficulty_level !== undefined) updateData.difficulty_level = data.difficulty_level;
    if (data.default_weight !== undefined) updateData.default_weight = data.default_weight;
    if (data.reverse_scored !== undefined) updateData.reverse_scored = data.reverse_scored;
    if (data.cognitive_level !== undefined) updateData.cognitive_level = data.cognitive_level;
    updateData.updated_at = new Date().toISOString();

    const { data: item, error } = await supabase
      .from('item_bank')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update tags if provided
    if (data.tag_ids !== undefined) {
      // Remove existing tags
      await supabase.from('item_tag_mappings').delete().eq('item_id', id);

      // Add new tags
      if (data.tag_ids.length > 0) {
        const tagMappings = data.tag_ids.map(tagId => ({
          item_id: id,
          tag_id: tagId
        }));
        await supabase.from('item_tag_mappings').insert(tagMappings);
      }
    }

    return formatResponse(item as ItemBankResponse);
  },

  /**
   * Delete an item (soft delete - sets status to retired)
   * 删除题目（软删除 - 状态设为已退役）
   */
  delete: async (id: string): Promise<APIResponse> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data: existing, error: fetchError } = await supabase
      .from('item_bank')
      .select('created_by')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!existing) throw new Error('Item not found');

    const profile = await getUserProfile();
    if (existing.created_by !== user.id && profile?.role !== 'admin') {
      throw new Error('Not authorized to delete this item');
    }

    const { error } = await supabase
      .from('item_bank')
      .update({ status: 'retired' })
      .eq('id', id);

    if (error) throw error;

    return formatResponse({ message: 'Item retired successfully' });
  },

  // ==================== Tag Management ====================

  /**
   * List all tags
   * 列出所有标签
   */
  listTags: async (): Promise<APIResponse<ItemTag[]>> => {
    const { data: tags, error } = await supabase
      .from('item_tags')
      .select('*')
      .order('category')
      .order('name');

    if (error) throw error;
    return formatResponse(tags || []);
  },

  /**
   * Create a new tag (Admin only)
   * 创建新标签（仅管理员）
   */
  createTag: async (data: ItemTagCreate): Promise<APIResponse<ItemTag>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const profile = await getUserProfile();
    if (profile?.role !== 'admin') {
      throw new Error('Only admins can create tags');
    }

    const { data: tag, error } = await supabase
      .from('item_tags')
      .insert({
        name: data.name,
        category: data.category,
        description: data.description || null
      })
      .select()
      .single();

    if (error) throw error;
    return formatResponse(tag as ItemTag);
  },

  // ==================== Item Collections ====================

  /**
   * List all collections
   * 列出所有题目集合
   */
  listCollections: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<APIResponse<{ items: ItemCollection[]; total: number }>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const skip = params?.skip || 0;
    const limit = params?.limit || 20;

    const { data: collections, count, error } = await supabase
      .from('item_collections')
      .select('*', { count: 'exact' })
      .range(skip, skip + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return formatResponse({
      items: collections || [],
      total: count || 0
    });
  },

  /**
   * Get collection details with items
   * 获取集合详情（包含题目列表）
   */
  getCollection: async (id: string): Promise<APIResponse<ItemCollectionDetail>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data: collection, error } = await supabase
      .from('item_collections')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!collection) throw new Error('Collection not found');

    // Get items in collection
    const { data: mappings } = await supabase
      .from('collection_items')
      .select('item_id')
      .eq('collection_id', id);

    const itemIds = (mappings || []).map(m => m.item_id);

    let items: ItemBankResponse[] = [];
    if (itemIds.length > 0) {
      const { data: itemsData } = await supabase
        .from('item_bank')
        .select('*')
        .in('id', itemIds);
      items = (await enrichItemsWithTags(itemsData || [])) as ItemBankResponse[];
    }

    return formatResponse({
      ...collection,
      items
    } as ItemCollectionDetail);
  },

  /**
   * Create a new collection
   * 创建新集合
   */
  createCollection: async (data: ItemCollectionCreate): Promise<APIResponse<ItemCollection>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data: collection, error } = await supabase
      .from('item_collections')
      .insert({
        name: data.name,
        description: data.description || null,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    return formatResponse(collection as ItemCollection);
  },

  /**
   * Update a collection
   * 更新集合
   */
  updateCollection: async (
    id: string,
    data: ItemCollectionUpdate
  ): Promise<APIResponse<ItemCollection>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;

    const { data: collection, error } = await supabase
      .from('item_collections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return formatResponse(collection as ItemCollection);
  },

  /**
   * Delete a collection
   * 删除集合
   */
  deleteCollection: async (id: string): Promise<APIResponse> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Delete collection items first
    await supabase.from('collection_items').delete().eq('collection_id', id);

    const { error } = await supabase
      .from('item_collections')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return formatResponse({ message: 'Collection deleted successfully' });
  },

  /**
   * Add items to a collection
   * 向集合添加题目
   */
  addItemsToCollection: async (
    collectionId: string,
    itemIds: string[]
  ): Promise<APIResponse> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const mappings = itemIds.map(itemId => ({
      collection_id: collectionId,
      item_id: itemId
    }));

    const { error } = await supabase
      .from('collection_items')
      .insert(mappings);

    if (error) throw error;

    return formatResponse({ message: 'Items added to collection' });
  },

  /**
   * Remove an item from a collection
   * 从集合中移除题目
   */
  removeItemFromCollection: async (collectionId: string, itemId: string): Promise<APIResponse> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('collection_id', collectionId)
      .eq('item_id', itemId);

    if (error) throw error;

    return formatResponse({ message: 'Item removed from collection' });
  },

  // ==================== Workflow Actions ====================

  /**
   * Submit an item for review
   * 提交题目审核
   */
  submitForReview: async (
    itemId: string,
    _data?: ItemSubmitReviewRequest
  ): Promise<APIResponse<ItemBankResponse>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data: item, error } = await supabase
      .from('item_bank')
      .update({ status: 'review' })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;

    return formatResponse(item as ItemBankResponse);
  },

  /**
   * Approve an item (Admin only)
   * 批准题目（仅管理员）
   */
  approve: async (
    itemId: string,
    _data?: ItemApproveRequest
  ): Promise<APIResponse<ItemBankResponse>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const profile = await getUserProfile();
    if (profile?.role !== 'admin') {
      throw new Error('Only admins can approve items');
    }

    const { data: item, error } = await supabase
      .from('item_bank')
      .update({ status: 'active' })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;

    return formatResponse(item as ItemBankResponse);
  },

  /**
   * Reject an item (Admin only)
   * 驳回题目（仅管理员）
   */
  reject: async (itemId: string, data: ItemRejectRequest): Promise<APIResponse<ItemBankResponse>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const profile = await getUserProfile();
    if (profile?.role !== 'admin') {
      throw new Error('Only admins can reject items');
    }

    const { data: item, error } = await supabase
      .from('item_bank')
      .update({
        status: 'draft',
        metadata: { rejection_reason: data.reason }
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;

    return formatResponse(item as ItemBankResponse);
  },

  /**
   * Retire an item (Admin only)
   * 退役题目（仅管理员）
   */
  retire: async (itemId: string, data: ItemRetireRequest): Promise<APIResponse<ItemBankResponse>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const profile = await getUserProfile();
    if (profile?.role !== 'admin') {
      throw new Error('Only admins can retire items');
    }

    const { data: item, error } = await supabase
      .from('item_bank')
      .update({
        status: 'retired',
        metadata: { retirement_reason: data.reason }
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;

    return formatResponse(item as ItemBankResponse);
  },

  // ==================== Statistics ====================

  /**
   * Get item bank statistics
   * 获取题库统计信息
   */
  getStats: async (): Promise<APIResponse<ItemBankStats>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Count by status
    const { count: totalCount } = await supabase
      .from('item_bank')
      .select('*', { count: 'exact', head: true });

    const { count: activeCount } = await supabase
      .from('item_bank')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: draftCount } = await supabase
      .from('item_bank')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft');

    const { count: reviewCount } = await supabase
      .from('item_bank')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'review');

    const { count: retiredCount } = await supabase
      .from('item_bank')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'retired');

    // Count by domain
    const { data: domainData } = await supabase
      .from('item_bank')
      .select('domain');

    const domainCounts: Record<string, number> = {};
    for (const item of (domainData || [])) {
      const domain = item.domain || 'uncategorized';
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    }

    return formatResponse({
      total: totalCount || 0,
      by_status: {
        active: activeCount || 0,
        draft: draftCount || 0,
        review: reviewCount || 0,
        retired: retiredCount || 0
      },
      by_domain: domainCounts
    } as ItemBankStats);
  },

  // ==================== Batch Operations ====================

  /**
   * Batch create items
   * 批量创建题目
   */
  batchCreate: async (data: ItemBankBatchCreate): Promise<APIResponse<ItemBankBatchResponse>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const profile = await getUserProfile();
    if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
      throw new Error('Only teachers and admins can create items');
    }

    const itemsData = data.items.map(item => ({
      content: item.content,
      item_type: item.item_type || 'likert',
      options: item.options,
      domain: item.domain || null,
      subdomain: item.subdomain || null,
      difficulty_level: item.difficulty_level || 'medium',
      default_weight: item.default_weight || 1.0,
      reverse_scored: item.reverse_scored || false,
      created_by: user.id,
      status: 'draft',
      created_at: new Date().toISOString()
    }));

    const { data: items, error } = await supabase
      .from('item_bank')
      .insert(itemsData)
      .select();

    if (error) throw error;

    return formatResponse({
      created_count: items?.length || 0,
      items: items || []
    } as ItemBankBatchResponse);
  },

  // ==================== Item Revisions ====================

  /**
   * Get revision history for an item
   * 获取题目修订历史
   */
  getRevisions: async (
    itemId: string,
    params?: { skip?: number; limit?: number }
  ): Promise<APIResponse<{ items: ItemRevision[]; total: number }>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const skip = params?.skip || 0;
    const limit = params?.limit || 20;

    const { data: revisions, count, error } = await supabase
      .from('item_revisions')
      .select('*', { count: 'exact' })
      .eq('item_id', itemId)
      .range(skip, skip + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return formatResponse({
      items: revisions || [],
      total: count || 0
    });
  },

  // ==================== Scale Integration ====================

  /**
   * Get items for a specific scale
   * 获取量表关联的题目
   */
  getScaleItems: async (
    scaleId: string,
    params?: { skip?: number; limit?: number }
  ): Promise<APIResponse<{ items: ScaleItem[]; total: number }>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('scale_items')
      .select('*', { count: 'exact' })
      .eq('scale_id', scaleId)
      .order('order_num');

    if (params?.skip !== undefined && params?.limit !== undefined) {
      query = query.range(params.skip, params.skip + params.limit - 1);
    }

    const { data: scaleItems, count, error } = await query;
    if (error) throw error;

    // Get item details
    const itemIds = (scaleItems || []).map(si => si.item_id);
    let items: any[] = [];

    if (itemIds.length > 0) {
      const { data: itemsData } = await supabase
        .from('item_bank')
        .select('*')
        .in('id', itemIds);
      items = await enrichItemsWithTags(itemsData || []);
    }

    const itemMap = new Map(items.map(i => [i.id, i]));

    // Merge scale item config with item details
    const result = (scaleItems || []).map(si => ({
      ...si,
      item: itemMap.get(si.item_id) || null
    }));

    return formatResponse({
      items: result as ScaleItem[],
      total: count || 0
    });
  },

  /**
   * Add an item to a scale
   * 向量表添加题目
   */
  addItemToScale: async (scaleId: string, data: ScaleItemCreate): Promise<APIResponse<ScaleItem>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Get next order number
    const { data: existingItems } = await supabase
      .from('scale_items')
      .select('order_num')
      .eq('scale_id', scaleId)
      .order('order_num', { ascending: false })
      .limit(1);

    const nextOrder = existingItems && existingItems.length > 0
      ? existingItems[0].order_num + 1
      : 1;

    const scaleItemData = {
      scale_id: scaleId,
      item_id: data.item_id,
      order_num: data.order_num || nextOrder,
      custom_weight: data.custom_weight || null,
      custom_dimension: data.custom_dimension || null,
      added_by: user.id
    };

    const { data: scaleItem, error } = await supabase
      .from('scale_items')
      .insert(scaleItemData)
      .select()
      .single();

    if (error) throw error;

    return formatResponse(scaleItem as ScaleItem);
  },

  /**
   * Update scale-item mapping
   * 更新量表-题目关联
   */
  updateScaleItem: async (
    scaleId: string,
    itemId: string,
    data: ScaleItemUpdate
  ): Promise<APIResponse<ScaleItem>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const updateData: any = {};
    if (data.order_num !== undefined) updateData.order_num = data.order_num;
    if (data.custom_weight !== undefined) updateData.custom_weight = data.custom_weight;
    if (data.custom_dimension !== undefined) updateData.custom_dimension = data.custom_dimension;

    const { data: scaleItem, error } = await supabase
      .from('scale_items')
      .update(updateData)
      .eq('scale_id', scaleId)
      .eq('item_id', itemId)
      .select()
      .single();

    if (error) throw error;

    return formatResponse(scaleItem as ScaleItem);
  },

  /**
   * Remove an item from a scale
   * 从量表中移除题目
   */
  removeItemFromScale: async (scaleId: string, itemId: string): Promise<APIResponse> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('scale_items')
      .delete()
      .eq('scale_id', scaleId)
      .eq('item_id', itemId);

    if (error) throw error;

    return formatResponse({ message: 'Item removed from scale' });
  },

  /**
   * Get available items pool for a scale (items not yet in the scale)
   * 获取量表可用题目池（尚未添加到量表的题目）
   */
  getScaleItemPool: async (
    query?: ScaleItemPoolQuery
  ): Promise<APIResponse<{ items: ItemBankResponse[]; total: number }>> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Get items already in the scale
    let excludeIds: string[] = [];
    if (query?.scale_id) {
      const { data: scaleItems } = await supabase
        .from('scale_items')
        .select('item_id')
        .eq('scale_id', query.scale_id);
      excludeIds = (scaleItems || []).map(si => si.item_id);
    }

    // Build query for available items
    let dbQuery = supabase
      .from('item_bank')
      .select('*', { count: 'exact' })
      .eq('status', 'active');

    if (excludeIds.length > 0) {
      dbQuery = dbQuery.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    // Apply filters
    if (query?.domain) {
      dbQuery = dbQuery.eq('domain', query.domain);
    }
    if (query?.search) {
      dbQuery = dbQuery.ilike('content', `%${query.search}%`);
    }

    // Pagination
    const skip = query?.skip || 0;
    const limit = query?.limit || 20;
    dbQuery = dbQuery.range(skip, skip + limit - 1);
    dbQuery = dbQuery.order('created_at', { ascending: false });

    const { data: items, count, error } = await dbQuery;
    if (error) throw error;

    const enrichedItems = await enrichItemsWithTags(items || []);

    return formatResponse({
      items: enrichedItems as ItemBankResponse[],
      total: count || 0
    });
  },

  /**
   * Reorder items in a scale
   * 重新排序量表中的题目
   */
  reorderScaleItems: async (
    scaleId: string,
    itemOrders: Array<{ item_id: string; order_num: number }>
  ): Promise<APIResponse> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Update each item's order
    for (const { item_id, order_num } of itemOrders) {
      await supabase
        .from('scale_items')
        .update({ order_num })
        .eq('scale_id', scaleId)
        .eq('item_id', item_id);
    }

    return formatResponse({ message: 'Items reordered successfully' });
  },
};

/**
 * Helper: Enrich items with their tags
 */
async function enrichItemsWithTags(items: any[]): Promise<any[]> {
  if (items.length === 0) return [];

  const itemIds = items.map(i => i.id);

  // Get tag mappings
  const { data: mappings } = await supabase
    .from('item_tag_mappings')
    .select('item_id, tag_id')
    .in('item_id', itemIds);

  // Get unique tag IDs
  const tagIds = [...new Set((mappings || []).map(m => m.tag_id))];

  // Get tag details
  let tags: ItemTag[] = [];
  if (tagIds.length > 0) {
    const { data: tagsData } = await supabase
      .from('item_tags')
      .select('*')
      .in('id', tagIds);
    tags = tagsData || [];
  }

  const tagMap = new Map(tags.map(t => [t.id, t]));

  // Build item-tags mapping
  const itemTagsMap = new Map<string, ItemTag[]>();
  for (const mapping of (mappings || [])) {
    const tag = tagMap.get(mapping.tag_id);
    if (tag) {
      const existing = itemTagsMap.get(mapping.item_id) || [];
      existing.push(tag);
      itemTagsMap.set(mapping.item_id, existing);
    }
  }

  // Enrich items
  return items.map(item => ({
    ...item,
    tags: itemTagsMap.get(item.id) || []
  }));
}
