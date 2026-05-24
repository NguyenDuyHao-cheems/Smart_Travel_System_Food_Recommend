import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
}

interface LinkPreviewProps {
  url: string;
}

export function LinkPreview({ url }: LinkPreviewProps) {
  const [data, setData] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchPreview = async () => {
      setLoading(true);
      setError(false);
      try {
        const cacheKey = `link_preview_v2_${url}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          setData(JSON.parse(cached));
          setLoading(false);
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        const res = await fetch(`${apiUrl}/social/posts/link-preview?url=${encodeURIComponent(url)}`);
        
        if (!res.ok) throw new Error('Failed to fetch link preview');
        const json = await res.json();
        
        if (isMounted) {
          setData(json);
          sessionStorage.setItem(cacheKey, JSON.stringify(json));
        }
      } catch (err) {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPreview();
    return () => { isMounted = false; };
  }, [url]);

  if (loading) {
    return (
      <div className="w-full h-[100px] sm:h-[120px] rounded-xl border border-border bg-card animate-pulse mt-3 flex items-stretch overflow-hidden shadow-sm">
        <div className="w-[100px] sm:w-[150px] bg-muted/40 shrink-0 border-r border-border"></div>
        <div className="flex-1 p-4 flex flex-col justify-center gap-3">
          <div className="h-4 bg-muted/40 rounded w-3/4"></div>
          <div className="h-3 bg-muted/40 rounded w-1/2"></div>
          <div className="h-3 bg-muted/40 rounded w-1/4 mt-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !data || (!data.title && !data.image_url)) {
    return null;
  }

  let hostname = url;
  try {
    hostname = new URL(url).hostname;
  } catch (e) {}

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block mt-3 w-full rounded-xl border border-border bg-card hover:bg-muted/10 active:scale-[0.99] transition-all overflow-hidden group shadow-sm hover:shadow-md"
    >
      <div className="flex flex-col sm:flex-row items-stretch min-h-[130px]">
        {data.image_url && (
          <div className="w-full sm:w-[140px] shrink-0 h-[140px] sm:h-auto border-b sm:border-b-0 sm:border-r border-border overflow-hidden bg-muted/5 relative">
            <img 
              src={data.image_url} 
              alt={data.title || 'Link preview'} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out sm:absolute sm:inset-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="p-3 sm:p-4 flex flex-col justify-center flex-1 min-w-0">
          <h3 className="text-[14px] sm:text-[15px] font-bold text-foreground line-clamp-2 leading-snug group-hover:text-brand transition-colors">
            {data.title || data.site_name || hostname}
          </h3>
          {data.description && (
            <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
              {data.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-auto pt-3 text-[10px] sm:text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
            <ExternalLink className="w-3 h-3" />
            <span className="truncate">{data.site_name || hostname}</span>
          </div>
        </div>
      </div>
    </a>
  );
}
