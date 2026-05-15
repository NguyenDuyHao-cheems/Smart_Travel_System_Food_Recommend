'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Roboto } from 'next/font/google';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  HelpCircle,
  LifeBuoy,
  MessageSquareText,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '../../components/ui/Header';
import { Sidebar } from '../../components/Sidebar';
import {
  supportService,
  SUPPORT_TICKETS_UPDATED_EVENT,
  type SupportCategory,
  type SupportPriority,
  type SupportStatus,
  type SupportTicket,
} from '../../services/supportService';

const roboto = Roboto({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '700', '900'],
});

const categories: Array<{ value: SupportCategory; label: string; description: string }> = [
  { value: 'account', label: 'Tai khoan', description: 'Dang nhap, ho so, bao mat' },
  { value: 'search', label: 'Goi y mon an', description: 'Ket qua AI, loc ngan sach, so thich' },
  { value: 'gps', label: 'Vi tri GPS', description: 'Quyen vi tri, khoang cach, ban do' },
  { value: 'restaurant', label: 'Du lieu quan an', description: 'Thong tin, hinh anh, gia, gio mo cua' },
  { value: 'other', label: 'Khac', description: 'Van de khac can doi ngu ho tro' },
];

const priorities: Array<{ value: SupportPriority; label: string }> = [
  { value: 'normal', label: 'Binh thuong' },
  { value: 'high', label: 'Can ho tro som' },
  { value: 'low', label: 'Gop y nhe' },
];

