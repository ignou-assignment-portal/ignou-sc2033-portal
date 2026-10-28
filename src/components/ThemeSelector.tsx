import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { THEMES } from '../utils/theme';
import { AppTheme } from '../types';
import {
  Palette,
  Check,
  Moon,
  Sun,
  ChevronDown,
  Sparkles,
  Layers,
} from 'lucide-react';

interface ThemeSelectorProps {
  variant?: 'dropdown' | 'cards' | 'minimal';
  className?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  variant = 'dropdown',
  className = '',
}) => {
  const { currentTheme, setTheme, isDark, toggleDark } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const activeThemeMeta = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  // Cards layout for Settings page
  if (variant === 'cards') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200">
          <div>
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-600" />
              <span>Application Theme & Visual Style</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select your preferred color scheme and contrast mode. Your preference is saved locally across sessions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleDark}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer shadow-2xs ${
                isDark
                  ? 'bg-indigo-950 text-indigo-200 border-indigo-700'
                  : 'bg-zinc-100 text-zinc-700 hover:text-zinc-900 border-zinc-200 hover:bg-zinc-200'
              }`}
              title="Quick Toggle Dark Mode"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
              <span>{isDark ? 'Switch to Light Theme' : 'Quick Dark Mode'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {THEMES.map((theme) => {
            const isSelected = currentTheme === theme.id;
            return (
              <div
                key={theme.id}
                onClick={() => setTheme(theme.id)}
                className={`group relative text-left rounded-2xl border p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md bg-white'
                    : 'border-zinc-200 hover:border-zinc-300 hover:shadow-xs bg-white/70 hover:bg-white'
                }`}
              >
                <div>
                  {/* Theme Header with Swatches */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center -space-x-1">
                        <span
                          className="w-4 h-4 rounded-full border border-white shadow-2xs"
                          style={{ backgroundColor: theme.colors.primary }}
                          title="Primary Accent"
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-white shadow-2xs"
                          style={{ backgroundColor: theme.colors.accent }}
                          title="Highlight Accent"
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-white shadow-2xs"
                          style={{ backgroundColor: theme.colors.bg }}
                          title="Canvas Background"
                        />
                      </div>
                      <span className="font-bold text-xs text-zinc-900">
                        {theme.name}
                      </span>
                    </div>

                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Check className="w-3 h-3 text-indigo-600" />
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {theme.isDark ? 'Dark' : 'Light'}
                      </span>
                    )}
                  </div>

                  {/* Subtitle */}
                  <div className="text-[11px] font-semibold text-zinc-600 mb-1.5">
                    {theme.subtitle}
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed mb-4">
                    {theme.description}
                  </p>
                </div>

                {/* Color Palette Preview Strip */}
                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold text-white shadow-2xs"
                      style={{ backgroundColor: theme.colors.primary }}
                    >
                      Primary
                    </div>
                    <div
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold text-white shadow-2xs"
                      style={{ backgroundColor: theme.colors.accent }}
                    >
                      Accent
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTheme(theme.id);
                    }}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-100 text-zinc-700 group-hover:bg-zinc-200'
                    }`}
                  >
                    {isSelected ? 'Current' : 'Select'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Minimal button (for floating or compact toolbars)
  if (variant === 'minimal') {
    return (
      <button
        type="button"
        onClick={toggleDark}
        className={`p-2 rounded-xl border transition shadow-2xs cursor-pointer flex items-center justify-center ${
          isDark
            ? 'bg-zinc-900 border-zinc-700 text-amber-400 hover:bg-zinc-800'
            : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100'
        } ${className}`}
        title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        aria-label="Toggle Theme Mode"
      >
        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
      </button>
    );
  }

  // Default Dropdown layout
  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        id="theme-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 text-xs font-semibold transition shadow-2xs cursor-pointer"
        title={`Change Theme (Active: ${activeThemeMeta.name})`}
        aria-label="Select Application Theme"
        aria-expanded={isOpen}
      >
        <Palette className="w-3.5 h-3.5 text-indigo-600" />
        <span
          className="w-2.5 h-2.5 rounded-full border border-white shadow-2xs hidden sm:inline-block"
          style={{ backgroundColor: activeThemeMeta.colors.primary }}
        />
        <span className="hidden md:inline text-[11px] truncate max-w-[90px]">
          {activeThemeMeta.name}
        </span>
        <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-zinc-700' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 bg-white border border-zinc-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1">
          <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-zinc-100 mb-1">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
              <Palette className="w-3 h-3 text-indigo-600" />
              Theme & Style
            </span>
            <button
              type="button"
              onClick={() => {
                toggleDark();
                setIsOpen(false);
              }}
              className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              {isDark ? <Sun className="w-3 h-3 text-amber-500" /> : <Moon className="w-3 h-3 text-indigo-600" />}
              <span>{isDark ? 'Light' : 'Dark'}</span>
            </button>
          </div>

          <div className="space-y-1">
            {THEMES.map((theme) => {
              const isSelected = currentTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    setTheme(theme.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-950 font-bold border border-indigo-200'
                      : 'text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex items-center -space-x-1 shrink-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white shadow-2xs"
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white shadow-2xs"
                        style={{ backgroundColor: theme.colors.accent }}
                      />
                    </div>
                    <div className="truncate">
                      <div className="truncate leading-tight text-xs">
                        {theme.name}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-normal truncate">
                        {theme.subtitle}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-1.5" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-2 mt-1.5 border-t border-zinc-100 px-2 flex items-center justify-between text-[10px] text-zinc-400">
            <span>Saved in Browser</span>
            <span className="font-mono">SC-2033</span>
          </div>
        </div>
      )}
    </div>
  );
};
