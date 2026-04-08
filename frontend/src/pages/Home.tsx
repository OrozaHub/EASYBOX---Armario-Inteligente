import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseService } from '../services/supabaseService';
import { 
  Smartphone, 
  Package, 
  Settings, 
  ExternalLink, 
  Box, 
  History, 
  ChevronRight,
  ShieldCheck,
  Bell
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [condo, setCondo] = useState<any>(null);

  useEffect(() => {
    const initDemo = async () => {
      try {
        const condominio = await supabaseService.detectLocal(0, 0);
        if (condominio) {
          setCondo(condominio);
          const s = await supabaseService.getLockerState(condominio.id);
          setSlots(s);
        }
      } catch (err) {
        console.error('Erro ao inicializar demo:', err);
      } finally {
        setLoading(false);
      }
    };

    initDemo();
    const subscription = setInterval(async () => {
        if (condo) {
            const s = await supabaseService.getLockerState(condo.id);
            setSlots(s);
        }
    }, 3000);
    return () => clearInterval(subscription);
  }, [condo?.id]);

  const fetchSlots = async () => {
    try {
      const data = await supabaseService.getLockerState(condominioId);
      setSlots(data);
    } catch (err) {
      console.error('Erro ao buscar slots:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header Premium */}
      <header style={{ textAlign: 'center', marginBottom: '60px', animation: 'fadeInScale 0.6s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}>
             <div style={{ background: 'var(--accent-neon)', padding: '10px', borderRadius: '12px', boxShadow: '0 0 20px var(--accent-neon-glow)' }}>
                <Box color="black" size={32} />
             </div>
             <h1 style={{ fontSize: '48px', fontWeight: '800', letterSpacing: '-1px' }}>
                EASY<span className="neon-text">BOX</span>
             </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
            A revolução dos lockers inteligentes. Teste o fluxo completo de entrega e retirada diretamente no seu navegador.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '40px' }}>
        
        {/* Painel de Controle (Demo Shortcuts) */}
        <div style={{ display: 'grid', gap: '25px' }}>
          
          <h2 style={{ fontSize: '20px', marginBottom: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Simular Persona
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            
            {/* CARD: ENTREGADOR */}
            <div className="glass-panel" style={{ padding: '25px', transition: 'transform 0.3s', cursor: 'pointer' }} onClick={() => navigate('/entregas')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
                    <div style={{ background: 'rgba(0,255,163,0.1)', p: '12px', borderRadius: '10px' }}>
                        <Package color="var(--accent-neon)" size={28} />
                    </div>
                    <ExternalLink size={18} color="var(--text-muted)" />
                </div>
                <h3 style={{ fontSize: '22px', marginBottom: '10px' }}>Sou Entregador</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
                    Simule a chegada ao condomínio, detecção via GPS e abertura de um slot vago para depósito.
                </p>
                <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', color: 'var(--accent-neon)', fontSize: '13px', fontWeight: 'bold' }}>
                    INICIAR ENTREGA <ChevronRight size={16} />
                </div>
            </div>

            {/* CARD: MORADOR */}
            <div className="glass-panel" style={{ padding: '25px', transition: 'transform 0.3s', cursor: 'pointer' }} onClick={() => navigate('/login')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
                    <div style={{ background: 'rgba(255,165,2,0.1)', p: '12px', borderRadius: '10px' }}>
                        <Smartphone color="var(--warning)" size={28} />
                    </div>
                    <ExternalLink size={18} color="var(--text-muted)" />
                </div>
                <h3 style={{ fontSize: '22px', marginBottom: '10px' }}>Sou Morador</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
                    Acesse seu painel para ver encomendas recebidas e gerar o link único de abertura por proximidade.
                </p>
                <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', color: 'var(--warning)', fontSize: '13px', fontWeight: 'bold' }}>
                    ACESSAR CONTA <ChevronRight size={16} />
                </div>
            </div>

            {/* CARD: ADMIN */}
            <div className="glass-panel" style={{ padding: '25px', transition: 'transform 0.3s', cursor: 'pointer', gridColumn: 'span 2' }} onClick={() => navigate('/admin')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
                    <div style={{ background: 'rgba(0,186,255,0.1)', p: '12px', borderRadius: '10px' }}>
                        <Settings color="#00baff" size={28} />
                    </div>
                    <ExternalLink size={18} color="var(--text-muted)" />
                </div>
                <h3 style={{ fontSize: '22px', marginBottom: '10px' }}>Dashboard Administrativo</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
                    Visão geral de todos os condomínios, status de rede dos armários, logs de auditoria e gestão de moradores.
                </p>
            </div>

          </div>
        </div>

        {/* Visualização do Armário (Live Feedback) */}
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '25px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center' }}>
            Estado do Armário
          </h2>
          
          <div className="glass-panel" style={{ padding: '30px', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                {loading ? (
                    <p style={{ gridColumn: 'span 2', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando slots...</p>
                ) : slots.length === 0 ? (
                    <p style={{ gridColumn: 'span 2', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum slot configurado no banco.</p>
                ) : (
                    slots.map((slot) => (
                        <div 
                            key={slot.id} 
                            style={{ 
                                height: '100px', 
                                border: `2px solid ${slot.status === 'OCUPADO' ? '#ff475733' : 'var(--glass-border)'}`,
                                borderRadius: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: slot.status === 'OCUPADO' ? 'rgba(255, 71, 87, 0.05)' : 'transparent',
                                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            {slot.status === 'OCUPADO' && (
                                <div style={{ position: 'absolute', top: 5, right: 10 }}>
                                     <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4757', boxShadow: '0 0 10px #ff4757' }}></div>
                                </div>
                            )}
                            <span style={{ fontSize: '24px', fontWeight: 'bold', color: slot.status === 'OCUPADO' ? '#ff4757' : 'var(--text-primary)' }}>
                                {slot.numeroPorta}
                            </span>
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '5px', color: 'var(--text-muted)' }}>
                                {slot.status}
                            </span>
                        </div>
                    ))
                )}
            </div>

            <div style={{ marginTop: '30px', padding: '15px', background: 'rgba(0,255,163,0.02)', borderRadius: '10px', border: '1px solid rgba(0,255,163,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-neon)', fontSize: '12px', fontWeight: 'bold' }}>
                    <ShieldCheck size={14} /> MODO DEMO ATIVO
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
                    Abertura via MQTT simulada via Supabase Realtime.
                </p>
            </div>
          </div>
          
          <button className="btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={() => navigate('/hardware')}>
             <History size={16} /> VER SIMULADOR DE HARDWARE
          </button>
        </div>

      </div>

      <style>{`
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .glass-panel:hover {
            transform: translateY(-5px);
            border-color: var(--accent-neon-glow);
            background: rgba(255,255,255,0.05);
        }
      `}</style>

    </div>
  );
}
