/**
 * Минимальное объявление для скриптов: в production-образе (npm ci --omit=dev) нет @types/pg.
 */
declare module 'pg';
