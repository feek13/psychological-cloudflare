import { useState } from 'react';
import { Brain, User, Heart } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import { scalesAPI } from '@/api';
import type { ScaleCreate } from '@/types';
import toast from 'react-hot-toast';

interface ScaleCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ScaleCreateModal({ isOpen, onClose, onSuccess }: ScaleCreateModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ScaleCreate>({
    code: '',
    name: '',
    category: 'mental_health',
    version: '1.0',
    description: '',
    total_questions: 0,
    estimated_duration: 0,
    is_active: true,
    is_public: false,
    scoring_config: {
      method: 'sum',
      max_score: null,
      min_score: null,
      dimensions: null
    }
  });

  const handleSubmit = async () => {
    // Validation
    if (!formData.code.trim()) {
      toast.error('请输入量表代码');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('请输入量表名称');
      return;
    }
    if (formData.total_questions <= 0) {
      toast.error('题目数必须大于0');
      return;
    }

    try {
      setLoading(true);
      await scalesAPI.create(formData);
      toast.success('量表创建成功');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Failed to create scale:', error);

      // Extract error message from API response
      let errorMessage = '创建量表失败';
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
      code: '',
      name: '',
      category: 'mental_health',
      version: '1.0',
      description: '',
      total_questions: 0,
      estimated_duration: 0,
      is_active: true,
      is_public: false,
      scoring_config: {
        method: 'sum',
        max_score: null,
        min_score: null,
        dimensions: null
      }
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="创建新量表"
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
            value={formData.category}
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

        {/* Info Note */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            创建量表后，您需要在量表详情页添加题目和配置评分规则。
          </p>
        </div>
      </div>
    </Modal>
  );
}
