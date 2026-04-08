<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EasyBox - Simulador Profissional</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/mqtt/dist/mqtt.min.js"></script>
    <style>
        .porta-aberta {
            transform: perspective(600px) rotateY(-80deg);
            transform-origin: left;
            transition: transform 0.5s ease;
            background-color: #1a202c !important;
        }
        .porta-fechada {
            transform: perspective(600px) rotateY(0deg);
            transform-origin: left;
            transition: transform 0.5s ease;
        }
        #log-console::-webkit-scrollbar { width: 6px; }
        #log-console::-webkit-scrollbar-track { background: #111827; }
        #log-console::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
        
        /* Overlay para o Setup */
        #setup-overlay {
            backdrop-filter: blur(8px);
        }
    </style>
</head>
<body class="bg-slate-950 text-slate-200 font-sans min-h-screen flex flex-col items-center">

    <!-- Modal de Configuração (Setup) -->
    <div id="setup-overlay" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 hidden">
        <div class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-8">
            <h2 class="text-2xl font-bold text-white mb-2">Configurar Novo Armário</h2>
            <p class="text-slate-400 text-sm mb-6">Defina as especificações de hardware para este EasyBox.</p>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Nome do Dispositivo</label>
                    <input type="text" id="setup-name" placeholder="Ex: Torre A - Entrada" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">Número de Slots (1-12)</label>
                    <input type="number" id="setup-slots" min="1" max="12" value="4" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                </div>
                <button onclick="confirmarSetup()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-900/20">
                    Gerar Identidade e Iniciar
                </button>
            </div>
        </div>
    </div>

    <div class="w-full max-w-6xl p-4 md:p-8 space-y-6">
        
        <!-- Header Info -->
        <header class="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <div>
                <div class="flex items-center gap-3">
                    <h1 class="text-3xl font-black text-white tracking-tight">EasyBox <span class="text-blue-500">Simulator</span></h1>
                    <span id="badge-slots" class="bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/20">-- SLOTS</span>
                </div>
                <div class="flex items-center gap-2 mt-2">
                    <code id="display-hash" class="bg-slate-800 text-slate-400 px-2 py-1 rounded text-xs font-mono border border-slate-700 select-all cursor-pointer" title="Clique para copiar">ID: Gerando...</code>
                    <span id="display-name" class="text-slate-500 text-xs italic"></span>
                </div>
            </div>
            
            <div class="mt-4 md:mt-0 flex flex-col items-end gap-2">
                <div class="flex items-center space-x-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                    <div id="status-dot" class="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <span id="status-text" class="text-xs font-bold uppercase tracking-wider text-slate-400">Desconectado</span>
                </div>
                <button onclick="resetarSimulador()" class="text-[10px] text-slate-600 hover:text-red-400 transition underline">Resetar Configurações</button>
            </div>
        </header>

        <!-- Container Principal -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Visão dos Armários (2/3 da largura) -->
            <div class="lg:col-span-2 space-y-4">
                <div class="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 min-h-[500px]">
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" id="armarios-container">
                        <!-- Gerado via JS -->
                    </div>
                </div>
            </div>

            <!-- Painel de Controle e Logs -->
            <div class="space-y-6">
                <!-- Teste de Backend -->
                <div class="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <h3 class="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                        <span class="w-2 h-2 bg-blue-500 rounded-full"></span> COMANDOS BACKEND
                    </h3>
                    <div class="flex gap-2 mb-4">
                        <input type="number" id="input-abrir-id" placeholder="ID" class="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-sm text-center">
                        <button onclick="simularBackendManual()" class="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2 rounded-lg transition border border-slate-700">
                            ABRIR PORTA
                        </button>
                    </div>
                </div>

                <!-- Logs -->
                <div class="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col h-[380px] shadow-2xl">
                    <div class="bg-slate-900/80 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
                        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hardware Logs</span>
                        <button onclick="limparLogs()" class="text-[10px] text-slate-600 hover:text-white uppercase">Limpar</button>
                    </div>
                    <div id="log-console" class="p-4 overflow-y-auto font-mono text-[11px] space-y-2 flex-1 leading-relaxed">
                        <!-- Logs -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // --- CONFIGURAÇÃO ---
        const brokerUrl = 'wss://test.mosquitto.org:8081/mqtt';
        let config = {
            id: '',
            name: '',
            slots: 0,
            initialized: false
        };

        let clienteMqtt = null;
        let estadoPortas = {};

        // --- INICIALIZAÇÃO E SETUP ---
        window.onload = () => {
            const saved = localStorage.getItem('easybox_sim_config');
            if (saved) {
                config = JSON.parse(saved);
                renderizarInterface();
                conectarMQTT();
            } else {
                document.getElementById('setup-overlay').classList.remove('hidden');
            }
        };

        function confirmarSetup() {
            const name = document.getElementById('setup-name').value || "EasyBox Genérico";
            const slots = parseInt(document.getElementById('setup-slots').value) || 4;
            
            // Gerar Hash único de 8 caracteres
            const hash = Math.random().toString(16).substring(2, 10).toUpperCase();

            config = {
                id: `EBX-${hash}`,
                name: name,
                slots: Math.min(Math.max(slots, 1), 12),
                initialized: true
            };

            localStorage.setItem('easybox_sim_config', JSON.stringify(config));
            document.getElementById('setup-overlay').classList.add('hidden');
            
            renderizarInterface();
            conectarMQTT();
        }

        function resetarSimulador() {
            if(confirm("Deseja deletar a identidade deste armário? Isso removerá a conexão com o banco de dados simulada.")) {
                localStorage.removeItem('easybox_sim_config');
                location.reload();
            }
        }

        // --- INTERFACE ---
        function renderizarInterface() {
            document.getElementById('display-hash').textContent = `ID: ${config.id}`;
            document.getElementById('display-name').textContent = config.name;
            document.getElementById('badge-slots').textContent = `${config.slots} SLOTS`;

            const container = document.getElementById('armarios-container');
            container.innerHTML = '';
            
            for (let i = 1; i <= config.slots; i++) {
                estadoPortas[i] = { trancada: true, timeout: null };
                
                const html = `
                    <div class="relative bg-slate-950 border border-slate-800 rounded-xl h-40 flex items-center justify-center overflow-hidden">
                        <div class="absolute inset-0 flex items-center justify-center opacity-10">
                            <span class="text-4xl font-black">${i}</span>
                        </div>
                        <div id="porta-${i}" class="absolute inset-0 bg-slate-800 border border-slate-700 shadow-xl flex flex-col justify-between p-3 z-10 porta-fechada">
                            <div class="flex justify-between items-center">
                                <span class="text-lg font-bold text-slate-400">${i < 10 ? '0'+i : i}</span>
                                <div id="led-${i}" class="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                            </div>
                            <div class="flex justify-end">
                                <div class="w-1 h-6 bg-slate-900 rounded-full opacity-30"></div>
                            </div>
                        </div>
                    </div>
                `;
                container.innerHTML += html;
            }
        }

        // --- COMUNICAÇÃO MQTT ---
        function conectarMQTT() {
            adicionarLog(`Iniciando Hardware: ${config.id}...`, 'info');
            clienteMqtt = mqtt.connect(brokerUrl);

            // Tópicos baseados no HASH ÚNICO do armário (Assim o backend fala com o armário certo!)
            const topicBase = `easybox/${config.id}`;
            const topicCommand = `${topicBase}/control`;
            const topicStatus = `${topicBase}/status`;

            clienteMqtt.on('connect', () => {
                atualizarConexaoUI(true);
                adicionarLog(`✅ Conectado ao Broker. ID registrado: ${config.id}`, 'acao');
                
                clienteMqtt.subscribe(topicCommand);
                
                // Avisa o backend: "Ei, estou online, sou o armário tal"
                publicarStatus(topicStatus, 0, 'ONLINE');
            });

            clienteMqtt.on('message', (topic, message) => {
                try {
                    const msg = JSON.parse(message.toString());
                    adicionarLog(`📥 RECEBIDO: ${message.toString()}`, 'comando');
                    
                    if (msg.acao === 'ABRIR_PORTA') {
                        executarAbertura(msg.slot, topicStatus);
                    }
                } catch (e) {
                    adicionarLog("❌ Erro ao processar mensagem JSON", 'erro');
                }
            });

            clienteMqtt.on('close', () => atualizarConexaoUI(false));
        }

        function executarAbertura(id, statusTopic) {
            if (!estadoPortas[id]) return adicionarLog(`Slot ${id} não existe.`, 'erro');
            if (!estadoPortas[id].trancada) return;

            adicionarLog(`⚡ Atuador Slot ${id}: DESTRANCANDO`, 'acao');
            
            const porta = document.getElementById(`porta-${id}`);
            const led = document.getElementById(`led-${id}`);
            
            estadoPortas[id].trancada = false;
            porta.classList.replace('porta-fechada', 'porta-aberta');
            led.classList.replace('bg-red-500', 'bg-green-500');
            led.classList.add('shadow-[0_0_8px_rgba(34,197,94,0.5)]');

            publicarStatus(statusTopic, id, 'ABERTO');

            if (estadoPortas[id].timeout) clearTimeout(estadoPortas[id].timeout);
            
            // Simula o fechamento
            estadoPortas[id].timeout = setTimeout(() => {
                estadoPortas[id].trancada = true;
                porta.classList.replace('porta-aberta', 'porta-fechada');
                led.classList.replace('bg-green-500', 'bg-red-500');
                led.classList.remove('shadow-[0_0_8px_rgba(34,197,94,0.5)]');
                
                adicionarLog(`🔒 Atuador Slot ${id}: RE-TRANCADO`, 'acao');
                publicarStatus(statusTopic, id, 'FECHADO');
            }, 4000);
        }

        function publicarStatus(topico, id, status) {
            const payload = JSON.stringify({
                device: config.id,
                slot: id,
                status: status,
                ts: Date.now()
            });
            clienteMqtt.publish(topico, payload);
            adicionarLog(`📤 STATUS: ${status} (Slot ${id})`, 'status');
        }

        // --- UTILITÁRIOS ---
        function adicionarLog(msg, tipo) {
            const el = document.getElementById('log-console');
            const time = new Date().toLocaleTimeString();
            let color = 'text-slate-500';
            if (tipo === 'comando') color = 'text-blue-400 font-bold';
            if (tipo === 'acao') color = 'text-amber-400';
            if (tipo === 'status') color = 'text-emerald-500';
            if (tipo === 'erro') color = 'text-red-500';

            el.innerHTML += `<div><span class="text-slate-700">[${time}]</span> <span class="${color}">${msg}</span></div>`;
            el.scrollTop = el.scrollHeight;
        }

        function atualizarConexaoUI(ok) {
            const dot = document.getElementById('status-dot');
            const txt = document.getElementById('status-text');
            dot.className = `w-2.5 h-2.5 rounded-full ${ok ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`;
            txt.textContent = ok ? 'Conectado' : 'Desconectado';
            txt.className = `text-[10px] font-bold uppercase tracking-wider ${ok ? 'text-emerald-500' : 'text-slate-400'}`;
        }

        function simularBackendManual() {
            const id = parseInt(document.getElementById('input-abrir-id').value);
            if (!id) return;
            
            const topicCommand = `easybox/${config.id}/control`;
            clienteMqtt.publish(topicCommand, JSON.stringify({ acao: 'ABRIR_PORTA', slot: id }));
        }

        function limparLogs() { document.getElementById('log-console').innerHTML = ''; }
    </script>
</body>
</html>