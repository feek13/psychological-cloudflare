/**
 * ItemSelector Component
 * 题库题目选择器 - 使用虚拟滚动优化大量题目展示
 */
import { useState, useEffect, useCallback, memo, CSSProperties, useRef } from 'react';
import { VariableSizeList } from 'react-window';
import { itemBankAPI } from '@/api/item-bank';
import type {
  ItemBankResponse,
  ScaleItemPoolQuery,
  DifficultyLevel,
  ItemType,
} from '@/types/item-bank';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Loading from '@/components/ui/Loading';
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

// Row 组件的 props 类型（传入 rowProps）
interface RowDataProps {
  items: ItemBankResponse[];
  selectedIds: Set<string>;
  toggleItemSelection: (item: ItemBankResponse) => void;
}

// ItemRow 子组件 - 使用 memo 优化渲染
interface ItemRowProps {
  index: number;
  style: CSSProperties;
  ariaAttributes: {
    'aria-posinset': number;
    'aria-setsize': number;
    role: 'listitem';
  };
  items: ItemBankResponse[];
  selectedIds: Set<string>;
  toggleItemSelection: (item: ItemBankResponse) => void;
}

const ItemRow = memo(({ index, style, items, selectedIds, toggleItemSelection }: ItemRowProps) => {
  const item = items[index];
  if (!item) return null;

  const isSelected = selectedIds.has(item.id);

  return (
    <div style={style} className="px-4 py-2">
      <Card
        className={`transition-all ${
          isSelected
            ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 cursor-pointer'
            : 'hover:shadow-lg cursor-pointer'
        }`}
        onClick={() => toggleItemSelection(item)}
        padding="md"
        hover={false}
      >
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <div className="flex-shrink-0 mt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              className="w-5 h-5 rounded border-gray-300 focus:ring-indigo-500 text-indigo-600"
            />
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
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
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
              {item.construct && (
                <span>
                  <span className="font-medium">构念:</span> {item.construct}
                </span>
              )}
              {item.discrimination_index !== undefined && item.discrimination_index !== null && (
                <span>
                  <span className="font-medium">区分度:</span>{' '}
                  {item.discrimination_index.toFixed(2)}
                </span>
              )}
              {item.reverse_scored && (
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                  反向计分
                </Badge>
              )}
            </div>

            {/* Options preview */}
            {item.options && item.options.length > 0 && (
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
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，只在关键属性变化时重新渲染
  const prevItem = prevProps.items[prevProps.index];
  const nextItem = nextProps.items[nextProps.index];
  const prevSelected = prevItem && prevProps.selectedIds.has(prevItem.id);
  const nextSelected = nextItem && nextProps.selectedIds.has(nextItem.id);
  return prevSelected === nextSelected && prevItem?.id === nextItem?.id;
});

ItemRow.displayName = 'ItemRow';

interface ItemSelectorProps {
  excludeScaleId?: string;
  onSelect: (items: ItemBankResponse[]) => void;
  onCancel: () => void;
  maxSelection?: number;
  initialSelected?: ItemBankResponse[];
  isLoading?: boolean;
}

export default function ItemSelector({
  excludeScaleId,
  onSelect,
  onCancel,
  maxSelection,
  initialSelected = [],
  isLoading = false,
}: ItemSelectorProps) {
  const [items, setItems] = useState<ItemBankResponse[]>([]);
  const [selectedItems, setSelectedItems] = useState<ItemBankResponse[]>(initialSelected);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // 虚拟列表 ref
  const listRef = useRef<VariableSizeList>(null);

  // 固定行高
  const ROW_HEIGHT = 150;

  // 快速查找选中状态的 Set
  const selectedIds = new Set(selectedItems.map(item => item.id));

  // Filter states - 一次性加载所有题目
  const [filters, setFilters] = useState<ScaleItemPoolQuery>({
    domain: undefined,
    subdomain: undefined,
    difficulty_level: undefined,
    search: undefined,
    exclude_scale_id: excludeScaleId,
    min_discrimination: undefined,
    skip: 0,
    limit: 1000,  // 一次性获取所有题目
  });

  // Search input state
  const [searchInput, setSearchInput] = useState('');


  // Fetch items
  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await itemBankAPI.getScaleItemPool(filters);
      if (response.data) {
        setItems(response.data.items);
        setTotal(response.data.total);
      }
    } catch (error: any) {
      // 处理 Pydantic 验证错误（detail 是数组格式）
      const detail = error.response?.data?.detail;
      let errorMsg = '获取题目失败';
      if (Array.isArray(detail) && detail.length > 0) {
        errorMsg = detail[0].msg || errorMsg;
      } else if (typeof detail === 'string') {
        errorMsg = detail;
      }
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [filters]);

  // Handle search
  const handleSearch = () => {
    setFilters((prev) => ({
      ...prev,
      search: searchInput || undefined,
    }));
  };

  // Handle filter change
  const handleFilterChange = (key: keyof ScaleItemPoolQuery, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  // Toggle item selection
  const toggleItemSelection = useCallback((item: ItemBankResponse) => {
    setSelectedItems(prev => {
      const isSelected = prev.some((i) => i.id === item.id);

      if (isSelected) {
        return prev.filter((i) => i.id !== item.id);
      } else {
        if (maxSelection && prev.length >= maxSelection) {
          toast.error(`最多只能选择 ${maxSelection} 个题目`);
          return prev;
        }
        return [...prev, item];
      }
    });
  }, [maxSelection]);

  // Select all visible items
  const handleSelectAll = () => {
    const newSelections = [...selectedItems];
    items.forEach((item) => {
      if (!newSelections.some((i) => i.id === item.id)) {
        if (!maxSelection || newSelections.length < maxSelection) {
          newSelections.push(item);
        }
      }
    });
    setSelectedItems(newSelections);
  };

  // Clear all selections
  const handleClearAll = () => {
    setSelectedItems([]);
  };

  // Confirm selection
  const handleConfirm = () => {
    if (selectedItems.length === 0) {
      toast.error('请至少选择一个题目');
      return;
    }
    onSelect(selectedItems);
  };

  // rowProps for List component
  const rowProps: RowDataProps = {
    items,
    selectedIds,
    toggleItemSelection,
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              从题库选择题目
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Selection Count */}
          <div className="mt-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              已选择 <span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">{selectedItems.length}</span> 题
              {maxSelection && (
                <span className="text-gray-500 dark:text-gray-400">
                  {' '}/ {maxSelection} 上限
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                搜索题目内容
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="输入关键词搜索..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                />
                <Button onClick={handleSearch} variant="primary">
                  搜索
                </Button>
              </div>
            </div>

            {/* Domain */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                领域
              </label>
              <input
                type="text"
                value={filters.domain || ''}
                onChange={(e) => handleFilterChange('domain', e.target.value)}
                placeholder="如:心理健康"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
            </div>

            {/* Subdomain */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                子领域
              </label>
              <input
                type="text"
                value={filters.subdomain || ''}
                onChange={(e) => handleFilterChange('subdomain', e.target.value)}
                placeholder="如:焦虑"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                难度等级
              </label>
              <select
                value={filters.difficulty_level || ''}
                onChange={(e) => handleFilterChange('difficulty_level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              >
                <option value="">全部难度</option>
                {Object.entries(DIFFICULTY_CONFIG).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Discrimination */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                最小区分度
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={filters.min_discrimination || ''}
                onChange={(e) => handleFilterChange('min_discrimination', parseFloat(e.target.value) || undefined)}
                placeholder="0.0 - 1.0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* Selection actions */}
          <div className="flex items-center gap-3 mt-4">
            <Button
              onClick={handleSelectAll}
              variant="secondary"
              size="sm"
            >
              全选当前列表
            </Button>
            <Button onClick={handleClearAll} variant="secondary" size="sm">
              清空选择
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              共 <span className="font-medium text-indigo-600 dark:text-indigo-400">{total}</span> 个可用题目
              {total > items.length && (
                <span className="text-xs text-gray-500">（显示前 {items.length} 个）</span>
              )}
            </span>
          </div>
        </div>

        {/* Virtual Items List */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12 h-full">
              <Loading size="lg" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">没有找到符合条件的题目</p>
            </div>
          ) : (
            <VariableSizeList
              ref={listRef}
              height={450}
              width="100%"
              itemCount={items.length}
              itemSize={() => ROW_HEIGHT}
              overscanCount={3}
              itemData={rowProps}
              className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
            >
              {({ index, style, data }) => (
                <ItemRow
                  index={index}
                  style={style}
                  items={data.items}
                  selectedIds={data.selectedIds}
                  toggleItemSelection={data.toggleItemSelection}
                  ariaAttributes={{
                    'aria-posinset': index + 1,
                    'aria-setsize': items.length,
                    role: 'listitem',
                  }}
                />
              )}
            </VariableSizeList>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              使用虚拟滚动，滑动查看更多题目
            </span>
            <div className="flex items-center gap-3">
              <Button onClick={onCancel} variant="secondary" disabled={isLoading}>
                取消
              </Button>
              <Button onClick={handleConfirm} variant="primary" disabled={isLoading || selectedItems.length === 0}>
                {isLoading ? '添加中...' : `确认添加 (${selectedItems.length})`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
