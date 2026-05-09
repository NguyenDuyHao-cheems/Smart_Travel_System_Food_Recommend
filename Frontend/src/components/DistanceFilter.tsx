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
      <div className="flex items-center gap-3">
        <button
          id="distance-filter-toggle"
          onClick={handleToggle}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${
            enabled
              ? 'bg-teal-500 border-teal-500 text-white shadow-sm shadow-teal-200 dark:shadow-teal-500/20'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-teal-400 hover:text-teal-600'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Lọc quán ở gần tôi
          {enabled && (
            <span className="bg-white/25 rounded-full px-2 py-0.5 text-xs font-bold">
              {radius} km
            </span>
          )}
        </button>

        {enabled && (
          <button
            onClick={() => setShowPanel((p) => !p)}
            className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Tuỳ chỉnh
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${showPanel ? 'rotate-180' : ''}`}
            />
          </button>
        )}

        {enabled && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
            Hiển thị{' '}
            <span className="font-semibold text-teal-600 dark:text-teal-400">
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
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
              {/* Preset buttons */}
              {PRESET_RADII.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePreset(preset.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    radius === preset.value && !isCustom
                      ? 'bg-teal-500 border-teal-500 text-white'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-teal-400'
                  }`}
                >
                  {preset.label}
                </button>
              ))}

              {/* Divider */}
              <span className="text-gray-300 dark:text-gray-600 text-sm select-none">|</span>

              {/* Custom input */}
              <div className="flex items-center gap-1.5">
                <input
                  id="distance-custom-input"
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomCommit()}
                  placeholder="Tuỳ chỉnh"
                  className={`w-24 px-2 py-1.5 text-xs rounded-lg border transition-all focus:outline-none focus:ring-1 focus:ring-teal-400 dark:bg-gray-700 dark:text-white
                    ${isCustom ? 'border-teal-400 bg-teal-50 dark:bg-teal-900/20' : 'border-gray-200 dark:border-gray-600 bg-gray-50'}`}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">km</span>
                <button
                  onClick={handleCustomCommit}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-500 text-white hover:bg-teal-600 transition-colors"
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
