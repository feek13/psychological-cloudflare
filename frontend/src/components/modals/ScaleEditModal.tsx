/**
 * ScaleEditModal Component
 * 量表编辑 Modal - 集成基本信息编辑和题库题目管理
 */
import { useState, useEffect } from 'react';
import { Brain, User, Heart, Plus } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import Tabs from '@/components/ui/Tabs';
import { scalesAPI, itemBankAPI } from '@/api';
import type { Scale, ScaleUpdate } from '@/types';
import type { ItemBankResponse } from '@/types/item-bank';
import ScaleItemsManager from '@/components/item-bank/ScaleItemsManager';
import ItemSelector from '@/components/item-bank/ItemSelector';
import toast from 'react-hot-toast';

interface ScaleEditModalProps {
  isOpen: boolean;
  scale: Scale;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ScaleEditModal({ isOpen, scale, onClose, onSuccess }: ScaleEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'items'>('basic');
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [itemsRefreshKey, setItemsRefreshKey] = useState(0);
  const [isAddingItems, setIsAddingItems] = useState(false);

  const [formData, setFormData] = useState<ScaleUpdate>({
    code: scale.code,
    name: scale.name,
    category: scale.category,
    version: scale.version,
    description: scale.description || '',
    total_questions: scale.total_questions,
    estimated_duration: scale.estimated_duration || 0,
    is_active: scale.is_active,
    is_public: scale.is_public,
    scoring_config: scale.scoring_config,
  });

  // Reset form when scale changes
  useEffect(() => {
    setFormData({
      code: scale.code,
      name: scale.name,
      category: scale.category,
      version: scale.version,
      description: scale.description || '',
      total_questions: scale.total_questions,
      estimated_duration: scale.estimated_duration || 0,
      is_active: scale.is_active,
      is_public: scale.is_public,
      scoring_config: scale.scoring_config,
    });
  }, [scale]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.code?.trim()) {
      toast.error('请输入量表代码');
      return;
    }
    if (!formData.name?.trim()) {
      toast.error('请输入量表名称');
      return;
    }
    if (formData.total_questions !== undefined && formData.total_questions <= 0) {
      toast.error('题目数必须大于0');
      return;
    }

    try {
      setLoading(true);
      await scalesAPI.update(scale.id, formData);
      toast.success('量表更新成功');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Failed to update scale:', error);

      let errorMessage = '更新量表失败';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          errorMessage = detail.map((err: any) => err.msg || '').join(', ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveTab('basic');
    setShowItemSelector(false);
    onClose();
  };

  // Handle adding items from item bank
  const handleItemsSelected = async (items: ItemBankResponse[]) => {
    if (items.length === 0) return;

    // Prevent double-clicks
    if (isAddingItems) return;
    setIsAddingItems(true);

    let successCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

    try {
      // Add items to scale sequentially, continue on duplicate errors
      for (const item of items) {
        try {
          await itemBankAPI.addItemToScale(scale.id, {
            item_id: item.id,
            order_num: 0, // Backend will auto-increment
          });
          successCount++;
        } catch (error: any) {
          const detail = error.response?.data?.detail;
          const status = error.response?.status;

          if (status === 409) {
            // 409 Conflict - item already in scale, skip silently
            skipCount++;
          } else {
            // Other errors
            let errorMessage = '添加题目失败';

            if (typeof detail === 'string') {
              errorMessage = detail;
            } else if (Array.isArray(detail) && detail.length > 0) {
              // Extract first error message from Pydantic validation errors
              errorMessage = detail[0].msg || detail[0].type || '添加题目失败';
            }

            errors.push(errorMessage);
          }
        }
      }

      // Show results and always close the selector
      if (successCount > 0) {
        if (skipCount > 0) {
          toast.success(`已添加 ${successCount} 个题目，跳过 ${skipCount} 个已存在的题目`);
        } else {
          toast.success(`已添加 ${successCount} 个题目`);
        }
        setItemsRefreshKey(prev => prev + 1); // Force refresh ScaleItemsManager
        onSuccess(); // Update total_questions count
      } else if (skipCount > 0) {
        toast('所有选择的题目都已在量表中', { icon: 'ℹ️' });
      } else if (errors.length > 0) {
        toast.error(`添加失败: ${errors[0]}`);
      }

      // Always close the selector after processing
      setShowItemSelector(false);
    } finally {
      setIsAddingItems(false);
    }
  };

  // Handle items update (deletion, reordering, etc.)
  const handleItemsUpdate = () => {
    setItemsRefreshKey(prev => prev + 1);
    onSuccess(); // Refresh parent scale list
  };

  const tabs = [
    { id: 'basic', label: '基本信息' },
    { id: 'items', label: '题目管理' },
  ];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={`编辑量表: ${scale.name}`}
        size="xl"
        footer={
          activeTab === 'basic' ? (
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={handleClose} disabled={loading}>
                取消
              </Button>
              <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
                保存
              </Button>
            </div>
          ) : null
        }
      >
        <div className="space-y-6">
          {/* Tabs */}
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(tabId) => setActiveTab(tabId as 'basic' | 'items')}
          />

          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    量表代码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="例如: SCL-90"
                    disabled={loading}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    版本 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="例如: 1.0"
                    disabled={loading}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  量表名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: 症状自评量表"
                  disabled={loading}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  分类 <span className="text-red-500">*</span>
                </label>
                <Dropdown
                  value={formData.category || ''}
                  onChange={(value) => setFormData({ ...formData, category: value as any })}
                  options={[
                    { value: 'mental_health', label: '心理健康', icon: <Brain size={16} /> },
                    { value: 'personality', label: '人格测评', icon: <User size={16} /> },
                    { value: 'emotion', label: '情绪测评', icon: <Heart size={16} /> },
                  ]}
                  disabled={loading}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  描述（可选）
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="请输入量表的简要描述..."
                  rows={3}
                  disabled={loading}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>

              {/* Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    题目数 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.total_questions || ''}
                    onChange={(e) => setFormData({ ...formData, total_questions: parseInt(e.target.value) || 0 })}
                    placeholder="请输入题目数"
                    disabled={loading}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    预估时长（分钟）
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.estimated_duration || ''}
                    onChange={(e) => setFormData({ ...formData, estimated_duration: parseInt(e.target.value) || 0 })}
                    placeholder="请输入预估时长"
                    disabled={loading}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Status Toggles */}
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    disabled={loading}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">激活状态</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">（激活后才能被发布使用）</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    disabled={loading}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">公开量表</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">（公开后所有用户可见）</span>
                </label>
              </div>
            </div>
          )}

          {/* Items Management Tab */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              {/* Add from Item Bank Button */}
              <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  量表题目
                </h3>
                <Button
                  onClick={() => setShowItemSelector(true)}
                  variant="primary"
                  size="sm"
                >
                  <Plus size={18} className="mr-2" />
                  从题库添加题目
                </Button>
              </div>

              {/* Scale Items Manager */}
              <ScaleItemsManager
                key={itemsRefreshKey}
                scaleId={scale.id}
                onUpdate={handleItemsUpdate}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Item Selector Modal */}
      {showItemSelector && (
        <ItemSelector
          excludeScaleId={scale.id}
          onSelect={handleItemsSelected}
          onCancel={() => setShowItemSelector(false)}
          isLoading={isAddingItems}
        />
      )}
    </>
  );
}
