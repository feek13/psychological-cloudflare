import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import { scalesAPI, publicationsAPI } from '@/api';
import type { Scale, PublicationCreate, VisibilityType } from '@/types';
import type { GradeLabel } from '@/types/teachers';
import { GRADE_LABELS } from '@/types/teachers';
import toast from 'react-hot-toast';

interface PublicationCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const allGrades: GradeLabel[] = ['freshman', 'sophomore', 'junior', 'senior'];

export default function PublicationCreateModal({ isOpen, onClose, onSuccess }: PublicationCreateModalProps) {
  const [loading, setLoading] = useState(false);
  const [scales, setScales] = useState<Scale[]>([]);
  const [loadingScales, setLoadingScales] = useState(true);

  const [formData, setFormData] = useState<PublicationCreate>({
    scale_id: '',
    visibility_type: 'all',
    target_grades: [],
    target_classes: [],
    start_time: undefined,
    end_time: undefined,
  });

  const [classInput, setClassInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadScales();
    }
  }, [isOpen]);

  const loadScales = async () => {
    try {
      setLoadingScales(true);
      const res = await scalesAPI.list({ is_active: true, limit: 100 });
      if (res.success && res.data) {
        setScales(res.data.items);
      }
    } catch (error) {
      console.error('Failed to load scales:', error);
      toast.error('加载量表列表失败');
    } finally {
      setLoadingScales(false);
    }
  };

  const handleVisibilityChange = (type: VisibilityType) => {
    setFormData({
      ...formData,
      visibility_type: type,
      target_grades: type === 'grades' ? [] : formData.target_grades,
      target_classes: type === 'classes' ? [] : formData.target_classes,
    });
  };

  const toggleGrade = (grade: GradeLabel) => {
    const current = formData.target_grades || [];
    if (current.includes(grade)) {
      setFormData({
        ...formData,
        target_grades: current.filter((g) => g !== grade),
      });
    } else {
      setFormData({
        ...formData,
        target_grades: [...current, grade],
      });
    }
  };

  const addClass = () => {
    if (!classInput.trim()) return;

    const current = formData.target_classes || [];
    if (current.includes(classInput.trim())) {
      toast.error('该班级已添加');
      return;
    }

    setFormData({
      ...formData,
      target_classes: [...current, classInput.trim()],
    });
    setClassInput('');
  };

  const removeClass = (className: string) => {
    setFormData({
      ...formData,
      target_classes: (formData.target_classes || []).filter((c) => c !== className),
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.scale_id) {
      toast.error('请选择量表');
      return;
    }

    if (formData.visibility_type === 'grades' && (!formData.target_grades || formData.target_grades.length === 0)) {
      toast.error('请至少选择一个年级');
      return;
    }

    if (formData.visibility_type === 'classes' && (!formData.target_classes || formData.target_classes.length === 0)) {
      toast.error('请至少添加一个班级');
      return;
    }

    if (formData.start_time && formData.end_time) {
      if (new Date(formData.start_time) >= new Date(formData.end_time)) {
        toast.error('结束时间必须晚于开始时间');
        return;
      }
    }

    try {
      setLoading(true);

      // Prepare data
      const submitData: PublicationCreate = {
        scale_id: formData.scale_id,
        visibility_type: formData.visibility_type,
      };

      if (formData.visibility_type === 'grades') {
        submitData.target_grades = formData.target_grades;
      } else if (formData.visibility_type === 'classes') {
        submitData.target_classes = formData.target_classes;
      }

      if (formData.start_time) {
        submitData.start_time = formData.start_time;
      }
      if (formData.end_time) {
        submitData.end_time = formData.end_time;
      }

      await publicationsAPI.create(submitData);
      toast.success('发布成功');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Failed to publish scale:', error);
      toast.error(error.response?.data?.detail || '发布失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      scale_id: '',
      visibility_type: 'all',
      target_grades: [],
      target_classes: [],
      start_time: undefined,
      end_time: undefined,
    });
    setClassInput('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="发布量表"
      size="lg"
      footer={
        <div className="flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={loading}
            disabled={loadingScales}
          >
            发布
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Scale Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            选择量表 <span className="text-red-500">*</span>
          </label>
          <Dropdown
            value={formData.scale_id}
            onChange={(value) => setFormData({ ...formData, scale_id: value })}
            options={[
              { value: '', label: '请选择量表' },
              ...scales.map((scale) => ({
                value: scale.id,
                label: `${scale.name} (${scale.code})`,
                icon: <FileText size={16} />
              }))
            ]}
            searchable={true}
            disabled={loading}
            loading={loadingScales}
            required
            className="w-full"
          />

          {/* Selected Scale Warning */}
          {formData.scale_id && (() => {
            const selectedScale = scales.find(s => s.id === formData.scale_id);
            if (selectedScale && selectedScale.total_questions === 0) {
              return (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-800 dark:text-red-200 font-semibold">
                    ⚠️ 警告:该量表还没有题目({selectedScale.total_questions}题),请先在"量表管理"页面编辑量表并添加题目后再发布!
                  </p>
                </div>
              );
            } else if (selectedScale) {
              return (
                <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    该量表包含 <span className="font-semibold text-gray-900 dark:text-white">{selectedScale.total_questions}</span> 个题目
                  </p>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Visibility Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            可见范围 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'all' as VisibilityType, label: '全部学生' },
              { value: 'grades' as VisibilityType, label: '指定年级' },
              { value: 'classes' as VisibilityType, label: '指定班级' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleVisibilityChange(option.value)}
                disabled={loading}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  formData.visibility_type === option.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-semibold'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target Grades */}
        {formData.visibility_type === 'grades' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              选择年级 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {allGrades.map((grade) => (
                <label
                  key={grade}
                  className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    (formData.target_grades || []).includes(grade)
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={(formData.target_grades || []).includes(grade)}
                    onChange={() => toggleGrade(grade)}
                    disabled={loading}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-gray-900 dark:text-white font-medium">{GRADE_LABELS[grade]}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Target Classes */}
        {formData.visibility_type === 'classes' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              添加班级 <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                value={classInput}
                onChange={(e) => setClassInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addClass()}
                placeholder="输入班级名称，如：计算机1班"
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
              <Button variant="secondary" onClick={addClass} disabled={loading}>
                添加
              </Button>
            </div>
            {formData.target_classes && formData.target_classes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.target_classes.map((className) => (
                  <span
                    key={className}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200"
                  >
                    {className}
                    <button
                      onClick={() => removeClass(className)}
                      disabled={loading}
                      className="ml-2 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Time Range (Optional) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              开始时间（可选）
            </label>
            <input
              type="datetime-local"
              value={formData.start_time || ''}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value || undefined })}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              结束时间（可选）
            </label>
            <input
              type="datetime-local"
              value={formData.end_time || ''}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value || undefined })}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Info Note */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            发布后，符合条件的学生将能够看到并参与该量表测评。
          </p>
        </div>
      </div>
    </Modal>
  );
}
