import { useAuth } from '../context/AuthContext';
import { LogOut, Building, ShieldAlert } from 'lucide-react';

export default function ProviderDashboard() {
  const { logout } = useAuth();

  return (
    <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '28px' }}>Painel Global <span className="neon-text" style={{color: '#3498db'}}>Provider</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Você tem acesso irrestrito ao sistema EasyBox.</p>
        </div>
        <button onClick={logout} className="btn-primary" style={{ padding: '8px 16px', background: 'transparent' }}>
          <LogOut size={16} /> Sair
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '30px' }}>
          <Building size={32} style={{ marginBottom: '15px', color: '#3498db' }} />
          <h2 style={{ marginBottom: '10px' }}>Gestão de Condomínios</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Adicione novos armários à frota global e configure as Coordenadas GPS Mestre deles.</p>
          <button className="btn-primary" style={{borderColor: '#3498db', color: '#3498db'}}>+ Novo Condomínio</button>
        </div>

        <div className="glass-panel" style={{ padding: '30px' }}>
          <ShieldAlert size={32} style={{ marginBottom: '15px', color: 'var(--warning)' }} />
          <h2 style={{ marginBottom: '10px' }}>Administradores (Síndicos)</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Vincule ou revogue credenciais de síndicos locais do sistema web.</p>
          <button className="btn-primary" style={{borderColor: 'var(--warning)', color: 'var(--warning)'}}>Moderar Acessos</button>
        </div>
      </div>
    </div>
  );
}
