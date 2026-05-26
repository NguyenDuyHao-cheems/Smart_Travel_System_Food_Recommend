'use client';

import { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useLanguage } from './LanguageProvider';

const SURVEY_SEEN_KEY = 'wanderbite_survey_seen';

/**
 * SurveyModal — Pop-up khảo sát hiện lần đầu tiên user vào trang
 *
 * TODO: Thay thế nội dung câu hỏi bên trong bằng form khảo sát thật
 * khi Product team đã xác nhận câu hỏi chính thức
 */
export function SurveyModal() {
  const { t } = useLanguage();
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

  useEffect(() => {
    const handleOpenSurvey = () => setIsOpen(true);
    window.addEventListener('open-survey', handleOpenSurvey);
    return () => window.removeEventListener('open-survey', handleOpenSurvey);
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
        className="relative bg-white dark:bg-[#2A2420] rounded-3xl shadow-2xl border border-gray-100 dark:border-[#4D3D32] w-full max-w-md mx-4 p-8 animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          aria-label={t('surveyModal.close')}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3D312A] transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-brand-muted dark:bg-brand/20 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-brand dark:text-[#E8735A]" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-[#E6DFD5] text-center mb-2">
          {t('surveyModal.title')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-[#9A8A7A] text-center mb-6">
          {t('surveyModal.description')}
        </p>

        {/* TODO: Thêm form câu hỏi khảo sát thật vào đây */}
        {/* TODO: Ví dụ: Bạn thường ăn gì? Bạn thích vị gì? Dị ứng thực phẩm? */}
        <div className="bg-brand-muted dark:bg-brand/10 border border-brand-muted dark:border-brand/20 rounded-2xl p-4 mb-6 text-center">
          <p className="text-sm text-brand-hover dark:text-[#E6DFD5] font-medium">
            {t('surveyModal.underConstruction')}
          </p>
          <p className="text-xs text-brand dark:text-[#E8735A] dark:text-[#E6DFD5] mt-1">
            {t('surveyModal.comingSoon')}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3 rounded-full border border-gray-200 dark:border-[#4D3D32] text-sm font-semibold text-gray-500 dark:text-[#9A8A7A] hover:bg-gray-50 dark:hover:bg-[#3D312A] transition-all cursor-pointer"
          >
            {t('surveyModal.skip')}
          </button>
          <button
            onClick={handleClose}
            className="flex-1 py-3 rounded-full bg-brand hover:bg-brand-hover text-white text-sm font-bold shadow-md shadow-brand/20 dark:shadow-brand/30 transition-all cursor-pointer"
          >
            {t('surveyModal.start')}
          </button>
        </div>
      </div>
    </div>
  );
}
