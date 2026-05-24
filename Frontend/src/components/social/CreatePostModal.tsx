import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ImagePlus, MapPin, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { LinkPreview } from './LinkPreview';
import { useLanguage } from '../LanguageProvider';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string, mediaUrls: string[], resId?: string) => void;
}

export function CreatePostModal({ isOpen, onClose, onSubmit }: CreatePostModalProps) {
  const { t } = useLanguage();
  const [content, setContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('social_media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('social_media')
        .getPublicUrl(filePath);

      setMediaUrls(prev => [...prev, publicUrl]);
      toast.success(t('createPost.uploadSuccess'));
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(`${t('createPost.uploadError')}: ${err.message || t('createPost.unknownError')}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const removeMedia = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && mediaUrls.length === 0) return;
    setIsSubmitting(true);
    await onSubmit(content, mediaUrls, undefined);
    setIsSubmitting(false);
    setContent('');
    setMediaUrls([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('createPost.title')}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <Textarea 
            placeholder={t('createPost.placeholder')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-none border-none focus-visible:ring-0 text-base"
          />
          
          {(mediaUrls.length > 0 || isUploading) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {mediaUrls.map((url, idx) => (
                <div key={idx} className="relative w-24 h-24 rounded-md overflow-hidden border">
                  {url.startsWith('data:video/') || url.match(/\.(mp4|webm)/i) ? (
                    <video src={url} className="object-cover w-full h-full" />
                  ) : (
                    <img src={url} alt="Media" className="object-cover w-full h-full" />
                  )}
                  <button 
                    onClick={() => removeMedia(idx)}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {isUploading && (
                <div className="relative w-24 h-24 rounded-md overflow-hidden border flex items-center justify-center bg-muted">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
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
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex space-x-2 text-muted-foreground">
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
              className="p-2 hover:bg-muted rounded-full transition-colors tooltip disabled:opacity-50 disabled:cursor-not-allowed" 
              title={t('createPost.addMedia')}
            >
              <ImagePlus className="w-5 h-5 text-primary" />
            </button>
            <button className="p-2 hover:bg-muted rounded-full transition-colors tooltip" title={t('createPost.tagRestaurant')}>
              <MapPin className="w-5 h-5 text-rose-500" />
            </button>
          </div>
          
          <Button 
            onClick={handleSubmit} 
            disabled={(!content.trim() && mediaUrls.length === 0) || isSubmitting || isUploading}
            className="rounded-full px-6 font-semibold"
          >
            {isSubmitting ? t('createPost.submitting') : t('createPost.submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
