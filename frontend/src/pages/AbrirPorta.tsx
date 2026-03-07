import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Unlock, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';

export default function AbrirPorta() {
  const { hash } = useParams<{ hash: string }>();
  const [status, setStatus] = useState<'idle' | 'locating' | 'opening' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [slotOpened, setSlotOpened] = useState('');

  const startUnlockSequence = () => {
    setStatus('locating');
    
    // Obter GPS nativo do Browser (Móvel)
    if (!navigator.geolocation) {
      setErrorMessage('Seu navegador não suporta GPS. Acesse via celular smartphone!');
      setStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          setStatus('opening');
          const data = await api.post(`/morador/abrir/${hash}`, {
            lat: position.coords.latitude,
            long: position.coords.longitude
          });
          
          setSlotOpened(data.slot);
          setStatus('success');
        } catch (err: any) {
          console.log(err);
          setErrorMessage(err.message || 'Erro ao destrancar porta. Link expirado ou GPS Longe.');
          setStatus('error');
        }
      },
      () => {
        setErrorMessage('Por favor, permita o acesso à localização para verificar a Geocerca!');
        setStatus('error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  if (status === 'success') {
    return (
      <div className="flex-center animate-fade-in" style={{ height: '100vh', padding: '20px', backgroundColor: '#051f13' }}>
        <div style={{ textAlign: 'center' }}>
          <CheckCircle2 size={100} className="neon-text animate-pulse-glow" style={{ margin: '0 auto 20px', borderRadius:'50%' }} />
          <h1 style={{ fontSize: '36px', color: 'var(--text-primary)', marginBottom: '10px' }}>Aberto!</h1>
          <p style={{ fontSize: '18px', color: '#a0a0a0' }}>A porta <strong style={{color: '#fff', fontSize: '24px'}}>{slotOpened}</strong> foi destrancada via MQTT com sucesso.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-center" style={{ height: '100vh', padding: '20px', flexDirection: 'column' }}>
       {status === 'error' && (
          <div className="glass-panel animate-fade-in" style={{ padding: '20px', background: 'rgba(255, 0, 0, 0.1)', border: '1px solid var(--error)', marginBottom: '30px', maxWidth: '400px', textAlign: 'center' }}>
            <AlertTriangle size={32} color="var(--error)" style={{ margin: '0 auto 10px' }} />
            <h3 style={{ color: 'var(--error)' }}>Falha de Segurança</h3>
            <p style={{ color: 'var(--text-primary)', fontSize: '14px', marginTop: '10px' }}>{errorMessage}</p>
            <button className="btn-primary" style={{ marginTop: '15px' }} onClick={() => setStatus('idle')}>Tentar Novamente</button>
          </div>
       )}

      <div style={{ textAlign: 'center', maxWidth: '300px' }}>
        <h2 style={{ fontSize: '28px', marginBottom: '40px', fontWeight: '500' }}>Recebimento de <br/><span className="neon-text">Encomenda</span></h2>
        
        <button 
          onClick={startUnlockSequence}
          disabled={status === 'locating' || status === 'opening'}
          className={status === 'idle' ? 'animate-pulse-glow' : ''}
          style={{
            width: '200px', height: '200px', borderRadius: '50%',
            background: status === 'idle' ? 'transparent' : 'var(--accent-dark)',
            border: `2px solid ${status === 'idle' ? 'var(--accent-neon)' : 'transparent'}`,
            color: status === 'idle' ? 'var(--accent-neon)' : 'black',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: 'bold', gap: '10px',
            cursor: 'pointer', transition: 'all 0.3s ease',
            margin: '0 auto',
            boxShadow: status === 'idle' ? 'var(--accent-neon-glow)' : 'none'
          }}
        >
          {status === 'idle' && <><Unlock size={48} /> DESTRANCAR</>}
          {status === 'locating' && <><AlertTriangle size={48} className="animate-pulse" /> Validando GPS...</>}
          {status === 'opening' && <><Loader2 size={48} className="animate-spin" /> Conectando MQTT</>}
        </button>

        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '40px' }}>
          O sistema validará sua localização exata para garantir que está em frente ao armário.
        </p>
      </div>
    </div>
  );
}
