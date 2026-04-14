'use client';

import React, { useState } from 'react';
import { 
  IconChefHat, 
  IconMeat, 
  IconCoin, 
  IconArmchair, 
  IconArrowRight, 
  IconCheck,
  IconUsers,
  IconLeaf,
  IconMapPin
} from '@tabler/icons-react';

// ==========================================
// TYPES & INITIAL STATE
// ==========================================
interface OnboardingData {
  purposes: string[];
  dietary: string[];
  tastes: string[];
  foodTypes: string[];
  priceRange: string;
  spaces: string[];
  transportation: string;
}

const initialData: OnboardingData = {
  purposes: [],
  dietary: [],
  tastes: [],
  foodTypes: [],
  priceRange: '',
  spaces: [],
  transportation: '',
};

export default function OnboardingPage() {
  const [formData, setFormData] = useState<OnboardingData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper cho multi-select (chọn nhiều)
  const toggleArrayItem = (field: keyof OnboardingData, value: string) => {
    setFormData((prev) => {
      const array = prev[field] as string[];
      if (array.includes(value)) {
        return { ...prev, [field]: array.filter((item) => item !== value) };
      }
      return { ...prev, [field]: [...array, value] };
    });
  };

  // Helper cho single-select (chọn 1)
  const setSingleItem = (field: keyof OnboardingData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ==========================================
  // HANDLER GỬI API
  // ==========================================
  const handleSubmit = async () => {
    // Validate cơ bản
    if (!formData.priceRange || !formData.transportation) {
      alert("Vui lòng chọn Mức giá và Phương tiện di chuyển (bắt buộc) để AI có thể gợi ý tốt nhất nhé!");
      return;
    }

    setIsSubmitting(true);
    try {
      // Nhắc nhở: Cần chốt Payload với Tuân
      const response = await fetch('http://127.0.0.1:8000/api/v1/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Cập nhật hồ sơ thành công! Đang lưu vào hệ thống...');
        // router.push('/home')
      } else {
        alert('Có lỗi xảy ra khi lưu dữ liệu.');
      }
    } catch (error) {
      console.error('Submit Error:', error);
      alert('Không thể kết nối tới server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-3xl bg-white shadow-xl shadow-blue-100/50 rounded-3xl overflow-hidden border border-slate-100 p-6 sm:p-12 mb-10">
        
        <Header />

        <div className="space-y-12 mt-10">
          
          <DiningPurpose 
            selected={formData.purposes} 
            onChange={(val) => toggleArrayItem('purposes', val)} 
          />

          <DietaryRestrictions 
            selected={formData.dietary} 
            onChange={(val) => toggleArrayItem('dietary', val)} 
          />

          <TasteSurvey 
            selected={formData.tastes} 
            onChange={(val) => toggleArrayItem('tastes', val)} 
          />
          
          <FoodTypeSelector 
            selected={formData.foodTypes} 
            onChange={(val) => toggleArrayItem('foodTypes', val)} 
          />
          
          <PriceRangePicker 
            selected={formData.priceRange} 
            onChange={(val) => setSingleItem('priceRange', val)} 
          />
          
          <SpacePreference 
            selected={formData.spaces} 
            onChange={(val) => toggleArrayItem('spaces', val)} 
          />

          <TransportationFilter 
            selected={formData.transportation} 
            onChange={(val) => setSingleItem('transportation', val)} 
          />

        </div>

        {/* Nút Submit */}
        <div className="mt-14 pt-8 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 -mx-6 sm:-mx-12 px-6 sm:px-12 -mb-6 sm:-mb-12 pb-6 sm:pb-12 border-t-dashed">
          <div className="text-sm font-medium text-slate-400 hidden sm:block">
            Mục có dấu (*) là cần thiết
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="group w-full sm:w-auto relative inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-10 py-4 text-[15px] font-semibold text-white shadow-xl shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-blue-500/40 focus:outline-none focus:ring-4 focus:ring-blue-500/20 active:scale-95 disabled:select-none disabled:opacity-70"
          >
            {isSubmitting ? 'Đang phân tích dữ liệu...' : 'Hoàn tất & Khám phá ngay'}
            <IconArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

      </div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function Header() {
  return (
    <div className="text-center space-y-4 pb-8 border-b border-slate-100">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-2 shadow-sm border border-blue-100/50">
        <IconChefHat stroke={1.5} size={32} />
      </div>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
        Thiết lập Hồ sơ Ẩm thực
      </h1>
      <p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
        Càng hiểu rõ sở thích, thói quen và nhu cầu của bạn, AI của Taste&Travel càng đưa ra những đề xuất "nhìn là muốn ăn ngay". Hãy dành chút thời gian nhé!
      </p>
    </div>
  );
}

function DiningPurpose({ selected, onChange }: { selected: string[], onChange: (val: string) => void }) {
  const options = ['Hẹn hò lãng mạn 💑', 'Tụ tập bạn bè 🎉', 'Ăn cùng gia đình 👨‍👩‍👧‍👦', 'Ăn một mình (Solo) 🎧', 'Gặp gỡ đối tác 🤝', 'Tổ chức sinh nhật/Tiệc 🎂'];
  return (
    <Section title="Mục đích đi ăn thường xuyên của bạn?" icon={<IconUsers size={22} />} subtitle="Có thể chọn nhiều">
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => (
          <Badge key={opt} label={opt} isActive={selected.includes(opt)} onClick={() => onChange(opt)} outlineMode />
        ))}
      </div>
    </Section>
  );
}

function DietaryRestrictions({ selected, onChange }: { selected: string[], onChange: (val: string) => void }) {
  const options = ['Không kiêng cữ 🍽️', 'Ăn chay / Thuần chay 🥦', 'Eat clean / Healthy 🥙', 'Không đồ ngọt 🚫🍬', 'Không hải sản 🚫🦐', 'Dị ứng đậu phộng 🥜'];
  return (
    <Section title="Bạn có chế độ ăn đặc biệt nào không?" icon={<IconLeaf size={22} />} subtitle="Có thể chọn nhiều">
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => {
          // Highlight "Không kiêng cữ" nếu đc chọn
          const isNeutral = opt.includes('Không kiêng cữ');
          return <Badge key={opt} label={opt} isActive={selected.includes(opt)} onClick={() => onChange(opt)} isNeutral={isNeutral && selected.includes(opt)} />
        })}
      </div>
    </Section>
  );
}

