'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconChefHat,
  IconMeat,
  IconCoin,
  IconArrowRight,
  IconCheck,
  IconMapPin,
  IconUser,
  IconFlame,
  IconAlertCircle, // Changed to a safer icon
  IconLeaf,
  IconBrain
} from '@tabler/icons-react';

// ==========================================
// TYPES & INITIAL STATE
// ==========================================
type SpicyLevel = 'none' | 'mild' | 'medium' | 'hot' | 'extra_hot' | '';
type BudgetLevel = 'low' | 'medium' | 'high' | '';

interface OnboardingData {
  favorite_dishes: string[];
  spicy_level: SpicyLevel;
  dietary_restrictions: string[];
  allergies: string[];
  budget: BudgetLevel;
  location: string;
  age: number | '';
}

const initialData: OnboardingData = {
  favorite_dishes: [],
  spicy_level: '',
  dietary_restrictions: [],
  allergies: [],
  budget: '',
  location: '',
  age: '',
};

// ==========================================
// CONSTANTS & STATIC DATA
// ==========================================
const FAV_DISH_CATEGORIES = [
  {
    name: "Đặc sản Việt Nam",
    items: ["Cơm Tấm", "Phở", "Bún Bò Huế", "Bánh Mì", "Hủ Tiếu", "Bún Chả", "Bún Đậu Mắm Tôm", "Bánh Xèo", "Mì Quảng", "Gỏi Cuốn"]
  },
  {
    name: "Ẩm thực Á Âu",
    items: ["Sushi", "Dimsum", "Lẩu Thái", "Kimbap", "Sashimi", "Pizza", "Bò Bít Tết", "Mì Ý", "Burger"]
  },
  {
    name: "Chuyên Ăn Vặt",
    items: ["Gà Rán", "Mì Cay", "Mực Nướng", "Đồ Nướng BBQ", "Khoai Tây Chiên", "Bánh Tráng Trộn"]
  },
  {
    name: "Tráng miệng & Nước",
    items: ["Trà Sữa", "Cà Phê", "Bingsu", "Chè Mâm"]
  }
];

const SPICY_OPTIONS: { id: SpicyLevel, label: string }[] = [
  { id: 'none', label: '0% Cay' },
  { id: 'mild', label: '25% Cay' },
  { id: 'medium', label: '50% Cay' },
  { id: 'hot', label: '75% Cay' },
  { id: 'extra_hot', label: 'MAX LEVEL' },
];

const DIETARY_OPTS = [
  { id: 'vegan', label: 'Thuần chay' },
  { id: 'vegetarian', label: 'Ăn chay' },
  { id: 'halal', label: 'Halal' }
];

const ALLERGY_OPTS = [
  { id: 'peanut', label: 'Đậu phộng' },
  { id: 'seafood', label: 'Hải sản' },
  { id: 'dairy', label: 'Sữa/Trứng' },
  { id: 'gluten', label: 'Gluten' }
];

