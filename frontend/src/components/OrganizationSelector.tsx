/**
 * Organization Cascade Selector Component
 * 组织架构级联选择器组件
 *
 * Features:
 * - College → Major → Class cascade selection
 * - Enrollment year selection
 * - Real-time student ID preview
 * - Loading states and error handling
 * - Dark mode support
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getOrganizationTree, previewStudentId } from '@/api/organization';
import type { College, Major, Class } from '@/types/organization';

interface OrganizationSelectorProps {
  value?: {
    collegeId?: string;
    majorId?: string;
    classId?: string;
    enrollmentYear?: number;
  };
  onChange?: (value: {
    collegeId: string;
    majorId: string;
    classId: string;
    enrollmentYear: number;
    collegeCode: string;
    majorCode: string;
    classCode: string;
  }) => void;
  showPreview?: boolean;
  disabled?: boolean;
  required?: boolean;
}

export default function OrganizationSelector({
  value,
  onChange,
  showPreview = false,
  disabled = false,
  required = false,
}: OrganizationSelectorProps) {
  const [colleges, setColleges] = useState<College[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [studentIdPreview, setStudentIdPreview] = useState<string>('');

  const [selectedCollege, setSelectedCollege] = useState<string>(value?.collegeId || '');
  const [selectedMajor, setSelectedMajor] = useState<string>(value?.majorId || '');
  const [selectedClass, setSelectedClass] = useState<string>(value?.classId || '');
  const [enrollmentYear, setEnrollmentYear] = useState<number>(
    value?.enrollmentYear || new Date().getFullYear()
  );

  // Use refs to avoid infinite loops caused by callback identity changes
  const onChangeRef = useRef(onChange);
  const lastPreviewParamsRef = useRef<string>('');

  // Keep onChange ref in sync
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Load organization tree on mount
  useEffect(() => {
    const loadOrganizationTree = async () => {
      try {
        setLoading(true);
        const response = await getOrganizationTree();
        setColleges(response.colleges || []);
      } catch (error) {
        console.error('Failed to load organization tree:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrganizationTree();
  }, []);

  // Update majors when college changes
  useEffect(() => {
    if (selectedCollege) {
      const college = colleges.find((c) => c.id === selectedCollege);
      setMajors(college?.majors || []);

      // Reset major and class if college changed
      if (selectedCollege !== value?.collegeId) {
        setSelectedMajor('');
        setSelectedClass('');
      }
    } else {
      setMajors([]);
      setSelectedMajor('');
      setSelectedClass('');
    }
  }, [selectedCollege, colleges, value?.collegeId]);

  // Update classes when major changes
  useEffect(() => {
    if (selectedMajor) {
      const major = majors.find((m) => m.id === selectedMajor);
      setClasses(major?.classes || []);

      // Reset class if major changed
      if (selectedMajor !== value?.majorId) {
        setSelectedClass('');
      }
    } else {
      setClasses([]);
      setSelectedClass('');
    }
  }, [selectedMajor, majors, value?.majorId]);

  // Trigger onChange when all fields are selected
  // Using ref for onChange to prevent infinite loops when parent passes inline function
  useEffect(() => {
    if (selectedCollege && selectedMajor && selectedClass && enrollmentYear) {
      const college = colleges.find((c) => c.id === selectedCollege);
      const major = majors.find((m) => m.id === selectedMajor);
      const classObj = classes.find((c) => c.id === selectedClass);

      if (college && major && classObj) {
        const classCodeValue = classObj.code ?? String(classObj.class_number ?? '');
        const classNumberValue = typeof classObj.class_number === 'number'
          ? classObj.class_number
          : parseInt(classCodeValue || '0', 10);

        // Use ref to call onChange without it being in dependencies
        onChangeRef.current?.({
          collegeId: selectedCollege,
          majorId: selectedMajor,
          classId: selectedClass,
          enrollmentYear,
          collegeCode: college.code,
          majorCode: major.code,
          classCode: classCodeValue,
        });

        // Load student ID preview if enabled
        // Use deduplication to prevent duplicate API calls
        if (showPreview && Number.isFinite(classNumberValue) && classNumberValue > 0) {
          const previewParams = `${college.code}-${major.code}-${enrollmentYear}-${classNumberValue}`;
          if (previewParams !== lastPreviewParamsRef.current) {
            lastPreviewParamsRef.current = previewParams;
            loadPreview(college.code, major.code, enrollmentYear, classNumberValue);
          }
        }
      }
    }
  }, [selectedCollege, selectedMajor, selectedClass, enrollmentYear, colleges, majors, classes, showPreview]);

  const loadPreview = async (
    collegeCode: string,
    majorCode: string,
    year: number,
    classNumber: number
  ) => {
    try {
      setPreviewLoading(true);
      const preview = await previewStudentId(collegeCode, majorCode, year, classNumber);
      setStudentIdPreview(preview.student_id);
    } catch (error) {
      console.error('Failed to preview student ID:', error);
      setStudentIdPreview('');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Generate enrollment year options (current year and past 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enrollment Year */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          入学年份 {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={enrollmentYear}
          onChange={(e) => setEnrollmentYear(parseInt(e.target.value))}
          disabled={disabled}
          required={required}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}级
            </option>
          ))}
        </select>
      </div>

      {/* College Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          学院 {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={selectedCollege}
          onChange={(e) => setSelectedCollege(e.target.value)}
          disabled={disabled || colleges.length === 0}
          required={required}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">请选择学院</option>
          {colleges.map((college) => (
            <option key={college.id} value={college.id}>
              {college.name}
            </option>
          ))}
        </select>
      </div>

      {/* Major Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          专业 {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={selectedMajor}
          onChange={(e) => setSelectedMajor(e.target.value)}
          disabled={disabled || !selectedCollege || majors.length === 0}
          required={required}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">请选择专业</option>
          {majors.map((major) => (
            <option key={major.id} value={major.id}>
              {major.name}
            </option>
          ))}
        </select>
      </div>

      {/* Class Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          班级 {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          disabled={disabled || !selectedMajor || classes.length === 0}
          required={required}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">请选择班级</option>
          {classes.map((classItem) => (
            <option key={classItem.id} value={classItem.id}>
              {classItem.class_name || classItem.name || `${classItem.class_number}班`}
            </option>
          ))}
        </select>
      </div>

      {/* Student ID Preview */}
      {showPreview && selectedCollege && selectedMajor && selectedClass && (
        <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              学号预览
            </span>
            {previewLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
            ) : studentIdPreview ? (
              <span className="text-lg font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {studentIdPreview}
              </span>
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                加载中...
              </span>
            )}
          </div>
          {studentIdPreview && (
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              此学号将在注册时自动生成
            </p>
          )}
        </div>
      )}
    </div>
  );
}
