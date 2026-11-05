/**
 * Serveur Supabase du projet « nabulo ». La clé publique ne donne accès qu'aux fonctions du jeu (le mot du jour
 * reste sur le serveur). Un fichier .env peut les remplacer (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY),
 * et EXPO_PUBLIC_ENGINE=local force le moteur hors ligne pour développer sans réseau.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://tkneqhacfmnphfqpjjax.supabase.co';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WGOJQVbi07wm_luC2xdOvw_meJe06_1';
export const FORCE_LOCAL = process.env.EXPO_PUBLIC_ENGINE === 'local';
