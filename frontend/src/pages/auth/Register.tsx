import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authStore } from '@/store/authStore';
import OrganizationSelector from '@/components/OrganizationSelector';
import CSSBlob, { BlobAnimationStyles } from '@/components/ui/CSSBlob';
import { Mail, Lock, User, Sprout, ChevronRight, Check, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

// Sprouting seedling illustration - represents the beginning of a journey
const SproutIllustration = () => (
  <motion.svg
    viewBox="0 0 100 120"
    className="w-24 h-28 mx-auto mb-4"
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.8, delay: 0.2 }}
  >
    {/* Soil/ground */}
    <motion.ellipse
      cx="50" cy="105" rx="35" ry="8"
      fill="url(#soilGradient)"
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    />

    {/* Main stem growing up */}
    <motion.path
      d="M50 105 Q48 85 50 65 Q52 50 50 40"
      stroke="url(#stemGradient)"
      strokeWidth="4"
      strokeLinecap="round"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
    />

    {/* Left leaf unfurling */}
    <motion.path
      d="M50 55 Q35 50 28 38 Q32 52 50 55"
      fill="url(#leafGradient1)"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay: 1.2, type: "spring" }}
      style={{ transformOrigin: "50px 55px" }}
    />

    {/* Right leaf unfurling */}
    <motion.path
      d="M50 50 Q65 45 72 32 Q68 48 50 50"
      fill="url(#leafGradient2)"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay: 1.4, type: "spring" }}
      style={{ transformOrigin: "50px 50px" }}
    />

    {/* Top bud */}
    <motion.circle
      cx="50" cy="38" r="6"
      fill="url(#budGradient)"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.4, delay: 1.6, type: "spring", stiffness: 200 }}
    />

    {/* Sparkle on bud - one-time */}
    <motion.circle
      cx="53" cy="35" r="2"
      fill="white"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 0.9, scale: 1 }}
      transition={{ duration: 0.4, delay: 1.8 }}
    />

    <defs>
      <linearGradient id="soilGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#4a3728" />
        <stop offset="50%" stopColor="#5d4632" />
        <stop offset="100%" stopColor="#4a3728" />
      </linearGradient>
      <linearGradient id="stemGradient" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#0f766e" />
        <stop offset="100%" stopColor="#14b8a6" />
      </linearGradient>
      <linearGradient id="leafGradient1" x1="100%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#14b8a6" />
        <stop offset="100%" stopColor="#5eead4" />
      </linearGradient>
      <linearGradient id="leafGradient2" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#c084fc" />
      </linearGradient>
      <radialGradient id="budGradient" cx="40%" cy="40%">
        <stop offset="0%" stopColor="#f0fdfa" />
        <stop offset="100%" stopColor="#5eead4" />
      </radialGradient>
    </defs>
  </motion.svg>
);

