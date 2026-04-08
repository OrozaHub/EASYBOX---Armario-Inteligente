import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CheckCircle2, MapPin, Loader2, Phone, Box, MapPinOff, ShieldCheck, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
});

function RecenterMap({ lat, lng }: { lat: number, lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom()); }, [lat, lng, map]);
  return null;
}

export default function Entregador() {
  // States
  const [step, setStep] = useState<'detecting' | 'identify' | 'open' | 'success'>('detecting');
  const [condominio, setCondominio] = useState<{ id: string, nome: string } | null>(null);
  const [apartamento, setApartamento] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [moradorId, setMoradorId] = useState<string | null>(null);
  const [openedSlot, setOpenedSlot] = useState<{ slot: string, slotId: string } | null>(null);
  const [maskedPhones, setMaskedPhones] = useState<string[]>([]);

  // Step 0: Auto-detect location via GPS on mount
  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = () => {
    setLoading(true);
    setError(null);
    
    if (!navigator.geolocation) {
      setError('GPS não suportado pelo navegador.');
      setLoading(false);
      return;
    }

    const handleLocSuccess = async (pos?: GeolocationPosition) => {
      const myLat = pos?.coords.latitude || 0;
      const myLng = pos?.coords.longitude || 0;
      setCoords({ lat: myLat, lng: myLng });
      try {
        const res = await api.post('/entrega/detectar-local', { lat: myLat, long: myLng });
        setCondominio(res);
        setStep('identify');
      } catch (err: any) {
        setError(err.message || 'Nenhum armário EasyBox encontrado por perto.');
      } finally {
        setLoading(false);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => handleLocSuccess(pos),
      () => {
        console.warn('GPS negado, usando fallback de demo.');
        handleLocSuccess();
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleVerifyAP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condominio) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/entrega/verificar-ap', {
        condominioId: condominio.id,
        apartamento
      });
      setMoradorId(res.moradorId);
      setStep('open');
    } catch (err: any) {
      setError(err.message || 'Apartamento não encontrado.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSlot = async () => {
    if (!condominio || !moradorId) return;
    setLoading(true);
    setError(null);

    const handleOpenSuccess = async (pos?: GeolocationPosition) => {
      try {
        const res = await api.post('/entrega/abrir-vago', {
          condominioId: condominio.id,
          lat: pos?.coords.latitude || 0,
          long: pos?.coords.longitude || 0
        });
        setOpenedSlot(res);
      } catch (err: any) {
        setError(err.message || 'Erro ao abrir armário.');
      } finally {
        setLoading(false);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => handleOpenSuccess(pos),
      () => {
        console.warn('GPS negado, usando fallback de demo.');
        handleOpenSuccess();
      },
      { timeout: 5000 }
    );
  };

  const handleFinalize = async () => {
    if (!openedSlot || !moradorId) return;
    setLoading(true);
    try {
      const res = await api.post('/entrega/finalizar', {
        slotId: openedSlot.slotId,
        moradorId
      });
      setMaskedPhones(res.maskedPhones || []);
      setStep('success');
    } catch (err: any) {
      setError('Erro ao finalizar a entrega.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '20px', background: 'var(--bg-primary)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '40px', textAlign: 'center' }}>
        
        {/* STEP 0: DETECTING GPS */}
        {step === 'detecting' && (
          <div style={{ padding: '20px 0' }}>
            <Navigation size={48} className="neon-text animate-pulse" style={{ margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>Detectando Local</h2>
            
            {coords && (
              <div className="map-container" style={{ height: '200px', marginBottom: '20px' }}>
                <MapContainer center={[coords.lat, coords.lng]} zoom={16} scrollWheelZoom={false} style={{ height: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[coords.lat, coords.lng]} />
                  <RecenterMap lat={coords.lat} lng={coords.lng} />
                </MapContainer>
              </div>
            )}

            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '14px' }}>
              {loading ? 'Validando sua posição com os armários...' : 'Sua localização atual no mapa.'}
            </p>

            {loading && <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto' }} />}
            
            {error && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)', justifyContent: 'center', marginBottom: '15px' }}>
                   <MapPinOff size={18} />
                   <p style={{ fontSize: '14px', margin: 0 }}>{error}</p>
                </div>
                <button onClick={detectLocation} className="btn-primary" style={{ width: '100%' }}>TENTAR NOVAMENTE</button>
              </div>
            )}
          </div>
        )}

        {/* STEP 1: IDENTIFY AP */}
        {step === 'identify' && (
          <div>
            <div style={{ marginBottom: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--accent-neon)', marginBottom: '10px', fontSize: '13px', fontWeight: 'bold' }}>
                <MapPin size={16} /> {condominio?.nome}
              </div>
              <h2 style={{ fontSize: '26px' }}>Nova <span className="neon-text">Entrega</span></h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '10px' }}>Digite o Apartamento de destino.</p>
            </div>

            <form onSubmit={handleVerifyAP}>
              <div style={{ textAlign: 'left', marginBottom: '30px' }}>
                <label className="label-dim">Número / Bloco do AP</label>
                <input 
                  autoFocus
                  className="input-dark" 
                  style={{ fontSize: '32px', textAlign: 'center', padding: '20px', fontWeight: 'bold' }}
                  value={apartamento}
                  onChange={(e) => setApartamento(e.target.value)}
                  placeholder="Ex: 101"
                  required
                />
              </div>

              {error && <p style={{ color: 'var(--error)', marginBottom: '20px', fontSize: '14px' }}>{error}</p>}
              
              <button type="submit" className="btn-neon" style={{ width: '100%', padding: '20px' }} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'AVANÇAR'}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: OPEN SLOT */}
        {step === 'open' && (
          <div>
            <div style={{ marginBottom: '30px' }}>
               <button onClick={() => setStep('identify')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', marginBottom: '15px' }}>← Voltar</button>
               <h2 style={{ fontSize: '24px' }}>Tudo Certo!</h2>
               <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>Armário identificado para o Apto {apartamento}.</p>
            </div>

            {!openedSlot ? (
              <button onClick={handleOpenSlot} className="btn-neon" style={{ width: '100%', padding: '25px', fontSize: '18px' }} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <><Box size={20} /> ABRIR PORTA AGORA</>}
              </button>
            ) : (
              <div className="glass-panel" style={{ padding: '30px', border: '2px solid var(--accent-neon)', background: 'rgba(0,255,163,0.05)', animation: 'fadeInScale 0.3s ease-out' }}>
                <h1 style={{ fontSize: '64px', color: 'var(--accent-neon)', margin: 0 }}>{openedSlot.slot}</h1>
                <p style={{ marginTop: '10px', fontWeight: 'bold', letterSpacing: '2px' }}>PORTA ABERTA!</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '25px', lineHeight: '1.6' }}>Deposite o pacote, feche a porta e então confirme abaixo.</p>
                
                <button onClick={handleFinalize} className="btn-neon" style={{ width: '100%', marginTop: '30px', padding: '20px', background: 'white', color: 'black' }} disabled={loading}>
                   {loading ? <Loader2 className="animate-spin" /> : 'CONFIRMAR ENTREGA'}
                </button>
              </div>
            )}

            {error && <p style={{ color: 'var(--error)', marginTop: '20px', fontSize: '14px' }}>{error}</p>}
          </div>
        )}

        {/* STEP 3: SUCCESS & VERIFICATION */}
        {step === 'success' && (
          <div style={{ animation: 'fadeInScale 0.4s ease-out' }}>
            <CheckCircle2 size={64} style={{ color: 'var(--accent-neon)', margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: '28px', marginBottom: '10px' }}>Sucesso!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '15px' }}>O morador foi notificado via WhatsApp.</p>
            
            <div className="glass-panel" style={{ padding: '25px', textAlign: 'left', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <ShieldCheck size={20} style={{ color: 'var(--accent-neon)' }} />
                <span style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>Código de Verificação</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '15px', lineHeight: '1.4' }}>Confira se os números batem com seu aplicativo de entrega:</p>
              
              <div style={{ display: 'grid', gap: '10px' }}>
                {maskedPhones.map((phone, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Phone size={16} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '22px', letterSpacing: '3px', fontWeight: 'bold', color: 'var(--accent-neon)' }}>{phone}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => window.location.reload()} className="btn-primary" style={{ width: '100%', marginTop: '40px', padding: '15px' }}>
              NOVA ENTREGA
            </button>
          </div>
        )}

      </div>
      <style>{`
        .label-dim { display: block; margin-bottom: 8px; font-size: 13px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
