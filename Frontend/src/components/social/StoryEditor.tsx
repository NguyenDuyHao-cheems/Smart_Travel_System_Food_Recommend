'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Type, Send, Loader2, Palette } from 'lucide-react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../LanguageProvider';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface OverlayText {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
}

interface StoryEditorProps {
  file: File;
  onClose: () => void;
  onSuccess: () => void;
}

const COLORS = ['#FFFFFF', '#000000', '#FF5722', '#4CAF50', '#2196F3', '#FFC107'];

export function StoryEditor({ file, onClose, onSuccess }: StoryEditorProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [overlays, setOverlays] = useState<OverlayText[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const positionsRef = useRef<Record<string, {x: number, y: number}>>({});

  useEffect(() => {
    setMounted(true);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleAddText = () => {
    const id = Date.now().toString();
    setOverlays([
      ...overlays,
      { id, text: t('storyEditor.defaultText'), color: activeColor, x: 0, y: 0 }
    ]);
    positionsRef.current[id] = { x: 0, y: 0 };
    setActiveTextId(id);
  };

  const handleColorChange = (color: string) => {
    setActiveColor(color);
    if (activeTextId) {
      setOverlays(overlays.map(o => o.id === activeTextId ? { ...o, color } : o));
    }
  };

  const handleTextChange = (id: string, newText: string) => {
    setOverlays(overlays.map(o => o.id === id ? { ...o, text: newText } : o));
  };

  const handleDragEnd = (id: string, info: any) => {
    const current = positionsRef.current[id] || { x: 0, y: 0 };
    positionsRef.current[id] = { 
      x: current.x + info.offset.x, 
      y: current.y + info.offset.y 
    };
  };

  const handleUpload = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      toast.error(t('storyEditor.loginRequired'));
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload file
      const fileExt = file.name.split('.').pop();
      const fileName = `story_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `stories/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('social_media')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('social_media')
        .getPublicUrl(filePath);

      // 2. Post API with overlays
      const finalOverlays = overlays.map(o => ({
        ...o,
        x: positionsRef.current[o.id]?.x || 0,
        y: positionsRef.current[o.id]?.y || 0
      }));

      const res = await fetch(`${BACKEND_URL}/api/v1/social/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          media_url: publicUrl,
          overlays: finalOverlays 
        }),
      });

      if (!res.ok) throw new Error(t('storyEditor.serverError'));

      toast.success(t('storyEditor.success'));
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t('storyEditor.unknownError'));
      setIsUploading(false);
    }
  };

  if (!mounted) return null;

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95">
      {/* Header Controls */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-50">
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20">
          <X className="w-6 h-6" />
        </button>
        <div className="flex gap-4">
          {/* Color Picker Picker */}
          <div className="flex gap-2 items-center bg-white/10 p-2 rounded-full px-4">
            <Palette className="w-4 h-4 text-white mr-2" />
            {COLORS.map(c => (
              <button 
                key={c}
                onClick={() => handleColorChange(c)}
                className={`w-5 h-5 rounded-full border-2 ${activeColor === c ? 'border-white scale-125' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button 
            onClick={handleAddText}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white hover:bg-white/20 font-semibold"
          >
            <Type className="w-5 h-5" /> {t('storyEditor.addText')}
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div 
        ref={containerRef}
        className="relative w-full max-w-[500px] h-[100dvh] md:h-[90dvh] md:rounded-2xl overflow-hidden bg-zinc-900 flex items-center justify-center"
      >
        <img src={previewUrl} alt="Preview" className="w-full h-full object-contain pointer-events-none" />

        {/* Render Overlays */}
        {overlays.map((overlay) => (
          <motion.div
            key={overlay.id}
            drag
            dragConstraints={containerRef}
            dragElastic={0}
            dragMomentum={false}
            onDragEnd={(e, info) => handleDragEnd(overlay.id, info)}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute cursor-move px-4 py-2"
            style={{ touchAction: 'none' }} // important for mobile dragging
          >
            <input
              type="text"
              autoFocus
              value={overlay.text}
              onFocus={() => setActiveTextId(overlay.id)}
              onChange={(e) => handleTextChange(overlay.id, e.target.value)}
              className="bg-transparent border-none outline-none text-2xl font-bold text-center drop-shadow-md placeholder:text-white/50 min-w-[200px]"
              style={{ color: overlay.color, textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
            />
          </motion.div>
        ))}
      </div>

      {/* Bottom Post Button */}
      <div className="absolute bottom-6 right-6 z-50">
        <button 
          onClick={handleUpload}
          disabled={isUploading}
          className="flex items-center gap-2 px-6 py-3 bg-brand hover:bg-orange-600 rounded-full text-white font-bold text-lg shadow-lg shadow-brand/30 disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
          {isUploading ? t('storyEditor.uploading') : t('storyEditor.submit')}
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
