/**
 * Options Editor Component
 * 选项编辑器组件 - 用于编辑题目的答案选项
 */
import { Plus, X } from 'lucide-react';
import type { QuestionOption } from '@/types/item-bank';

interface OptionsEditorProps {
  options: QuestionOption[];
  onChange: (options: QuestionOption[]) => void;
  className?: string;
}

export default function OptionsEditor({ options, onChange, className = '' }: OptionsEditorProps) {
  const addOption = () => {
    const newValue = options.length > 0 ? Math.max(...options.map((o) => o.value)) + 1 : 1;
    onChange([...options, { value: newValue, label: '' }]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) {
      return; // 至少保留2个选项
    }
    onChange(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, field: 'value' | 'label', newValue: string | number) => {
    const updated = options.map((opt, i) => {
      if (i === index) {
        return {
          ...opt,
          [field]: field === 'value' ? Number(newValue) : newValue,
        };
      }
      return opt;
    });
    onChange(updated);
  };

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          答案选项
          <span className="text-red-500 ml-1">*</span>
        </label>
        <button
          type="button"
          onClick={addOption}
          className="flex items-center px-3 py-1 text-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
        >
          <Plus size={16} className="mr-1" />
          添加选项
        </button>
      </div>

      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            {/* 分值输入 */}
            <div className="w-24">
              <input
                type="number"
                value={option.value}
                onChange={(e) => updateOption(index, 'value', e.target.value)}
                placeholder="分值"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
              />
            </div>

            {/* 选项文本输入 */}
            <div className="flex-1">
              <input
                type="text"
                value={option.label}
                onChange={(e) => updateOption(index, 'label', e.target.value)}
                placeholder={`选项 ${index + 1} 文本`}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
              />
            </div>

            {/* 删除按钮 */}
            <button
              type="button"
              onClick={() => removeOption(index)}
              disabled={options.length <= 2}
              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={options.length <= 2 ? '至少需要2个选项' : '删除此选项'}
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>

      {options.length < 2 && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">至少需要2个选项</p>
      )}

      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        提示:分值用于计算量表总分,选项文本为受测者看到的选项描述
      </p>
    </div>
  );
}
