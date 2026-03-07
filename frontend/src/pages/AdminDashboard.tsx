import { useState } from 'react';
import { LogOut, Users, Box, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function AdminDashboard() {
  const { logout, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'slots' | 'moradores'>('slots');
  
  // Dummy data for design verification, will hook up to real API in next steps
  const slots = [
    { id: 1, numeroPorta: '01', status: 'LIVRE' },
    { id: 2, numeroPorta: '02', status: 'OCUPADO' },
    { id: 3, numeroPorta: '03', status: 'LIVRE' },
  ];

  const handleForceUnlock = async (numeroPorta: string) => {
    const pwd = prompt(`[PERIGO] Você está forçando a abertura do Slot ${numeroPorta}.\n\nDigite sua Master Password para confirmar:`);
    if (!pwd) return;

    try {
      // Slot ID is hardcoded to "1" in this mockup to match the seeded database slot
      await api.post('/admin/force-unlock', { slotId: 1, masterPassword: pwd }, token);
      alert('✅ Comando de destrancamento enviado por MQTT com sucesso.');
    } catch (err: any) {
      alert(`❌ Erro: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '28px' }}>Painel do <span className="neon-text">Síndico</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gerencie seu condomínio e portas locais</p>
        </div>
        <button onClick={logout} className="btn-primary" style={{ padding: '8px 16px', background: 'transparent' }}>
          <LogOut size={16} /> Sair
        </button>
      </header>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <button 
          className="btn-primary" 
          style={{ background: activeTab === 'slots' ? 'var(--bg-tertiary)' : 'transparent', borderColor: activeTab === 'slots' ? 'var(--accent-neon)' : 'var(--glass-border)' }}
          onClick={() => setActiveTab('slots')}
        >
          <Box size={18} /> Armários Físicos
        </button>
        <button 
          className="btn-primary" 
          style={{ background: activeTab === 'moradores' ? 'var(--bg-tertiary)' : 'transparent', borderColor: activeTab === 'moradores' ? 'var(--accent-neon)' : 'var(--glass-border)' }}
          onClick={() => setActiveTab('moradores')}
        >
           <Users size={18} /> Moradores
        </button>
      </div>

      {activeTab === 'slots' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
          {slots.map(slot => (
            <div key={slot.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '24px' }}>Porta {slot.numeroPorta}</h3>
                <span style={{ 
                  padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                  background: slot.status === 'LIVRE' ? 'rgba(0,255,163,0.1)' : 'rgba(255,165,2,0.1)',
                  color: slot.status === 'LIVRE' ? 'var(--accent-neon)' : 'var(--warning)'
                }}>
                  {slot.status}
                </span>
              </div>
              
              <button 
                onClick={() => handleForceUnlock(slot.numeroPorta)} 
                className="btn-primary" 
                style={{ marginTop: 'auto', border: '1px solid var(--error-glow)', color: '#ffb8b8' }}
              >
                <Settings size={16} /> Abertura Forçada
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'moradores' && (
          <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>
              <Users size={48} style={{ margin: '0 auto 15px', color: 'var(--text-muted)' }} />
              <h3>Cadastros de Moradores</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Esta área gerencia os telefones DDI para integração WhatsApp.</p>
              <button className="btn-neon">Adicionar Morador</button>
          </div>
      )}
    </div>
  );
}
