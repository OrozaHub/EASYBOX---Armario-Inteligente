import { supabaseService } from './supabaseService';

export const api = {
  get: async (endpoint: string, token?: string | null) => {
    // Implementar se necessário para Admin dashboard
    console.log(`GET ${endpoint}`);
    if (endpoint.startsWith('/admin/slots/')) {
        const condoId = endpoint.split('/').pop() || '';
        return await supabaseService.getLockerState(condoId);
    }
    throw new Error('Endpoint não mapeado na Demo.');
  },

  post: async (endpoint: string, body: any, token?: string | null) => {
    console.log(`POST ${endpoint}`, body);
    
    // Roteamento para SupabaseService
    if (endpoint.startsWith('/morador/abrir/')) {
        const hash = endpoint.split('/').pop() || '';
        return await supabaseService.abrirPortaHash(hash, body.lat, body.long);
    }
    
    if (endpoint === '/entrega/detectar-local') {
        return await supabaseService.detectLocal(body.lat, body.long);
    }
    
    if (endpoint === '/entrega/verificar-ap') {
        return await supabaseService.verifyAP(body.condominioId, body.apartamento);
    }
    
    if (endpoint === '/entrega/abrir-vago') {
        return await supabaseService.abrirVago(body.condominioId, body.lat, body.long);
    }
    
    if (endpoint === '/entrega/finalizar') {
        return await supabaseService.finalizarEntrega(body.slotId, body.moradorId);
    }

    if (endpoint === '/auth/login') {
        // Mock Login para Demo (Qualquer um entra como Admin por enquanto)
        return { token: 'demo-token', user: { role: 'ADMIN', name: 'Demonstração' } };
    }

    throw new Error(`Endpoint ${endpoint} não mapeado na Demo.`);
  },

  put: async (endpoint: string, body: any, token?: string | null) => {
    throw new Error('PUT não mapeado na Demo.');
  },

  delete: async (endpoint: string, token?: string | null) => {
    throw new Error('DELETE não mapeado na Demo.');
  }
};

