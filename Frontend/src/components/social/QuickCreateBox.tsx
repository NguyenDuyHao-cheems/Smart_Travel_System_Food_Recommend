'use client';
import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ImagePlus, MapPin, Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { LinkPreview } from './LinkPreview';

interface QuickCreateBoxProps {
  username?: string | null;
  avatarUrl?: string | null;
  onSubmit: (content: string, mediaUrls: string[], resId?: string) => void;
}

export function QuickCreateBox({ username, avatarUrl, onSubmit }: QuickCreateBoxProps) {
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MOODS = [
    { id: 'stress', label: '😭 Stress', suggest: 'Mì cay Sasin, Trà sữa đậm vị' },
    { id: 'study', label: '🧠 Chạy Deadline', suggest: 'Americano, Bánh Croissant' },
    { id: 'chill', label: '🎉 Chill cuối tuần', suggest: 'Ốc đêm, Cocktail nhẹ' },
    { id: 'dating', label: '💖 Hẹn hò', suggest: 'Steak house, Rượu vang' },
  ];

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
    await onSubmit(content.trim(), mediaUrls, undefined);
    setIsSubmitting(false);
    setContent('');
    setMediaUrls([]);
    setSelectedMood(null);
    setIsFocused(false);
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
          {content && content.match(/(https?:\/\/[^\s]+)/) && (
            <div className="mb-2">
              <LinkPreview url={content.match(/(https?:\/\/[^\s]+)/)![0]} />
            </div>
          )}

          {/* AI Mood Selector */}
          {isFocused && (
            <div className="mt-2 mb-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tâm trạng của bạn? (AI sẽ gợi ý món)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {MOODS.map(mood => (
                  <button
                    key={mood.id}
                    onClick={() => {
                      if (selectedMood === mood.id) {
                        setSelectedMood(null);
                        setContent(content.replace(`\n\n✨ AI gợi ý: ${mood.suggest} (Vì đang ${mood.label})`, ''));
                      } else {
                        setSelectedMood(mood.id);
                        const baseContent = content.replace(/\n\n✨ AI gợi ý: .*/, '');
                        setContent(`${baseContent}\n\n✨ AI gợi ý: ${mood.suggest} (Vì đang ${mood.label})`);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      selectedMood === mood.id 
                        ? 'border-brand text-brand bg-brand/10' 
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {mood.label}
                  </button>
                ))}
              </div>
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
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-rose-500 px-3 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors">
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