export default function SupportPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [userId, setUserId] = React.useState<string>('guest');
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [category, setCategory] = React.useState<SupportCategory>('search');
  const [priority, setPriority] = React.useState<SupportPriority>('normal');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const refreshTickets = React.useCallback(async (targetUserId: string) => {
    const items = await supportService.getTickets(targetUserId);
    setTickets(items);
  }, []);

  React.useEffect(() => {
    const currentUserId = localStorage.getItem('user_id') || 'guest';
    setUserId(currentUserId);
    refreshTickets(currentUserId);

    const handleTicketsUpdated = () => refreshTickets(currentUserId);
    window.addEventListener(SUPPORT_TICKETS_UPDATED_EVENT, handleTicketsUpdated);
    window.addEventListener('storage', handleTicketsUpdated);

    return () => {
      window.removeEventListener(SUPPORT_TICKETS_UPDATED_EVENT, handleTicketsUpdated);
      window.removeEventListener('storage', handleTicketsUpdated);
    };
  }, [refreshTickets]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    if (!cleanSubject) {
      toast.error('Vui long nhap tieu de ho tro.');
      return;
    }
    if (cleanMessage.length < 10) {
      toast.error('Noi dung can it nhat 10 ky tu de doi ngu nam ro van de.');
      return;
    }

    setIsSubmitting(true);
    try {
      await supportService.createTicket(userId, {
        category,
        subject: cleanSubject,
        message: cleanMessage,
        priority,
      });
      setSubject('');
      setMessage('');
      setCategory('search');
      setPriority('normal');
      await refreshTickets(userId);
      toast.success('Da ghi nhan yeu cau ho tro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = categories.find((item) => item.value === category) || categories[0];

  return (
    <div className={`flex min-h-screen bg-[#F7F8FA] dark:bg-[#0B0F19] transition-colors duration-300 ${roboto.className}`}>
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'ml-[80px]' : 'ml-[260px]'}`}>
        <Header showBack={true} backPath="/" />

        <main className="flex-1 px-6 md:px-10 py-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
            >
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-bold mb-4">
                  <LifeBuoy className="w-4 h-4" />
                  Support center
                </span>
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                  Ho tro Wanderbite
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-2xl">
                  Gui loi, gop y hoac cau hoi cua ban. Phien ban nay luu ticket cuc bo tren trinh duyet va khong ghi vao database goc.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-[#1A1F2B] border border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-500 dark:text-gray-400 shadow-sm">
                <Clock3 className="w-4 h-4 text-orange-500" />
                Local MVP
              </div>
            </motion.div>

            {userId === 'guest' && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                  Ban dang gui ho tro voi tu cach khach. Ticket van duoc luu cuc bo, nhung dang nhap se giup tach lich su theo tai khoan.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
              <motion.form
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                onSubmit={handleSubmit}
                className="bg-white dark:bg-[#1A1F2B] rounded-[28px] p-6 md:p-8 border border-gray-100 dark:border-gray-800 shadow-sm space-y-6"
              >
                <div>
                  <h2 className="text-lg font-black text-gray-900 dark:text-white">Tao yeu cau ho tro</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Mo ta ngan gon van de, minh se giu cau truc nay de sau nay doi sang API that.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Nhom van de</span>
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value as SupportCategory)}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    >
                      {categories.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                    <span className="block text-xs text-gray-400">{selectedCategory.description}</span>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Muc uu tien</span>
                    <select
                      value={priority}
                      onChange={(event) => setPriority(event.target.value as SupportPriority)}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    >
                      {priorities.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block space-y-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Tieu de</span>
                  <input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="Vi du: Ket qua goi y bi sai vi tri"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-800 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Noi dung</span>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Mo ta chi tiet dieu ban gap phai..."
                    rows={6}
                    className="w-full resize-none bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-orange-500 text-white text-sm font-black hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-200 dark:shadow-none"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Dang gui...' : 'Gui yeu cau'}
                </button>
              </motion.form>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-4"
              >
                <div className="bg-white dark:bg-[#1A1F2B] rounded-[28px] p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                  <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4">FAQ nhanh</h2>
                  <div className="space-y-3">
                    {[
                      ['Thong bao co luu vao DB khong?', 'Khong. Tat ca dang luu localStorage trong trinh duyet.'],
                      ['Sau nay doi sang DB that duoc khong?', 'Duoc. UI chi goi service layer, sau nay thay localStorage bang API.'],
                      ['Ticket cua toi co gui cho admin chua?', 'Chua. Day la MVP khong cham backend/database.'],
                    ].map(([question, answer]) => (
                      <div key={question} className="flex gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/70 border border-gray-100 dark:border-gray-800">
                        <HelpCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-gray-800 dark:text-white">{question}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{answer}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#1A1F2B] rounded-[28px] p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-black text-gray-900 dark:text-white">Ticket da gui</h2>
                    <span className="text-xs font-bold text-gray-400">{tickets.length} ticket</span>
                  </div>

                  {tickets.length === 0 ? (
                    <div className="py-10 text-center">
                      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                        <MessageSquareText className="w-7 h-7 text-gray-400" />
                      </div>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Chua co ticket nao</p>
                      <p className="text-xs text-gray-400 mt-1">Ticket moi se xuat hien tai day.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tickets.map((ticket) => (
                        <div key={ticket.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/70 border border-gray-100 dark:border-gray-800">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-black text-gray-900 dark:text-white truncate">{ticket.subject}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{ticket.message}</p>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold flex-shrink-0 ${getStatusClass(ticket.status)}`}>
                              {ticket.status === 'resolved' ? <CheckCircle2 className="w-3 h-3" /> : <Clock3 className="w-3 h-3" />}
                              {getStatusLabel(ticket.status)}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                            <span>{getCategoryLabel(ticket.category)}</span>
                            <span>/</span>
                            <span>{getPriorityLabel(ticket.priority)}</span>
                            <span>/</span>
                            <span>{new Date(ticket.createdAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function getCategoryLabel(category: SupportCategory) {
  return categories.find((item) => item.value === category)?.label || 'Khac';
}

function getPriorityLabel(priority: SupportPriority) {
  const found = priorities.find((item) => item.value === priority);
  return found?.label || 'Binh thuong';
}

function getStatusLabel(status: SupportStatus) {
  if (status === 'resolved') return 'Da xu ly';
  if (status === 'in_progress') return 'Dang xu ly';
  return 'Moi';
}

function getStatusClass(status: SupportStatus) {
  if (status === 'resolved') {
    return 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-500/20';
  }
  if (status === 'in_progress') {
    return 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20';
  }
  return 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20';
}
