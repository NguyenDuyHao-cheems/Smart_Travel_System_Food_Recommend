'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronDown, SlidersHorizontal } from 'lucide-react';

const PRESET_RADII = [
  { label: '≤ 2 km', value: 2 },
  { label: '≤ 5 km', value: 5 },
  { label: '≤ 10 km', value: 10 },
];

export interface DistanceFilterProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  radius: number;
  onRadiusChange: (km: number) => void;
  totalCount: number;
  filteredCount: number;
}

export function DistanceFilter({
  enabled,
  onToggle,
  radius,
  onRadiusChange,
  totalCount,
  filteredCount,
}: DistanceFilterProps) {
  const [customInput, setCustomInput] = useState('');
  const [showPanel, setShowPanel] = useState(false);

  const isCustom = !PRESET_RADII.some((p) => p.value === radius);

  const handleToggle = () => {
    const next = !enabled;
    onToggle(next);
    if (next) setShowPanel(true);
  };

  const handlePreset = (value: number) => {
    onRadiusChange(value);
    setCustomInput('');
  };

  const handleCustomCommit = () => {
    const parsed = parseFloat(customInput);
    if (!isNaN(parsed) && parsed > 0) {
      onRadiusChange(parsed);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Toggle button */}
      <div className="flex items-center gap-2">
        <button
          id="distance-filter-toggle"
          onClick={handleToggle}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
            enabled
              ? 'bg-brand-muted dark:bg-brand/10 border-brand/30 dark:border-brand/30 text-brand-hover dark:text-brand shadow-sm shadow-brand/10 dark:shadow-none'
              : 'bg-white dark:bg-[#3D312A] border-gray-200 dark:border-[#4D3D32] text-gray-600 dark:text-[#9A8A7A] hover:border-brand/70 hover:text-brand-hover'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Lọc quán ở gần tôi
          {enabled && (
            <span className="bg-brand/10 dark:bg-brand/20 rounded-full px-2 py-0.5 text-[10px] font-bold text-brand-hover dark:text-brand ml-1">
              {radius} km
            </span>
          )}
        </button>

        {enabled && (
          <button
            onClick={() => setShowPanel((p) => !p)}
            className="inline-flex items-center gap-1 text-xs font-bold text-brand-hover dark:text-brand hover:bg-brand-muted dark:hover:bg-brand/10 px-2 py-1 rounded-lg transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Tuỳ chỉnh
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${showPanel ? 'rotate-180' : ''}`}
            />
          </button>
        )}

        {enabled && (
          <span className="text-[11px] text-gray-500 dark:text-[#9A8A7A] whitespace-nowrap ml-auto">
            Hiển thị{' '}
            <span className="font-bold text-brand-hover dark:text-brand">
              {filteredCount}
            </span>
            /{totalCount} quán
          </span>
        )}
      </div>

      {/* Options panel */}
      <AnimatePresence>
        {enabled && showPanel && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-white dark:bg-[#3D312A] border border-gray-100 dark:border-[#4D3D32] shadow-sm mt-1">
              {/* Preset buttons */}
              {PRESET_RADII.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePreset(preset.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    radius === preset.value && !isCustom
                      ? 'bg-brand border-brand text-white shadow-sm'
                      : 'bg-gray-50 dark:bg-[#4D3D32] border-gray-100 dark:border-[#5A4A3A] text-gray-600 dark:text-[#9A8A7A] hover:border-brand/70'
                  }`}
                >
                  {preset.label}
                </button>
              ))}

              <div className="flex items-center gap-1.5 ml-2 border-l border-gray-100 dark:border-[#4D3D32] pl-3">
                <div className="relative">
                  <input
                    id="distance-custom-input"
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCustomCommit()}
                    placeholder="Tự nhập"
                    className={`w-24 px-2 py-1.5 text-xs rounded-lg border transition-all focus:outline-none focus:ring-1 focus:ring-brand/50 dark:bg-[#4D3D32] dark:text-[#E6DFD5]
                      ${isCustom ? 'border-brand/70 bg-brand-muted dark:bg-brand/10' : 'border-gray-200 dark:border-[#5A4A3A] bg-gray-50'}`}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">km</span>
                </div>
                <button
                  onClick={handleCustomCommit}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-brand text-white hover:bg-brand-hover transition-colors shadow-sm"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
