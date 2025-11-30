/**
 * Item Bank Management Page
 * 题库管理页面 - 教师端
 */
import { useEffect, useState } from 'react';
import TeacherLayout from '@/components/layout/TeacherLayout';
import ItemBankCreateModal from '@/components/item-bank/ItemBankCreateModal';
import ItemBankEditModal from '@/components/item-bank/ItemBankEditModal';
import Dropdown from '@/components/ui/Dropdown';
import { itemBankAPI } from '@/api';
import type {
  ItemBankResponse,
  ItemBankListQuery,
  ItemType,
  DifficultyLevel,
  ItemStatus,
} from '@/types';
import toast from 'react-hot-toast';
import { Edit, Trash2, Plus, BookText, TrendingUp } from 'lucide-react';
import { useConfirm } from '@/hooks/useConfirm';

export default function ItemBank() {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ItemBankResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemBankResponse | null>(null);

  // Filters
  const [filters, setFilters] = useState<ItemBankListQuery>({
    status: undefined,
    item_type: undefined,
    difficulty_level: undefined,
    search: '',
    limit: 20,
    skip: 0,
  });

  useEffect(() => {
    loadItems();
  }, [filters]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const res = await itemBankAPI.list(filters);
      if (res.success) {
        setItems(res.data.items);
        setTotal(res.data.total);
      }
    } catch (error: any) {
      console.error('Failed to load items:', error);
      toast.error('加载题库列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, content: string) => {
    const confirmed = await confirm({
      title: '删除题目',
      message: `确定要删除题目 "${content.substring(0, 30)}..." 吗？此操作不可撤销。`,
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      await itemBankAPI.delete(id);
      toast.success('题目删除成功');
      loadItems();
    } catch (error: any) {
      console.error('Failed to delete item:', error);
      toast.error(error.response?.data?.detail || '删除题目失败');
    }
  };

  // Helper functions for labels and colors
  const getItemTypeLabel = (type: ItemType): string => {
    const labels: Record<ItemType, string> = {
      likert: 'Likert量表',
      multiple_choice: '单选题',
      true_false: '判断题',
      scale: '评分题',
      open_ended: '开放题',
    };
    return labels[type];
  };

  const getDifficultyLabel = (difficulty: DifficultyLevel): string => {
    const labels: Record<DifficultyLevel, string> = {
      very_easy: '非常容易',
      easy: '容易',
      medium: '中等',
      hard: '困难',
      very_hard: '非常困难',
    };
    return labels[difficulty];
  };

  const getStatusLabel = (status: ItemStatus): string => {
    const labels: Record<ItemStatus, string> = {
      draft: '草稿',
      review: '审核中',
      approved: '已批准',
      active: '使用中',
      retired: '已停用',
    };
    return labels[status];
  };

  const getStatusColor = (status: ItemStatus): string => {
    const colors: Record<ItemStatus, string> = {
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
      review: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      approved: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      active: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      retired: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    };
    return colors[status];
  };

  const getDifficultyColor = (difficulty: DifficultyLevel): string => {
    const colors: Record<DifficultyLevel, string> = {
      very_easy: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      easy: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      medium: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      hard: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
      very_hard: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    };
    return colors[difficulty];
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">题库管理</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              共 {total} 道题目
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            <Plus size={20} />
            <span>创建新题目</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                搜索
              </label>
              <input
                type="text"
                value={filters.search || ''}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value, skip: 0 })
                }
                placeholder="搜索题目内容..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Item Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                题目类型
              </label>
              <Dropdown
                value={filters.item_type || ''}
                onChange={(value) =>
                  setFilters({
                    ...filters,
                    item_type: value ? (value as ItemType) : undefined,
                    skip: 0,
                  })
                }
                options={[
                  { value: '', label: '全部类型' },
                  { value: 'likert', label: 'Likert量表' },
                  { value: 'multiple_choice', label: '单选题' },
                  { value: 'true_false', label: '判断题' },
                  { value: 'scale', label: '评分题' },
                  { value: 'open_ended', label: '开放题' },
                ]}
                searchable={false}
                className="w-full"
              />
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                难度等级
              </label>
              <Dropdown
                value={filters.difficulty_level || ''}
                onChange={(value) =>
                  setFilters({
                    ...filters,
                    difficulty_level: value ? (value as DifficultyLevel) : undefined,
                    skip: 0,
                  })
                }
                options={[
                  { value: '', label: '全部难度' },
                  { value: 'very_easy', label: '非常容易' },
                  { value: 'easy', label: '容易' },
                  { value: 'medium', label: '中等' },
                  { value: 'hard', label: '困难' },
                  { value: 'very_hard', label: '非常困难' },
                ]}
                searchable={false}
                className="w-full"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                状态
              </label>
              <Dropdown
                value={filters.status || ''}
                onChange={(value) =>
                  setFilters({
                    ...filters,
                    status: value ? (value as ItemStatus) : undefined,
                    skip: 0,
                  })
                }
                options={[
                  { value: '', label: '全部状态' },
                  { value: 'draft', label: '草稿' },
                  { value: 'review', label: '审核中' },
                  { value: 'approved', label: '已批准' },
                  { value: 'active', label: '使用中' },
                  { value: 'retired', label: '已停用' },
                ]}
                searchable={false}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Items List */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">加载中...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <BookText size={48} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">暂无题目</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {filters.search || filters.item_type || filters.difficulty_level || filters.status
                ? '没有符合筛选条件的题目'
                : '点击右上角按钮创建您的第一道题目'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start">
                  {/* Item Info */}
                  <div className="flex-1">
                    <div className="flex items-start space-x-3">
                      <BookText
                        size={24}
                        className="text-indigo-600 dark:text-indigo-400 mt-1 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        {/* Header badges */}
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                            {getItemTypeLabel(item.item_type)}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(item.difficulty_level)}`}
                          >
                            {getDifficultyLabel(item.difficulty_level)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            v{item.version}
                          </span>
                        </div>

                        {/* Content */}
                        <p className="text-gray-900 dark:text-white mb-3 line-clamp-2">
                          {item.content}
                        </p>

                        {/* Metadata */}
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                          {item.domain && (
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">领域:</span>
                              <span>{item.domain}</span>
                              {item.subdomain && <span> / {item.subdomain}</span>}
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <span className="font-medium">权重:</span>
                            <span>{item.default_weight}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="font-medium">选项数:</span>
                            <span>{item.options.length}</span>
                          </div>
                          {item.usage_count > 0 && (
                            <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                              <TrendingUp size={14} />
                              <span>使用 {item.usage_count} 次</span>
                            </div>
                          )}
                          {item.reverse_scored && (
                            <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded text-xs">
                              反向计分
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors"
                      title="编辑题目"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.content)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                      title="删除题目"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > filters.limit! && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                显示 {filters.skip! + 1} - {Math.min(filters.skip! + filters.limit!, total)} / 共{' '}
                {total} 条
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilters({ ...filters, skip: Math.max(0, filters.skip! - filters.limit!) })}
                  disabled={filters.skip === 0}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  上一页
                </button>
                <button
                  onClick={() => setFilters({ ...filters, skip: filters.skip! + filters.limit! })}
                  disabled={filters.skip! + filters.limit! >= total}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ItemBankCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadItems}
      />

      <ItemBankEditModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        onSuccess={loadItems}
        item={editingItem}
      />
    </TeacherLayout>
  );
}
