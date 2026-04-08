import { useState, useEffect, useRef } from 'react';
import { Terminal, Cpu, Plus, Trash2, Power, PowerOff, ShieldCheck, Activity } from 'lucide-react';
import mqtt from 'mqtt';

interface Slot {
  id: number;
  isOpen: boolean;
}

interface SimulatedArmario {
  id: string;
  serialHash: string;
  name: string; // Local/Physical Name
  isConnected: boolean;
  slots: Slot[];
  lastMessage: string;
  onlineName?: string;   // Name from Cloud
  onlineCondo?: string;  // Condo from Cloud
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'error' | 'success' | 'mqtt';
  message: string;
}

export default function HardwareSimulatorUI() {
  const [armarios, setArmarios] = useState<SimulatedArmario[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const clientsRef = useRef<{ [hash: string]: any }>({});
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    addLog('System', 'info', 'Hardware Simulator Interface Initialized');
    return () => {
      // Disconnect all clients on unmount
      Object.values(clientsRef.current).forEach(client => client.end());
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  function addLog(source: string, type: LogEntry['type'], message: string) {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message: `[${source}] ${message}`
    };
    setLogs(prev => [...prev.slice(-49), newLog]);
  }

  function generateHash() {
    return 'HW-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
  }

  function addArmario() {
    const slotCountStr = prompt("Quantas portas (slots) este armário possui?", "10");
    const slotCount = parseInt(slotCountStr || "10") || 10;
    
    const hash = generateHash();
    const slots: Slot[] = Array.from({ length: slotCount }, (_, i) => ({
      id: i + 1,
      isOpen: false
    }));

    const newArmario: SimulatedArmario = {
      id: Math.random().toString(36).substr(2, 5),
      serialHash: hash,
      name: `Virtual Box ${armarios.length + 1}`,
      isConnected: false,
      slots: slots,
      lastMessage: 'Waiting for connection...'
    };
    setArmarios([...armarios, newArmario]);
    addLog('System', 'success', `Created virtual hardware (${slotCount} slots) with hash: ${hash}`);
  }

  function deleteArmario(id: string) {
    const armario = armarios.find(a => a.id === id);
    if (armario && clientsRef.current[armario.serialHash]) {
      clientsRef.current[armario.serialHash].end();
      delete clientsRef.current[armario.serialHash];
    }
    setArmarios(armarios.filter(a => a.id !== id));
    addLog('System', 'info', `Removed hardware: ${armario?.serialHash}`);
  }

  function toggleConnection(serialHash: string) {
    const armario = armarios.find(a => a.serialHash === serialHash);
    if (!armario) return;

    if (armario.isConnected) {
      // Disconnect
      if (clientsRef.current[serialHash]) {
        clientsRef.current[serialHash].end();
        delete clientsRef.current[serialHash];
      }
      updateArmario(serialHash, { isConnected: false, lastMessage: 'Disconnected' });
      addLog(serialHash, 'info', 'Connection closed manually.');
    } else {
      // Connect
      connectArmario(serialHash);
    }
  }

  function connectArmario(hash: string) {
    addLog(hash, 'mqtt', 'Attempting to connect to MQTT broker...');
    
    // Using HiveMQ WebSockets broker (standard for dev)
    const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt', {
      clientId: `easybox_web_${hash}_${Math.random().toString(16).slice(2, 8)}`,
    });

    const topicControl = `easybox/hardware/${hash}/control`;
    const topicStatus = `easybox/hardware/${hash}/status`;
    const topicConfig = `easybox/hardware/${hash}/config`;

    client.on('connect', () => {
      addLog(hash, 'success', 'Connected! Requesting config...');
      client.subscribe(topicControl);
      client.subscribe(topicConfig);
      
      updateArmario(hash, { isConnected: true, lastMessage: 'Announcing to Backend...' });
      
      const currentArmario = armarios.find(a => a.serialHash === hash);
      const cleanHash = hash.trim().toUpperCase();
      
      // ANNOUNCE structure to backend (The "Discovery" event)
      client.publish(`easybox/hardware/${cleanHash}/register`, JSON.stringify({
        serialHash: cleanHash,
        action: 'announce',
        slots: currentArmario ? currentArmario.slots.map(s => s.id) : [],
        timestamp: new Date().toISOString()
      }));
    });

    client.on('message', (topic, message) => {
      if (topic === topicConfig) {
        try {
          const data = JSON.parse(message.toString());
          if (data.action === 'config') {
            const slots: Slot[] = data.slots.map((s: any) => ({
              id: s.id,
              isOpen: false
            }));
            updateArmario(hash, { 
              slots, 
              lastMessage: 'Online & Configured',
              onlineName: data.nome,
              onlineCondo: data.condominio
            });
            addLog(hash, 'success', `Cloud Identity: ${data.nome} @ ${data.condominio}`);
          }
        } catch (e) {
          addLog(hash, 'error', 'Failed to parse config from backend');
        }
      }

      if (topic === topicControl) {
        try {
          const data = JSON.parse(message.toString());
          if (data.action === 'open') {
            handleOpenRequest(hash, data.door, client, topicStatus);
          }
        } catch (e) {
          addLog(hash, 'error', 'Failed to parse incoming MQTT message');
        }
      }
    });

    client.on('error', (err) => {
      addLog(hash, 'error', `MQTT Error: ${err.message}`);
      client.end();
    });

    client.on('close', () => {
      updateArmario(hash, { isConnected: false, lastMessage: 'Offline' });
    });

    clientsRef.current[hash] = client;
  }

  function handleOpenRequest(hash: string, door: string | number, client: any, statusTopic: string) {
    const doorId = typeof door === 'string' ? parseInt(door) : door;
    
    addLog(hash, 'mqtt', `CMD RECEIVED: Open door ${doorId}`);
    
    setArmarios(prev => prev.map(a => {
      if (a.serialHash === hash) {
        return {
          ...a,
          lastMessage: `Door ${doorId} Opening...`,
          slots: a.slots.map(s => s.id === doorId ? { ...s, isOpen: true } : s)
        };
      }
      return a;
    }));
    
    // Notify Server
    client.publish(statusTopic, JSON.stringify({
      serialHash: hash,
      state: 'OPENED',
      door: doorId.toString(),
      timestamp: new Date().toISOString()
    }));

    // Auto-close after 5s simulation
    setTimeout(() => {
      setArmarios(prev => prev.map(a => {
        if (a.serialHash === hash) {
          return {
            ...a,
            lastMessage: 'Online & Listening',
            slots: a.slots.map(s => s.id === doorId ? { ...s, isOpen: false } : s)
          };
        }
        return a;
      }));

      client.publish(statusTopic, JSON.stringify({
        serialHash: hash,
        state: 'CLOSED',
        door: doorId.toString(),
        timestamp: new Date().toISOString()
      }));
      addLog(hash, 'info', `Door ${doorId} closed.`);
    }, 5000);
  }

  function updateArmario(hash: string, updates: Partial<SimulatedArmario>) {
    setArmarios(prev => prev.map(a => a.serialHash === hash ? { ...a, ...updates } : a));
  }

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#e2e8f0', padding: '30px', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu className="neon-text" style={{ color: '#38bdf8' }} />
            EASYBOX <span style={{ color: '#38bdf8' }}>Hardware Lab</span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Simulador de hardware integrado para depuração MQTT.</p>
        </div>
        <button onClick={addArmario} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          <Plus size={18} /> Spawn Hardware
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: '20px', height: 'calc(100vh - 150px)' }}>
        {/* Hardware List */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {armarios.length === 0 && (
            <div style={{ border: '2px dashed #334155', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Nenhum hardware simulado. Clique em Spawn para começar.
            </div>
          )}
          {armarios.map(a => (
            <div key={a.id} className="glass-panel" style={{ padding: '15px', position: 'relative', borderLeft: a.isConnected ? '4px solid #10b981' : '4px solid #ef4444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>{a.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <code style={{ fontSize: '13px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>{a.serialHash}</code>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(a.serialHash); alert('Hash copiado!'); }} 
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '10px' }}
                    >
                      (Copiar)
                    </button>
                  </div>
                  
                  {a.onlineName && (
                    <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(0, 255, 163, 0.05)', border: '1px solid rgba(0, 255, 163, 0.2)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--accent-neon)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ShieldCheck size={10} /> Identidade Cloud
                      </div>
                      <div style={{ fontSize: '12px', color: '#fff', fontWeight: 'bold' }}>{a.onlineName}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Condomínio: {a.onlineCondo}</div>
                    </div>
                  )}
                  <button onClick={() => toggleConnection(a.serialHash)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: a.isConnected ? '#ef4444' : '#10b981' }}>
                    {a.isConnected ? <PowerOff size={18} /> : <Power size={18} />}
                  </button>
                  <button onClick={() => deleteArmario(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                <Activity size={14} className={a.isConnected ? 'spin' : ''} />
                <span>{a.lastMessage}</span>
              </div>

              {/* Slot Grid Visualization */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))', 
                gap: '6px',
                padding: '10px',
                backgroundColor: 'rgba(2, 6, 23, 0.4)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                {a.slots.map(slot => (
                  <div 
                    key={slot.id} 
                    title={`Porta ${slot.id}`}
                    style={{ 
                      aspectRatio: '1/1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      borderRadius: '4px',
                      backgroundColor: slot.isOpen ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 1)',
                      color: slot.isOpen ? '#38bdf8' : '#64748b',
                      border: slot.isOpen ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: slot.isOpen ? '0 0 10px rgba(56, 189, 248, 0.3)' : 'none',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {slot.id}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Debug Console */}
        <div style={{ backgroundColor: '#020617', borderRadius: '12px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 15px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#0f172a' }}>
            <Terminal size={16} style={{ color: '#10b981' }} />
            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>DEBUG TERMINAL</span>
            <span style={{ fontSize: '11px', color: '#475569', marginLeft: 'auto' }}>MQTT STREAM: broker.hivemq.com</span>
          </div>
          
          <div style={{ flex: 1, padding: '15px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '12px' }}>
            {logs.map(log => (
              <div key={log.id} style={{ marginBottom: '6px', lineBreak: 'anywhere' }}>
                <span style={{ color: '#475569', marginRight: '8px' }}>[{log.timestamp}]</span>
                <span style={{ 
                  color: log.type === 'error' ? '#ef4444' : 
                         log.type === 'success' ? '#10b981' : 
                         log.type === 'mqtt' ? '#38bdf8' : '#cbd5e1' 
                }}>
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
          
          <div style={{ padding: '8px 15px', backgroundColor: '#0f172a', borderTop: '1px solid #1e293b', fontSize: '11px', color: '#64748b', display: 'flex', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
              BROKER OK
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <ShieldCheck size={12} /> SSL ENCRYPTED
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .spin { animation: spin 2s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .glass-panel {
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        .glass-panel:hover {
          border-color: rgba(56, 189, 248, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }
        .btn-primary:hover {
          filter: brightness(1.1);
          transform: scale(1.02);
        }
        .modal-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000;
        }
      `}</style>
    </div>
  );
}
