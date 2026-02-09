export const preloadCriticalImages = () => {
  const criticalImages = ["/images/logo.png", "/images/hero-bg.jpg"];

  criticalImages.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
};

export const lazyLoadImage = (
  src: string,
  placeholder?: string
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.src = src;
  });
};

export const createImageObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void
) => {
  if ("IntersectionObserver" in window) {
    return new IntersectionObserver(callback, {
      rootMargin: "50px 0px",
      threshold: 0.01,
    });
  }
  return null;
};

export const optimizeImageSrc = (
  src: string,
  width?: number,
  quality?: number
): string => {
  // Add image optimization parameters if supported by your CDN
  if (width || quality) {
    const params = new URLSearchParams();
    if (width) params.append("w", width.toString());
    if (quality) params.append("q", quality.toString());
    return `${src}?${params.toString()}`;
  }
  return src;
};

export const preloadImage = (src: string): void => {
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = src;
  document.head.appendChild(link);
};
