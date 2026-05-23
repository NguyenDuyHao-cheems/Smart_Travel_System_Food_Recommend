'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ImagePlus, MapPin, Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { LinkPreview } from './LinkPreview';

interface QuickCreateBoxProps {
  username?: string | null;
  avatarUrl?: string | null;
  onSubmit: (content: string, mediaUrls: string[], resId?: string, mood?: string | null) => void;
}

export function QuickCreateBox({ username, avatarUrl, onSubmit }: QuickCreateBoxProps) {
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showResSelector, setShowResSelector] = useState(false);
  const [isLoadingRes, setIsLoadingRes] = useState(false);
  const [suggestedRestaurants, setSuggestedRestaurants] = useState<any[]>([]);
  const [taggedRes, setTaggedRes] = useState<{id: string, name: string} | null>(null);
  const [searchResQuery, setSearchResQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    if (!showResSelector) return;
    const timer = setTimeout(() => {
      loadRestaurants(searchResQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchResQuery, showResSelector]);

  const displayName = username || 'Bạn';
  const initial = displayName.charAt(0).toUpperCase();
  const avatar = avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Create a unique file name using timestamp and clean filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('social_media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('social_media')
        .getPublicUrl(filePath);

      setMediaUrls(prev => [...prev, publicUrl]);
      toast.success('Tải ảnh lên thành công!');
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(`Lỗi tải ảnh lên: ${err.message || 'Không rõ nguyên nhân'}`);
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && mediaUrls.length === 0) return;
    setIsSubmitting(true);
    await onSubmit(content.trim(), mediaUrls, taggedRes?.id, null);
    setIsSubmitting(false);
    setContent('');
    setMediaUrls([]);
    setTaggedRes(null);
    setShowResSelector(false);
    setIsFocused(false);
  };

  const loadRestaurants = async (query: string = '') => {
    setIsLoadingRes(true);
    try {
      let lat = '';
      let lng = '';
      if (typeof window !== 'undefined') {
        const cachedStr = localStorage.getItem('user_cached_gps');
        if (cachedStr) {
          try {
            const coords = JSON.parse(cachedStr);
            lat = coords.lat;
            lng = coords.lng;
          } catch(e) {}
        }
      }

      let url = `http://localhost:8000/api/v1/restaurants/search?q=${encodeURIComponent(query)}&limit=10`;
      if (lat && lng) {
        url += `&lat=${lat}&lng=${lng}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSuggestedRestaurants(Array.isArray(data) ? data : data.results || []);
      }
    } catch (err) {
      console.error('Error fetching restaurants for tagging', err);
    } finally {
      setIsLoadingRes(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10 shrink-0 border border-border">
          <AvatarImage src={avatar} alt={displayName} />
          <AvatarFallback className="bg-brand/10 text-brand font-semibold text-sm">{initial}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div
            className={`w-full rounded-xl border transition-all duration-200 ${
              isFocused
                ? 'border-brand/40 bg-background shadow-sm'
                : 'border-border bg-muted/40 hover:bg-muted/70 cursor-pointer'
            }`}
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              placeholder={`${displayName} đang nghĩ gì về món ăn hôm nay?`}
              rows={isFocused ? 3 : 1}
              className="w-full bg-transparent px-4 py-3 text-sm resize-none outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Media preview */}
          {(mediaUrls.length > 0 || isUploading) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {mediaUrls.map((url, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                  {url.startsWith('data:video/') || url.match(/\.(mp4|webm)/i) ? (
                    <video src={url} className="object-cover w-full h-full" />
                  ) : (
                    <img src={url} alt="media" className="object-cover w-full h-full" />
                  )}
                  <button
                    onClick={() => setMediaUrls(mediaUrls.filter((_, i) => i !== idx))}
                    className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:bg-black"
                  >✕</button>
                </div>
              ))}
              {isUploading && (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border flex items-center justify-center bg-muted">
                  <Loader2 className="w-5 h-5 text-brand animate-spin" />
                </div>
              )}
            </div>
          )}

          {/* Link preview */}
          {(() => {
            const linkMatchRegex = /(https?:\/\/[^\s]+)|([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/i;
            const match = content.match(linkMatchRegex);
            if (match && match[0]) {
              let url = match[0];
              const lastChar = url[url.length - 1];
              if (['.', ',', '!', '?'].includes(lastChar)) url = url.slice(0, -1);
              if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
              return (
                <div className="mb-2">
                  <LinkPreview url={url} />
                </div>
              );
            }
            return null;
          })()}

          {/* Restaurant Tag Selector */}
          {showResSelector && isFocused && (
            <div className="mt-2 mb-3 bg-muted/30 p-3 rounded-lg border border-border">
              <div className="flex items-center gap-1.5 mb-2">
                <MapPin className="w-3.5 h-3.5 text-brand" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Chọn quán để gắn thẻ</span>
              </div>
              <input 
                type="text" 
                placeholder="Tìm kiếm quán ăn..." 
                className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 mb-2 focus:outline-none focus:ring-1 focus:ring-brand"
                value={searchResQuery}
                onChange={(e) => setSearchResQuery(e.target.value)}
              />
              {isLoadingRes ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-brand" /></div>
              ) : (
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                  {suggestedRestaurants.map(r => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setTaggedRes({ id: r.id, name: r.name });
                        setShowResSelector(false);
                      }}
                      className="flex items-center gap-2 text-left p-2 hover:bg-background rounded-md border border-transparent hover:border-border transition-colors"
                    >
                      {r.image_url && <img src={r.image_url} alt={r.name} className="w-8 h-8 rounded object-cover" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{r.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{r.address}</div>
                      </div>
                    </button>
                  ))}
                  {suggestedRestaurants.length === 0 && !isLoadingRes && (
                    <div className="text-xs text-center text-muted-foreground py-2">Không tìm thấy quán nào gần đây.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tagged Restaurant Display */}
          {taggedRes && (
            <div className="mt-2 mb-3 inline-flex items-center gap-2 px-3 py-1.5 bg-brand/10 text-brand rounded-full text-sm font-medium border border-brand/20">
              <MapPin className="w-4 h-4" />
              Tại: <span className="font-bold truncate max-w-[200px]">{taggedRes.name}</span>
              <button 
                onClick={() => setTaggedRes(null)} 
                className="ml-1 hover:bg-brand/20 rounded-full p-0.5 transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          {/* Actions */}
          {isFocused && (
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <input 
                  type="file" 
                  accept="image/*,video/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand px-3 py-1.5 rounded-lg hover:bg-brand/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ImagePlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Ảnh / Video</span>
                </button>
                <button 
                  onClick={() => {
                    if (!showResSelector) loadRestaurants();
                    setShowResSelector(!showResSelector);
                  }}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${showResSelector ? 'bg-brand/10 text-brand' : 'text-muted-foreground hover:text-brand hover:bg-brand/10'}`}
                >
                  <MapPin className="w-4 h-4" />
                  <span className="hidden sm:inline">Gắn thẻ quán</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setIsFocused(false); setContent(''); setMediaUrls([]); }}
                  className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  Hủy
                </button>
                <Button
                  onClick={handleSubmit}
                  disabled={(!content.trim() && mediaUrls.length === 0) || isSubmitting || isUploading}
                  size="sm"
                  className="rounded-full px-5 text-xs font-semibold gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Đang đăng...' : 'Đăng bài'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
