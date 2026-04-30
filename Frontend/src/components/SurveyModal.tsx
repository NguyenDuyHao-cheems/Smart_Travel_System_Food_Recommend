'use client';

import { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';

const SURVEY_SEEN_KEY = 'wanderbite_survey_seen';

/**
 * SurveyModal — Pop-up khảo sát hiện lần đầu tiên user vào trang
 *
 * TODO: Thay thế nội dung câu hỏi bên trong bằng form khảo sát thật
 * khi Product team đã xác nhận câu hỏi chính thức
 */
export function SurveyModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Kiểm tra xem user đã xem survey chưa
    const hasSeen = localStorage.getItem(SURVEY_SEEN_KEY);
    if (!hasSeen) {
      // Delay 1s để trang load xong rồi mới hiện
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(SURVEY_SEEN_KEY, 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      {/* Modal Panel */}
      <div
        className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-md mx-4 p-8 animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-500/20 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
          Chào mừng đến Wanderbite! 🍜
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
          Cho chúng tôi biết thêm về bạn để AI gợi ý chính xác hơn nhé!
        </p>

        {/* TODO: Thêm form câu hỏi khảo sát thật vào đây */}
        {/* TODO: Ví dụ: Bạn thường ăn gì? Bạn thích vị gì? Dị ứng thực phẩm? */}
        <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-2xl p-4 mb-6 text-center">
          <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
            🚧 Khảo sát đang được xây dựng
          </p>
          <p className="text-xs text-orange-400 dark:text-orange-500 mt-1">
            Tính năng đầy đủ sẽ sớm ra mắt!
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3 rounded-full border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer"
          >
            Bỏ qua
          </button>
          <button
            onClick={handleClose}
            className="flex-1 py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-md shadow-orange-200 dark:shadow-orange-500/30 transition-all cursor-pointer"
          >
            Bắt đầu khám phá! ✨
          </button>
        </div>
      </div>
    </div>
  );
}
