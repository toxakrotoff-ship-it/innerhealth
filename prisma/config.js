// Простой конфигурационный файл для Prisma 7+
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;