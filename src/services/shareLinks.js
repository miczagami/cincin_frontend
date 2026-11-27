/**
 * The link CinCin's share actions (Palate Wrapped, season results) send people to: the app
 * on playcincin.com. A build can point it elsewhere with VITE_SHARE_URL.
 */
export const SHARE_URL = import.meta.env.VITE_SHARE_URL || 'https://app.playcincin.com';
