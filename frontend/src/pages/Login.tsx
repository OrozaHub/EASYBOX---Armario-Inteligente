import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Lock, LogIn, AlertTriangle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.post('/auth/login', { email, password });
      login(data.token, data.role, data.mustChangePassword);
      
      if (data.role === 'PROVIDER') {
        navigate('/provedor');
      } else {
        navigate('/admin');
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao Autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center animate-fade-in" style={{ height: '100vh', padding: '20px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '40px 30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div className="flex-center" style={{ 
            width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0, 255, 163, 0.1)',
            margin: '0 auto 16px', border: '1px solid var(--accent-neon-glow)'
          }}>
            <Lock size={32} className="neon-text" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', letterSpacing: '0.5px' }}>
            Acesso <span className="neon-text">Restrito</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>
            Apenas Provedores e Síndicos credenciados.
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{ background: 'var(--error-glow)', color: 'var(--error)', padding: '12px', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>E-mail</label>
            <input 
              type="email" 
              className="input-dark" 
              placeholder="sindico@easybox.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Senha</label>
            <input 
              type="password" 
              className="input-dark" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn-neon" 
            style={{ width: '100%', marginTop: '10px' }}
            disabled={loading}
          >
            {loading ? 'Validando...' : <><LogIn size={18} /> Entrar no Sistema</>}
          </button>

          <div style={{ marginTop: '20px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '15px' }}>MODO DEMONSTRAÇÃO</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button 
                    type="button" 
                    className="btn-primary" 
                    style={{ fontSize: '12px', padding: '10px' }}
                    onClick={() => {
                        setEmail('sindico@demo.com');
                        setPassword('demo');
                        setTimeout(() => document.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })), 100);
                    }}
                >
                    Acesso Síndico
                </button>
                <button 
                    type="button" 
                    className="btn-primary" 
                    style={{ fontSize: '12px', padding: '10px', borderColor: '#3498db', color: '#3498db' }}
                    onClick={() => {
                        setEmail('provider@demo.com');
                        setPassword('demo');
                        setTimeout(() => document.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })), 100);
                    }}
                >
                    Acesso Global
                </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
