import { useEffect, useState } from 'react';
import TeacherLayout from '@/components/layout/TeacherLayout';
import PublicationCreateModal from '@/components/modals/PublicationCreateModal';
import { publicationsAPI } from '@/api';
import type { PublicationListItem } from '@/types';
import toast from 'react-hot-toast';
import { Trash2, Power, PowerOff } from 'lucide-react';
import { useConfirm } from '@/hooks/useConfirm';

export default function TeacherPublications() {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [publications, setPublications] = useState<PublicationListItem[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadPublications();
  }, []);

  const loadPublications = async () => {
    try {
      setLoading(true);
      const res = await publicationsAPI.list({ limit: 50 });
      if (res.success) {
        setPublications(res.data.items);
      }
    } catch (error: any) {
      console.error('Failed to load publications:', error);
      toast.error('加载发布列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await publicationsAPI.update(id, { is_active: !currentStatus });
      toast.success(currentStatus ? '已停用发布' : '已激活发布');
      loadPublications();
    } catch (error: any) {
      console.error('Failed to toggle publication:', error);
      toast.error(error.response?.data?.detail || '操作失败');
    }
  };

  const handleDelete = async (id: string, scaleName: string) => {
    const confirmed = await confirm({
      title: '删除发布',
      message: `确定要删除发布 "${scaleName}" 吗？此操作不可撤销。`,
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      await publicationsAPI.delete(id);
      toast.success('发布删除成功');
      loadPublications();
    } catch (error: any) {
      console.error('Failed to delete publication:', error);
      toast.error(error.response?.data?.detail || '删除发布失败');
    }
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">发布管理</h2>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            + 发布新量表
          </button>
        </div>

        {/* Publications List */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">加载中...</p>
          </div>
        ) : publications.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">暂无发布记录</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              点击右上角按钮发布您的第一个量表
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {publications.map((pub) => (
              <div
                key={pub.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {pub.scale_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      代码: {pub.scale_code}
                    </p>
                    <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
                      <span>
                        可见范围: {pub.visibility_type === 'all' ? '全部' : pub.visibility_type === 'grades' ? '指定年级' : '指定班级'}
                      </span>
                      <span>完成率: {pub.completion_rate}%</span>
                      <span>总测评数: {pub.total_assessments}</span>
                    </div>
                    {pub.start_time && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        时间范围: {new Date(pub.start_time).toLocaleDateString()}
                        {pub.end_time && ` - ${new Date(pub.end_time).toLocaleDateString()}`}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        pub.is_active
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {pub.is_active ? '激活' : '已停用'}
                    </span>

                    {/* Toggle Active Button */}
                    <button
                      onClick={() => handleToggleActive(pub.id, pub.is_active)}
                      className={`p-2 rounded-md transition-colors ${
                        pub.is_active
                          ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                          : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                      title={pub.is_active ? '停用发布' : '激活发布'}
                    >
                      {pub.is_active ? <PowerOff size={18} /> : <Power size={18} />}
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(pub.id, pub.scale_name)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                      title="删除发布"
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
          共 {publications.length} 个发布
        </div>
      </div>

      {/* Publication Create Modal */}
      <PublicationCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadPublications}
      />
    </TeacherLayout>
  );
}
