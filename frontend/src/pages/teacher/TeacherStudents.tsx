import { useEffect, useState, useMemo, useCallback, memo, ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { FixedSizeList as List } from 'react-window';
import { GraduationCap } from 'lucide-react';
import TeacherLayout from '@/components/layout/TeacherLayout';
import Dropdown from '@/components/ui/Dropdown';
import { studentsAPI } from '@/api';
import type { StudentListItem, GradeLabel } from '@/types';
import { GRADE_LABELS } from '@/types/teachers';
import toast from 'react-hot-toast';

// 行高常量
const ROW_HEIGHT = 56;
const TABLE_HEIGHT = 600;

// 表头组件
const TableHeader = memo(function TableHeader() {
  return (
    <div className="flex bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
      <div className="w-[15%] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
        姓名
      </div>
      <div className="w-[12%] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
        学号
      </div>
      <div className="w-[10%] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
        年级
      </div>
      <div className="w-[10%] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
        班级
      </div>
      <div className="w-[23%] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
        邮箱
      </div>
      <div className="w-[12%] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
        平均分
      </div>
      <div className="w-[18%] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
        操作
      </div>
    </div>
  );
});

// 虚拟化行组件
interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    students: StudentListItem[];
    gradeLabels: Record<GradeLabel, string>;
    onNavigate: (id: string) => void;
  };
}

const StudentRow = memo(function StudentRow({ index, style, data }: RowProps) {
  const { students, gradeLabels, onNavigate } = data;
  const student = students[index];

  return (
    <div
      style={style}
      className={`flex items-center border-b border-gray-200 dark:border-gray-700 ${
        index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'
      } hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
    >
      <div className="w-[15%] px-4 text-sm font-medium text-gray-900 dark:text-white truncate">
        {student.full_name || student.username || '-'}
      </div>
      <div className="w-[12%] px-4 text-sm text-gray-500 dark:text-gray-400 truncate">
        {student.student_id || '-'}
      </div>
      <div className="w-[10%] px-4 text-sm text-gray-500 dark:text-gray-400">
        {student.grade ? gradeLabels[student.grade] : '-'}
      </div>
      <div className="w-[10%] px-4 text-sm text-gray-500 dark:text-gray-400 truncate">
        {student.class_name || '-'}
      </div>
      <div className="w-[23%] px-4 text-sm text-gray-500 dark:text-gray-400 truncate">
        {student.email}
      </div>
      <div className="w-[12%] px-4 text-sm">
        {student.avg_score !== undefined && student.avg_score !== null ? (
          <span className="font-semibold text-purple-600 dark:text-purple-400">
            {student.avg_score.toFixed(2)}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">N/A</span>
        )}
      </div>
      <div className="w-[18%] px-4">
        <button
          onClick={() => onNavigate(student.id)}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          查看详情
        </button>
      </div>
    </div>
  );
});

export default function TeacherStudents() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<GradeLabel | ''>('');

  useEffect(() => {
    loadStudents();
  }, [selectedGrade]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 1000 };
      if (selectedGrade) {
        params.grade = selectedGrade;
      }

      const res = await studentsAPI.list(params);
      if (res.success) {
        setStudents(res.data.items);
      }
    } catch (error: any) {
      console.error('Failed to load students:', error);
      toast.error('加载学生列表失败');
    } finally {
      setLoading(false);
    }
  };

  // useMemo 缓存过滤结果
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase();
    return students.filter((student) => (
      student.full_name?.toLowerCase().includes(query) ||
      student.username?.toLowerCase().includes(query) ||
      student.student_id?.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query)
    ));
  }, [students, searchQuery]);

  // 年级标签映射 - 使用导入的常量
  const gradeLabels = useMemo<Record<GradeLabel, string>>(() => GRADE_LABELS, []);

  // 导航函数 - useCallback 避免子组件重渲染
  const handleNavigate = useCallback((id: string) => {
    navigate(`/teacher/students/${id}`);
  }, [navigate]);

  // 虚拟列表数据
  const listData = useMemo(() => ({
    students: filteredStudents,
    gradeLabels,
    onNavigate: handleNavigate,
  }), [filteredStudents, gradeLabels, handleNavigate]);

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">学生数据</h2>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="搜索学生姓名、学号或邮箱..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <Dropdown
              value={selectedGrade as string}
              onChange={(value) => setSelectedGrade(value as GradeLabel | '')}
              options={[
                { value: '', label: '全部年级' },
                { value: 'freshman', label: '大一', icon: <GraduationCap size={16} /> },
                { value: 'sophomore', label: '大二', icon: <GraduationCap size={16} /> },
                { value: 'junior', label: '大三', icon: <GraduationCap size={16} /> },
                { value: 'senior', label: '大四', icon: <GraduationCap size={16} /> },
              ]}
              searchable={false}
              className="w-48"
            />
          </div>
        </div>

        {/* Students List with Virtual Scrolling */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">加载中...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">暂无学生数据</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {/* Table Header - Fixed */}
            <TableHeader />

            {/* Virtual List Body */}
            <List
              height={TABLE_HEIGHT}
              itemCount={filteredStudents.length}
              itemSize={ROW_HEIGHT}
              width="100%"
              itemData={listData}
            >
              {(props) => <StudentRow {...props} />}
            </List>
          </div>
        )}

        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
          共 {filteredStudents.length} 个学生
        </div>
      </div>
    </TeacherLayout>
  );
}