// Step indicator component
const StepIndicator = ({ steps, currentStep }: { steps: string[]; currentStep: number }) => (
  <div className="flex items-center justify-center gap-2 mb-6">
    {steps.map((step, index) => (
      <div key={step} className="flex items-center">
        <motion.div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
            index < currentStep
              ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white'
              : index === currentStep
              ? 'bg-white/20 text-white border-2 border-primary-400'
              : 'bg-white/5 text-white/40 border border-white/10'
          }`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 * index, type: "spring" }}
        >
          {index < currentStep ? <Check size={14} /> : index + 1}
        </motion.div>
        {index < steps.length - 1 && (
          <div className={`w-8 h-0.5 mx-1 transition-all duration-500 ${
            index < currentStep ? 'bg-gradient-to-r from-primary-500 to-secondary-500' : 'bg-white/10'
          }`} />
        )}
      </div>
    ))}
  </div>
);

// Custom input component with glassmorphism style
const GlassInput = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon,
  required,
  showPasswordToggle,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  required?: boolean;
  showPasswordToggle?: boolean;
}) => {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const actualType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

  return (
    <div>
      <label className="block text-white/70 text-sm font-medium mb-2">{label}</label>
      <div className="relative group">
        <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl opacity-0 blur transition-all duration-300 ${focused ? 'opacity-50' : 'group-hover:opacity-30'}`} />
        <div className="relative flex items-center">
          {icon && <div className="absolute left-4 text-white/40">{icon}</div>}
          <input
            type={actualType}
            name={name}
            value={value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            required={required}
            className={`w-full ${icon ? 'pl-11' : 'pl-4'} ${showPasswordToggle ? 'pr-11' : 'pr-4'} py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-primary-400/50 focus:bg-white/[0.08] transition-all duration-300`}
          />
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 text-white/40 hover:text-white/60 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    full_name: '',
    college_id: '',
    major_id: '',
    class_id: '',
    enrollment_year: new Date().getFullYear(),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [focusedSection, setFocusedSection] = useState<string | null>(null);
  const navigate = useNavigate();
  const register = authStore((s) => s.register);

  // Smart animation pause
  useEffect(() => {
    const handleVisibilityChange = () => setIsPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const shouldAnimateBackground = isPageVisible && !isLoading && !focusedSection;

  // Calculate current step based on filled fields
  const currentStep = useMemo(() => {
    if (formData.college_id && formData.major_id && formData.class_id) return 3;
    if (formData.password && formData.confirmPassword) return 2;
    if (formData.email && formData.username && formData.full_name) return 1;
    return 0;
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOrganizationChange = (value: {
    collegeId: string;
    majorId: string;
    classId: string;
    enrollmentYear: number;
  }) => {
    setFormData({
      ...formData,
      college_id: value.collegeId,
      major_id: value.majorId,
      class_id: value.classId,
      enrollment_year: value.enrollmentYear,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('密码长度至少为8位');
      return;
    }

    const hasUppercase = /[A-Z]/.test(formData.password);
    const hasLowercase = /[a-z]/.test(formData.password);
    const hasNumber = /\d/.test(formData.password);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      toast.error('密码必须包含大写字母、小写字母和数字');
      return;
    }

    if (!formData.college_id || !formData.major_id || !formData.class_id) {
      toast.error('请选择学院、专业和班级');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email: formData.email,
        password: formData.password,
        username: formData.username,
        full_name: formData.full_name,
        role: 'student',
        college_id: formData.college_id,
        major_id: formData.major_id,
        class_id: formData.class_id,
        enrollment_year: formData.enrollment_year,
      });
      toast.success('注册成功！请检查邮箱进行验证');
      navigate('/login');
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-8 px-4">
      {/* CSS keyframes for blob animations */}
      <BlobAnimationStyles />

      {/* Layered gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary-900 to-secondary-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-secondary-500/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-primary-500/20 via-transparent to-transparent" />

      {/* Grain texture */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* CSS-animated blobs */}
      <CSSBlob variant="variant2" className={`absolute -top-32 -right-32 w-[450px] h-[450px] text-primary-500/8 blob-animate-1 ${!shouldAnimateBackground ? 'blob-paused' : ''}`} />
      <CSSBlob variant="variant2" className={`absolute -bottom-40 -left-40 w-[500px] h-[500px] text-secondary-500/8 blob-animate-2 ${!shouldAnimateBackground ? 'blob-paused' : ''}`} />

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl relative z-10"
      >
        {/* Glassmorphism card */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-secondary-500/30 via-primary-500/30 to-secondary-500/30 rounded-3xl blur-xl opacity-50" />

          <div className="relative backdrop-blur-xl bg-white/[0.07] border border-white/[0.12] rounded-3xl p-8 shadow-2xl">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/[0.08] to-transparent pointer-events-none" />

            {/* Sprout illustration */}
            <SproutIllustration />

            {/* Title */}
            <motion.div
              className="text-center mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                开启成长之旅
              </h1>
              <p className="text-white/50 text-sm">
                创建账号，探索内心世界
              </p>
            </motion.div>

            {/* Step indicator */}
            <StepIndicator steps={['基本信息', '设置密码', '学籍信息']} currentStep={currentStep} />

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6 relative">
              {/* Section 1: Basic Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onFocus={() => setFocusedSection('basic')}
                onBlur={() => setFocusedSection(null)}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
                    <User size={12} className="text-white" />
                  </div>
                  <span className="text-white/80 text-sm font-medium">基本信息</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <GlassInput
                    label="邮箱"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    icon={<Mail size={18} />}
                    required
                  />
                  <GlassInput
                    label="用户名"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="username"
                    icon={<User size={18} />}
                    required
                  />
                  <div className="md:col-span-2">
                    <GlassInput
                      label="姓名"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="请输入真实姓名"
                      icon={<User size={18} />}
                      required
                    />
                  </div>
                </div>
              </motion.div>

              {/* Section 2: Password */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="pt-4 border-t border-white/[0.08]"
                onFocus={() => setFocusedSection('password')}
                onBlur={() => setFocusedSection(null)}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
                    <Lock size={12} className="text-white" />
                  </div>
                  <span className="text-white/80 text-sm font-medium">设置密码</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <GlassInput
                    label="密码"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="至少8位，含大小写和数字"
                    icon={<Lock size={18} />}
                    showPasswordToggle
                    required
                  />
                  <GlassInput
                    label="确认密码"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="再次输入密码"
                    icon={<Lock size={18} />}
                    showPasswordToggle
                    required
                  />
                </div>
                {/* Password strength indicator */}
                <AnimatePresence>
                  {formData.password && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-1"
                    >
                      <div className="flex gap-1">
                        {[
                          formData.password.length >= 8,
                          /[A-Z]/.test(formData.password),
                          /[a-z]/.test(formData.password),
                          /\d/.test(formData.password),
                        ].map((valid, i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              valid ? 'bg-gradient-to-r from-primary-500 to-secondary-500' : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-white/40 text-xs">
                        {formData.password.length >= 8 && /[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password) && /\d/.test(formData.password)
                          ? '密码强度：强'
                          : '需要：8位以上、大写、小写、数字'}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Section 3: Organization */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="pt-4 border-t border-white/[0.08]"
                onFocus={() => setFocusedSection('org')}
                onBlur={() => setFocusedSection(null)}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
                    <Sprout size={12} className="text-white" />
                  </div>
                  <span className="text-white/80 text-sm font-medium">学籍信息</span>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                  <OrganizationSelector
                    value={{
                      collegeId: formData.college_id,
                      majorId: formData.major_id,
                      classId: formData.class_id,
                      enrollmentYear: formData.enrollment_year,
                    }}
                    onChange={handleOrganizationChange}
                    showPreview={true}
                    required={true}
                  />
                </div>
              </motion.div>

              {/* Submit button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="pt-4"
              >
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full relative group overflow-hidden"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-secondary-500 via-primary-500 to-secondary-500 rounded-xl blur opacity-40 group-hover:opacity-60 transition-opacity duration-300" />
                  <div className="relative flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-secondary-600 to-primary-600 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                    {isLoading ? (
                      <motion.div
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <>
                        <Sprout size={18} className="opacity-80" />
                        <span>开始成长</span>
                        <ChevronRight size={18} className="opacity-60 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </div>
                </button>
              </motion.div>

              {/* Login link */}
              <motion.div
                className="text-center pt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                <p className="text-white/50 text-sm">
                  已有账号？{' '}
                  <Link
                    to="/login"
                    className="text-primary-400 hover:text-primary-300 font-medium transition-colors hover:underline underline-offset-4"
                  >
                    立即登录
                  </Link>
                </p>
              </motion.div>
            </form>
          </div>
        </div>

        {/* Bottom text */}
        <motion.div
          className="text-center mt-6 text-white/25 text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          每一次自我探索，都是成长的开始
        </motion.div>
      </motion.div>
    </div>
  );
}
