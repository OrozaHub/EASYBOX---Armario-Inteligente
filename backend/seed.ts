import prisma from './src/prisma';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('🌱 Inserindo dados de teste no Supabase...');

  // 1. Create a Provider and Admin
  const adminPass = await bcrypt.hash('admin123', 10);
  
  // 2. Create the Condominio
  const condominio = await prisma.condominio.create({
    data: {
      id: 'TEST-CONDOMINIO-001',
      nome: 'Residencial EasyBox Teste',
      // Coordinates of a known place (e.g., Av Paulista, SP)
      lat: -23.561414,
      long: -46.656461,
      masterPasswordHash: adminPass
    }
  });
  console.log(`✅ Condomínio criado: ${condominio.nome}`);

  // 3. Create Slots
  await prisma.slot.createMany({
    data: [
      { condominioId: condominio.id, numeroPorta: '01', mqttTopic: `easybox/${condominio.id}/control` },
      { condominioId: condominio.id, numeroPorta: '02', mqttTopic: `easybox/${condominio.id}/control` },
      { condominioId: condominio.id, numeroPorta: '03', mqttTopic: `easybox/${condominio.id}/control` },
    ]
  });
  console.log(`✅ 3 Armários (Slots) criados!`);

  // 4. Create a Resident
  const morador = await prisma.morador.create({
    data: {
      condominioId: condominio.id,
      apartamento: '101A',
      telefone: '5511999999999'
    }
  });

  console.log(`✅ Morador criado: Apto ${morador.apartamento}`);
  console.log('\n================================');
  console.log('TUDO PRONTO PARA TESTAR!');
  console.log('Condominio ID:', condominio.id);
  console.log('Morador Apto:', morador.apartamento);
  console.log('Coordenadas (GPS) do Prédio: ', condominio.lat, condominio.long);
  console.log('================================\n');
}

seed().catch(e => {
  console.error(e);
}).finally(async () => {
  await prisma.$disconnect();
});
