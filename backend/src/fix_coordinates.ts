import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Sets a testable coordinate (São Paulo) for existing condos
  const lat = -23.5505;
  const long = -46.6333;

  console.log(`🚀 Updating condominios with test coordinates: ${lat}, ${long}`);

  const result = await prisma.condominio.updateMany({
    data: { lat, long }
  });

  console.log(`✅ Updated ${result.count} condominios.`);
}

main()
  .catch(e => {
    console.error('❌ Error updating coordinates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
