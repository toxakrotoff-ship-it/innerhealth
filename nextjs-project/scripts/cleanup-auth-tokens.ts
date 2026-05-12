import 'dotenv/config';
import { cleanupExpiredAuthAndTwoFactorTokens } from '@/services/maintenance.service';
import { prisma } from '@/lib/prisma';

async function main() {
  console.log('[cleanup-auth-tokens] Starting cleanup...');
  await cleanupExpiredAuthAndTwoFactorTokens();
  console.log('[cleanup-auth-tokens] Cleanup finished.');
}

main()
  .catch((err) => {
    console.error('[cleanup-auth-tokens] Error during cleanup:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

