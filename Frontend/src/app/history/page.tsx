"use client";

import React, { useEffect, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { historyService, SearchHistoryItem } from "../../services/historyService";
import { Clock, Search, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export default function HistoryPage() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const id = localStorage.getItem("user_id");
    if (!id) {
      toast.error("Vui lòng đăng nhập để xem lịch sử");
      router.push("/auth");
      return;
    }
    setUserId(id);
    setHistory(historyService.getHistory(id));
  }, [router]);

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    historyService.removeHistoryItem(userId, id);
    setHistory(prev => prev.filter(h => h.id !== id));
    toast.success("Đã xóa lịch sử");
  };

  const handleClearAll = () => {
    if (!userId) return;
    if (confirm("Bạn có chắc muốn xóa toàn bộ lịch sử tìm kiếm?")) {
      historyService.clearHistory(userId);
      setHistory([]);
      toast.success("Đã xóa toàn bộ lịch sử");
    }
  };

  const handleSearchAgain = (item: SearchHistoryItem) => {
    const params = new URLSearchParams();
    if (item.sessionId) {
      params.set("session_id", item.sessionId);
      if (item.searchMode) params.set("mode", item.searchMode);
      router.push(`/result?${params.toString()}`);
      return;
    }

    params.set("q", item.query);
    params.set("budget", String(item.budget));
    if (item.searchMode) params.set("mode", item.searchMode);
    router.push(`/result?${params.toString()}`);
  };

  return (
    <PageLayout>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-[#E6DFD5] flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-500 fill-blue-500/20" />
            Lịch sử tìm kiếm
          </h1>
          <p className="text-gray-500 dark:text-[#9A8A7A] mt-2">
            Xem lại các món ăn bạn đã tìm kiếm gần đây
          </p>
        </div>
        {history.length > 0 && (
          <button 
            onClick={handleClearAll}
            className="text-red-500 hover:text-red-600 text-sm font-semibold transition-colors flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" /> Xóa tất cả
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#3D312A] rounded-3xl border border-gray-100 dark:border-[#4D3D32]">
          <Clock className="w-16 h-16 text-gray-300 dark:text-[#6A5A4A] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 dark:text-[#E6DFD5] mb-2">Bạn chưa có lịch sử tìm kiếm</h2>
          <p className="text-gray-500 dark:text-[#9A8A7A] mb-6">Hãy thử tìm một món ăn ngon ngay bây giờ!</p>
          <button 
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-full font-semibold transition-colors"
          >
            Tìm kiếm ngay
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
                      Ngân sách: {item.budget === 'auto' ? 'Tự động' : `${Number(item.budget).toLocaleString('vi-VN')}đ`}
                    </span>
                    <span>•</span>
                    <span>{formatDistanceToNow(item.createdAt, { addSuffix: true, locale: vi })}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => handleRemove(item.id, e)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                  title="Xóa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-brand bg-brand-muted dark:bg-brand/10">
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
