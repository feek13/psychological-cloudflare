/**
 * Item Bank Create Modal Component
 * 题库题目创建模态框
 */
import { useState } from 'react';
import { Brain, Target, TrendingUp, ToggleLeft, Weight } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import OptionsEditor from './OptionsEditor';
import { itemBankAPI } from '@/api';
import type { ItemBankCreate, ItemType, DifficultyLevel } from '@/types';
import toast from 'react-hot-toast';

interface ItemBankCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

export default function ItemBankCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: ItemBankCreateModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ItemBankCreate>({
    content: '',
    item_type: 'likert',
    options: [
      { value: 1, label: '' },
      { value: 2, label: '' },
    ],
    domain: null,
    subdomain: null,
    construct: null,
    cognitive_level: null,
    difficulty_level: 'medium',
    estimated_difficulty: null,
    discrimination_index: null,
    reverse_scored: false,
    default_weight: 1,
    tag_ids: [],
  });

  const handleSubmit = async () => {
    // Validation
    if (!formData.content.trim()) {
      toast.error('请输入题目内容');
      return;
    }

    if (formData.options.length < 2) {
      toast.error('至少需要2个选项');
      return;
    }

    // Validate all options have labels
    const emptyOptions = formData.options.filter((opt) => !opt.label.trim());
    if (emptyOptions.length > 0) {
      toast.error('所有选项都必须填写文本');
      return;
    }

    if (formData.default_weight <= 0) {
      toast.error('默认权重必须大于0');
      return;
    }

    try {
      setLoading(true);
      await itemBankAPI.create(formData);
      toast.success('题目创建成功');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Failed to create item:', error);

      // Extract error message from API response
      let errorMessage = '创建题目失败';
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
    setFormData({
      content: '',
      item_type: 'likert',
      options: [
        { value: 1, label: '' },
        { value: 2, label: '' },
      ],
      domain: null,
      subdomain: null,
      construct: null,
      cognitive_level: null,
      difficulty_level: 'medium',
      estimated_difficulty: null,
      discrimination_index: null,
      reverse_scored: false,
      default_weight: 1,
      tag_ids: [],
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="创建题库题目"
      size="lg"
      footer={
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            取消
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
            创建
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Question Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            题目内容 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="请输入题目内容..."
            rows={3}
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white resize-none"
          />
        </div>

        {/* Item Type and Difficulty */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              题目类型 <span className="text-red-500">*</span>
            </label>
            <Dropdown
              value={formData.item_type}
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
              value={formData.difficulty_level}
              onChange={(value) =>
                setFormData({ ...formData, difficulty_level: value as DifficultyLevel })
              }
              options={DIFFICULTY_OPTIONS}
              disabled={loading}
              required
              className="w-full"
            />
          </div>
        </div>

        {/* Options Editor */}
        <OptionsEditor
          options={formData.options}
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
              value={formData.domain || ''}
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
              value={formData.subdomain || ''}
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
              value={formData.construct || ''}
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
              value={formData.cognitive_level || ''}
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
              value={formData.default_weight || ''}
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
                checked={formData.reverse_scored}
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

        {/* Info Note */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            创建题目后，可以将其添加到量表中使用。题目默认为"草稿"状态，需经过审核后才能使用。
          </p>
        </div>
      </div>
    </Modal>
  );
}