function TasteSurvey({ selected, onChange }: { selected: string[], onChange: (val: string) => void }) {
  const options = ['Nghiện ăn Cay 🌶️', 'Hảo Ngọt 🍬', 'Đậm đà (Mặn/Nhiều sốt) 🧂', 'Thanh đạm (Ít gia vị) 🥗', 'Chua chua 🍋', 'Thích Đồ chiên/Dầu mỡ 🍗'];
  return (
    <Section title="Khẩu vị đặc trưng" icon={<IconChefHat size={22} />} subtitle="Có thể chọn nhiều">
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => (
          <Badge key={opt} label={opt} isActive={selected.includes(opt)} onClick={() => onChange(opt)} />
        ))}
      </div>
    </Section>
  );
}

function FoodTypeSelector({ selected, onChange }: { selected: string[], onChange: (val: string) => void }) {
  const options = ['Cơm/Gia đình 🍚', 'Bún/Phở/Mì 🍜', 'Lẩu/Nướng 🍲', 'Đồ ăn vặt/Fastfood 🍟', 'Đồ Âu/Steak 🥩', 'Hải sản 🦞', 'Món Á (Nhật/Hàn/Trung) 🍣', 'Cafe/Tráng miệng ☕'];
  return (
    <Section title="Các thể loại món ăn yêu thích" icon={<IconMeat size={22} />} subtitle="Có thể chọn nhiều">
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => (
          <Badge key={opt} label={opt} isActive={selected.includes(opt)} onClick={() => onChange(opt)} outlineMode />
        ))}
      </div>
    </Section>
  );
}

