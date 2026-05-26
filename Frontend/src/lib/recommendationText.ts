export type DisplayLanguage = 'vi' | 'en';

const RESTAURANT_TAGS_EN: Record<string, string> = {
  'ga': 'chicken',
  'ga nuong': 'grilled chicken',
  'bo': 'beef',
  'heo': 'pork',
  'com': 'rice',
  'chao': 'porridge',
  'pho': 'pho',
  'bun': 'vermicelli',
  'mi': 'noodles',
  'lau': 'hotpot',
  'hai san': 'seafood',
  'nuong': 'grill',
  'tra sua': 'milk tea',
  'ca phe': 'coffee',
  'do uong': 'drinks',
  'mo khuya': 'open late',
  'trang mieng': 'dessert',
  'mon chay': 'vegetarian',
  'chay': 'vegetarian',
  'an sang': 'breakfast',
  'an trua': 'lunch',
  'an toi': 'dinner',
  'an vat': 'snacks',
  'an khuya': 'late-night',
  'danh gia cao': 'highly rated',
  'nhieu danh gia': 'many reviews',
  'gia re': 'budget',
  'tam trung': 'mid-range',
  'cao cap': 'premium',
  'chien': 'fried',
  'fastfood': 'fast food',
  'xao': 'stir-fried',
  'mi xao': 'fried noodles',
  'hap': 'steamed',
  'luoc': 'boiled',
  'tron': 'mixed',
  'goi': 'salad',
  'salad': 'salad',
  'healthy': 'healthy',
  'sushi': 'sushi',
  'pizza': 'pizza',
  'burger': 'burger',
  'dua tren so thich': 'based on preferences',
  'gan day tim kiem': 'recently searched',
  'thinh hanh': 'trending',
  'trai nghiem': 'new experience',
};

const REASON_LABELS_EN: Record<string, string> = {
  'Rat gan ban': 'Very close to you',
  'Gan ban': 'Near you',
  'Rat gan nhom': 'Very close to group',
  'Gan nhom': 'Near group',
  'Danh gia xuat sac': 'Excellent rating',
  'Danh gia cao': 'Highly rated',
  'Nha hang xuat sac': 'Top restaurant',
  'Review tich cuc': 'Positive reviews',
  'Goi y cho ban': 'Recommended for you',
  'Quan ngon phu hop': 'Great match',
  'Quan ngot phu hop': 'Great match',
  'Phu hop voi nhom': 'Great fit for group',
  'Quan an noi bat': 'Trending restaurant',
  'Thinh Hanh': 'Trending',
  'Phu hop voi tim kiem gan day cua ban.': 'Matches your recent searches.',
  'Dang thinh hanh trong khu vuc cua ban.': 'Trending in your area.',
  'Mon ngon cuoi tuan, thich hop trai nghiem moi.': 'A great weekend dish for a new experience.',
  'Mon an da duoc them vao muc yeu thich cua ban.': 'Added to your favorites.',
  'Duoc luu trong bo suu tap.': 'Saved in collection.',
};

function normalizeVietnamese(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (char) => char === 'đ' ? 'd' : 'D')
    .trim();
}

export function translateRestaurantTag(label: string, language: DisplayLanguage): string {
  if (language !== 'en') return label;
  const normalized = normalizeVietnamese(label).toLowerCase();
  return RESTAURANT_TAGS_EN[normalized] || REASON_LABELS_EN[normalizeVietnamese(label)] || label;
}

export function translateRecommendationReason(reason: string, language: DisplayLanguage): string {
  if (language !== 'en') return reason;

  return reason.split(' · ').map((part) => {
    const normalized = normalizeVietnamese(part);
    if (REASON_LABELS_EN[normalized]) return REASON_LABELS_EN[normalized];
    if (normalized.toLowerCase().startsWith('co mon ')) {
      return `Serves ${translateRestaurantTag(part.slice('Có món '.length), language)}`;
    }
    const favoriteReason = part.match(/^Dựa trên món (.+) bạn đã thích gần đây\.$/);
    if (favoriteReason) {
      return `Based on ${favoriteReason[1]}, which you liked recently.`;
    }
    return part;
  }).join(' · ');
}
