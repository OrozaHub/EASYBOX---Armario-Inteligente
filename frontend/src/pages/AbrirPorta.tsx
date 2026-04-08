import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Unlock, AlertTriangle, Loader2, CheckCircle2, MapPin } from 'lucide-react';

export default function AbrirPorta() {
  const { hash } = useParams<{ hash: string }>();
  const [status, setStatus] = useState<'idle' | 'locating' | 'opening' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [slotOpened, setSlotOpened] = useState('');
  const [distance, setDistance] = useState<number | null>(null);

  const startUnlockSequence = () => {
    setStatus('locating');
    
    if (!navigator.geolocation) {
      setErrorMessage('Seu navegador não suporta GPS. Use um smartphone com GPS ativo.');
      setStatus('error');
      return;
    }

    const handleSuccess = async (position?: GeolocationPosition) => {
      try {
        setStatus('opening');
        const lat = position?.coords.latitude || 0;
        const long = position?.coords.longitude || 0;
        
        const data = await api.post(`/morador/abrir/${hash}`, { lat, long });
        
        setSlotOpened(data.slot);
        setStatus('success');
      } catch (err: any) {
        setErrorMessage(err.message || 'Erro ao destrancar. Verifique se o link não expirou.');
        if (err.distanceMeters) setDistance(err.distanceMeters);
        setStatus('error');
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => handleSuccess(pos),
      () => {
        console.warn('GPS negado, usando coordenadas de demo.');
        handleSuccess(); // Fallback para demo
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  if (status === 'success') {
    return (
      <div className="flex-center" style={{ height: '100vh', padding: '20px', background: 'radial-gradient(circle, #0a2e1c 0%, #05140b 100%)' }}>
        <div style={{ textAlign: 'center', animation: 'fadeInScale 0.6s ease-out' }}>
          <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 30px' }}>
             <CheckCircle2 size={120} color="#00ffa3" className="animate-pulse-glow" />
             <div className="status-ring" style={{ position: 'absolute', top: -10, left: -10, right: -10, bottom: -10, border: '2px solid #00ffa3', borderRadius: '50%', opacity: 0.3, animation: 'ping 2s infinite' }}></div>
          </div>
          <h1 style={{ fontSize: '42px', color: '#fff', marginBottom: '10px', textShadow: '0 0 20px rgba(0,255,163,0.5)' }}>PORTA ABERTA!</h1>
          <p style={{ fontSize: '20px', color: '#a0a0a0' }}>O compartimento <strong style={{color: '#00ffa3', fontSize: '28px'}}>{slotOpened}</strong> foi liberado.</p>
          <div style={{ marginTop: '40px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '14px', color: '#888' }}>
            Retire seu pacote e lembre-se de fechar a porta firmemente.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-center" style={{ height: '100vh', padding: '20px', flexDirection: 'column', background: 'var(--bg-primary)' }}>
       {status === 'error' && (
          <div className="glass-panel" style={{ padding: '25px', background: 'rgba(255, 60, 60, 0.05)', border: '1px solid #ff3c3c33', marginBottom: '40px', maxWidth: '400px', textAlign: 'center', animation: 'shake 0.5s' }}>
            <AlertTriangle size={40} color="#ff3c3c" style={{ margin: '0 auto 15px' }} />
            <h3 style={{ color: '#ff3c3c', fontSize: '20px' }}>Ops! Algo deu errado</h3>
            <p style={{ color: '#fff', fontSize: '15px', marginTop: '10px', opacity: 0.8 }}>{errorMessage}</p>
            {distance && <p style={{ fontSize: '12px', marginTop: '10px', color: '#ff3c3c' }}>Distância detectada: {distance}m do armário.</p>}
            <button className="btn-primary" style={{ marginTop: '20px', width: '100%', borderColor: '#ff3c3c', color: '#ff3c3c' }} onClick={() => setStatus('idle')}>Tentar Novamente</button>
          </div>
       )}

      <div style={{ textAlign: 'center', maxWidth: '320px', animation: 'fadeIn 1s ease' }}>
        <header style={{ marginBottom: '60px' }}>
          <div style={{ fontSize: '12px', color: 'var(--accent-neon)', letterSpacing: '3px', marginBottom: '10px' }}>EASYBOX SMART LOCKER</div>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', lineHeight: '1.2' }}>Validar <br/><span className="neon-text">Acesso Local</span></h2>
        </header>
        
        <div style={{ position: 'relative', width: '220px', height: '220px', margin: '0 auto' }}>
          <button 
            onClick={startUnlockSequence}
            disabled={status === 'locating' || status === 'opening'}
            className={status === 'idle' ? 'animate-pulse-glow' : ''}
            style={{
              width: '100%', height: '100%', borderRadius: '50%',
              background: 'transparent',
              border: `2px solid ${status === 'idle' ? 'var(--accent-neon)' : '#333'}`,
              color: status === 'idle' ? 'var(--accent-neon)' : '#666',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: 'bold', gap: '15px',
              cursor: 'pointer', transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative', zIndex: 2
            }}
          >
            {status === 'idle' && <><Unlock size={56} /> DESTRANCAR</>}
            {status === 'locating' && <><MapPin size={56} className="animate-bounce" /> Verificando...</>}
            {status === 'opening' && <><Loader2 size={56} className="animate-spin" /> Conectando...</>}
          </button>
          
          {status === 'locating' && (
             <div style={{ position: 'absolute', top: -20, left: -20, right: -20, bottom: -20, border: '1px dashed var(--accent-neon)', borderRadius: '50%', animation: 'spin 10s linear infinite' }}></div>
          )}
        </div>

        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginTop: '60px', lineHeight: '1.5' }}>
          {status === 'idle' ? 'Clique no botão acima para permitir o GPS e abrir seu slot automaticamente.' : 'Aguarde um instante enquanto validamos sua proximidade com o armário físico.'}
        </p>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes shake { 
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes ping {
          75%, 100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
