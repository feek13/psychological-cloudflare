import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authStore } from '@/store/authStore';
import CSSBlob, { BlobAnimationStyles } from '@/components/ui/CSSBlob';
import { Mail, Lock, Sparkles } from 'lucide-react';

// Mind tree illustration with one-time sparkle animation
const MindTreeIllustration = () => (
  <motion.svg
    viewBox="0 0 120 140"
    className="w-32 h-36 mx-auto mb-6"
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.8, delay: 0.2 }}
  >
    {/* Tree trunk */}
    <motion.path
      d="M55 140 Q60 100 58 80 Q54 60 60 50"
      stroke="url(#trunkGradient)"
      strokeWidth="8"
      strokeLinecap="round"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.5, delay: 0.3 }}
    />

    {/* Brain-like foliage circles */}
    <motion.circle
      cx="60" cy="35" r="28"
      fill="url(#leafGradient1)"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.5, delay: 0.8, type: "spring" }}
    />
    <motion.circle
      cx="40" cy="45" r="18"
      fill="url(#leafGradient2)"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.5, delay: 1, type: "spring" }}
    />
    <motion.circle
      cx="80" cy="42" r="20"
      fill="url(#leafGradient2)"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.5, delay: 1.1, type: "spring" }}
    />
    <motion.circle
      cx="55" cy="18" r="15"
      fill="url(#leafGradient3)"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.5, delay: 1.2, type: "spring" }}
    />

    {/* Sparkle dots - ONE-TIME entrance animation, not infinite */}
    {[
      { cx: 45, cy: 25, delay: 1.5 },
      { cx: 70, cy: 30, delay: 1.7 },
      { cx: 58, cy: 12, delay: 1.9 },
      { cx: 35, cy: 40, delay: 2.1 },
      { cx: 85, cy: 38, delay: 2.3 },
    ].map((dot, i) => (
      <motion.circle
        key={i}
        cx={dot.cx}
        cy={dot.cy}
        r="2"
        fill="white"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 0.8, scale: 1 }}
        transition={{ duration: 0.6, delay: dot.delay, type: "spring" }}
      />
    ))}

    <defs>
      <linearGradient id="trunkGradient" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#0f766e" />
        <stop offset="100%" stopColor="#14b8a6" />
      </linearGradient>
      <linearGradient id="leafGradient1" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#14b8a6" />
        <stop offset="100%" stopColor="#5eead4" />
      </linearGradient>
      <linearGradient id="leafGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#c084fc" />
      </linearGradient>
      <linearGradient id="leafGradient3" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#2dd4bf" />
        <stop offset="100%" stopColor="#99f6e4" />
      </linearGradient>
    </defs>
  </motion.svg>
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const navigate = useNavigate();
  const login = authStore((s) => s.login);

  // Smart animation pause: detect page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Determine if background animations should run
  const shouldAnimateBackground = isPageVisible && !isLoading && !focusedField;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      const user = authStore.getState().user;
      if (user && ['teacher', 'counselor', 'admin'].includes(user.role)) {
        navigate('/teacher/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* CSS keyframes for blob animations */}
      <BlobAnimationStyles />

      {/* Layered gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary-900 to-secondary-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-500/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-secondary-500/20 via-transparent to-transparent" />

      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* CSS-animated blob decorations (2 instead of 3, CSS instead of framer-motion) */}
      <CSSBlob
        className={`absolute -top-20 -left-20 w-96 h-96 text-primary-500/10 blob-animate-1 ${!shouldAnimateBackground ? 'blob-paused' : ''}`}
      />
      <CSSBlob
        className={`absolute -bottom-32 -right-32 w-[500px] h-[500px] text-secondary-500/10 blob-animate-2 ${!shouldAnimateBackground ? 'blob-paused' : ''}`}
      />

      {/* Removed: 6 FloatingParticle components (visual noise, no value) */}

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md px-6 relative z-10"
      >
        {/* Glassmorphism card */}
        <div className="relative">
          {/* Card glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary-500/30 via-secondary-500/30 to-primary-500/30 rounded-3xl blur-xl opacity-60" />

          <div className="relative backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] rounded-3xl p-8 shadow-2xl">
            {/* Inner highlight */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/[0.1] to-transparent pointer-events-none" />

            {/* Mind tree illustration */}
            <MindTreeIllustration />

            {/* Title */}
            <motion.div
              className="text-center mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                心理健康评估平台
              </h1>
              <p className="text-white/60 text-sm">
                开启你的心灵成长之旅
              </p>
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 relative">
              {/* Email field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <label className="block text-white/70 text-sm font-medium mb-2">
                  邮箱地址
                </label>
                <div className="relative group">
                  <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl opacity-0 blur transition-all duration-300 ${focusedField === 'email' ? 'opacity-50' : 'group-hover:opacity-30'}`} />
                  <div className="relative flex items-center">
                    <div className="absolute left-4 text-white/40">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="your@email.com"
                      className="w-full pl-11 pr-4 py-3.5 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-primary-400/50 focus:bg-white/[0.08] transition-all duration-300"
                      required
                    />
                  </div>
                </div>
              </motion.div>

              {/* Password field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <label className="block text-white/70 text-sm font-medium mb-2">
                  密码
                </label>
                <div className="relative group">
                  <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl opacity-0 blur transition-all duration-300 ${focusedField === 'password' ? 'opacity-50' : 'group-hover:opacity-30'}`} />
                  <div className="relative flex items-center">
                    <div className="absolute left-4 text-white/40">
                      <Lock size={18} />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3.5 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-primary-400/50 focus:bg-white/[0.08] transition-all duration-300"
                      required
                    />
                  </div>
                </div>
              </motion.div>

              {/* Submit button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="pt-2"
              >
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full relative group overflow-hidden"
                >
                  {/* Button glow - only animate on hover, not infinite */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 rounded-xl blur opacity-40 group-hover:opacity-60 transition-opacity duration-300" />

                  <div className="relative flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                    {isLoading ? (
                      <motion.div
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <>
                        <Sparkles size={18} className="opacity-80" />
                        <span>登录</span>
                      </>
                    )}
                  </div>
                </button>
              </motion.div>
            </form>

            {/* Register link */}
            <motion.div
              className="mt-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <p className="text-white/50 text-sm">
                还没有账号？{' '}
                <Link
                  to="/register"
                  className="text-primary-400 hover:text-primary-300 font-medium transition-colors hover:underline underline-offset-4"
                >
                  立即注册
                </Link>
              </p>
            </motion.div>

            {/* Test account hint */}
            <motion.div
              className="mt-6 p-4 bg-white/[0.04] border border-white/[0.08] rounded-xl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
            >
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-primary-500/20 rounded-lg">
                  <Sparkles size={14} className="text-primary-400" />
                </div>
                <div className="text-xs">
                  <p className="text-white/60 font-medium mb-1.5">测试账号</p>
                  <p className="text-white/40 font-mono">test@demo.com</p>
                  <p className="text-white/40 font-mono">Test123456</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom decoration */}
        <motion.div
          className="text-center mt-8 text-white/30 text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          守护每一颗心灵的成长
        </motion.div>
      </motion.div>
    </div>
  );
}
