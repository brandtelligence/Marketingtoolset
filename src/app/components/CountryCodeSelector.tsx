import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDashboardTheme } from './saas/DashboardThemeContext';

interface CountryCode {
  code: string;
  country: string;
}

interface CountryCodeSelectorProps {
  value: string;
  onChange: (code: string) => void;
  countryCodes: CountryCode[];
}

export function CountryCodeSelector({ value, onChange, countryCodes }: CountryCodeSelectorProps) {
  const { isDark } = useDashboardTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setActiveIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [isOpen]);

  const filteredCodes = countryCodes.filter(
    (item) =>
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset active index when filtered list changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [searchQuery]);

  const selectedCountry = countryCodes.find((c) => c.code === value);

  const selectItem = useCallback((code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearchQuery('');
    setActiveIndex(-1);
  }, [onChange]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        setActiveIndex(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, filteredCodes.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredCodes.length) {
          selectItem(filteredCodes[activeIndex].code);
        }
        break;
    }
  }, [isOpen, filteredCodes, activeIndex, selectItem]);

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // ── Theme tokens ───────────────────────────────────────────────
  const triggerCls = isDark
    ? 'bg-white/10 border border-white/20 text-white focus:border-white/40 hover:bg-white/15'
    : 'bg-gray-50 border border-gray-300 text-gray-900 focus:border-[#0BA4AA] hover:bg-gray-100';
  const dropdownBg = isDark
    ? 'bg-[#1a1a2e]/98 backdrop-blur-xl border border-white/20 shadow-2xl'
    : 'bg-white/98 backdrop-blur-xl border border-gray-200 shadow-2xl';
  const searchBorder = isDark ? 'border-white/10' : 'border-gray-200';
  const searchInputCls = isDark
    ? 'bg-white/10 border border-white/15 text-white placeholder-white/40 focus:border-white/30'
    : 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-teal-500';
  const searchIconCls = isDark ? 'text-white/30' : 'text-gray-400';
  const optionBorder = isDark ? 'border-white/6' : 'border-gray-100';
  const optionCls = (selected: boolean, active: boolean) => {
    if (isDark) {
      if (active) return 'bg-white/15';
      if (selected) return 'bg-white/10';
      return 'bg-transparent hover:bg-white/8';
    }
    if (active) return 'bg-teal-50';
    if (selected) return 'bg-teal-50/60';
    return 'bg-white hover:bg-gray-50';
  };
  const optionCodeCls = isDark ? 'text-white font-semibold' : 'text-gray-800 font-semibold';
  const optionCountryCls = isDark ? 'text-white/50' : 'text-gray-500';
  const emptyStateCls = isDark ? 'text-white/40' : 'text-gray-500';

  const listboxId = 'country-code-listbox';

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Country code: ${value}${selectedCountry ? ` (${selectedCountry.country})` : ''}`}
        className={`w-full rounded-xl px-4 py-3 focus:outline-none transition-all flex items-center justify-between ${triggerCls}`}
      >
        <span className="font-medium">{value}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={`absolute z-50 mt-2 w-full max-w-xs rounded-xl overflow-hidden ${dropdownBg}`}
          >
            {/* Search Input */}
            <div className={`p-3 border-b ${searchBorder}`}>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${searchIconCls}`} aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search country or code..."
                  aria-label="Search country codes"
                  aria-controls={listboxId}
                  aria-activedescendant={activeIndex >= 0 ? `country-option-${activeIndex}` : undefined}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none transition-all text-sm ${searchInputCls}`}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Options List */}
            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label="Country codes"
              className="max-h-64 overflow-y-auto"
            >
              {filteredCodes.length > 0 ? (
                filteredCodes.map((item, i) => (
                  <button
                    key={item.code}
                    type="button"
                    id={`country-option-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={value === item.code}
                    onClick={() => selectItem(item.code)}
                    className={`w-full px-4 py-3 text-left transition-colors border-b last:border-b-0 ${optionBorder} ${optionCls(value === item.code, activeIndex === i)}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${optionCodeCls}`}>
                        {item.code}
                      </span>
                      <span className={`text-xs truncate ml-2 ${optionCountryCls}`}>
                        {item.country}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className={`px-4 py-8 text-center text-sm ${emptyStateCls}`}>
                  No countries found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
