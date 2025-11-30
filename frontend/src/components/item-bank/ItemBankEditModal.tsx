/**
 * Item Bank Edit Modal Component
 * 题库题目编辑模态框
 */
import { useState, useEffect } from 'react';
import { Brain, Target, TrendingUp, ToggleLeft, Weight } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import OptionsEditor from './OptionsEditor';
import { itemBankAPI } from '@/api';
import type {
  ItemBankResponse,
  ItemBankUpdate,
  ItemType,
  DifficultyLevel,
  ItemStatus,
} from '@/types';
import toast from 'react-hot-toast';

interface ItemBankEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: ItemBankResponse | null;
}

const ITEM_TYPE_OPTIONS: { value: ItemType; label: string; icon: JSX.Element }[] = [
  { value: 'likert', label: 'Likert量表', icon: <TrendingUp size={16} /> },
  { value: 'multiple_choice', label: '单选题', icon: <Target size={16} /> },
  { value: 'true_false', label: '判断题', icon: <ToggleLeft size={16} /> },
  { value: 'scale', label: '评分题', icon: <Weight size={16} /> },
  { value: 'open_ended', label: '开放题', icon: <Brain size={16} /> },
];

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string }[] = [
  { value: 'very_easy', label: '非常容易' },
  { value: 'easy', label: '容易' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
  { value: 'very_hard', label: '非常困难' },
];

const STATUS_OPTIONS: { value: ItemStatus; label: string }[] = [
  { value: 'draft', label: '草稿' },
  { value: 'review', label: '审核中' },
  { value: 'approved', label: '已批准' },
  { value: 'active', label: '使用中' },
  { value: 'retired', label: '已停用' },
];

export default function ItemBankEditModal({
  isOpen,
  onClose,
  onSuccess,
  item,
}: ItemBankEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ItemBankUpdate>({});

  // Initialize form data when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        content: item.content,
        item_type: item.item_type,
        options: item.options,
        domain: item.domain,
        subdomain: item.subdomain,
        construct: item.construct,
        cognitive_level: item.cognitive_level,
        difficulty_level: item.difficulty_level,
        estimated_difficulty: item.estimated_difficulty,
        discrimination_index: item.discrimination_index,
        reverse_scored: item.reverse_scored,
        default_weight: item.default_weight,
        status: item.status,
      });
    }
  }, [item]);

  const handleSubmit = async () => {
    if (!item) return;

    // Validation
    if (formData.content && !formData.content.trim()) {
      toast.error('题目内容不能为空');
      return;
    }

    if (formData.options && formData.options.length < 2) {
      toast.error('至少需要2个选项');
      return;
    }

    // Validate all options have labels
    if (formData.options) {
      const emptyOptions = formData.options.filter((opt) => !opt.label.trim());
      if (emptyOptions.length > 0) {
        toast.error('所有选项都必须填写文本');
        return;
      }
    }

    if (formData.default_weight !== undefined && formData.default_weight <= 0) {
      toast.error('默认权重必须大于0');
      return;
    }

    try {
      setLoading(true);
      await itemBankAPI.update(item.id, formData);
      toast.success('题目更新成功');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Failed to update item:', error);

      // Extract error message from API response
      let errorMessage = '更新题目失败';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        // If detail is an array of Pydantic validation errors
        if (Array.isArray(detail)) {
          errorMessage = detail.map((err: any) => err.msg || '').join(', ');
        }
        // If detail is a string
        else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({});
    onClose();
  };

  if (!item) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="编辑题库题目"
      size="lg"
      footer={
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            取消
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
            保存
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Version Info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex justify-between">
            <span>题目ID: {item.id.substring(0, 8)}...</span>
            <span>版本: v{item.version}</span>
            <span>
              状态:{' '}
              <span className="font-medium">
                {STATUS_OPTIONS.find((s) => s.value === item.status)?.label}
              </span>
            </span>
          </div>
        </div>

        {/* Question Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            题目内容 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.content || ''}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="请输入题目内容..."
            rows={3}
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white resize-none"
          />
        </div>

        {/* Item Type, Difficulty, and Status */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              题目类型 <span className="text-red-500">*</span>
            </label>
            <Dropdown
              value={formData.item_type || item.item_type}
              onChange={(value) => setFormData({ ...formData, item_type: value as ItemType })}
              options={ITEM_TYPE_OPTIONS}
              disabled={loading}
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              难度等级 <span className="text-red-500">*</span>
            </label>
            <Dropdown
              value={formData.difficulty_level || item.difficulty_level}
              onChange={(value) =>
                setFormData({ ...formData, difficulty_level: value as DifficultyLevel })
              }
              options={DIFFICULTY_OPTIONS}
              disabled={loading}
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              状态
            </label>
            <Dropdown
              value={formData.status || item.status}
              onChange={(value) => setFormData({ ...formData, status: value as ItemStatus })}
              options={STATUS_OPTIONS}
              disabled={loading}
              className="w-full"
            />
          </div>
        </div>

        {/* Options Editor */}
        <OptionsEditor
          options={formData.options || item.options}
          onChange={(options) => setFormData({ ...formData, options })}
        />

        {/* Domain and Subdomain */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              领域（可选）
            </label>
            <input
              type="text"
              value={formData.domain !== undefined ? formData.domain || '' : item.domain || ''}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value || null })}
              placeholder="例如: 心理健康"
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              子领域（可选）
            </label>
            <input
              type="text"
              value={
                formData.subdomain !== undefined
                  ? formData.subdomain || ''
                  : item.subdomain || ''
              }
              onChange={(e) => setFormData({ ...formData, subdomain: e.target.value || null })}
              placeholder="例如: 焦虑"
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Construct and Cognitive Level */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              测量构念（可选）
            </label>
            <input
              type="text"
              value={
                formData.construct !== undefined ? formData.construct || '' : item.construct || ''
              }
              onChange={(e) => setFormData({ ...formData, construct: e.target.value || null })}
              placeholder="例如: 社交焦虑"
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              认知水平（可选）
            </label>
            <input
              type="text"
              value={
                formData.cognitive_level !== undefined
                  ? formData.cognitive_level || ''
                  : item.cognitive_level || ''
              }
              onChange={(e) =>
                setFormData({ ...formData, cognitive_level: e.target.value || null })
              }
              placeholder="例如: 理解"
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Weight and Reverse Scored */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              默认权重 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={
                formData.default_weight !== undefined
                  ? formData.default_weight || ''
                  : item.default_weight || ''
              }
              onChange={(e) =>
                setFormData({ ...formData, default_weight: parseFloat(e.target.value) || 1 })
              }
              placeholder="默认为1"
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex items-center">
            <label className="flex items-center space-x-3 cursor-pointer mt-7">
              <input
                type="checkbox"
                checked={
                  formData.reverse_scored !== undefined
                    ? formData.reverse_scored
                    : item.reverse_scored
                }
                onChange={(e) => setFormData({ ...formData, reverse_scored: e.target.checked })}
                disabled={loading}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                反向计分
              </span>
            </label>
          </div>
        </div>

        {/* Revision Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            修订原因（可选）
          </label>
          <textarea
            value={formData.revision_reason || ''}
            onChange={(e) => setFormData({ ...formData, revision_reason: e.target.value })}
            placeholder="请说明修订原因..."
            rows={2}
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white resize-none"
          />
        </div>

        {/* Info Note */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            修改题目将创建新版本(v{item.version + 1})。建议填写修订原因以便追踪变更历史。
          </p>
        </div>
      </div>
    </Modal>
  );
}
