'use client';
import React from 'react';
import { TrendingUp, ExternalLink } from 'lucide-react';
import { UserSearchPanel } from './UserSearchPanel';

const TRENDING_TAGS = [
  { tag: '#MiCayCap7', count: '1.245 bài viết' },
  { tag: '#FoodieSaiGon', count: '987 bài viết' },
  { tag: '#HomNayAnGi', count: '756 bài viết' },
  { tag: '#QuanNgonSaiGon', count: '612 bài viết' },
  { tag: '#AnVatDuoi50k', count: '531 bài viết' },
];

export function FeedRightSidebar() {
  return (
    <div className="flex flex-col gap-4 sticky top-24">
      {/* User Search */}
      <UserSearchPanel />

      {/* Trending Hashtags */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-bold text-foreground">Chủ đề hot</h3>
          </div>
          <button className="text-xs text-brand hover:underline flex items-center gap-1">
            Xem tất cả <ExternalLink className="w-3 h-3" />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {TRENDING_TAGS.map((item, i) => (
            <button
              key={i}
              className="flex items-center justify-between w-full px-2 py-2 rounded-lg hover:bg-muted/60 transition-colors group text-left"
            >
              <span className="text-sm font-semibold text-brand group-hover:underline">{item.tag}</span>
              <span className="text-xs text-muted-foreground">{item.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-[11px] text-muted-foreground text-center px-2 leading-relaxed">
        Wanderbite · Gợi ý bởi AI · Vị ngon Sài Gòn
      </p>
    </div>
  );
}
