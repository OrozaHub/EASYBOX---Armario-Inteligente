import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const condominios = await prisma.condominio.findMany({
    include: { armarios: { include: { slots: true } } }
  });
  console.log(JSON.stringify(condominios, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
