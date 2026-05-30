'use client';

import React from 'react';
import { Sparkles, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '../LanguageProvider';
import { translateRecommendationReason } from '../../lib/recommendationText';

interface AIPersonalizedBlockProps {
  restaurant: {
    id: string;
    name: string;
    img?: string;
    match?: number;
    distance_km?: number;
    reason?: string;
  } | null;
}

export function AIPersonalizedBlock({ restaurant }: AIPersonalizedBlockProps) {
  const { t, language } = useLanguage();
  if (!restaurant) return null;

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-brand/10 dark:to-orange-950/20 border border-brand/20 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
      {/* Decorative background glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand/10 blur-2xl rounded-full pointer-events-none group-hover:bg-brand/20 transition-all"></div>
      
      <div className="flex items-center gap-2 mb-3 relative z-10">
        <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-brand animate-pulse" />
        </div>
        <h3 className="font-bold text-foreground text-sm tracking-tight">{t('aiPersonalized.title')}</h3>
      </div>
      
      <div className="space-y-3 relative z-10">
        <div className="bg-background/80 dark:bg-background/50 backdrop-blur-sm rounded-xl p-3 border border-border/50">
          <div className="flex justify-between items-start mb-1">
            <h4 className="font-bold text-[15px] text-foreground leading-tight truncate mr-2">{restaurant.name}</h4>
          </div>
          
          <div className="flex items-center text-xs text-muted-foreground gap-1 mt-1 mb-2">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{restaurant.distance_km?.toFixed(1) || 0}km</span>
          </div>
          
          {restaurant.reason && (
             <p className="text-xs text-muted-foreground line-clamp-2 mt-2 italic">"{translateRecommendationReason(restaurant.reason, language)}"</p>
          )}
        </div>
        
        <Link href={`/restaurant/${restaurant.id}`} className="block w-full py-2 bg-brand text-white text-center rounded-lg text-xs font-bold shadow-sm shadow-brand/30 hover:bg-brand/90 hover:scale-[1.02] transition-all">
          {t('aiPersonalized.viewDetails')}
        </Link>
      </div>
    </div>
  );
}
