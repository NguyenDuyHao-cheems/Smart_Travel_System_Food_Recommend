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
import { ThemeToggle } from '../../components/ThemeToggle';

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
  { id: 'milk', label: 'Sữa' },
  { id: 'egg', label: 'Trứng' },
  { id: 'gluten', label: 'Gluten' },
  { id: 'seafood', label: 'Hải sản' },
  { id: 'fish', label: 'Cá' },
  { id: 'peanut', label: 'Đậu phộng' },
  { id: 'soy', label: 'Đậu nành' }
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoadingOldData, setIsLoadingOldData] = useState(false);

  // Phát hiện chế độ chỉnh sửa từ URL query parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setIsEditMode(params.get('edit') === 'true');
    }
  }, []);

  // Yêu cầu đăng nhập — redirect về /auth nếu chưa có token
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const storedUserId = localStorage.getItem('user_id');

    if (!token || !storedUserId) {
      console.warn("Chưa đăng nhập, redirect về /auth");
      router.push('/auth?redirect=/onboarding');
      return;
    }

    setUserId(storedUserId);
  }, [router]);

  // Tải dữ liệu cũ nếu đang ở chế độ chỉnh sửa
  useEffect(() => {
    if (!userId || !isEditMode) return;

    const fetchOldPreferences = async () => {
      setIsLoadingOldData(true);
      try {
        const token = localStorage.getItem('access_token');
        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';
        
        const response = await fetch(`${API_BASE}/api/v1/users/${userId}/onboarding`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log("🚀 [Frontend] Dữ liệu khảo sát cũ nhận từ Backend:", data);

          const normalizeString = (str: string) => str.normalize("NFC").toLowerCase().trim();

          const mappedDietary = (data.dietary_restrictions || []).map(
            (label: string) => DIETARY_OPTS.find(o => normalizeString(o.label) === normalizeString(label))?.id
          ).filter(Boolean) as string[];

          if (data.is_vegetarian && !mappedDietary.includes('vegetarian') && !mappedDietary.includes('vegan')) {
            mappedDietary.push('vegetarian');
          }

          const mappedAllergies = (data.allergies || []).map(
            (label: string) => ALLERGY_OPTS.find(o => normalizeString(o.label) === normalizeString(label))?.id
          ).filter(Boolean) as string[];

          // Đảm bảo favorite_dishes là chữ hoa đầu từ như trong FAV_DISH_CATEGORIES
          // (Backend normalize_list chuyển thành lowercase)
          const rawFavs = data.favorite_dishes || [];
          const normalizedFavs = rawFavs.map((dish: string) => {
            for (const cat of FAV_DISH_CATEGORIES) {
              const matched = cat.items.find(item => item.toLowerCase() === dish.toLowerCase());
              if (matched) return matched;
            }
            return dish;
          });

          setFormData({
            favorite_dishes: normalizedFavs,
            spicy_level: data.spicy_level || '',
            dietary_restrictions: mappedDietary,
            allergies: mappedAllergies,
            budget: data.budget || '',
            location: data.location || '',
            age: data.age || '',
          });
        }
      } catch (error) {
        console.error("Failed to load old onboarding preferences:", error);
      } finally {
        setIsLoadingOldData(false);
      }
    };

    fetchOldPreferences();
  }, [userId, isEditMode]);

  // Helpers
  const toggleArrayItem = React.useCallback((field: keyof OnboardingData, value: string) => {
    setFormData((prev) => {
      const array = prev[field] as string[];
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

    if (formData.favorite_dishes.length < 3) {
      setErrorMsg("Vui lòng chọn hoặc tự nhập ít nhất 3 Món ăn yêu thích để AI phân tích.");
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
      const payloadToSubmit = {
        ...formData,
        location: formData.location.trim(),
        // Backend đang chặn cứng (validate) Enum tiếng Anh cho 2 trường này, nên bắt buộc gửi ID. 
        // Backend (Thành viên 2) sẽ phải tự map ID sang Text khi sinh vector.
        spicy_level: formData.spicy_level,
        budget: formData.budget,
        // Dị ứng và Chế độ ăn là mảng String tự do, nên ta map sang Tiếng Việt thoải mái
        dietary_restrictions: formData.dietary_restrictions.map(
          id => DIETARY_OPTS.find(o => o.id === id)?.label
        ).filter(Boolean),
        allergies: formData.allergies.map(
          id => ALLERGY_OPTS.find(o => o.id === id)?.label
        ).filter(Boolean),
        is_vegetarian: formData.dietary_restrictions.includes('vegan') || formData.dietary_restrictions.includes('vegetarian'),
      };

      console.log("🚀 [Frontend] Payload Tiếng Việt chuẩn bị gửi cho Backend:", payloadToSubmit);

      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';
      
      const response = await fetch(`${API_BASE}/api/v1/users/${userId}/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToSubmit),
      });

      if (response.ok) {
        // Trì hoãn một chút để User thấy hiệu ứng đang xử lý
        setTimeout(() => {
          if (isEditMode) {
            router.push('/profile');
          } else {
            router.push('/');
          }
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
    <div className="min-h-screen bg-white dark:bg-[#2A2420] text-gray-800 dark:text-[#E6DFD5] flex flex-col items-center py-6 sm:py-12 px-4 sm:px-6 relative overflow-x-hidden">

      {/* ── Food-pattern background (fixed, full page) ── */}
      <div
        className="fixed inset-0 pointer-events-none z-0 dark:hidden"
        style={{
          backgroundImage: "url('/images/food-pattern-light.png')",
          backgroundSize: "1300px",
          backgroundRepeat: "repeat",
          backgroundPosition: "center",
          opacity: 0.15,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none z-0 hidden dark:block"
        style={{
          backgroundImage: "url('/images/food-pattern.png')",
          backgroundSize: "1300px",
          backgroundRepeat: "repeat",
          backgroundPosition: "center",
          opacity: 0.06,
        }}
      />

      {/* Ambient glow blobs */}
      <div className="fixed top-[20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand/5 blur-[120px] pointer-events-none z-0" />
      <div className="fixed top-[40%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand/5 blur-[120px] pointer-events-none z-0" />

      <motion.div
        className="w-full max-w-3xl bg-white dark:bg-[#3D312A] shadow-sm border border-[#E6DFD5] dark:border-[#4D3D32]/60 rounded-[32px] overflow-hidden p-6 sm:p-12 mb-8 relative z-10"      >
        <Header isEditMode={isEditMode} />

        {isLoadingOldData ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <IconBrain className="w-12 h-12 text-brand animate-pulse" />
            <p className="text-[14px] font-medium text-[#9A8A7A] dark:text-[#E6DFD5]/60 animate-pulse">Đang tải cấu hình sở thích của bạn...</p>
          </div>
        ) : (
          <>
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
            <div className="mt-14 pt-8 border-t border-[#E6DFD5] dark:border-[#4D3D32]/60 flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-5 bg-transparent">

              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    key="error-box"
                    initial={{ opacity: 0, scale: 0.95, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: 20 }}
                    className="p-4 px-5 sm:mr-auto bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-start gap-3 border border-red-100 dark:border-red-900/10 flex-1 w-full sm:w-auto"
                  >
                    <IconAlertCircle size={18} className="shrink-0" />
                    <span className="font-bold text-xs uppercase tracking-wide leading-snug">{errorMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="group w-full sm:w-auto shrink-0 relative inline-flex items-center justify-center gap-2 rounded-2xl bg-brand hover:bg-brand-hover px-8 py-3.5 text-sm font-bold text-white shadow-md shadow-brand/20 transition-all duration-300 disabled:opacity-50 cursor-pointer"
              >
                <IconBrain size={18} className={isSubmitting ? "animate-pulse" : ""} />
                <span>
                  {isSubmitting 
                    ? 'Đang đồng bộ Neural Data...' 
                    : (isEditMode ? 'Cập nhật Hồ sơ AI' : 'Khởi tạo Hồ sơ AI')
                  }
                </span>
                <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </div>
          </>
        )}

      </motion.div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function Header({ isEditMode }: { isEditMode: boolean }) {
  return (
    <div className="text-center space-y-4 pb-10 border-b border-[#E6DFD5] dark:border-[#4D3D32]/60 relative">
      <div className="absolute top-0 right-0 p-2 sm:p-0">
        <ThemeToggle />
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[250px] h-[1px] bg-gradient-to-r from-transparent via-brand/50 to-transparent"></div>

      <div className="inline-flex items-center gap-2 bg-brand/5 dark:bg-brand/10 border border-brand/15 dark:border-brand/30 text-brand dark:text-[#E8735A] text-[10px] uppercase tracking-[0.25em] font-black px-4.5 py-2 rounded-full mb-3 shadow-sm">
        <IconBrain size={14} className="animate-pulse" />
        {isEditMode ? 'AI Profile Modification Engine' : 'AI Food Recommendation Engine'}
      </div>

      <h1 className="text-[32px] sm:text-[40px] font-black text-[#3D312A] dark:text-[#E6DFD5] tracking-tight leading-tight uppercase">
        {isEditMode ? 'Chỉnh Sửa Hồ Sơ Cá Nhân' : 'Khám Phá Bản Đồ Ẩm Thực'} <br />
        <span className="inline-block pb-3 pt-1 px-1.5 italic text-transparent bg-clip-text bg-gradient-to-r from-brand via-[#E8735A] to-brand font-black normal-case leading-relaxed">
          {isEditMode ? 'Tối Ưu Hóa Trực Quan' : 'Dành Riêng Cho Bạn'}
        </span>
      </h1>

      <p className="text-[#7A6A5A] dark:text-[#9A8A7A] text-sm sm:text-base max-w-xl mx-auto leading-relaxed mt-4">
        {isEditMode
          ? 'Cập nhật lại sở thích ăn uống của bạn. Hệ thống trí tuệ nhân tạo sẽ tự động học hỏi, phân tích và tối ưu hóa lại các gợi ý ẩm thực phù hợp nhất với khẩu vị mới.'
          : 'Hãy cho chúng tôi biết sơ lược về sở thích của bạn. Trí tuệ nhân tạo sẽ tự động phân tích và chọn lọc ra những địa điểm thưởng thức tuyệt vời nhất, phù hợp chính xác với gu của riêng bạn.'
        }
      </p>
    </div>
  );
}

function BasicInfoSection({ formData, setSingleItem }: { formData: OnboardingData, setSingleItem: Function }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-1">
      <div className="space-y-3 group">
        <label className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#7A6A5A] dark:text-[#9A8A7A] transition-colors group-focus-within:text-brand dark:group-focus-within:text-[#E8735A]">
          <IconUser className="text-brand dark:text-[#E8735A] transition-colors" size={16} /> Độ tuổi của bạn (*)
        </label>
        <div className="relative">
          <input
            type="number"
            min="13"
            max="120"
            placeholder="Ví dụ: 22..."
            value={formData.age}
            onChange={(e) => setSingleItem('age', e.target.value === '' ? '' : parseInt(e.target.value))}
            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-[#2A2420]/50 border border-gray-150 dark:border-[#4D3D32] rounded-2xl outline-none text-gray-900 dark:text-[#E6DFD5] focus:border-brand dark:focus:border-brand/60 focus:bg-white dark:focus:bg-[#3D312A] focus:ring-4 focus:ring-brand/10 transition-all duration-300 font-bold placeholder-gray-400 dark:placeholder-white/20 shadow-sm"
          />
        </div>
      </div>
      <div className="space-y-3 group">
        <label className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#7A6A5A] dark:text-[#9A8A7A] transition-colors group-focus-within:text-brand dark:group-focus-within:text-[#E8735A]">
          <IconMapPin className="text-brand dark:text-[#E8735A] transition-colors" size={16} /> Khu vực hiện tại (*)
        </label>
        <div className="relative">
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setSingleItem('location', e.target.value)}
              className="w-full px-5 py-3.5 bg-gray-50 dark:bg-[#2A2420]/50 border border-gray-150 dark:border-[#4D3D32] rounded-2xl outline-none text-gray-900 dark:text-[#E6DFD5] focus:border-brand dark:focus:border-brand/60 focus:bg-white dark:focus:bg-[#3D312A] focus:ring-4 focus:ring-brand/10 transition-all duration-300 font-bold placeholder-gray-400 dark:placeholder-white/20 shadow-sm"
              placeholder="Nhập địa chỉ của bạn"
            />
        </div>
      </div>
    </div>
  );
}

function FavoriteDishes({ selected, onChange }: { selected: string[], onChange: (val: string) => void }) {
  const [customDish, setCustomDish] = React.useState("");

  const handleAddCustom = () => {
    const val = customDish.trim();
    if (val) {
      if (selected.includes(val)) {
        return;
      }
      onChange(val);
      setCustomDish("");
    }
  };

  const presetDishes = new Set(FAV_DISH_CATEGORIES.flatMap(cat => cat.items));
  const customDishes = selected.filter(dish => !presetDishes.has(dish));

  return (
    <Section title="Món ăn yêu thích (*)" icon={<IconMeat size={20} />} subtitle={`Đã chọn ${selected.length} món (Yêu cầu ít nhất 3 món)`}>
      <div className="text-[13px] text-[#7A6A5A] dark:text-[#9A8A7A] mb-6 mt-1 font-bold">Chọn các món ăn ưa thích hoặc tự nhập thêm món ăn khoái khẩu của bạn:</div>

      <div className="space-y-4">
        {FAV_DISH_CATEGORIES.map((cat, idx) => {
          let themeClasses = "";
          let DotColor = "";
          let badgeTheme: 'brand' | 'amber' | 'rose' | 'emerald' = 'brand';
          
          if (idx === 0) {
            themeClasses = "border-brand/20 dark:border-brand/35 text-brand dark:text-[#E8735A] bg-brand/[0.02] hover:border-brand/40 dark:hover:border-brand/60";
            DotColor = "bg-brand dark:bg-[#E8735A]";
            badgeTheme = 'brand';
          } else if (idx === 1) {
            themeClasses = "border-amber-500/20 dark:border-amber-500/35 text-amber-600 dark:text-amber-400 bg-amber-500/[0.02] hover:border-amber-500/40 dark:hover:border-amber-500/60";
            DotColor = "bg-amber-500";
            badgeTheme = 'amber';
          } else if (idx === 2) {
            themeClasses = "border-rose-500/20 dark:border-rose-500/35 text-rose-600 dark:text-rose-450 bg-rose-500/[0.02] hover:border-rose-500/40 dark:hover:border-rose-500/60";
            DotColor = "bg-rose-500";
            badgeTheme = 'rose';
          } else {
            themeClasses = "border-emerald-500/20 dark:border-emerald-500/35 text-emerald-600 dark:text-emerald-450 bg-emerald-500/[0.02] hover:border-emerald-500/40 dark:hover:border-emerald-500/60";
            DotColor = "bg-emerald-500";
            badgeTheme = 'emerald';
          }

          return (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * idx }}
              key={cat.name}
              className={`p-5 sm:p-6 rounded-[24px] border relative overflow-hidden group transition-all bg-[#FDFBF7] dark:bg-[#2A2420]/30 ${themeClasses}`}
            >
              <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <IconMeat size={120} />
              </div>
              <div className="text-[11px] font-black mb-5 tracking-widest uppercase flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${DotColor} animate-pulse`}></div>
                {cat.name}
              </div>
              <div className="flex flex-wrap gap-2.5 relative z-10 transition-all">
                {cat.items.map((opt) => (
                  <Badge
                    key={opt}
                    label={opt}
                    theme={badgeTheme}
                    isActive={selected.includes(opt)}
                    onClick={() => onChange(opt)}
                  />
                ))}
              </div>
            </motion.div>
          )
        })}

        {/* Tự nhập món ăn khác */}
        <div className="p-5 sm:p-6 rounded-[24px] border border-dashed border-[#E6DFD5] dark:border-[#4D3D32]/65 bg-[#FDFBF7] dark:bg-[#2A2420]/30">
          <div className="text-[11px] font-black mb-3 tracking-widest uppercase text-brand dark:text-[#E8735A] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand dark:bg-[#E8735A] animate-pulse"></div>
            Tự nhập món ăn ưa thích khác
          </div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={customDish}
              onChange={(e) => setCustomDish(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustom())}
              placeholder="Nhập món ăn khác (ví dụ: Bún đậu mắm tôm, Nem nướng...)"
              className="flex-1 bg-white dark:bg-[#3D312A] border border-[#E6DFD5] dark:border-[#4D3D32]/60 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 dark:text-[#E6DFD5] focus:border-brand dark:focus:border-[#E8735A] focus:ring-4 focus:ring-brand/10 dark:focus:ring-[#E8735A]/10 outline-none transition-all"
            />
            <button
              onClick={handleAddCustom}
              className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
            >
              Thêm
            </button>
          </div>

          {customDishes.length > 0 && (
            <div className="flex flex-wrap gap-2.5">
              {customDishes.map((dish) => (
                <span
                  key={dish}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-brand bg-brand/5 dark:bg-brand/15 text-brand dark:text-[#E8735A] shadow-sm dark:shadow-[0_0_15px_rgba(232,115,90,0.25)] z-10"
                >
                  {dish}
                  <button
                    onClick={() => onChange(dish)}
                    className="hover:text-brand transition-colors font-bold ml-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

function SpicyLevelPicker({ selected, onChange }: { selected: SpicyLevel, onChange: (val: SpicyLevel) => void }) {
  return (
    <Section title="Mức độ ăn cay (*)" icon={<IconFlame size={20} />}>
      <div className="bg-[#FDFBF7] dark:bg-[#2A2420]/30 p-5 sm:p-6 rounded-[24px] border border-[#E6DFD5] dark:border-[#4D3D32]/60 relative overflow-hidden group transition-colors mt-2">
        <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <IconFlame size={120} />
        </div>
        <div className="text-[11px] font-black text-red-600 dark:text-red-400 mb-5 tracking-widest uppercase flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-500 animate-pulse"></div>
          Kháng Hỏa Tùy Chỉnh
        </div>
        <div className="flex flex-wrap gap-3 relative z-10 transition-all">
          {SPICY_OPTIONS.map((opt) => {
            const isActive = selected === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onChange(opt.id)}
                className={`px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-300 border cursor-pointer ${isActive
                  ? 'border-red-650 bg-red-600 text-white shadow-md shadow-red-500/20 dark:border-red-500 dark:bg-red-500 dark:text-white dark:shadow-[0_0_15px_rgba(239,68,68,0.55)]'
                  : 'border-[#E6DFD5] dark:border-[#4D3D32] bg-white dark:bg-[#2A2420]/50 text-[#7A6A5A] dark:text-[#E6DFD5] hover:border-red-500 dark:hover:border-red-500 hover:text-red-650 dark:hover:text-red-450'
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
        <div className="bg-[#FDFBF7] dark:bg-[#2A2420]/30 p-5 sm:p-6 rounded-[24px] border border-[#E6DFD5] dark:border-[#4D3D32]/60 relative overflow-hidden group transition-colors">
          <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <IconLeaf size={100} />
          </div>
          <div className="text-[11px] font-black text-emerald-600 dark:text-emerald-450 mb-5 tracking-widest uppercase flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm dark:bg-emerald-500/80"></div>
            Chế Độ Đặc Biệt
          </div>
          <div className="flex flex-wrap gap-2.5 relative z-10 transition-all">
            {DIETARY_OPTS.map(opt => (
              <Badge key={opt.id} label={opt.label} isActive={dietary.includes(opt.id)} onClick={() => toggleDietary(opt.id)} theme="emerald" />
            ))}
          </div>
          <div className="mt-4 text-[11px] text-emerald-600/60 dark:text-emerald-400/50 font-medium italic">
            * Món Halal là thực phẩm và đồ uống được phép tiêu thụ theo luật Hồi giáo .
          </div>
        </div>

        {/* Panel Dị ứng (Red) */}
        <div className="bg-[#FDFBF7] dark:bg-[#2A2420]/30 p-5 sm:p-6 rounded-[24px] border border-[#E6DFD5] dark:border-[#4D3D32]/60 relative overflow-hidden group transition-colors">
          <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <IconAlertCircle size={100} />
          </div>
          <div className="text-[11px] font-black text-red-600 dark:text-red-450 mb-5 tracking-widest uppercase flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm dark:bg-red-500/80 animate-pulse"></div>
            Khai Báo Dị Ứng
          </div>
          <div className="flex flex-wrap gap-2.5 relative z-10 transition-all">
            {ALLERGY_OPTS.map(opt => (
              <Badge key={opt.id} label={opt.label} isActive={allergies.includes(opt.id)} onClick={() => toggleAllergy(opt.id)} theme="red" />
            ))}
          </div>
          <div className="mt-4 text-[11px] text-red-600/60 dark:text-red-400/50 font-medium italic">
            * Gluten: Protein có trong lúa mì & lúa mạch, có thể gây khó tiêu hoặc dị ứng.
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
              className={`relative cursor-pointer rounded-[24px] p-5 sm:p-6 transition-all duration-300 overflow-hidden group border ${isActive
                ? 'border-brand bg-brand/5 dark:bg-brand/10 shadow-md shadow-brand/5'
                : 'border-[#E6DFD5] dark:border-[#4D3D32]/60 bg-white dark:bg-[#3D312A] hover:border-brand dark:hover:border-brand hover:bg-[#FDFBF7]/50'
                }`}
            >
              {/* Background Watermark */}
              <div className={`absolute -bottom-6 -right-6 p-4 transition-opacity duration-300 ${isActive ? 'opacity-10 text-brand' : 'opacity-5 text-[#9A8A7A] group-hover:text-brand dark:text-[#E6DFD5] dark:group-hover:opacity-10'}`}>
                <IconCoin size={100} />
              </div>

              <div className="relative z-10">
                <div className={`font-black text-sm flex items-center gap-2 ${isActive ? 'text-brand dark:text-[#E8735A]' : 'text-gray-800 dark:text-[#E6DFD5]/80'}`}>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-brand dark:bg-[#E8735A] animate-pulse"></div>}
                  {opt.label}
                </div>
                <div className={`text-xs mt-2 font-medium leading-relaxed ${isActive ? 'text-brand/80 dark:text-[#E8735A]/80' : 'text-gray-500 dark:text-[#E6DFD5]/40'}`}>{opt.desc}</div>
              </div>

              {isActive && (
                <div className="absolute top-5 right-5 text-brand dark:text-[#E8735A]">
                  <IconCheck size={20} stroke={3} />
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
        <div className="flex items-center gap-3 text-gray-800 dark:text-[#E6DFD5] font-black text-base uppercase tracking-wider">
          <div className="text-brand dark:text-[#E8735A] bg-brand/5 dark:bg-brand/10 p-2.5 rounded-xl border border-brand/10 dark:border-brand/20 shadow-sm">
            {icon}
          </div>
          <h3>{title}</h3>
        </div>
        {subtitle && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand dark:text-[#E8735A] bg-brand/5 dark:bg-brand/10 border border-brand/10 dark:border-brand/20 px-3 py-1.5 rounded-full inline-block self-start sm:self-auto">
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

const Badge = React.memo(({ label, isActive, onClick, theme = 'brand', disabled = false }: { label: string, isActive: boolean, onClick: () => void, theme?: 'brand' | 'amber' | 'rose' | 'emerald' | 'red', disabled?: boolean }) => {
  let activeStyle = '';
  if (theme === 'red') {
    activeStyle = 'bg-red-50 dark:bg-red-500/20 border-red-500 text-red-700 dark:border-red-400 dark:text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.25)] dark:shadow-[0_0_15px_rgba(239,68,68,0.55)]';
  } else if (theme === 'emerald') {
    activeStyle = 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)] dark:shadow-[0_0_15px_rgba(52,211,153,0.55)]';
  } else if (theme === 'amber') {
    activeStyle = 'bg-amber-50 dark:bg-amber-500/20 border-amber-500 text-amber-750 dark:border-amber-400 dark:text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)] dark:shadow-[0_0_15px_rgba(251,191,36,0.55)]';
  } else if (theme === 'rose') {
    activeStyle = 'bg-rose-50 dark:bg-rose-500/20 border-rose-500 text-rose-750 dark:border-rose-400 dark:text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.25)] dark:shadow-[0_0_15px_rgba(251,113,133,0.55)]';
  } else {
    // brand
    activeStyle = 'bg-brand/5 dark:bg-[#E8735A]/15 border-brand dark:border-[#E8735A]/60 text-brand dark:text-[#E8735A] shadow-[0_0_12px_rgba(200,50,43,0.2)] dark:shadow-[0_0_15px_rgba(232,115,90,0.45)] z-10';
  }

  let hoverStyle = '';
  if (theme === 'red') {
    hoverStyle = 'hover:border-red-500 dark:hover:border-red-400 hover:text-red-600 dark:hover:text-red-300';
  } else if (theme === 'emerald') {
    hoverStyle = 'hover:border-emerald-500 dark:hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300';
  } else if (theme === 'amber') {
    hoverStyle = 'hover:border-amber-500 dark:hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-300';
  } else if (theme === 'rose') {
    hoverStyle = 'hover:border-rose-500 dark:hover:border-rose-400 hover:text-rose-600 dark:hover:text-rose-300';
  } else {
    hoverStyle = 'hover:border-brand dark:hover:border-[#E8735A] hover:text-brand dark:hover:text-[#E8735A]';
  }

  let inactiveStyle = `border-[#E6DFD5] dark:border-[#4D3D32] bg-gray-50/50 dark:bg-[#2A2420]/30 text-[#7A6A5A] dark:text-[#C8BFB0] hover:bg-[#FDFBF7] dark:hover:bg-[#3D312A] cursor-pointer ${hoverStyle}`;
  if (disabled && !isActive) inactiveStyle = 'bg-gray-100 dark:bg-gray-900/40 border-[#E6DFD5]/50 dark:border-gray-800 text-gray-400 dark:text-gray-650 cursor-not-allowed opacity-50';

  return (
    <motion.button
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center px-4 py-2 rounded-xl text-[13.5px] font-bold transition-all border backdrop-blur-sm ${isActive ? activeStyle : inactiveStyle}`}
    >
      {label}
    </motion.button>
  );
});

Badge.displayName = 'Badge';
