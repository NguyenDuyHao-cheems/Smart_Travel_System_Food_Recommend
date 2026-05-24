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

const LINK_PREVIEW_CACHE_PREFIX = 'link_preview_v4';

function normalizePreviewUrl(rawUrl: string) {
  let normalized = rawUrl.trim();
  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(normalized);
      if (decoded === normalized) break;
      normalized = decoded;
    } catch {
      break;
    }
  }
  return normalized;
}

function getYouTubeVideoId(rawUrl: string) {
  try {
    const parsed = new URL(normalizePreviewUrl(rawUrl));
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0] || null;
    }

    if (['youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v');
      }
      const match = parsed.pathname.match(/^\/(?:shorts|embed)\/([^/?#]+)/);
      return match?.[1] || null;
    }
  } catch {
    return null;
  }

  return null;
}

function getGitHubRepoPath(rawUrl: string) {
  try {
    const parsed = new URL(normalizePreviewUrl(rawUrl));
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host !== 'github.com') return null;

    const [owner, repo] = parsed.pathname.split('/').filter(Boolean);
    if (!owner || !repo) return null;
    return `${owner}/${repo}`;
  } catch {
    return null;
  }
}

function enrichKnownSitePreview(rawUrl: string, preview: LinkPreviewData): LinkPreviewData {
  const normalizedUrl = normalizePreviewUrl(rawUrl);
  const videoId = getYouTubeVideoId(rawUrl);
  if (videoId) {
    const weakTitle = !preview.title || preview.title === 'www.youtube.com' || preview.title === 'youtube.com';
    return {
      ...preview,
      url: normalizedUrl,
      title: weakTitle ? 'YouTube video' : preview.title,
      image_url: preview.image_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      site_name: preview.site_name || 'YouTube',
    };
  }

  const repoPath = getGitHubRepoPath(rawUrl);
  if (repoPath) {
    const weakTitle = !preview.title || preview.title === 'github.com' || preview.title === 'www.github.com';
    return {
      ...preview,
      url: normalizedUrl,
      title: weakTitle ? repoPath : preview.title,
      image_url: preview.image_url || `https://opengraph.githubassets.com/wanderbite/${repoPath}`,
      site_name: preview.site_name || 'GitHub',
    };
  }

  return { ...preview, url: normalizedUrl };
}

function createKnownSiteFallbackPreview(rawUrl: string): LinkPreviewData | null {
  const normalizedUrl = normalizePreviewUrl(rawUrl);
  const videoId = getYouTubeVideoId(rawUrl);
  if (videoId) {
    return {
      url: normalizedUrl,
      title: 'YouTube video',
      description: null,
      image_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      site_name: 'YouTube',
    };
  }

  const repoPath = getGitHubRepoPath(rawUrl);
  if (repoPath) {
    return {
      url: normalizedUrl,
      title: repoPath,
      description: null,
      image_url: `https://opengraph.githubassets.com/wanderbite/${repoPath}`,
      site_name: 'GitHub',
    };
  }

  return null;
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
        const normalizedUrl = normalizePreviewUrl(url);
        const cacheKey = `${LINK_PREVIEW_CACHE_PREFIX}_${normalizedUrl}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          setData(enrichKnownSitePreview(url, JSON.parse(cached)));
          setLoading(false);
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        const res = await fetch(`${apiUrl}/social/posts/link-preview?url=${encodeURIComponent(url)}`);
        
        if (!res.ok) throw new Error('Failed to fetch link preview');
        const json = await res.json();
        const preview = enrichKnownSitePreview(url, json);
        
        if (isMounted) {
          setData(preview);
          sessionStorage.setItem(cacheKey, JSON.stringify(preview));
        }
      } catch (err) {
        if (isMounted) {
          const fallback = createKnownSiteFallbackPreview(url);
          if (fallback) {
            setData(fallback);
            setError(false);
          } else {
            setError(true);
          }
        }
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

  let hostname = url;
  try {
    hostname = new URL(normalizePreviewUrl(url)).hostname;
  } catch (e) {}

  if (error || !data || (!data.title && !data.image_url)) {
    // Render a basic fallback card instead of returning null
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block mt-3 w-full rounded-xl border border-border bg-card hover:bg-muted/10 active:scale-[0.99] transition-all overflow-hidden group shadow-sm hover:shadow-md"
      >
        <div className="p-3 sm:p-4 flex flex-col justify-center flex-1 min-w-0">
          <h3 className="text-[14px] sm:text-[15px] font-bold text-foreground line-clamp-2 leading-snug group-hover:text-brand transition-colors">
            {hostname}
          </h3>
          <div className="flex items-center gap-1.5 mt-auto pt-3 text-[10px] sm:text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
            <ExternalLink className="w-3 h-3" />
            <span className="truncate">{hostname}</span>
          </div>
        </div>
      </a>
    );
  }


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
