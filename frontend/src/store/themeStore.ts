import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDark: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

export const themeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: false,
      get theme() {
        return get().isDark ? 'dark' : 'light';
      },

      toggleTheme: () => {
        set((state) => {
          const newIsDark = !state.isDark;
          // Update HTML class
          if (newIsDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          return { isDark: newIsDark };
        });
      },

      setTheme: (isDark) => {
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        set({ isDark });
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);

// Initialize theme on app load
const savedIsDark = themeStore.getState().isDark;
if (savedIsDark) {
  document.documentElement.classList.add('dark');
}
