import { supabase } from '../lib/supabase';

const DEMO_MODE = true; // Permite pular checagem de distância GPS para testes

// Função auxiliar para calcular distância Haversine
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export const supabaseService = {
  // --- ENTREGADOR ---
  detectLocal: async (lat: number, long: number) => {
    const { data: condominios, error } = await supabase.from('Condominio').select('*');
    if (error) throw error;

    const nearby = condominios
      .map(c => ({ 
        ...c, 
        distance: getDistance(lat, long, c.lat, c.long) 
      }))
      .filter(c => c.distance <= 1000) // 1km para detecção na demo
      .sort((a, b) => a.distance - b.distance);

    if (nearby.length === 0) throw new Error('Nenhum armário EasyBox por perto.');
    return nearby[0];
  },

  verifyAP: async (condominioId: string, apartamento: string) => {
    const { data, error } = await supabase
      .from('Morador')
      .select('id')
      .eq('condominioId', condominioId)
      .eq('apartamento', apartamento)
      .single();

    if (error || !data) throw new Error('Apartamento não encontrado.');
    return { moradorId: data.id };
  },

  abrirVago: async (condominioId: string, lat: number, long: number) => {
    // Pegar condomínio para checar distância
    const { data: condo } = await supabase.from('Condominio').select('*').eq('id', condominioId).single();
    if (!condo) throw new Error('Condomínio não encontrado.');

    if (!DEMO_MODE) {
       const dist = getDistance(lat, long, condo.lat, condo.long);
       if (dist > 100) throw new Error(`Muito longe do armário (${Math.round(dist)}m).`);
    }

    // Achar slot livre
    const { data: slot, error } = await supabase
      .from('Slot')
      .select('*')
      .eq('condominioId', condominioId)
      .eq('status', 'LIVRE')
      .limit(1)
      .single();

    if (error || !slot) throw new Error('Sem armários livres.');

    // Marcar como ocupado
    await supabase.from('Slot').update({ status: 'OCUPADO' }).eq('id', slot.id);

    return { slot: slot.numeroPorta, slotId: slot.id };
  },

  finalizarEntrega: async (slotId: string, moradorId: string) => {
    const hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiraEm = new Date();
    expiraEm.setHours(expiraEm.getHours() + 24);

    const { error } = await supabase.from('Entrega').insert({
      slotId,
      moradorId,
      hashAbertura: hash,
      expiraEm: expiraEm.toISOString(),
      status: 'PENDENTE'
    });

    if (error) throw error;

    // Simulação de telefones mascareados
    return { 
        success: true, 
        maskedPhones: ['****-9988'],
        hash // Retornamos o hash na demo para facilitar teste
    };
  },

  // --- MORADOR ---
  abrirPortaHash: async (hash: string, lat: number, long: number) => {
    const { data: entrega, error } = await supabase
      .from('Entrega')
      .select('*, slot:Slot(*, condominio:Condominio(*)), morador:Morador(*)')
      .eq('hashAbertura', hash)
      .single();

    if (error || !entrega) throw new Error('Link inválido.');
    if (entrega.status !== 'PENDENTE') throw new Error('Entrega já finalizada.');

    if (!DEMO_MODE) {
      const dist = getDistance(lat, long, entrega.slot.condominio.lat, entrega.slot.condominio.long);
      if (dist > 50) throw new Error('Muito longe do armário.');
    }

    // Finalizar entrega e liberar slot
    await supabase.from('Entrega').update({ status: 'FINALIZADA', dataAbertura: new Date().toISOString() }).eq('id', entrega.id);
    await supabase.from('Slot').update({ status: 'LIVRE' }).eq('id', entrega.slotId);

    // Criar Log
    await supabase.from('LogAbertura').insert({
        slotId: entrega.slotId,
        metodo: 'HASH_ENTREGA',
        quemAbriu: `Morador (Apto ${entrega.morador.apartamento})`
    });

    return { slot: entrega.slot.numeroPorta };
  },

  // --- ADMIN DASHBOARD ---
  getAdminDashboard: async (condoId: string) => {
    // 1. Buscar Armários e Slots
    const { data: armarios, error: err1 } = await supabase
      .from('Armario')
      .select('*, slots:Slot(*)')
      .eq('condominioId', condoId);
    if (err1) throw err1;

    // 2. Buscar Moradores e seus Telefones
    const { data: moradores, error: err2 } = await supabase
      .from('Morador')
      .select('*, telefones:Telefone(*)')
      .eq('condominioId', condoId);
    if (err2) throw err2;

    return { armarios: armarios || [], moradores: moradores || [] };
  },

  createMorador: async (condoId: string, apartamento: string, telefones: string[]) => {
    // 1. Criar Morador
    const { data: morador, error: err1 } = await supabase
      .from('Morador')
      .insert({ id: crypto.randomUUID(), condominioId: condoId, apartamento })
      .select()
      .single();
    if (err1) throw err1;

    // 2. Criar Telefones
    const phoneInserts = telefones.map(num => ({ numero: num, moradorId: morador.id }));
    const { error: err2 } = await supabase.from('Telefone').insert(phoneInserts);
    if (err2) throw err2;

    return morador;
  },

  updateMorador: async (id: string, apartamento: string, telefones: string[]) => {
    // 1. Atualizar Morador
    await supabase.from('Morador').update({ apartamento }).eq('id', id);
    // 2. Resetar e recriar telefones (mais simples para demo)
    await supabase.from('Telefone').delete().eq('moradorId', id);
    const phoneInserts = telefones.map(num => ({ numero: num, moradorId: id }));
    await supabase.from('Telefone').insert(phoneInserts);
    return { success: true };
  },

  deleteMorador: async (id: string) => {
    const { error } = await supabase.from('Morador').delete().eq('id', id);
    if (error) throw error;
  },

  createSlot: async (armarioId: string, numeroPorta: string) => {
    const { error } = await supabase.from('Slot').insert({
        id: crypto.randomUUID(),
        armarioId,
        numeroPorta,
        status: 'LIVRE',
        mqttTopic: `locker/slot/${numeroPorta}` // Valor padrão
    });
    if (error) throw error;
  },

  // --- PROVIDER DASHBOARD ---
  getProviderDashboard: async () => {
    // 1. Condomínios (com contagem de armários e moradores - contagem simplificada para demo)
    const { data: condominios, error: errCondo } = await supabase.from('Condominio').select('*, armarios:Armario(id), moradores:Morador(id)');
    if (errCondo) throw errCondo;

    // 2. Todos os Armários (com nome do condomínio)
    const { data: armarios, error: errArmario } = await supabase.from('Armario').select('*, condominio:Condominio(nome), slots:Slot(id)');
    if (errArmario) throw errArmario;

    // 3. Todos os Usuários Admins
    const { data: admins, error: errAdmin } = await supabase.from('User').select('*, condominio:Condominio(nome, id)').eq('role', 'ADMIN');
    if (errAdmin) throw errAdmin;

    // Mapeando contagens para o formato esperado pelo frontend
    const condoCounts = condominios.map(c => ({
        ...c,
        _count: { armarios: c.armarios?.length || 0, moradores: c.moradores?.length || 0 }
    }));

    return { 
        condominios: condoCounts, 
        armarios: armarios?.map(a => ({ ...a, _count: { slots: a.slots?.length || 0 } })) || [], 
        admins: admins || [] 
    };
  },

  createCondominio: async (form: any) => {
    const { error } = await supabase.from('Condominio').insert({
        id: crypto.randomUUID(),
        nome: form.nome,
        lat: form.lat,
        long: form.long,
        masterPasswordHash: form.masterPassword // Simplificado na demo
    });
    if (error) throw error;
  },

  updateCondominio: async (id: string, form: any) => {
    const { error } = await supabase.from('Condominio').update({
        nome: form.nome,
        lat: form.lat,
        long: form.long
    }).eq('id', id);
    if (error) throw error;
  },

  deleteCondominio: async (id: string) => {
    await supabase.from('Condominio').delete().eq('id', id);
  },

  createArmario: async (form: any) => {
    const { error } = await supabase.from('Armario').insert({
        id: crypto.randomUUID(),
        nome: form.nome,
        serialHash: form.serialHash
    });
    if (error) throw error;
  },

  assignArmario: async (id: string, condoId: string | null) => {
    await supabase.from('Armario').update({ condominioId: condoId }).eq('id', id);
  },

  deleteArmario: async (id: string) => {
    await supabase.from('Armario').delete().eq('id', id);
  },

  createAdmin: async (form: any) => {
     const { error } = await supabase.from('User').insert({
         id: crypto.randomUUID(),
         name: form.name,
         email: form.email,
         passwordHash: form.password, // Simplificado na demo
         role: 'ADMIN',
         condominioId: form.condominioId,
         mustChangePassword: true
     });
     if (error) throw error;
  },

  deleteAdmin: async (id: string) => {
     await supabase.from('User').delete().eq('id', id);
  },

  getLockerState: async (condominioId: string) => {
    const { data, error } = await supabase
      .from('Slot')
      .select('*, armario:Armario!inner(condominioId)')
      .eq('armario.condominioId', condominioId)
      .order('numeroPorta');
    if (error) throw error;
    return data;
  }
};

