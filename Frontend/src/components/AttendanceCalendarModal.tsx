"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

interface AttendanceCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDates: string[]; // Dates in "YYYY-MM-DD" format
}

export function AttendanceCalendarModal({ isOpen, onClose, activeDates }: AttendanceCalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || !isOpen) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Get the day of the week the month starts on (0 is Sunday, 1 is Monday...)
  // Adjust so Monday is 0, Sunday is 6
  let firstDayOfWeek = new Date(year, month, 1).getDay();
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Generate days array
  const days: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];

  // Previous month padding days
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const mStr = String(prevMonth + 1).padStart(2, "0");
    const dStr = String(d).padStart(2, "0");
    days.push({
      day: d,
      isCurrentMonth: false,
      dateStr: `${prevYear}-${mStr}-${dStr}`,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const mStr = String(month + 1).padStart(2, "0");
    const dStr = String(d).padStart(2, "0");
    days.push({
      day: d,
      isCurrentMonth: true,
      dateStr: `${year}-${mStr}-${dStr}`,
    });
  }

  // Next month padding days to fill 42 cells grid (6 rows * 7 days)
  const remainingCells = 42 - days.length;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  for (let d = 1; d <= remainingCells; d++) {
    const mStr = String(nextMonth + 1).padStart(2, "0");
    const dStr = String(d).padStart(2, "0");
    days.push({
      day: d,
      isCurrentMonth: false,
      dateStr: `${nextYear}-${mStr}-${dStr}`,
    });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4",
    "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8",
    "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  const weekdayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  // Count active days in the current month
  const activeDaysInMonth = activeDates.filter(dateStr => {
    const d = new Date(dateStr);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-4">
        {/* Backdrop blur overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#2A2420]/60 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative my-auto w-full max-w-md bg-white dark:bg-[#3D312A] rounded-[32px] border border-gray-100 dark:border-[#4D3D32] shadow-2xl p-5 z-10 max-h-[92vh] overflow-y-auto"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-muted dark:bg-brand/10 text-brand dark:text-[#E8735A] flex items-center justify-center shrink-0">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-[#E6DFD5] tracking-tight leading-none mb-1">
                  Lịch Chuyên Cần
                </h3>
                <p className="text-[10px] text-gray-500 dark:text-[#9A8A7A]">
                  Tần suất hoạt động trên hệ thống
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-50 dark:bg-[#2A2420] text-gray-400 hover:text-gray-600 dark:hover:text-[#E6DFD5] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Streak Status Box */}
          <div className="mb-4 p-3.5 bg-gradient-to-r from-brand/5 to-red-500/5 dark:from-brand/10 dark:to-red-500/10 border border-brand/10 dark:border-brand/20 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                <Flame className="w-4.5 h-4.5 fill-current" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-500 dark:text-[#9A8A7A]">
                  Tháng này bạn đã hoạt động
                </p>
                <p className="text-sm font-black text-gray-900 dark:text-[#E6DFD5]">
                  {activeDaysInMonth} ngày chuyên cần
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              {activeDaysInMonth > 5 ? "Tích Cực" : "Khởi Đầu"}
            </span>
          </div>

          {/* Month/Year Controller */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-gray-900 dark:text-[#E6DFD5]">
              {monthNames[month]}, {year}
            </h4>
            <div className="flex gap-2">
              <button
                onClick={handlePrevMonth}
                className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-[#2A2420] text-gray-500 dark:text-[#E6DFD5] hover:bg-gray-100 dark:hover:bg-[#4D3D32] flex items-center justify-center transition-all active:scale-90 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-[#2A2420] text-gray-500 dark:text-[#E6DFD5] hover:bg-gray-100 dark:hover:bg-[#4D3D32] flex items-center justify-center transition-all active:scale-90 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 mb-1.5 text-center">
            {weekdayNames.map((name, idx) => (
              <span
                key={idx}
                className="text-[9px] font-bold text-gray-400 dark:text-[#7A6A5A] uppercase tracking-wider"
              >
                {name}
              </span>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4 text-center">
            {days.map((item, idx) => {
              const isActive = activeDates.includes(item.dateStr);
              return (
                <div
                  key={idx}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-xl transition-all duration-200 select-none ${
                    item.isCurrentMonth
                      ? "text-gray-800 dark:text-[#E6DFD5] font-semibold"
                      : "text-gray-300 dark:text-[#6A5A4A]"
                  } ${
                    isActive
                      ? "bg-brand/5 dark:bg-brand/10 border border-brand/10 dark:border-brand/20 scale-100 shadow-sm"
                      : "hover:bg-gray-50 dark:hover:bg-[#2A2420]"
                  }`}
                >
                  <span className={isActive ? "text-brand dark:text-[#E8735A] font-bold text-xs" : "text-xs"}>
                    {item.day}
                  </span>

                  {/* Pulsing Green Dot */}
                  {isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex h-1 w-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1 w-1 bg-emerald-500"></span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Legend */}
          <div className="flex justify-center gap-4 text-[9px] font-bold text-gray-400 dark:text-[#7A6A5A] border-t border-gray-100 dark:border-[#4D3D32] pt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 relative flex">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              </span>
              <span>ĐÃ TRUY CẬP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" />
              <span>CHƯA CÓ HOẠT ĐỘNG</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
