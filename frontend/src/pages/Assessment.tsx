import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { scalesAPI } from '@/api/scales';
import { assessmentsAPI } from '@/api/assessments';
import MainLayout from '@/components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import ProgressBar from '@/components/ui/ProgressBar';
import toast from 'react-hot-toast';
import type { Question } from '@/types/scale';
import type { Assessment } from '@/types/assessment';
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Keyboard } from 'lucide-react';

export default function AssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadAssessment = async () => {
      try {
        // First, load the assessment
        const assessmentRes = await assessmentsAPI.get(id);

        if (!assessmentRes.success) {
          toast.error(assessmentRes.message || '测评不存在');
          setTimeout(() => navigate('/'), 1500); // Auto-redirect to home after showing error
          setLoading(false);
          return;
        }

        setAssessment(assessmentRes.data);
        setAnswers(assessmentRes.data.answers || {});

        // Check if assessment is already completed
        if (assessmentRes.data.status === 'completed') {
          toast.error('该测评已完成');
          navigate(`/reports/${id}`);
          return;
        }

        // Then load questions for this scale
        if (assessmentRes.data.scale_id) {
          const questionsRes = await scalesAPI.getQuestions(assessmentRes.data.scale_id);
          if (questionsRes.success && questionsRes.data && questionsRes.data.questions) {
            setQuestions(questionsRes.data.questions);
          } else {
            toast.error('加载题目失败');
          }
        }
      } catch (error: any) {
        console.error('Load assessment error:', error);
        const errorMessage = error?.response?.data?.message || '加载测评失败';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadAssessment();
  }, [id, navigate]);

  // Derived state - must be declared before useEffect that uses them
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  // Keyboard shortcuts
  useEffect(() => {
    if (!currentQuestion || loading) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent keyboard shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Number keys 1-5 for options
      if (e.key >= '1' && e.key <= '5') {
        const optionIndex = parseInt(e.key) - 1;
        if (currentQuestion.options[optionIndex]) {
          handleAnswerSelect(currentQuestion.options[optionIndex].value);
        }
      }

      // Arrow keys for navigation
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < totalQuestions - 1) {
          handleNext();
        }
      }

      // Enter to submit when all questions answered
      if (e.key === 'Enter' && answeredCount === totalQuestions) {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentQuestion, loading, currentIndex, totalQuestions, answeredCount]);

  const handleAnswerSelect = async (optionValue: number) => {
    if (!currentQuestion || !id) return;

    // Prevent submitting answer if assessment is already completed
    if (assessment?.status === 'completed') {
      console.warn('Cannot submit answer: assessment is already completed');
      return;
    }

    // Prevent duplicate submissions
    if (isSubmittingAnswer) {
      console.warn('Already submitting an answer, please wait');
      return;
    }

    const newAnswers = {
      ...answers,
      [currentQuestion.id]: optionValue,
    };
    setAnswers(newAnswers);

    // Save answer to backend
    setIsSubmittingAnswer(true);
    try {
      await assessmentsAPI.submitAnswer(id, currentQuestion.id, optionValue);
    } catch (error: any) {
      // Check if error is due to completed assessment
      if (error?.response?.data?.detail?.includes('进行中')) {
        console.warn('Assessment already completed, skipping answer submission');
      } else {
        console.error('Failed to save answer:', error);
      }
    } finally {
      setIsSubmittingAnswer(false);
    }

    // Auto advance to next question
    if (currentIndex < totalQuestions - 1) {
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
      }, 300);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSubmit = async () => {
    if (!id) return;

    // Check if all questions are answered
    if (answeredCount < totalQuestions) {
      toast.error(`还有 ${totalQuestions - answeredCount} 题未作答，请完成所有题目后再提交`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await assessmentsAPI.submit(id, answers);
      if (res.success) {
        // Trigger confetti animation
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
          });
        }, 250);

        toast.success('测评提交成功！正在生成报告...');
        setTimeout(() => {
          navigate(`/reports/${id}`);
        }, 1000);
      } else {
        toast.error(res.message || '提交失败');
      }
    } catch (error) {
      toast.error('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loading size="lg" text="加载测评中..." />
        </div>
      </MainLayout>
    );
  }

  if (!assessment || !currentQuestion) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4">
          <Card className="text-center py-12">
            <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              测评未找到
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              该测评不存在或已被删除
            </p>
            <Button onClick={() => navigate('/dashboard')}>返回首页</Button>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card variant="gradient" className="mb-6 border-2 border-primary-200 dark:border-primary-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {assessment.scales?.name || '心理测评'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  第 {currentIndex + 1} 题 / 共 {totalQuestions} 题
                </p>
              </div>
              <div className="text-right">
                <motion.div
                  className="text-2xl font-bold text-primary-600 dark:text-primary-400"
                  key={answeredCount}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  {answeredCount}/{totalQuestions}
                </motion.div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {answeredCount === totalQuestions ? '已完成' : '已作答'}
                </p>
              </div>
            </div>
            <ProgressBar
              value={answeredCount}
              max={totalQuestions}
              showLabel={false}
              variant="gradient"
              animated
            />
          </Card>
        </motion.div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="mb-6">
          <div className="mb-6">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold flex items-center justify-center">
                {currentIndex + 1}
              </span>
              <div className="flex-1">
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                  {currentQuestion.content}
                </h3>
                {currentQuestion.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {currentQuestion.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = answers[currentQuestion.id] === option.value;
              return (
                <motion.button
                  key={option.value}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAnswerSelect(option.value)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {isSelected && <CheckCircle className="text-white" size={16} />}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${
                        isSelected
                          ? 'text-primary-700 dark:text-primary-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {option.label}
                      </div>
                      {option.description && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {option.description}
                        </div>
                      )}
                    </div>
                    {/* 隐藏分值显示，符合心理测评标准 */}
                    {index < 5 && (
                      <kbd className="ml-2 px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                        {index + 1}
                      </kbd>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </Card>
          </motion.div>
        </AnimatePresence>

        {/* Keyboard Shortcuts Hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
        >
          <div className="flex items-start gap-2">
            <Keyboard className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-semibold">快捷键提示：</span>
              <span className="ml-2">按数字键 1-5 选择选项</span>
              <span className="mx-2">•</span>
              <span>左右方向键切换题目</span>
              <span className="mx-2">•</span>
              <span>Enter 键提交</span>
            </div>
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.div
          className="flex items-center justify-between gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            size="lg"
            iconLeft={<ChevronLeft size={20} />}
          >
            上一题
          </Button>

          <div className="flex gap-2">
            {questions.map((_, idx) => {
              const isAnswered = answers[questions[idx].id] !== undefined;
              const isCurrent = idx === currentIndex;
              return (
                <motion.button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  className={`h-2 rounded-full transition-all ${
                    isCurrent
                      ? 'bg-primary-600 w-6'
                      : isAnswered
                      ? 'bg-primary-300 dark:bg-primary-700 w-2'
                      : 'bg-red-400 dark:bg-red-600 w-2 ring-2 ring-red-200 dark:ring-red-800'
                  }`}
                  title={`第 ${idx + 1} 题${isAnswered ? '（已作答）' : '（未作答）'}`}
                />
              );
            })}
          </div>

          {currentIndex === totalQuestions - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={answeredCount < totalQuestions || submitting}
              isLoading={submitting}
              variant="gradient-primary"
              size="lg"
            >
              {submitting ? '提交中...' : '提交测评'}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={currentIndex === totalQuestions - 1}
              variant="gradient-primary"
              size="lg"
              iconRight={<ChevronRight size={20} />}
            >
              下一题
            </Button>
          )}
        </motion.div>

        {/* Hint */}
        {answeredCount < totalQuestions && (
          <motion.div
            className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
                  还有 {totalQuestions - answeredCount} 题未作答，完成所有题目后才能提交
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  提示：点击底部红色圆点可快速跳转到未作答的题目
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
}
