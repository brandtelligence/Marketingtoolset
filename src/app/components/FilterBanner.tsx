import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, X, Filter, Building2, AlertCircle, Calendar, Factory, UserCircle, Tag } from 'lucide-react';
import { useDashboardTheme } from './saas/DashboardThemeContext';

interface FilterOption {
  label: string;
  value: string;
}

export interface ActiveFilters {
  company: string[];
  status: string[];
  dateRange: string[];
  industry: string[];
  projectLead: string[];
  tags: string[];
}

interface FilterBannerProps {
  filterOptions: {
    company: FilterOption[];
    status: FilterOption[];
    dateRange: FilterOption[];
    industry: FilterOption[];
    projectLead: FilterOption[];
    tags: FilterOption[];
  };
  activeFilters: ActiveFilters;
  onFiltersChange: (filters: ActiveFilters) => void;
}

type FilterKey = keyof ActiveFilters;

const filterConfig: { key: FilterKey; label: string; icon: React.ReactNode }[] = [
  { key: 'company', label: 'Company', icon: <Building2 className="w-3 h-3" /> },
  { key: 'status', label: 'Status', icon: <AlertCircle className="w-3 h-3" /> },
  { key: 'dateRange', label: 'Date Range', icon: <Calendar className="w-3 h-3" /> },
  { key: 'industry', label: 'Industry', icon: <Factory className="w-3 h-3" /> },
  { key: 'projectLead', label: 'Project Lead', icon: <UserCircle className="w-3 h-3" /> },
  { key: 'tags', label: 'Tags', icon: <Tag className="w-3 h-3" /> },
];

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

function MultiSelectDropdown({
  label,
  icon,
  options,
  selected,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const { isDark } = useDashboardTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<DropdownPosition>({ top: 0, left: 0, width: 224 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate & update dropdown position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: Math.max(rect.width, 224),
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const dropdownMenu = isOpen ? createPortal(
    <AnimatePresence>
      <motion.div
        ref={dropdownRef}
        key="dropdown"
        initial={{ opacity: 0, y: -4, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'absolute',
          top: dropdownPos.top,
          left: dropdownPos.left,
          width: dropdownPos.width,
          zIndex: 99999,
        }}
        className={isDark
          ? "bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden"
          : "bg-white backdrop-blur-xl border border-gray-200 rounded-xl shadow-2xl overflow-hidden"}
      >
        <div className="p-2 max-h-48 overflow-y-auto custom-scrollbar">
          {options.length === 0 ? (
            <div className={`${isDark ? 'text-white/40' : 'text-gray-400'} text-xs text-center py-2`}>No options</div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleOption(option.value)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all mb-0.5 ${
                  selected.includes(option.value)
                    ? isDark ? 'bg-teal-500/30 text-white' : 'bg-teal-500/15 text-teal-800'
                    : isDark ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                  selected.includes(option.value)
                    ? 'bg-teal-500 border-teal-400'
                    : isDark ? 'border-white/30' : 'border-gray-300'
                }`}>
                  {selected.includes(option.value) && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="truncate">{option.label}</span>
              </button>
            ))
          )}
        </div>
        {selected.length > 0 && (
          <div className={`border-t ${isDark ? 'border-white/10' : 'border-gray-200'} p-1.5`}>
            <button
              onClick={() => onChange([])}
              className={`w-full text-xs ${isDark ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'} py-1 rounded-lg transition-all`}
            >
              Clear selection
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  ) : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
          selected.length > 0
            ? isDark ? 'bg-white/25 border border-white/40 text-white' : 'bg-teal-50 border border-teal-300 text-teal-800'
            : isDark ? 'bg-white/8 border border-white/15 text-white/70 hover:bg-white/12 hover:border-white/25' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
        }`}
      >
        {icon}
        <span className="truncate flex-1 text-left">{label}</span>
        {selected.length > 0 && (
          <span className={`${isDark ? 'bg-white/30 text-white' : 'bg-teal-500 text-white'} px-1.5 py-0.5 rounded-full text-[10px] font-semibold min-w-[18px] text-center shrink-0`}>
            {selected.length}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {dropdownMenu}
    </div>
  );
}

export function FilterBanner({ filterOptions, activeFilters, onFiltersChange }: FilterBannerProps) {
  const { isDark } = useDashboardTheme();
  const totalActive = Object.values(activeFilters).reduce((sum, arr) => sum + arr.length, 0);

  const handleFilterChange = (key: FilterKey, selected: string[]) => {
    onFiltersChange({ ...activeFilters, [key]: selected });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      company: [],
      status: [],
      dateRange: [],
      industry: [],
      projectLead: [],
      tags: [],
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className={`${isDark ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-white/80 backdrop-blur-md border border-gray-200/60 shadow-sm'} rounded-2xl p-4 md:p-5 shadow-xl h-full flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className={`w-4 h-4 ${isDark ? 'text-white/80' : 'text-gray-500'}`} />
          <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-semibold text-sm`}>Filters</span>
          {totalActive > 0 && (
            <span className={`${isDark ? 'bg-teal-500/40 text-teal-200' : 'bg-teal-100 text-teal-700'} px-2 py-0.5 rounded-full text-[10px] font-semibold`}>
              {totalActive} active
            </span>
          )}
        </div>
        {totalActive > 0 && (
          <button
            onClick={clearAllFilters}
            className={`flex items-center gap-1 ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-400 hover:text-gray-700'} text-xs transition-all`}
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Filter Dropdowns - 2-col mobile, 3-col sm+ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 flex-1">
        {filterConfig.map(({ key, label, icon }) => (
          <MultiSelectDropdown
            key={key}
            label={label}
            icon={icon}
            options={filterOptions[key]}
            selected={activeFilters[key]}
            onChange={(selected) => handleFilterChange(key, selected)}
          />
        ))}
      </div>
    </motion.div>
  );
}