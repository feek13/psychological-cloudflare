import { useEffect, useState } from 'react';
import TeacherLayout from '@/components/layout/TeacherLayout';
import ScaleCreateModal from '@/components/modals/ScaleCreateModal';
import ScaleEditModal from '@/components/modals/ScaleEditModal';
import Dropdown from '@/components/ui/Dropdown';
import { scalesAPI } from '@/api';
import type { Scale } from '@/types';
import toast from 'react-hot-toast';
import { Edit, Trash2, Plus, BookOpen, Brain, User, Heart } from 'lucide-react';
import { useConfirm } from '@/hooks/useConfirm';

export default function TeacherScales() {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [scales, setScales] = useState<Scale[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingScale, setEditingScale] = useState<Scale | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  useEffect(() => {
    loadScales();
  }, [categoryFilter]);

  const loadScales = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 100 };
      if (categoryFilter) {
        params.category = categoryFilter;
      }

      const res = await scalesAPI.list(params);
      if (res.success) {
        setScales(res.data.items);
      }
    } catch (error: any) {
      console.error('Failed to load scales:', error);
      toast.error('加载量表列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: '删除量表',
      message: `确定要删除量表 "${name}" 吗？此操作不可撤销。`,
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      await scalesAPI.delete(id);
      toast.success('量表删除成功');
      loadScales();
    } catch (error: any) {
      console.error('Failed to delete scale:', error);
      toast.error(error.response?.data?.detail || '删除量表失败');
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      mental_health: '心理健康',
      personality: '人格测评',
      emotion: '情绪测评',
    };
    return labels[category] || category;
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      mental_health: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      personality: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      emotion: 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200',
    };
    return colors[category] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">量表管理</h2>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            <Plus size={20} />
            <span>创建新量表</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">分类筛选：</label>
            <Dropdown
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: '', label: '全部分类' },
                { value: 'mental_health', label: '心理健康', icon: <Brain size={16} /> },
                { value: 'personality', label: '人格测评', icon: <User size={16} /> },
                { value: 'emotion', label: '情绪测评', icon: <Heart size={16} /> },
              ]}
              searchable={false}
              className="w-48"
            />
          </div>
        </div>

        {/* Scales List */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">加载中...</p>
          </div>
        ) : scales.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">暂无量表</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              点击右上角按钮创建您的第一个量表
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {scales.map((scale) => (
              <div
                key={scale.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start">
                  {/* Scale Info */}
                  <div className="flex-1">
                    <div className="flex items-start space-x-3">
                      <BookOpen size={24} className="text-indigo-600 dark:text-indigo-400 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {scale.name}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryBadgeColor(scale.category)}`}>
                            {getCategoryLabel(scale.category)}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              scale.is_active
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {scale.is_active ? '激活' : '已停用'}
                          </span>
                          {scale.is_public && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                              公开
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          代码: {scale.code} | 版本: {scale.version}
                        </p>

                        {scale.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {scale.description}
                          </p>
                        )}

                        <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                          <span className={scale.total_questions === 0 ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>
                            题目数: {scale.total_questions}
                            {scale.total_questions === 0 && (
                              <span className="ml-2 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-0.5 rounded">
                                未添加题目
                              </span>
                            )}
                          </span>
                          {scale.estimated_duration && (
                            <span>预估时长: {scale.estimated_duration} 分钟</span>
                          )}
                          <span>创建时间: {new Date(scale.created_at).toLocaleDateString()}</span>
                        </div>

                        {/* Warning for empty scale */}
                        {scale.total_questions === 0 && (
                          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                              ⚠️ 此量表还没有题目,请点击右侧编辑按钮,在"题目管理"标签中从题库添加题目后再发布。
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => setEditingScale(scale)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                      title="编辑量表"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(scale.id, scale.name)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                      title="删除量表"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
          共 {scales.length} 个量表
        </div>
      </div>

      {/* Modals */}
      <ScaleCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadScales}
      />

      {editingScale && (
        <ScaleEditModal
          isOpen={!!editingScale}
          scale={editingScale}
          onClose={() => setEditingScale(null)}
          onSuccess={loadScales}
        />
      )}
    </TeacherLayout>
  );
}
