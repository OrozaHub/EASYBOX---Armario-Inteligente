import React, { useState } from 'react';
import { api } from '../services/api';
import { Package, CheckCircle2, Navigation } from 'lucide-react';

export default function Entregador() {
  const [condominioId, setCondominioId] = useState(''); // Could be auto-filled via QR Code query param in v3
  const [apartamento, setApartamento] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [message, setMessage] = useState('');
  const [slot, setSlot] = useState('');

  const handleEntrega = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const data = await api.post('/entrega/registrar', { condominioId, apartamento });
      setSlot(data.slot);
      setMessage(data.message);
      setStatus('success');
      
      // Reset form after a few seconds ready for next delivery guy
      setTimeout(() => {
        setStatus('idle');
        setApartamento('');
      }, 8000);
      
    } catch (err: any) {
      setMessage(err.message || 'Erro ao registrar entrega');
      setStatus('idle'); // Back to idle to try again or show error above form
      alert(err.message);
    }
  };

  if (status === 'success') {
    return (
      <div className="flex-center animate-fade-in" style={{ height: '100vh', padding: '20px' }}>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '50px 30px', maxWidth: '400px' }}>
          <CheckCircle2 size={64} className="neon-text animate-pulse-glow" style={{ margin: '0 auto 20px', borderRadius:'50%' }} />
          <h2 style={{ fontSize: '28px', marginBottom: '10px' }}>Porta <span className="neon-text">{slot}</span> Liberada!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
            {message} Volte a fechar a porta com firmeza após deixar o pacote.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-center animate-fade-in" style={{ height: '100vh', padding: '20px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '40px 30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
           <div className="flex-center" style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', margin: '0 auto 16px' }}>
            <Package size={32} color="#f0f0f0" />
           </div>
          <h2 style={{ fontSize: '24px' }}>Entrega Expressa</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>
            Fez escaneamento do QR Code? O Condomínio ID foi preenchido. Digite o Apartamento do destino:
          </p>
        </div>

        <form onSubmit={handleEntrega} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
               Condomínio ID <span style={{opacity: 0.5}}>(Via QR)</span>
            </label>
            <input 
              type="text" 
              className="input-dark" 
              placeholder="Ex: TEST-CONDOMINIO-001"
              value={condominioId}
              onChange={(e) => setCondominioId(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
               Número do Apartamento (e Bloco)
            </label>
            <input 
              type="text" 
              className="input-dark" 
              placeholder="Ex: 101A"
              value={apartamento}
              onChange={(e) => setApartamento(e.target.value)}
              required
              style={{ fontSize: '20px', textAlign: 'center', fontWeight: 'bold' }}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={status==='loading'} style={{ width: '100%', marginTop: '10px', padding: '15px' }}>
            {status === 'loading' ? 'Alocando Armário...' : <><Navigation size={18} /> Alocar Encomenda</>}
          </button>
        </form>
      </div>
    </div>
  );
}
