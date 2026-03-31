/**
 * OptimisedImage — Priority 6 (Phase 5)
 * Spec ref: Phase 5 Timeline — Image optimisation
 *
 * A drop-in replacement for <img> tags that adds:
 * - Native lazy loading (loading="lazy") for below-the-fold images
 * - width/height attributes to prevent layout shift (CLS)
 * - Decode async for non-blocking decode
 * - Error fallback (grey placeholder on load failure)
 * - Optional blurhash/skeleton placeholder while loading
 *
 * Usage:
 *   <OptimisedImage
 *     src="/bottle-labels/shiraz-2021.jpg"
 *     alt="Barossa Valley Shiraz 2021 label"
 *     width={300}
 *     height={400}
 *     priority={false}  // true for above-the-fold hero images
 *   />
 */

import { useState, useRef, useEffect } from 'react';

export default function OptimisedImage({
  src,
  alt,
  width,
  height,
  className = '',
  style = {},
  priority = false,
  fallbackBg = '#1A1A1A',
  ...props
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef(null);

  // Reset state when src changes
  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  if (hasError || !src) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{
          width,
          height,
          backgroundColor: fallbackBg,
          borderRadius: 8,
          ...style,
        }}
        role="img"
        aria-label={alt || 'Image unavailable'}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#666"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        width,
        height,
        backgroundColor: isLoaded ? 'transparent' : fallbackBg,
        borderRadius: style.borderRadius || 0,
        ...style,
      }}
    >
      {/* Skeleton pulse while loading */}
      {!isLoaded && (
        <div
          className="absolute inset-0 cin-skeleton"
          style={{ borderRadius: style.borderRadius || 0 }}
        />
      )}

      <img
        ref={imgRef}
        src={src}
        alt={alt || ''}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
        {...props}
      />
    </div>
  );
}
