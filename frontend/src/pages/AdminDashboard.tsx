import { useEffect, useState } from 'react';
import { LogOut, Users, Box, Settings, Save, ShieldCheck, Trash2, Edit, Plus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface Slot {
  id: string;
  numeroPorta: string;
  status: 'LIVRE' | 'OCUPADO' | 'MANUTENCAO';
  armario?: { serialHash: string };
}

interface Armario {
  id: string;
  nome: string;
  serialHash: string;
  slots: Slot[];
}

interface Telefone {
  id: string;
  numero: string;
}

interface Morador {
  id: string;
  apartamento: string;
  telefones: Telefone[];
}

export default function AdminDashboard() {
  const { logout, token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'slots' | 'moradores'>('slots');
  const [armarios, setArmarios] = useState<Armario[]>([]);
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [loading, setLoading] = useState(true);

  // Setup Modal State
  const [showSetup, setShowSetup] = useState(user?.mustChangePassword || false);
  const [setupForm, setSetupForm] = useState({ password: '', masterPassword: '' });

  // Resident Modal State
  const [showMoradorModal, setShowMoradorModal] = useState(false);
  const [editingMorador, setEditingMorador] = useState<Morador | null>(null);
  const [moradorForm, setMoradorForm] = useState({ apartamento: '', telefones: [''] });

  // Slot Modal State
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotForm, setSlotForm] = useState({ numeroPorta: '', armarioId: '' });

  useEffect(() => {
    if (user?.condominioId) {
      fetchData();
    }
  }, [user]);

  async function fetchData() {
    try {
      const data = await api.get(`/admin/${user?.condominioId}/dashboard`, token);
      setArmarios(data.armarios || []);
      setMoradores(data.moradores || []);
    } catch (error) {
      console.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  const handleForceUnlock = async (numeroPorta: string, slotId: string) => {
    const pwd = prompt(`[PERIGO] Você está forçando a abertura do Slot ${numeroPorta}.\n\nDigite a Master Password do Condomínio para confirmar:`);
    if (!pwd) return;

    try {
      await api.post('/admin/force-unlock', { slotId, masterPassword: pwd }, token);
      alert('✅ Comando de destrancamento enviado por MQTT com sucesso.');
      fetchData();
    } catch (err: any) {
      alert(`❌ Erro: ${err.message}`);
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/admin/setup', setupForm, token);
      setShowSetup(false);
      alert('Configuração concluída! Guarde bem sua Master Key.');
    } catch (err: any) {
      alert('Erro ao realizar configuração inicial');
    }
  };

  const handleSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/admin/armario/${slotForm.armarioId}/slots`, {
        numeroPorta: slotForm.numeroPorta
      }, token);
      setShowSlotModal(false);
      setSlotForm({ numeroPorta: '', armarioId: '' });
      fetchData();
    } catch (err: any) {
      alert('Erro ao criar slot');
    }
  };

  const handleMoradorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filteredPhones = moradorForm.telefones.filter(t => t.trim() !== '');
    
    try {
      if (editingMorador) {
        await api.put(`/admin/morador/${editingMorador.id}`, {
          apartamento: moradorForm.apartamento,
          telefones: filteredPhones
        }, token);
      } else {
        await api.post(`/admin/${user?.condominioId}/morador`, {
          apartamento: moradorForm.apartamento,
          telefones: filteredPhones
        }, token);
      }
      setShowMoradorModal(false);
      fetchData();
    } catch (err: any) {
      alert('Erro ao salvar morador');
    }
  };

  const deleteMorador = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este morador?')) return;
    try {
      await api.delete(`/admin/morador/${id}`, token);
      fetchData();
    } catch (err) {
      alert('Erro ao excluir morador');
    }
  };

  if (loading && !showSetup) return <div className="flex-center" style={{height: '100vh'}}>Carregando...</div>;

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-neon" onClick={() => setShowSlotModal(true)} style={{ padding: '8px 16px', fontSize: '13px' }}>
              <Plus size={16} /> Novo Slot
            </button>
          </div>

          {armarios.map(armario => (
            <div key={armario.id}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px', paddingBottom: '10px' }}>
                <h2 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Box size={20} style={{ color: 'var(--accent-neon)' }} />
                  {armario.nome} 
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 'normal' }}>({armario.serialHash})</span>
                </h2>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                {armario.slots.map(slot => (
                  <div key={slot.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '24px' }}>Porta {slot.numeroPorta}</h3>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
                        background: slot.status === 'LIVRE' ? 'rgba(0,255,163,0.1)' : 'rgba(255,165,2,0.1)',
                        color: slot.status === 'LIVRE' ? 'var(--accent-neon)' : 'var(--warning)'
                      }}>
                        {slot.status}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleForceUnlock(slot.numeroPorta, slot.id)} 
                      className="btn-primary" 
                      style={{ marginTop: 'auto', border: '1px solid var(--error-glow)', color: '#ffb8b8', fontSize: '12px' }}
                    >
                      <Settings size={14} /> Abertura Forçada
                    </button>
                  </div>
                ))}
                {armario.slots.length === 0 && <p style={{color: 'var(--text-muted)', fontSize: '13px'}}>Este armário não possui slots configurados.</p>}
              </div>
            </div>
          ))}
          {armarios.length === 0 && <p style={{color: 'var(--text-muted)', textAlign: 'center', padding: '40px'}}>Nenhum armário vinculado a este condomínio.</p>}
        </div>
      )}

      {activeTab === 'moradores' && (
        <div className="glass-panel" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h3 style={{ fontSize: '22px' }}>Gestão de Apartamentos</h3>
            <button className="btn-neon" onClick={() => { setEditingMorador(null); setMoradorForm({apartamento: '', telefones: ['']}); setShowMoradorModal(true); }} style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} /> Novo Morador
            </button>
          </div>
          
          <div style={{ display: 'grid', gap: '15px' }}>
            {moradores.map(m => (
              <div key={m.id} className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-neon)' }}>Apto: {m.apartamento}</p>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {m.telefones?.map(t => (
                      <span key={t.id} style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {t.numero}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-primary" style={{ padding: '8px', background: 'transparent' }} onClick={() => {
                    setEditingMorador(m);
                    setMoradorForm({ apartamento: m.apartamento, telefones: m.telefones.map(t => t.numero) });
                    setShowMoradorModal(true);
                  }}><Edit size={16} /></button>
                  <button className="btn-primary" style={{ padding: '8px', background: 'transparent', color: 'var(--error)' }} onClick={() => deleteMorador(m.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {moradores.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Nenhum morador cadastrado neste condomínio.</p>}
          </div>
        </div>
      )}

      {/* MODAL SLOT (NEW) */}
      {showSlotModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '30px' }}>
            <h3 style={{ marginBottom: '25px' }}>Adicionar Porta/Slot</h3>
            <form onSubmit={handleSlotSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label className="label-dim">Número da Porta</label>
                <input className="input-dark" style={{ background: 'var(--bg-primary)' }} value={slotForm.numeroPorta} onChange={e => setSlotForm({...slotForm, numeroPorta: e.target.value})} placeholder="Ex: 01" required />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="label-dim">No Armário:</label>
                <select className="input-dark" style={{ background: 'var(--bg-primary)' }} value={slotForm.armarioId} onChange={e => setSlotForm({...slotForm, armarioId: e.target.value})} required>
                  <option value="" style={{ background: 'var(--bg-primary)' }}>Selecione...</option>
                  {armarios.map(a => <option key={a.id} value={a.id} style={{ background: 'var(--bg-primary)' }}>{a.nome} ({a.serialHash})</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                <button type="button" onClick={() => setShowSlotModal(false)} className="btn-primary" style={{ flex: 1, background: 'transparent' }}>Cancelar</button>
                <button type="submit" className="btn-neon" style={{ flex: 1 }}>Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MORADOR */}
      {showMoradorModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '30px', position: 'relative' }}>
            <button onClick={() => setShowMoradorModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
            <h3 style={{ marginBottom: '25px' }}>{editingMorador ? 'Editar' : 'Novo'} Morador</h3>
            
            <form onSubmit={handleMoradorSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label className="label-dim">Apartamento / Bloco</label>
                <input className="input-dark" value={moradorForm.apartamento} onChange={e => setMoradorForm({...moradorForm, apartamento: e.target.value})} placeholder="Ex: 101A" required />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label className="label-dim">Telefones (WhatsApp)</label>
                {moradorForm.telefones.map((tel, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <input className="input-dark" value={tel} onChange={e => {
                      const newTels = [...moradorForm.telefones];
                      newTels[idx] = e.target.value;
                      setMoradorForm({...moradorForm, telefones: newTels});
                    }} placeholder="Ex: 551199999999" required />
                    {idx > 0 && <button type="button" onClick={() => {
                      const newTels = moradorForm.telefones.filter((_, i) => i !== idx);
                      setMoradorForm({...moradorForm, telefones: newTels});
                    }} style={{ color: 'var(--error)', background: 'none', border: 'none' }}><Trash2 size={16} /></button>}
                  </div>
                ))}
                <button type="button" onClick={() => setMoradorForm({...moradorForm, telefones: [...moradorForm.telefones, '']})} style={{ background: 'none', border: 'none', color: 'var(--accent-neon)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Plus size={14} /> Adicionar Telefone
                </button>
              </div>
              
              <button type="submit" className="btn-neon" style={{ width: '100%', marginTop: '20px', padding: '15px' }}>
                <Save size={18} /> {editingMorador ? 'ATUALIZAR' : 'CADASTRAR'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SETUP MODAL */}
      {showSetup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div className="glass-panel" style={{ width: '450px', padding: '40px', border: '1px solid var(--accent-neon)' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <ShieldCheck size={48} style={{ color: 'var(--accent-neon)', marginBottom: '15px' }} />
              <h2 style={{ fontSize: '24px' }}>Configuração <span className="neon-text">Mestre</span></h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Defina sua senha e sua Master Key agora.</p>
            </div>
            <form onSubmit={handleSetupSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label className="label-dim">Sua Nova Senha</label>
                <input type="password" className="input-dark" value={setupForm.password} onChange={e => setSetupForm({...setupForm, password: e.target.value})} required />
              </div>
              <div style={{ marginBottom: '30px' }}>
                <label className="label-dim">Master Key do Condomínio</label>
                <input type="password" className="input-dark" value={setupForm.masterPassword} onChange={e => setSetupForm({...setupForm, masterPassword: e.target.value})} required />
              </div>
              <button type="submit" className="btn-neon" style={{ width: '100%' }}>
                <Save size={18} /> SALVAR E CONTINUAR
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