function PriceRangePicker({ selected, onChange }: { selected: string, onChange: (val: string) => void }) {
  const options = [
    { id: 'cheap', label: 'Sinh viên/Bình dân', desc: '< 50.000đ' },
    { id: 'medium', label: 'Tầm trung', desc: '50.000đ - 200.000đ' },
    { id: 'expensive', label: 'Cao cấp/Sang trọng', desc: '> 200.000đ' },
  ];

  return (
    <Section title="Mức chi tiêu trung bình cho 1 bữa ăn (*)" icon={<IconCoin size={22} />}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
        {options.map((opt) => {
          const isActive = selected === opt.id;
          return (
            <div 
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={`relative cursor-pointer rounded-2xl border-2 p-5 transition-all duration-300 ${
                isActive 
                  ? 'border-blue-600 bg-blue-50/70 shadow-sm' 
                  : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50 bg-white'
              }`}
            >
              <div className={`font-semibold ${isActive ? 'text-blue-800' : 'text-slate-700'}`}>{opt.label}</div>
              <div className={`text-sm mt-1.5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>{opt.desc}</div>
              {isActive && (
                <div className="absolute top-5 right-5 text-blue-600">
                  <IconCheck size={22} stroke={2.5} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function SpacePreference({ selected, onChange }: { selected: string[], onChange: (val: string) => void }) {
  const options = ['Rộng rãi/Thoáng mát 🍃', 'Yên tĩnh/Chill 🎧', 'Vỉa hè/Bình dân 🏙️', 'View đẹp/Sống ảo 📸', 'Phòng riêng/Khép kín 🚪', 'Có máy lạnh ❄️', 'Rooftop/Sân thượng 🌟'];
  return (
    <Section title="Tiêu chí Không gian quán" icon={<IconArmchair size={22} />} subtitle="Có thể chọn nhiều">
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => (
          <Badge key={opt} label={opt} isActive={selected.includes(opt)} onClick={() => onChange(opt)} outlineMode />
        ))}
      </div>
    </Section>
  );
}

function TransportationFilter({ selected, onChange }: { selected: string, onChange: (val: string) => void }) {
  const options = [
    { id: 'bike', label: 'Xe máy', emoji: '🛵', desc: 'Có chỗ để xe máy' },
    { id: 'car', label: 'Ô tô', emoji: '🚗', desc: 'Cần bãi đậu xe hơi' },
    { id: 'walk', label: 'Đi bộ', emoji: '🚶‍♂️', desc: 'Ưu tiên vị trí gần nhà (Dưới 1km)' },
  ];

  return (
    <Section title="Bạn thường di chuyển bằng gì? (*)" icon={<IconMapPin size={22} />} subtitle="Ảnh hưởng lớn đến gợi ý địa điểm">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {options.map((opt) => {
          const isActive = selected === opt.id;
          return (
            <div 
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={`flex items-center gap-4 cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 ${
                isActive ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100/80 hover:border-blue-200 hover:bg-slate-50 bg-white'
              }`}
            >
              <div className="text-3xl bg-slate-100/50 rounded-xl px-2 py-1">{opt.emoji}</div>
              <div>
                <div className="font-semibold text-slate-800 text-sm">{opt.label}</div>
                <div className="text-[12px] text-slate-500 mt-0.5 max-w-[120px]">{opt.desc}</div>
              </div>
            </div>
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
        <div className="flex items-center gap-2.5 text-slate-800 font-bold text-[17px]">
          <div className="text-blue-600 bg-blue-50 p-1.5 rounded-lg">
            {icon}
          </div>
          <h3>{title}</h3>
        </div>
        {subtitle && <span className="text-[13px] font-medium text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-full inline-block self-start sm:self-auto">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function Badge({ label, isActive, onClick, isNeutral = false, outlineMode = false }: { label: string, isActive: boolean, onClick: () => void, isNeutral?: boolean, outlineMode?: boolean }) {
  
  // Các style giao diện nút
  const activeStyle = isNeutral 
    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200'
    : 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200';

  let inactiveStyle = 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/50';
  
  if (outlineMode && !isActive) {
    inactiveStyle = 'bg-transparent border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/50';
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-4 py-2.5 rounded-full text-[14.5px] font-medium transition-all duration-200 border ${
        isActive ? activeStyle : inactiveStyle
      } active:scale-95`}
    >
      {label}
    </button>
  );
}
