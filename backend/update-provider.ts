import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function trocarProvedor() {
  try {
    console.log('🔄 Atualizando acessos Masters...');
    
    // 1. Delete old test admin if exists
    await prisma.user.deleteMany({
      where: { email: 'admin@easybox.com.br' }
    });
    
    // 2. Insert new Provider
    const passwordHash = await bcrypt.hash('vladimirlenin2005', 10);
    const newProvider = await prisma.user.upsert({
      where: { email: 'leonardo.arbs@Gmail.com' },
      update: { passwordHash, role: 'PROVIDER', name: 'Leonardo Arbs' },
      create: { email: 'leonardo.arbs@Gmail.com', passwordHash, role: 'PROVIDER', name: 'Leonardo Arbs' }
    });
    
    console.log('✅ Acesso Provedor atualizado com sucesso:');
    console.log(`E-mail: ${newProvider.email}`);
    
  } catch(e) {
    console.error('❌ Erro:', e);
  } finally {
    await prisma.$disconnect();
  }
}

trocarProvedor();