const BUDGET_OPTIONS: { id: BudgetLevel, label: string, desc: string }[] = [
  { id: 'low', label: 'Bình dân', desc: 'Dưới 50k - Học sinh/Sinh viên' },
  { id: 'medium', label: 'Tầm trung', desc: '50k - 200k - Ăn ngon, view ổn' },
  { id: 'high', label: 'Cao cấp', desc: 'Trên 200k - Sang trọng, Fine dining' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<OnboardingData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [userId, setUserId] = useState('');

  // Sinh ID độc nhất cho mỗi User để không bị đụng hàng
  useEffect(() => {
    let stored = localStorage.getItem('food_recsys_userid');
    if (!stored) {
      stored = `user_${crypto.randomUUID()}`;
      localStorage.setItem('food_recsys_userid', stored);
    }
    setUserId(stored);
  }, []);

  // Helpers
  const toggleArrayItem = React.useCallback((field: keyof OnboardingData, value: string) => {
    setFormData((prev) => {
      const array = prev[field] as string[];
      if (field === 'favorite_dishes' && !array.includes(value) && array.length >= 5) {
        return prev;
      }
      if (array.includes(value)) {
        return { ...prev, [field]: array.filter((item) => item !== value) };
      }
      return { ...prev, [field]: [...array, value] };
    });
  }, []);

  const setSingleItem = React.useCallback((field: keyof OnboardingData, value: OnboardingData[typeof field]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async () => {
    setErrorMsg('');

    if (formData.favorite_dishes.length < 3 || formData.favorite_dishes.length > 5) {
      setErrorMsg("Vui lòng chọn từ 3 đến 5 Món ăn yêu thích để AI phân tích.");
      return;
    }
    if (!formData.spicy_level) {
      setErrorMsg("Vui lòng chọn Độ cay ưu tiên.");
      return;
    }
    if (!formData.budget) {
      setErrorMsg("Vui lòng chọn Mức giá trung bình.");
      return;
    }
    if (!formData.location.trim()) {
      setErrorMsg("Vui lòng nhập Khu vực sinh sống hiện tại.");
      return;
    }
    if (!formData.age || formData.age < 13 || formData.age > 120) {
      setErrorMsg("Độ tuổi của bạn chưa hợp lệ (13 - 120).");
      return;
    }

    setIsSubmitting(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';
      const response = await fetch(`${API_BASE}/api/v1/users/${userId}/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Trì hoãn một chút để User thấy hiệu ứng đang xử lý
        setTimeout(() => {
          router.push('/'); // <-- Nhảy về localhost:3000 (Trang gốc)
        }, 1500);
      } else {
        const errData = await response.json();
        setErrorMsg('Hệ thống từ chối: ' + JSON.stringify(errData));
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Submit Error:', error);
      setErrorMsg('Không thể kết nối với hệ thống Backend. Hãy kiểm tra lại Server/Mạng.');
      setIsSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center py-6 sm:py-12 px-4 sm:px-6 relative overflow-x-hidden">

      {/* Background Cyberpunk Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-60 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-amber-900/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-3xl bg-[#121A2A]/80 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden border border-white/10 p-5 sm:p-10 mb-8 relative z-10"
      >
        <Header />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-10 sm:space-y-12 mt-8"
        >
          <motion.div variants={sectionVariants}>
            <BasicInfoSection formData={formData} setSingleItem={setSingleItem} />
          </motion.div>

          <motion.div variants={sectionVariants}>
            <FavoriteDishes
              selected={formData.favorite_dishes}
              onChange={(val) => toggleArrayItem('favorite_dishes', val)}
            />
          </motion.div>

          <motion.div variants={sectionVariants}>
            <SpicyLevelPicker
              selected={formData.spicy_level}
              onChange={(val) => setSingleItem('spicy_level', val)}
            />
          </motion.div>

          <motion.div variants={sectionVariants}>
            <DietaryAndAllergies
              dietary={formData.dietary_restrictions}
              allergies={formData.allergies}
              toggleDietary={(val) => toggleArrayItem('dietary_restrictions', val)}
              toggleAllergy={(val) => toggleArrayItem('allergies', val)}
            />
          </motion.div>

          <motion.div variants={sectionVariants}>
            <BudgetPicker
              selected={formData.budget}
              onChange={(val) => setSingleItem('budget', val)}
            />
          </motion.div>
        </motion.div>

        {/* Nút Submit & Vùng Cảnh báo */}
        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-5 bg-transparent -mx-6 sm:-mx-12 px-6 sm:px-12 -mb-6 sm:-mb-12 pb-6 sm:pb-12">

          <AnimatePresence>
            {errorMsg && (
              <motion.div
                key="error-box"
                initial={{ opacity: 0, scale: 0.95, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: 20 }}
                className="p-3 px-5 sm:mr-auto bg-red-950/80 backdrop-blur-md text-red-400 rounded-2xl flex items-center justify-start gap-3 border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.25)] flex-1 w-full sm:w-auto"
              >
                <IconAlertCircle size={20} className="shrink-0" />
                <span className="font-medium text-[13px] sm:text-[14px] leading-snug">{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="group w-full sm:w-auto shrink-0 relative inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 px-8 py-4 text-[14px] sm:text-[15px] font-semibold text-white shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:shadow-[0_0_30px_rgba(245,158,11,0.55)] focus:outline-none disabled:select-none disabled:opacity-50"
          >
            <IconBrain size={20} className={isSubmitting ? "animate-pulse" : ""} />
            {isSubmitting ? 'Đang đồng bộ Neural Data...' : 'Khởi tạo Hồ sơ AI'}
            <IconArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </motion.button>
        </div>

      </motion.div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function Header() {
  return (
    <div className="text-center space-y-4 pb-10 border-b border-white/5 relative" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[250px] h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>

      <div className="inline-flex items-center gap-2 bg-amber-900/30 border border-amber-500/30 text-amber-400 text-[11px] uppercase tracking-[0.2em] font-bold px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.15)] mb-3">
        <IconBrain size={14} className="animate-pulse" />
        AI Food Recommendation Engine
      </div>

      <h1 className="text-[32px] sm:text-[42px] lg:text-[48px] font-bold text-white tracking-tight leading-tight">
        Khám Phá Bản Đồ Ẩm Thực <br />
        <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 font-bold">
          Dành Riêng Cho Bạn
        </span>
      </h1>

      <p className="text-white/60 text-[16px] sm:text-[18px] max-w-xl mx-auto leading-relaxed mt-4">
        Hãy cho chúng tôi biết sơ lược về sở thích của bạn. Trí tuệ nhân tạo sẽ tự động phân tích và chọn lọc ra những địa điểm thưởng thức tuyệt vời nhất, phù hợp chính xác với gu của riêng bạn.
      </p>
    </div>
  );
}

function BasicInfoSection({ formData, setSingleItem }: { formData: OnboardingData, setSingleItem: Function }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-1">
      <div className="space-y-3 group">
        <label className="flex items-center gap-2 font-medium text-white/80 transition-colors group-focus-within:text-cyan-400">
          <IconUser className="text-cyan-400/80 group-focus-within:text-cyan-300 transition-colors" size={18} /> Độ tuổi của bạn (*)
        </label>
        <div className="relative">
          <input
            type="number"
            min="13"
            max="120"
            placeholder="Ví dụ: 22..."
            value={formData.age}
            onChange={(e) => setSingleItem('age', e.target.value === '' ? '' : parseInt(e.target.value))}
            className="w-full px-5 py-3.5 bg-white/[0.03] border border-white/10 rounded-2xl outline-none text-white focus:border-cyan-500/50 focus:bg-[#080B13]/90 focus:ring-4 focus:ring-cyan-500/10 transition-all duration-300 font-medium placeholder-white/20 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)] hover:border-white/20 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>
      <div className="space-y-3 group">
        <label className="flex items-center gap-2 font-medium text-white/80 transition-colors group-focus-within:text-cyan-400">
          <IconMapPin className="text-cyan-400/80 group-focus-within:text-cyan-300 transition-colors" size={18} /> Khu vực hiện tại (*)
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Nhập địa chỉ của bạn (VD: Quận 1, TPHCM)..."
            value={formData.location}
            onChange={(e) => setSingleItem('location', e.target.value)}
            className="w-full px-5 py-3.5 bg-white/[0.03] border border-white/10 rounded-2xl outline-none text-white focus:border-cyan-500/50 focus:bg-[#080B13]/90 focus:ring-4 focus:ring-cyan-500/10 transition-all duration-300 font-medium placeholder-white/20 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)] hover:border-white/20 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
          />
        </div>
      </div>
    </div>
  );
}

function FavoriteDishes({ selected, onChange }: { selected: string[], onChange: (val: string) => void }) {
  return (
    <Section title="Món ăn yêu thích (*)" icon={<IconMeat size={20} />} subtitle={`Đã chọn ${selected.length}/5 (Yêu cầu 3-5 món)`}>
      <div className="text-[14px] text-zinc-400 mb-6 mt-1 font-light">Chọn ngẫu nhiên 3 đến 5 đồ ăn khoái khẩu nhất của bạn:</div>

      <div className="space-y-4">
        {FAV_DISH_CATEGORIES.map((cat, idx) => {
          let themeClasses = "";
          let DotColor = "";
          if (idx === 0) { themeClasses = "from-orange-900/10 border-orange-500/20 hover:border-orange-500/40 text-orange-400/80 shadow-[inset_0_0_20px_rgba(249,115,22,0.02)]"; DotColor = "bg-orange-500/80 shadow-[0_0_8px_rgba(249,115,22,0.8)]"; } // Đặc sản VN
          else if (idx === 1) { themeClasses = "from-indigo-900/10 border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400/80 shadow-[inset_0_0_20px_rgba(99,102,241,0.02)]"; DotColor = "bg-indigo-500/80 shadow-[0_0_8px_rgba(99,102,241,0.8)]"; } // Á Âu
          else if (idx === 2) { themeClasses = "from-pink-900/10 border-pink-500/20 hover:border-pink-500/40 text-pink-400/80 shadow-[inset_0_0_20px_rgba(236,72,153,0.02)]"; DotColor = "bg-pink-500/80 shadow-[0_0_8px_rgba(236,72,153,0.8)]"; } // Ăn Vặt
          else { themeClasses = "from-sky-900/10 border-sky-500/20 hover:border-sky-500/40 text-sky-400/80 shadow-[inset_0_0_20px_rgba(14,165,233,0.02)]"; DotColor = "bg-sky-500/80 shadow-[0_0_8px_rgba(14,165,233,0.8)]"; } // Tráng miệng

          return (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * idx }}
              key={cat.name}
              className={`bg-gradient-to-br to-transparent p-5 sm:p-6 rounded-3xl border relative overflow-hidden group transition-colors ${themeClasses}`}
            >
              <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <IconMeat size={120} />
              </div>
              <div className={`text-[12px] font-bold mb-5 tracking-widest uppercase flex items-center gap-2 ${themeClasses.split(' ').find(c => c.startsWith('text-'))}`}>
                <div className={`w-2 h-2 rounded-full ${DotColor} animate-pulse`}></div>
                {cat.name}
              </div>
              <div className="flex flex-wrap gap-2.5 relative z-10 transition-all">
                {cat.items.map((opt) => (
                  <Badge
                    key={opt}
                    label={opt}
                    isActive={selected.includes(opt)}
                    onClick={() => onChange(opt)}
                    disabled={!selected.includes(opt) && selected.length >= 5}
                  />
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>
    </Section>
  );
}

function SpicyLevelPicker({ selected, onChange }: { selected: SpicyLevel, onChange: (val: SpicyLevel) => void }) {
  return (
    <Section title="Mức độ ăn cay (*)" icon={<IconFlame size={20} />}>
      <div className="bg-gradient-to-br from-orange-900/10 to-transparent p-5 sm:p-6 rounded-3xl border border-orange-500/20 shadow-[inset_0_0_20px_rgba(249,115,22,0.02)] relative overflow-hidden group hover:border-orange-500/40 transition-colors mt-2">
        <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <IconFlame size={120} />
        </div>
        <div className="text-[12px] font-bold text-orange-400/80 mb-5 tracking-widest uppercase flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500/80 shadow-[0_0_8px_rgba(249,115,22,0.8)] animate-pulse"></div>
          Kháng Hỏa Tùy Chỉnh
        </div>
        <div className="flex flex-wrap gap-3 relative z-10 transition-all">
          {SPICY_OPTIONS.map((opt) => {
            const isActive = selected === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onChange(opt.id)}
                className={`px-5 py-3 rounded-full font-semibold transition-all duration-300 border backdrop-blur-sm ${isActive
                  ? 'border-orange-500/50 bg-orange-500/20 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)] scale-[1.02]'
                  : 'border-white/10 bg-white/5 text-white/50 hover:border-orange-500/30 hover:bg-white/10 hover:text-white/80'
                  }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

function DietaryAndAllergies({ dietary, allergies, toggleDietary, toggleAllergy }: { dietary: string[], allergies: string[], toggleDietary: (val: string) => void, toggleAllergy: (val: string) => void }) {
  return (
    <Section title="Chế độ ăn & Dị ứng" icon={<IconLeaf size={20} />} subtitle="Tuỳ chọn">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-2">
        {/* Panel Chế độ ăn (Emerald) */}
        <div className="bg-gradient-to-br from-emerald-900/10 to-transparent p-5 sm:p-6 rounded-3xl border border-emerald-500/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.02)] relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
          <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <IconLeaf size={100} />
          </div>
          <div className="text-[12px] font-bold text-emerald-400/80 mb-5 tracking-widest uppercase flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
            Chế Độ Đặc Biệt
          </div>
          <div className="flex flex-wrap gap-2.5 relative z-10 transition-all">
            {DIETARY_OPTS.map(opt => (
              <Badge key={opt.id} label={opt.label} isActive={dietary.includes(opt.id)} onClick={() => toggleDietary(opt.id)} theme="emerald" />
            ))}
          </div>
        </div>

        {/* Panel Dị ứng (Red) */}
        <div className="bg-gradient-to-br from-red-900/10 to-transparent p-5 sm:p-6 rounded-3xl border border-red-500/20 shadow-[inset_0_0_20px_rgba(239,68,68,0.02)] relative overflow-hidden group hover:border-red-500/40 transition-colors">
          <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <IconAlertCircle size={100} />
          </div>
          <div className="text-[12px] font-bold text-red-400/80 mb-5 tracking-widest uppercase flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></div>
            Khai Báo Dị Ứng
          </div>
          <div className="flex flex-wrap gap-2.5 relative z-10 transition-all">
            {ALLERGY_OPTS.map(opt => (
              <Badge key={opt.id} label={opt.label} isActive={allergies.includes(opt.id)} onClick={() => toggleAllergy(opt.id)} theme="red" />
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function BudgetPicker({ selected, onChange }: { selected: BudgetLevel, onChange: (val: BudgetLevel) => void }) {
  return (
    <Section title="Mức chi tiêu trung bình (*)" icon={<IconCoin size={20} />}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
        {BUDGET_OPTIONS.map((opt) => {
          const isActive = selected === opt.id;
          return (
            <motion.div
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={`relative cursor-pointer rounded-3xl p-5 sm:p-6 transition-all duration-300 overflow-hidden group border ${isActive
                ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/20 to-transparent shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                : 'border-white/10 hover:border-amber-500/30 bg-gradient-to-br from-white/[0.02] to-transparent hover:from-amber-900/10'
                }`}
            >
              {/* Background Watermark */}
              <div className={`absolute -bottom-6 -right-6 p-4 transition-opacity duration-300 ${isActive ? 'opacity-20 text-amber-500' : 'opacity-5 text-white group-hover:opacity-10 group-hover:text-amber-500'}`}>
                <IconCoin size={100} />
              </div>

              <div className="relative z-10">
                <div className={`font-semibold text-lg flex items-center gap-2 ${isActive ? 'text-amber-400' : 'text-white/80'}`}>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse"></div>}
                  {opt.label}
                </div>
                <div className={`text-[13px] mt-2 font-light leading-relaxed ${isActive ? 'text-amber-400/80' : 'text-white/40'}`}>{opt.desc}</div>
              </div>

              {isActive && (
                <div className="absolute top-5 right-5 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]">
                  <IconCheck size={24} stroke={2.5} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </Section>
  );
}

// ==========================================
// UI UTILITIES
// ==========================================

function Section({ title, icon, subtitle, children }: { title: string, icon: React.ReactNode, subtitle?: string, children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-3 text-white font-medium text-[16px]">
          <div className="text-amber-400 bg-amber-400/10 p-2 rounded-xl border border-amber-400/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
            {icon}
          </div>
          <h3>{title}</h3>
        </div>
        {subtitle && (
          <span className="text-[12px] font-medium text-amber-200/70 bg-amber-900/40 border border-amber-500/20 px-3 py-1.5 rounded-full inline-block self-start sm:self-auto">
            {subtitle}
          </span>
        )}
      </div>
      <div className="pl-0 sm:pl-[52px]">
        {children}
      </div>
    </div>
  );
}

const Badge = React.memo(({ label, isActive, onClick, theme = 'cyan', disabled = false }: { label: string, isActive: boolean, onClick: () => void, theme?: 'cyan' | 'red' | 'emerald', disabled?: boolean }) => {
  let activeStyle = '';
  if (theme === 'red') activeStyle = 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
  else if (theme === 'emerald') activeStyle = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
  else activeStyle = 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]';

  let inactiveStyle = 'bg-white/5 border-white/10 text-white/60 hover:border-white/30 hover:bg-white/10 hover:text-white/80';
  if (disabled && !isActive) inactiveStyle = 'bg-[#080B13] border-white/5 text-white/20 cursor-not-allowed';

  return (
    <motion.button
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center px-4 py-2 rounded-full text-[13.5px] font-medium transition-colors border backdrop-blur-sm ${isActive ? activeStyle : inactiveStyle}`}
    >
      {label}
    </motion.button>
  );
});

Badge.displayName = 'Badge';
