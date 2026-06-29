import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface Select2Option {
  value: string | number;
  label: string;
}

interface Select2Props {
  options: Select2Option[];
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  openUp?: boolean; // true = เปิดขึ้นด้านบน, false = เปิดลงด้านล่างปกติ
}

export const Select2: React.FC<Select2Props> = ({
  options,
  value,
  onChange,
  placeholder = 'เลือกรายการ...',
  disabled = false,
  className = '',
  openUp = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset search term when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const safeOptions = options || [];
  const selectedOption = safeOptions.find(opt => opt && String(opt.value) === String(value));

  const filteredOptions = safeOptions.filter(opt => {
    if (!opt) return false;
    const labelStr = opt.label ? String(opt.label) : '';
    return labelStr.toLowerCase().includes((searchTerm || '').toLowerCase());
  });

  const handleSelect = (val: string | number) => {
    onChange(String(val));
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative min-w-[200px] ${className} ${isOpen ? 'z-[100]' : 'z-0'}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm border border-slate-200 rounded-lg text-left bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 font-bold transition-all ${
          disabled
            ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-100'
            : 'text-slate-800 hover:border-slate-300'
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute z-50 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-[300px] flex flex-col ${
          openUp ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}>
          {/* Search Box */}
          <div className="relative p-2 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="ค้นหา..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent transition-all"
              autoFocus
            />
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-1 py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors truncate ${
                      isSelected
                        ? 'bg-emerald-500 text-white font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-xs text-center text-slate-400">
                ไม่พบข้อมูล
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
