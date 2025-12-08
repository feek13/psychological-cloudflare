import { useState, useRef, useCallback, memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Mail, Calendar, GraduationCap, Building2, Hash, Sparkles } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import type { User } from '@/types/auth';

interface ProfileCard3DProps {
  user: User | null;
  className?: string;
}

const ProfileCard3D = memo(({ user, className = '' }: ProfileCard3DProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0 });
  const rafRef = useRef<number | null>(null);

  // Throttled mouse move handler using RAF
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (rafRef.current) return; // Skip if RAF is pending

    rafRef.current = requestAnimationFrame(() => {
      if (!cardRef.current) {
        rafRef.current = null;
        return;
      }
      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setTransform({ rotateX: -y * 8, rotateY: x * 8 });
      rafRef.current = null;
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setTransform({ rotateX: 0, rotateY: 0 });
  }, []);

  const roleBadge = useMemo(() => {
    const roleMap = {
      student: { label: '学生', variant: 'info' as const, icon: '🎓' },
      teacher: { label: '教师', variant: 'success' as const, icon: '👨‍🏫' },
      counselor: { label: '咨询师', variant: 'warning' as const, icon: '💼' },
      admin: { label: '管理员', variant: 'danger' as const, icon: '👑' },
    };
    return roleMap[user?.role as keyof typeof roleMap] || roleMap.student;
  }, [user?.role]);

  // Memoize info items to prevent re-renders
  const infoItems = useMemo(() => {
    const items = [
      {
        key: 'email',
        icon: Mail,
        label: '邮箱',
        value: user?.email || '未设置',
        gradient: 'from-primary-400 to-primary-600',
        bg: 'from-primary-50/50 to-primary-100/30 dark:from-primary-900/20 dark:to-primary-800/10',
        border: 'border-primary-200/50 dark:border-primary-700/30',
        shadow: 'shadow-primary-400/30',
      },
    ];

    if (user?.student_id) {
      items.push({
        key: 'student_id',
        icon: Hash,
        label: '学号',
        value: user.student_id,
        gradient: 'from-secondary-400 to-secondary-600',
        bg: 'from-secondary-50/50 to-secondary-100/30 dark:from-secondary-900/20 dark:to-secondary-800/10',
        border: 'border-secondary-200/50 dark:border-secondary-700/30',
        shadow: 'shadow-secondary-400/30',
      });
    }

    items.push({
      key: 'date',
      icon: Calendar,
      label: user?.enrollment_year ? '入学年份' : '注册时间',
      value: user?.enrollment_year?.toString() || new Date(user?.created_at || '').toLocaleDateString('zh-CN'),
      gradient: 'from-amber-400 to-amber-600',
      bg: 'from-amber-50/50 to-amber-100/30 dark:from-amber-900/20 dark:to-amber-800/10',
      border: 'border-amber-200/50 dark:border-amber-700/30',
      shadow: 'shadow-amber-400/30',
    });

    if (user?.class_name) {
      items.push({
        key: 'class',
        icon: GraduationCap,
        label: '班级',
        value: user.class_name,
        gradient: 'from-green-400 to-green-600',
        bg: 'from-green-50/50 to-green-100/30 dark:from-green-900/20 dark:to-green-800/10',
        border: 'border-green-200/50 dark:border-green-700/30',
        shadow: 'shadow-green-400/30',
      });
    }

    return items;
  }, [user]);

  return (
    <div className={`perspective-1000 ${className}`} style={{ perspective: '1000px' }}>
      <motion.div
        ref={cardRef}
        className="relative w-full will-change-transform"
        style={{
          transform: `rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.1s ease-out',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Card Container */}
        <div className="relative rounded-3xl overflow-hidden">
          {/* Animated Border - using CSS animation */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-400 p-[2px] animate-gradient-slow">
            <div className="absolute inset-[2px] rounded-3xl bg-white dark:bg-gray-900" />
          </div>

          {/* Main Card Content */}
          <div className="relative bg-gradient-to-br from-white/95 via-white/90 to-gray-50/95 dark:from-gray-800/95 dark:via-gray-850/90 dark:to-gray-900/95 backdrop-blur-sm rounded-3xl p-8 overflow-hidden">
            {/* Static Decorative Elements - no animation */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary-200/20 to-secondary-200/20 dark:from-primary-900/15 dark:to-secondary-900/15 rounded-full -mr-32 -mt-32 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-secondary-200/15 to-primary-200/15 dark:from-secondary-900/10 dark:to-primary-900/10 rounded-full -ml-24 -mb-24 blur-xl" />

            {/* Header Section */}
            <div className="relative flex items-start justify-between mb-8">
              {/* Avatar & Name */}
              <div className="flex items-center gap-5">
                {/* Avatar */}
                <div className="relative">
                  {/* Avatar Glow - static */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-2xl blur-md opacity-40" />

                  {/* Avatar Container */}
                  <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-400 via-primary-500 to-secondary-500 p-[3px] shadow-xl">
                    <div className="w-full h-full rounded-[13px] bg-gradient-to-br from-primary-300 to-secondary-400 flex items-center justify-center overflow-hidden">
                      {user?.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name || 'Avatar'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl font-bold text-white drop-shadow-lg">
                          {user?.full_name?.[0] || user?.username?.[0] || 'U'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Online Indicator - simple pulse */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-4 border-white dark:border-gray-800 animate-pulse" />
                </div>

                {/* Name & Username */}
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
                    {user?.full_name || user?.username || '未设置'}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">
                    @{user?.username || '未设置'}
                  </p>
                </div>
              </div>

              {/* Role Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xl">{roleBadge.icon}</span>
                <Badge variant={roleBadge.variant} className="text-sm px-4 py-1.5 font-semibold">
                  {roleBadge.label}
                </Badge>
              </div>
            </div>

            {/* Divider with Gradient */}
            <div className="relative h-px mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
              <Sparkles className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 bg-white dark:bg-gray-800 px-1" />
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {infoItems.map((item) => (
                <div
                  key={item.key}
                  className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r ${item.bg} border ${item.border} transition-transform duration-200 hover:scale-[1.02] hover:translate-x-1`}
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg ${item.shadow}`}>
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{item.label}</div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {item.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Wave Decoration - CSS animation */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-400 animate-gradient-slow" />
          </div>
        </div>
      </motion.div>

      {/* CSS Animations */}
      <style>{`
        @keyframes gradient-slow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-slow {
          background-size: 200% 200%;
          animation: gradient-slow 4s ease infinite;
        }
      `}</style>
    </div>
  );
});

ProfileCard3D.displayName = 'ProfileCard3D';

export default ProfileCard3D;
