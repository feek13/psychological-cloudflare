import { ReactNode, useState, useEffect, memo, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  Brain
} from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
}

// Navigation items configuration
const navItems = [
  { path: '/dashboard', icon: Home, label: '首页' },
  { path: '/scales', icon: FileText, label: '量表' },
  { path: '/history', icon: History, label: '历史' },
  { path: '/profile', icon: User, label: '我的' },
];

// Desktop nav link component
const DesktopNavLink = memo(({
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
    className={`relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
      isActive
        ? 'text-primary-700 dark:text-primary-300'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-white/[0.06]'
    }`}
  >
    {isActive && (
      <motion.div
        layoutId="activeNavBg"
        className="absolute inset-0 bg-gradient-to-r from-primary-100 to-primary-50 dark:from-primary-900/40 dark:to-primary-800/30 rounded-xl"
        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
      />
    )}
    <span className="relative z-10 flex items-center gap-2">
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </span>
    {isActive && (
      <motion.div
        layoutId="activeNavIndicator"
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-1 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
      />
    )}
  </Link>
));

DesktopNavLink.displayName = 'DesktopNavLink';

// Mobile nav link component
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
    {isActive && (
      <motion.div
        layoutId="activeMobileIndicator"
        className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-1 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
      />
    )}
  </Link>
));

MobileNavLink.displayName = 'MobileNavLink';

export default function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = authStore((s) => s.user);
  const logout = authStore((s) => s.logout);
  const { theme, toggleTheme } = themeStore();
  const [isScrolled, setIsScrolled] = useState(false);

  // Track scroll for header background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 border-b border-gray-200/50 dark:border-white/[0.08]'
            : 'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center shadow-lg shadow-primary-500/30 transition-transform duration-300 group-hover:scale-105">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                心理评估平台
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <DesktopNavLink
                  key={item.path}
                  path={item.path}
                  icon={item.icon}
                  label={item.label}
                  isActive={location.pathname === item.path}
                />
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="relative w-10 h-10 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100/50 dark:bg-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.1] transition-all duration-300 overflow-hidden"
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

              {/* User Info & Logout */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {user?.full_name || user?.username}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                    {user?.email}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-10 h-10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 bg-gray-100/50 dark:bg-white/[0.06] hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300"
                >
                  <LogOut className="w-5 h-5 mx-auto" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        {/* Glass background */}
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-white/[0.08]" />

        {/* Navigation items */}
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

        {/* Safe area padding for iOS */}
        <div className="h-safe-area-bottom bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl" />
      </nav>

      {/* Spacer for mobile nav */}
      <div className="h-16 md:hidden" />
    </div>
  );
}
