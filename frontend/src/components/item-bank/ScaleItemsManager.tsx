/**
 * ScaleItemsManager Component
 * 量表题目管理器 - 用于管理量表中的题目(排序、删除、配置)
 */
import { useState, useEffect } from 'react';
import { itemBankAPI } from '@/api/item-bank';
import type {
  ScaleItem,
  ScaleItemUpdate,
  DifficultyLevel,
  ItemType,
} from '@/types/item-bank';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Loading from '@/components/ui/Loading';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

// Difficulty level display config
const DIFFICULTY_CONFIG: Record<DifficultyLevel, { label: string; color: string }> = {
  very_easy: { label: '非常简单', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' },
  easy: { label: '简单', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' },
  medium: { label: '中等', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' },
  hard: { label: '困难', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100' },
  very_hard: { label: '非常困难', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' },
};

// Item type display config
const ITEM_TYPE_CONFIG: Record<ItemType, string> = {
  likert: '李克特量表',
  multiple_choice: '多选题',
  true_false: '是非题',
  open_ended: '开放题',
  scale: '量表',
};

interface ScaleItemsManagerProps {
  scaleId: string;
  onUpdate?: () => void;
}

interface EditingConfig {
  itemId: string;
  custom_weight?: number;
  custom_dimension?: string;
}

export default function ScaleItemsManager({ scaleId, onUpdate }: ScaleItemsManagerProps) {
  const [items, setItems] = useState<ScaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [draggedItem, setDraggedItem] = useState<ScaleItem | null>(null);
  const [editingConfig, setEditingConfig] = useState<EditingConfig | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  // Fetch scale items
  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await itemBankAPI.getScaleItems(scaleId);
      if (response.data) {
        // Backend returns array directly in data, not data.items
        const itemsArray = Array.isArray(response.data) ? response.data : [];
        setItems(itemsArray.sort((a: ScaleItem, b: ScaleItem) => a.order_num - b.order_num));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '获取量表题目失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [scaleId]);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, item: ScaleItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = async (e: React.DragEvent, targetItem: ScaleItem) => {
    e.preventDefault();

    if (!draggedItem || draggedItem.id === targetItem.id) {
      setDraggedItem(null);
      return;
    }

    const oldIndex = items.findIndex((i) => i.id === draggedItem.id);
    const newIndex = items.findIndex((i) => i.id === targetItem.id);

    const newItems = [...items];
    newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, draggedItem);

    // Update order_num for all items
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      order_num: index + 1,
    }));

    setItems(updatedItems);
    setDraggedItem(null);

    // Save new order to backend
    try {
      await itemBankAPI.reorderScaleItems(
        scaleId,
        updatedItems.map((item) => ({
          item_id: item.item_id,
          order_num: item.order_num,
        }))
      );
      toast.success('题目顺序已更新');
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '更新顺序失败');
      fetchItems(); // Reload to revert changes
    }
  };

  // Handle delete item
  const handleDeleteItem = async (itemId: string) => {
    try {
      await itemBankAPI.removeItemFromScale(scaleId, itemId);
      toast.success('题目已删除');
      setDeleteConfirm(null);
      fetchItems();
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '删除题目失败');
    }
  };

  // Start editing config
  const startEditingConfig = (item: ScaleItem) => {
    setEditingConfig({
      itemId: item.item_id,
      custom_weight: item.custom_weight ?? item.item?.default_weight ?? 1,
      custom_dimension: item.custom_dimension ?? item.item?.domain ?? '',
    });
  };

  // Save config changes
  const handleSaveConfig = async () => {
    if (!editingConfig) return;

    setSavingConfig(true);
    try {
      const updateData: ScaleItemUpdate = {
        custom_weight: editingConfig.custom_weight,
        custom_dimension: editingConfig.custom_dimension || undefined,
      };

      await itemBankAPI.updateScaleItem(scaleId, editingConfig.itemId, updateData);
      toast.success('配置已更新');
      setEditingConfig(null);
      fetchItems();
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '更新配置失败');
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loading size="lg" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          当前量表暂无题目
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          点击"从题库添加题目"按钮选择题目
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Items list */}
      {items.map((scaleItem) => {
        const item = scaleItem.item;
        if (!item) return null;

        const isEditing = editingConfig?.itemId === scaleItem.item_id;

        return (
          <Card
            key={scaleItem.id}
            className={`transition-all ${
              draggedItem?.id === scaleItem.id ? 'opacity-50' : ''
            }`}
            padding="md"
            hover={false}
            draggable
            onDragStart={(e) => handleDragStart(e, scaleItem)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, scaleItem)}
          >
            <div className="flex items-start gap-4">
              {/* Drag handle */}
              <div className="flex-shrink-0 cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-1">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </div>

              {/* Order number */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-semibold">
                {scaleItem.order_num}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Title and badges */}
                <div className="flex items-start gap-3 mb-2">
                  <p className="flex-1 text-gray-900 dark:text-white font-medium">
                    {item.content}
                  </p>
                  <div className="flex gap-2 flex-shrink-0">
                    <Badge className={DIFFICULTY_CONFIG[item.difficulty_level].color}>
                      {DIFFICULTY_CONFIG[item.difficulty_level].label}
                    </Badge>
                    <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                      {ITEM_TYPE_CONFIG[item.item_type]}
                    </Badge>
                  </div>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {item.domain && (
                    <span>
                      <span className="font-medium">领域:</span> {item.domain}
                    </span>
                  )}
                  {item.subdomain && (
                    <span>
                      <span className="font-medium">子领域:</span> {item.subdomain}
                    </span>
                  )}
                  {scaleItem.custom_weight !== null && (
                    <span>
                      <span className="font-medium">权重:</span> {scaleItem.custom_weight}
                    </span>
                  )}
                  {scaleItem.custom_dimension && (
                    <span>
                      <span className="font-medium">自定义维度:</span> {scaleItem.custom_dimension}
                    </span>
                  )}
                </div>

                {/* Config editing form */}
                {isEditing ? (
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          自定义权重
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          value={editingConfig.custom_weight || ''}
                          onChange={(e) =>
                            setEditingConfig({
                              ...editingConfig,
                              custom_weight: parseFloat(e.target.value) || 1,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          自定义维度
                        </label>
                        <input
                          type="text"
                          value={editingConfig.custom_dimension || ''}
                          onChange={(e) =>
                            setEditingConfig({
                              ...editingConfig,
                              custom_dimension: e.target.value,
                            })
                          }
                          placeholder="选填"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={() => setEditingConfig(null)}
                        variant="secondary"
                        size="sm"
                      >
                        取消
                      </Button>
                      <Button
                        onClick={handleSaveConfig}
                        variant="primary"
                        size="sm"
                        disabled={savingConfig}
                      >
                        {savingConfig ? '保存中...' : '保存'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => startEditingConfig(scaleItem)}
                      variant="secondary"
                      size="sm"
                    >
                      配置
                    </Button>
                    <Button
                      onClick={() => setDeleteConfirm(scaleItem.item_id)}
                      variant="danger"
                      size="sm"
                    >
                      删除
                    </Button>
                  </div>
                )}

                {/* Options preview */}
                {item.options && item.options.length > 0 && !isEditing && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.options.slice(0, 5).map((opt, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                      >
                        {opt.label} ({opt.value})
                      </span>
                    ))}
                    {item.options.length > 5 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        +{item.options.length - 5} 更多
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {/* Summary */}
      <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
        共 {items.length} 个题目 · 拖拽题目可调整顺序
      </div>

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={!!deleteConfirm}
          title="删除题目"
          message="确定要从量表中删除这个题目吗?此操作不可恢复。"
          confirmText="删除"
          cancelText="取消"
          onConfirm={() => handleDeleteItem(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
          variant="danger"
        />
      )}
    </div>
  );
}
