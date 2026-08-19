// /uploads/... → абсолютный URL на том же origin, откуда загружена страница
export const fileUrl = (u: string) => new URL(u, window.location.origin).href;