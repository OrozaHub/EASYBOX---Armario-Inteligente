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

  // --- ADMIN / DASHBOARD ---
  getLockerState: async (condominioId: string) => {
    const { data, error } = await supabase
      .from('Slot')
      .select('*')
      .eq('condominioId', condominioId)
      .order('numeroPorta');
    if (error) throw error;
    return data;
  }
};
