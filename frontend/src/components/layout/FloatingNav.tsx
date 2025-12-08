import { memo, useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authStore } from '@/store/authStore';
import { themeStore } from '@/store/themeStore';
import {
  Home,
  FileText,
  History,
  User,
  LogOut,
  Moon,
  Sun,
  Brain,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';

interface FloatingNavProps {
  transparentOnTop?: boolean;
}

const navItems = [
  { path: '/dashboard', icon: Home, label: '首页' },
  { path: '/scales', icon: FileText, label: '量表' },
  { path: '/history', icon: History, label: '历史' },
  { path: '/profile', icon: User, label: '我的' },
];

const NavLink = memo(({
  path,
  icon: Icon,
  label,
  isActive,
  isTransparent,
}: {
  path: string;
  icon: typeof Home;
  label: string;
  isActive: boolean;
  isTransparent: boolean;
}) => (
  <Link
    to={path}
    className={`relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
      isActive
        ? isTransparent
          ? 'text-white'
          : 'text-primary-700 dark:text-primary-300'
        : isTransparent
          ? 'text-white/70 hover:text-white hover:bg-white/10'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-white/[0.06]'
    }`}
  >
    {isActive && (
      <motion.div
        layoutId="activeNavBg"
        className={`absolute inset-0 rounded-xl ${
          isTransparent
            ? 'bg-white/20 backdrop-blur-sm'
            : 'bg-gradient-to-r from-primary-100 to-primary-50 dark:from-primary-900/40 dark:to-primary-800/30'
        }`}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
      />
    )}
    <span className="relative z-10 flex items-center gap-2">
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </span>
  </Link>
));

NavLink.displayName = 'NavLink';

const MobileNavLink = memo(({
  path,
  icon: Icon,
  label,
  isActive,
}: {
  path: string;
  icon: typeof Home;
  label: string;
  isActive: boolean;
}) => (
  <Link
    to={path}
    className="relative flex flex-col items-center justify-center py-2 px-3"
  >
    {isActive && (
      <motion.div
        layoutId="activeMobileNav"
        className="absolute inset-1 bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/40 dark:to-primary-800/30 rounded-xl"
        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
      />
    )}
    <span className={`relative z-10 flex flex-col items-center gap-1 transition-colors ${
      isActive
        ? 'text-primary-600 dark:text-primary-400'
        : 'text-gray-500 dark:text-gray-400'
    }`}>
      <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
      <span className="text-xs font-medium">{label}</span>
    </span>
  </Link>
));

MobileNavLink.displayName = 'MobileNavLink';

const FloatingNav = memo(({ transparentOnTop = true }: FloatingNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = authStore((s) => s.user);
  const logout = authStore((s) => s.logout);
  const { theme, toggleTheme } = themeStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const isTransparent = transparentOnTop && !isScrolled;

  return (
    <>
      {/* Desktop Navigation */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isTransparent
            ? 'bg-transparent'
            : 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-lg shadow-gray-200/20 dark:shadow-gray-900/50 border-b border-gray-200/50 dark:border-white/[0.08]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-105 ${
                isTransparent
                  ? 'bg-white/20 backdrop-blur-sm shadow-white/10'
                  : 'bg-gradient-to-br from-primary-500 to-secondary-600 shadow-primary-500/30'
              }`}>
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className={`text-xl font-bold transition-colors duration-300 ${
                isTransparent
                  ? 'text-white'
                  : 'bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent'
              }`}>
                心理评估平台
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  path={item.path}
                  icon={item.icon}
                  label={item.label}
                  isActive={location.pathname === item.path}
                  isTransparent={isTransparent}
                />
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`relative w-10 h-10 rounded-xl transition-all duration-300 overflow-hidden ${
                  isTransparent
                    ? 'text-white/80 hover:text-white bg-white/10 hover:bg-white/20'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100/50 dark:bg-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.1]'
                }`}
              >
                <span
                  className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
                  style={{ transform: theme === 'dark' ? 'translateY(0)' : 'translateY(-100%)' }}
                >
                  <Sun className="w-5 h-5" />
                </span>
                <span
                  className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
                  style={{ transform: theme === 'dark' ? 'translateY(100%)' : 'translateY(0)' }}
                >
                  <Moon className="w-5 h-5" />
                </span>
              </button>

              {/* User Info & Logout (Desktop) */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <div className={`text-sm font-semibold transition-colors ${
                    isTransparent ? 'text-white' : 'text-gray-900 dark:text-white'
                  }`}>
                    {user?.full_name || user?.username}
                  </div>
                  <div className={`text-xs truncate max-w-[120px] transition-colors ${
                    isTransparent ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {user?.email}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className={`w-10 h-10 rounded-xl transition-all duration-300 ${
                    isTransparent
                      ? 'text-white/70 hover:text-red-300 bg-white/10 hover:bg-red-500/20'
                      : 'text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 bg-gray-100/50 dark:bg-white/[0.06] hover:bg-red-50 dark:hover:bg-red-900/20'
                  }`}
                >
                  <LogOut className="w-5 h-5 mx-auto" />
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`md:hidden w-10 h-10 rounded-xl transition-all duration-300 ${
                  isTransparent
                    ? 'text-white/80 hover:text-white bg-white/10 hover:bg-white/20'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100/50 dark:bg-white/[0.06]'
                }`}
              >
                {mobileMenuOpen ? <X className="w-5 h-5 mx-auto" /> : <Menu className="w-5 h-5 mx-auto" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-white/[0.08]"
            >
              <div className="px-4 py-3 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                      location.pathname === item.path
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                ))}
                <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full p-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">退出登录</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-white/[0.08]" />
        <div className="relative flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map((item) => (
            <MobileNavLink
              key={item.path}
              path={item.path}
              icon={item.icon}
              label={item.label}
              isActive={location.pathname === item.path}
            />
          ))}
        </div>
        <div className="h-safe-area-bottom bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl" />
      </nav>

      {/* Spacer for fixed header - only when not transparent */}
      {!transparentOnTop && <div className="h-16" />}

      {/* Spacer for mobile bottom nav */}
      <div className="h-16 md:hidden" />
    </>
  );
});

FloatingNav.displayName = 'FloatingNav';

export default FloatingNav;
