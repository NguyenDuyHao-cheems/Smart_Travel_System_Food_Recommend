"use client";

import React, { useEffect, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { historyService, SearchHistoryItem } from "../../services/historyService";
import { Clock, Search, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { useLanguage } from "../../components/LanguageProvider";

export default function HistoryPage() {
  const { t, language } = useLanguage();
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const id = localStorage.getItem("user_id");
    if (!id) {
      toast.error(t("history.pleaseLogin"));
      router.push("/auth");
      return;
    }
    setUserId(id);
    setHistory(historyService.getHistory(id));
  }, [router, t]);

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    historyService.removeHistoryItem(userId, id);
    setHistory(prev => prev.filter(h => h.id !== id));
    toast.success(t("history.removedSuccess"));
  };

  const handleClearAll = () => {
    if (!userId) return;
    if (confirm(t("history.clearConfirm"))) {
      historyService.clearHistory(userId);
      setHistory([]);
      toast.success(t("history.clearAllSuccess"));
    }
  };

  const handleSearchAgain = (item: SearchHistoryItem) => {
    // [FIX-CONFLICT]: Ẩn session_id và mode vào sessionStorage, đẩy query q lên URL
    if (typeof window !== 'undefined') {
      if (item.sessionId) {
        sessionStorage.setItem('current_search_session_id', item.sessionId);
      } else {
        sessionStorage.removeItem('current_search_session_id');
      }
      if (item.searchMode) {
        sessionStorage.setItem('current_search_mode', item.searchMode);
      } else {
        sessionStorage.removeItem('current_search_mode');
      }
    }

    if (item.sessionId) {
      router.push(`/result?q=${encodeURIComponent(item.query)}`);
      return;
    }

    const params = new URLSearchParams();
    params.set("q", item.query);
    params.set("budget", String(item.budget));
    router.push(`/result?${params.toString()}`);
  };

  return (
    <PageLayout>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-[#E6DFD5] flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-500 fill-blue-500/20" />
            {t("history.title")}
          </h1>
          <p className="text-gray-500 dark:text-[#9A8A7A] mt-2">
            {t("history.desc")}
          </p>
        </div>
        {history.length > 0 && (
          <button 
            onClick={handleClearAll}
            className="text-red-500 hover:text-red-600 text-sm font-semibold transition-colors flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" /> {t("history.clearAllBtn")}
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#3D312A] rounded-3xl border border-gray-100 dark:border-[#4D3D32]">
          <Clock className="w-16 h-16 text-gray-300 dark:text-[#6A5A4A] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 dark:text-[#E6DFD5] mb-2">{t("history.emptyTitle")}</h2>
          <p className="text-gray-500 dark:text-[#9A8A7A] mb-6">{t("history.emptyDesc")}</p>
          <button 
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-full font-semibold transition-colors"
          >
            {t("history.searchNowBtn")}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div 
              key={item.id}
              onClick={() => handleSearchAgain(item)}
              className="bg-white dark:bg-[#3D312A] p-5 rounded-2xl border border-gray-100 dark:border-[#4D3D32] shadow-sm hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-[#2A2420] flex items-center justify-center text-gray-400 group-hover:text-brand group-hover:bg-brand-muted dark:group-hover:bg-brand/10 transition-colors">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-[#E6DFD5] text-lg">{item.query}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                    <span className="bg-gray-100 dark:bg-[#4D3D32] px-2 py-0.5 rounded text-xs font-medium">
                      {t("history.budgetLabel")} {item.budget === 'auto' ? t("history.budgetAuto") : `${Number(item.budget).toLocaleString('vi-VN')}đ`}
                    </span>
                    <span>•</span>
                    <span>{formatDistanceToNow(item.createdAt, { addSuffix: true, locale: language === 'en' ? enUS : vi })}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => handleRemove(item.id, e)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                  title={t("favorites.deleteBtn")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-brand dark:text-[#E8735A] bg-brand-muted dark:bg-brand/10">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
