(async () => {
  const baseURL = 'http://localhost:3000/api';
  console.log('🚀 Iniciando Teste Ponta-a-Ponta da API EasyBox V2...\n');

  try {
    // 1. Simular um Entregador chegando no condomínio
    console.log('📦 [ENTREGADOR] Registrando entrega no Apto 101A...');
    let res = await fetch(`${baseURL}/entrega/registrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        condominioId: 'TEST-CONDOMINIO-001',
        apartamento: '101A'
      })
    });
    
    let data = await res.json();
    console.log('✅ Resposta:', data);
    
    if (!data.message) {
      console.log('🚨 Erro crítico, parando teste.');
      return;
    }

    // Como o backend nesta fase de testes printa o link no log e não retorna o hash pra
    // evitar falhas de segurança do entregador, vamos pegar a ultima entrega no BD
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const lastDelivery = await prisma.entrega.findFirst({
        orderBy: { createdAt: 'desc' },
        where: { morador: { apartamento: '101A' } }
    });
    
    if(!lastDelivery) {
        console.error('Lógica de criação do BD falhou');
        return;
    }
    
    const hash = lastDelivery.hashAbertura;
    console.log(`🔑 Pegamos o Hash gerado na base: ${hash}\n`);

    // 2. Simular Morador abrindo FORA DA ZONA (Geofencing Test)
    console.log('🏃‍♂️ [MORADOR LONGE] Tentando abrir o armário do Supermercado (Mais de 30m)...');
    res = await fetch(`${baseURL}/morador/abrir/${hash}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: -23.561714, // Slightly different
        long: -46.656861
      })
    });
    data = await res.json();
    console.log('❌ Resposta (Esperada Falha de Distância):', data, '\n');

    // 3. Simular Morador abrindo NA ZONA CORRETA
    console.log('🏡 [MORADOR NA PORTA] Tentando abrir o armário (Geofencing OK)...');
    res = await fetch(`${baseURL}/morador/abrir/${hash}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: -23.561414, // Exact coords
        long: -46.656461
      })
    });
    data = await res.json();
    console.log('✅ Resposta (Esperado Sucesso - Verifique o log do ESP32!):', data, '\n');

    process.exit(0);
  } catch(e) {
    console.error('Erro nos testes:', e);
  }
})();
