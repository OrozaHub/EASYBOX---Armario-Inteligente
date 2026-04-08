import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { LogOut, Building, ShieldAlert, Plus, Edit, Trash2, X, Save, Locate } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
});

interface Condominio {
  id: string;
  nome: string;
  lat: number;
  long: number;
  _count?: { armarios: number, moradores: number };
}

interface Armario {
  id: string;
  serialHash: string;
  nome: string;
  condominioId: string | null;
  condominio?: { nome: string };
  _count?: { slots: number };
}

interface Admin {
  id: string;
  name: string;
  email: string;
  condominio?: { nome: string, id: string };
}

// Map Click Helper
function MapEvents({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Recenter Map Helper
function RecenterMap({ lat, lng }: { lat: number, lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function ProviderDashboard() {
  const { logout, token } = useAuth();
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [armarios, setArmarios] = useState<Armario[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [showCondoModal, setShowCondoModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showArmarioModal, setShowArmarioModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<Armario | null>(null);

  const [editingCondo, setEditingCondo] = useState<Condominio | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);

  const [condoForm, setCondoForm] = useState({ nome: '', lat: -23.5505, long: -46.6333, masterPassword: '' });
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', condominioId: '' });
  const [armarioForm, setArmarioForm] = useState({ nome: '', serialHash: '' });
  const [assignCondoId, setAssignCondoId] = useState('');

  const getUserLocation = () => {
    if (!navigator.geolocation) return alert('GPS não suportado');
    navigator.geolocation.getCurrentPosition((pos) => {
      setCondoForm(prev => ({ ...prev, lat: pos.coords.latitude, long: pos.coords.longitude }));
    }, () => alert('Erro ao obter localização'));
  };

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const data = await api.get('/provider/dashboard', token);
      setCondominios(data.condominios);
      setArmarios(data.armarios);
      setAdmins(data.admins);
    } catch (error) {
      alert('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCondo(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingCondo) {
        await api.put(`/provider/condominio/${editingCondo.id}`, condoForm, token);
      } else {
        await api.post('/provider/condominio', condoForm, token);
      }
      setShowCondoModal(false);
      setEditingCondo(null);
      setCondoForm({ nome: '', lat: -23.5505, long: -46.6333, masterPassword: '' });
      fetchData();
    } catch (error) {
      alert('Erro ao salvar condomínio');
    }
  }

  async function handleDeleteCondo(id: string) {
    if (!confirm('Deseja realmente excluir este condomínio? Isso excluirá todos os dados vinculados!')) return;
    try {
      await api.delete(`/provider/condominio/${id}`, token);
      fetchData();
    } catch (error) {
      alert('Erro ao excluir condomínio');
    }
  }

  async function handleSaveArmario(e: React.FormEvent) {
    e.preventDefault();
    try {
      const cleanForm = { ...armarioForm, serialHash: armarioForm.serialHash.trim().toUpperCase() };
      await api.post('/provider/armario', cleanForm, token);
      setShowArmarioModal(false);
      setArmarioForm({ nome: '', serialHash: '' });
      fetchData();
    } catch (error) {
      alert('Erro ao criar armário. Verifique se o Serial Hash já existe.');
    }
  }

  async function handleAssignArmario(e: React.FormEvent) {
    e.preventDefault();
    if (!showAssignModal) return;
    try {
      await api.put(`/provider/armario/${showAssignModal.id}/assign`, { condominioId: assignCondoId }, token);
      setShowAssignModal(null);
      setAssignCondoId('');
      fetchData();
    } catch (error) {
      alert('Erro ao vincular armário');
    }
  }

  async function handleDeleteArmario(id: string) {
    if (!confirm('Deseja excluir este armário? Todas as configurações de slots serão perdidas.')) return;
    try {
      await api.delete(`/provider/armario/${id}`, token);
      fetchData();
    } catch (error) {
      alert('Erro ao excluir armário');
    }
  }

  async function handleSaveAdmin(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingAdmin) {
        await api.put(`/provider/admin/${editingAdmin.id}`, adminForm, token);
      } else {
        await api.post('/provider/admin', adminForm, token);
      }
      setShowAdminModal(false);
      setEditingAdmin(null);
      setAdminForm({ name: '', email: '', password: '', condominioId: '' });
      fetchData();
    } catch (error) {
      alert('Erro ao salvar administrador');
    }
  }

  async function handleDeleteAdmin(id: string) {
    if (!confirm('Deseja remover o acesso deste administrador?')) return;
    try {
      await api.delete(`/provider/admin/${id}`, token);
      fetchData();
    } catch (error) {
      alert('Erro ao excluir administrador');
    }
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando Painel...</div>;

  return (
    <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '28px' }}>Painel Global <span className="neon-text" style={{color: '#3498db'}}>Provider</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gestão total da infraestrutura EasyBox.</p>
        </div>
        <button onClick={logout} className="btn-primary" style={{ padding: '8px 16px', background: 'transparent' }}>
          <LogOut size={16} /> Sair
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '40px' }}>
        {/* CONDOMINIOS SECTION */}
        <section className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Building size={20} style={{ color: '#3498db' }} />
              <h2 style={{ margin: 0, fontSize: '18px' }}>Condomínios</h2>
            </div>
            <button className="btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => { setEditingCondo(null); setCondoForm({ nome: '', lat: -23.5505, long: -46.6333, masterPassword: '' }); setShowCondoModal(true); }}>
              <Plus size={14} /> Novo
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {condominios.map(c => (
              <div key={c.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 'bold' }}>{c.nome}</div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => { setEditingCondo(c); setCondoForm({ nome: c.nome, lat: c.lat, long: c.long, masterPassword: '' }); setShowCondoModal(true); }} style={{ background: 'none', border: 'none', color: '#3498db', cursor: 'pointer' }}><Edit size={14}/></button>
                    <button onClick={() => handleDeleteCondo(c.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={14}/></button>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {c._count?.armarios || 0} Armários | {c._count?.moradores || 0} Moradores
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ARMARIOS SECTION */}
        <section className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldAlert size={20} style={{ color: '#2ecc71' }} />
              <h2 style={{ margin: 0, fontSize: '18px' }}>Armários (Hardware)</h2>
            </div>
            <button className="btn-primary" style={{ padding: '4px 8px', fontSize: '12px', borderColor: '#2ecc71', color: '#2ecc71' }} onClick={() => setShowArmarioModal(true)}>
              <Plus size={14} /> Novo Hardware
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {armarios.map(a => (
              <div key={a.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{a.nome}</div>
                    <div style={{ fontSize: '10px', color: '#2ecc71', fontFamily: 'monospace' }}>{a.serialHash}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => setShowAssignModal(a)} title="Vincular a Condomínio" style={{ background: 'none', border: 'none', color: '#f1c40f', cursor: 'pointer' }}><Edit size={14}/></button>
                    <button onClick={() => handleDeleteArmario(a.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={14}/></button>
                  </div>
                </div>
                <div style={{ fontSize: '11px', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '8px', paddingTop: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Jurisdição:</span> {a.condominio?.nome || '⚠️ NÃO VINCULADO'}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ADMINS SECTION */}
        <section className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldAlert size={20} style={{ color: 'var(--warning)' }} />
              <h2 style={{ margin: 0, fontSize: '18px' }}>Administradores</h2>
            </div>
            <button className="btn-primary" style={{ padding: '4px 8px', fontSize: '12px', borderColor: 'var(--warning)', color: 'var(--warning)' }} onClick={() => { setEditingAdmin(null); setAdminForm({ name: '', email: '', password: '', condominioId: '' }); setShowAdminModal(true); }}>
              <Plus size={14} /> Novo Admin
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {admins.map(a => (
              <div key={a.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{a.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => { setEditingAdmin(a); setAdminForm({ name: a.name, email: a.email, password: '', condominioId: '' }); setShowAdminModal(true); }} style={{ background: 'none', border: 'none', color: 'var(--warning)', cursor: 'pointer' }}><Edit size={14}/></button>
                    <button onClick={() => handleDeleteAdmin(a.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={14}/></button>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--warning)', marginTop: '4px' }}>
                  Lida com: {a.condominio?.nome || 'Nenhum'}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* MODAL CONDOMINIO */}
      {showCondoModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2>{editingCondo ? 'Editar' : 'Novo'} Condomínio</h2>
              <X onClick={() => setShowCondoModal(false)} style={{ cursor: 'pointer' }} />
            </div>
            <form onSubmit={handleSaveCondo}>
              <div className="form-group"><label className="label-dim">Nome</label><input className="input-dark" style={{ background: 'var(--bg-primary)' }} value={condoForm.nome} onChange={e => setCondoForm({...condoForm, nome: e.target.value})} required /></div>
              
              <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label className="label-dim">Localização Geo-espacial</label>
                  <button type="button" onClick={getUserLocation} className="btn-secondary">
                    <Locate size={14} /> Minha Localização
                  </button>
                </div>
                
                <div className="map-container">
                  <MapContainer 
                    center={[condoForm.lat, condoForm.long]} 
                    zoom={15} 
                    scrollWheelZoom={false}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Marker position={[condoForm.lat, condoForm.long]} />
                    <MapEvents onClick={(lat, lng) => setCondoForm(prev => ({ ...prev, lat, long: lng }))} />
                    <RecenterMap lat={condoForm.lat} lng={condoForm.long} />
                  </MapContainer>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Clique no mapa para ajustar as coordenadas da Box.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group"><label className="label-dim">Latitude</label><input className="input-dark" style={{ background: 'var(--bg-primary)' }} type="number" step="any" value={condoForm.lat} onChange={e => setCondoForm({...condoForm, lat: parseFloat(e.target.value)})} readOnly /></div>
                <div className="form-group"><label className="label-dim">Longitude</label><input className="input-dark" style={{ background: 'var(--bg-primary)' }} type="number" step="any" value={condoForm.long} onChange={e => setCondoForm({...condoForm, long: parseFloat(e.target.value)})} readOnly /></div>
              </div>
              <div className="form-group"><label className="label-dim">Senha Mestre {!editingCondo && '*'}</label><input className="input-dark" style={{ background: 'var(--bg-primary)' }} type="password" value={condoForm.masterPassword} onChange={e => setCondoForm({...condoForm, masterPassword: e.target.value})} required={!editingCondo} /></div>
              <button type="submit" className="btn-neon" style={{ width: '100%', marginTop: '20px' }}><Save size={16}/> Salvar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ARMARIO */}
      {showArmarioModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2>Registrar Hardware</h2>
              <X onClick={() => setShowArmarioModal(false)} style={{ cursor: 'pointer' }} />
            </div>
            <p style={{fontSize: '13px', color: 'var(--text-muted)', marginBottom: '15px'}}>Informe o hash de conexão gerado pela placa física (ou simulador).</p>
            <form onSubmit={handleSaveArmario}>
              <div className="form-group"><label className="label-dim">Nome de Identificação</label><input className="input-dark" style={{ background: 'var(--bg-primary)' }} placeholder="Ex: Bloco A - Entrada" value={armarioForm.nome} onChange={e => setArmarioForm({...armarioForm, nome: e.target.value})} required /></div>
              <div className="form-group"><label className="label-dim">Serial Hash (Placa)</label><input className="input-dark" style={{ background: 'var(--bg-primary)' }} placeholder="Ex: HW-XXXX-XXXX" value={armarioForm.serialHash} onChange={e => setArmarioForm({...armarioForm, serialHash: e.target.value})} required /></div>
              <button type="submit" className="btn-neon" style={{ width: '100%', marginTop: '20px', borderColor: '#2ecc71', color: '#2ecc71' }}><Save size={16}/> Registrar Armário</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VINCULAR */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2>Vincular Jurisdição</h2>
              <X onClick={() => setShowAssignModal(null)} style={{ cursor: 'pointer' }} />
            </div>
            <p style={{fontSize: '14px', marginBottom: '15px'}}>Delegar o armário <strong>{showAssignModal.nome}</strong> para:</p>
            <form onSubmit={handleAssignArmario}>
              <div className="form-group">
                <label className="label-dim">Condomínio Destino</label>
                <select className="input-dark" style={{ background: 'var(--bg-primary)' }} value={assignCondoId} onChange={e => setAssignCondoId(e.target.value)}>
                  <option value="" style={{ background: 'var(--bg-primary)' }}>Nenhum (Desvincular)</option>
                  {condominios.map(c => <option key={c.id} value={c.id} style={{ background: 'var(--bg-primary)' }}>{c.nome}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-neon" style={{ width: '100%', marginTop: '20px', borderColor: '#f1c40f', color: '#f1c40f' }}>Confirmar Delegação</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADMIN */}
      {showAdminModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2>{editingAdmin ? 'Editar' : 'Novo'} Administrador</h2>
              <X onClick={() => { setShowAdminModal(false); setEditingAdmin(null); }} style={{ cursor: 'pointer' }} />
            </div>
            <form onSubmit={handleSaveAdmin}>
              <div className="form-group"><label className="label-dim">Nome Completo</label><input className="input-dark" style={{ background: 'var(--bg-primary)' }} value={adminForm.name} onChange={e => setAdminForm({...adminForm, name: e.target.value})} required /></div>
              <div className="form-group"><label className="label-dim">Email</label><input className="input-dark" style={{ background: 'var(--bg-primary)' }} type="email" value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} required /></div>
              <div className="form-group"><label className="label-dim">Senha {editingAdmin && '(Deixe vazio para manter)'}</label><input className="input-dark" style={{ background: 'var(--bg-primary)' }} type="password" value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} required={!editingAdmin} /></div>
              {!editingAdmin && (
                <div className="form-group">
                  <label className="label-dim">Condomínio Vinculado</label>
                  <select className="input-dark" style={{ background: 'var(--bg-primary)' }} value={adminForm.condominioId} onChange={e => setAdminForm({...adminForm, condominioId: e.target.value})} required>
                    <option value="" style={{ background: 'var(--bg-primary)' }}>Selecione...</option>
                    {condominios.map(c => <option key={c.id} value={c.id} style={{ background: 'var(--bg-primary)' }}>{c.nome}</option>)}
                  </select>
                </div>
              )}
              <button type="submit" className="btn-neon" style={{ width: '100%', marginTop: '20px', borderColor: 'var(--warning)', color: 'var(--warning)' }}><Save size={16}/> {editingAdmin ? 'Salvar Alterações' : 'Criar Acesso'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
