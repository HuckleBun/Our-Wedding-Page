export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const number = Number(value);
  if (Number.isNaN(number)) return "";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(number);
}

export function safeURL(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return "";
    return u.toString();
  } catch {
    return "";
  }
}

export function normalizeImagePath(image: string): string {
  if (!image) return "";
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  if (image.startsWith("/")) return image;
  if (image.startsWith("images/")) return `/${image}`;
  return image;
}
