import { supabaseService } from './supabaseService';

export const api = {
  get: async (endpoint: string, token?: string | null) => {
    console.log(`GET ${endpoint}`);
    if (endpoint.includes('/dashboard')) {
        const id = endpoint.split('/')[2];
        if (endpoint.includes('admin')) return await supabaseService.getAdminDashboard(id);
        if (endpoint.includes('provider')) return await supabaseService.getProviderDashboard();
    }
    throw new Error(`GET ${endpoint} não mapeado na Demo.`);
  },

  post: async (endpoint: string, body: any, token?: string | null, method: string = 'POST') => {
    console.log(`${method} ${endpoint}`, body);
    
    // Roteamento para SupabaseService
    if (endpoint.startsWith('/morador/abrir/')) {
        const hash = endpoint.split('/').pop() || '';
        return await supabaseService.abrirPortaHash(hash, body.lat, body.long);
    }
    
    if (endpoint === '/entrega/detectar-local') return await supabaseService.detectLocal(body.lat, body.long);
    if (endpoint === '/entrega/verificar-ap') return await supabaseService.verifyAP(body.condominioId, body.apartamento);
    if (endpoint === '/entrega/abrir-vago') return await supabaseService.abrirVago(body.condominioId, body.lat, body.long);
    if (endpoint === '/entrega/finalizar') return await supabaseService.finalizarEntrega(body.slotId, body.moradorId);

    // AUTH
    if (endpoint === '/auth/login') {
        const isProvider = body.email.includes('provider');
        let condoId = '';
        
        if (!isProvider) {
            // Buscar o primeiro condomínio para o admin demo não ver página vazia
            const condo = await supabaseService.detectLocal(0, 0);
            condoId = condo?.id || '';
        }

        return { 
            token: 'demo-token', 
            user: { 
                role: isProvider ? 'PROVIDER' : 'ADMIN', 
                name: isProvider ? 'Super Admin' : 'Síndico Demo', 
                mustChangePassword: false, 
                condominioId: condoId 
            } 
        };
    }

    // ADMIN
    if (endpoint === '/admin/force-unlock') return { success: true };
    if (endpoint === '/admin/setup') return { success: true };
    if (endpoint.includes('/slots')) {
        const armarioId = endpoint.split('/')[3];
        return await supabaseService.createSlot(armarioId, body.numeroPorta);
    }
    if (endpoint.includes('/morador')) {
        const parts = endpoint.split('/');
        if (method === 'POST') return await supabaseService.createMorador(parts[2], body.apartamento, body.telefones);
        if (method === 'PUT') return await supabaseService.updateMorador(parts[3], body.apartamento, body.telefones);
        if (method === 'DELETE') return await supabaseService.deleteMorador(parts[3]);
    }

    // PROVIDER
    if (endpoint.includes('/provider/condominio')) {
        const id = endpoint.split('/').pop();
        if (method === 'POST') return await supabaseService.createCondominio(body);
        if (method === 'PUT') return await supabaseService.updateCondominio(id!, body);
        if (method === 'DELETE') return await supabaseService.deleteCondominio(id!);
    }
    if (endpoint.includes('/provider/armario')) {
        const parts = endpoint.split('/');
        if (method === 'POST') return await supabaseService.createArmario(body);
        if (endpoint.includes('/assign')) return await supabaseService.assignArmario(parts[3], body.condominioId);
        if (method === 'DELETE') return await supabaseService.deleteArmario(parts[3]);
    }
    if (endpoint.includes('/provider/admin')) {
        const id = endpoint.split('/').pop();
        if (method === 'POST') return await supabaseService.createAdmin(body);
        if (method === 'DELETE') return await supabaseService.deleteAdmin(id!);
    }

    throw new Error(`${method} ${endpoint} não mapeado na Demo.`);
  },

  put: async (endpoint: string, body: any, token?: string | null) => {
    return api.post(endpoint, body, token, 'PUT');
  },

  delete: async (endpoint: string, token?: string | null) => {
    return api.post(endpoint, {}, token, 'DELETE');
  }
};
