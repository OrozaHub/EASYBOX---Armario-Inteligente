import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../prisma';

const router = Router();

// Basic memory rate-limiter for this endpoint
const rateLimitMap = new Map<string, number>();

// POST /api/entrega/registrar
router.post('/registrar', async (req: any, res: any) => {
  try {
    const { condominioId, apartamento } = req.body;
    const clientIp = req.ip || 'unknown';

    // Anti-Spam: 1 request per 10 seconds per IP
    const now = Date.now();
    const lastRequest = rateLimitMap.get(clientIp);
    if (lastRequest && now - lastRequest < 10000) {
      return res.status(429).json({ error: 'Too many requests. Please wait.' });
    }
    rateLimitMap.set(clientIp, now);

    // 1. Find the resident
    const morador = await prisma.morador.findUnique({
      where: {
        condominioId_apartamento: { condominioId, apartamento }
      }
    });

    if (!morador) return res.status(404).json({ error: 'Morador não encontrado neste condomínio' });

    // 2. Find a FREE slot
    const freeSlot = await prisma.slot.findFirst({
      where: { condominioId, status: 'LIVRE' }
    });

    if (!freeSlot) return res.status(400).json({ error: 'Nenhum armário livre no momento' });

    // 3. Generate Secure Hash & Expiration
    const rawString = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
    // Using a URL-safe Base64 encoded SHA256 hash or simple random hex to be the link
    const hashAbertura = crypto.createHash('sha256').update(rawString).digest('hex').substring(0, 32); 
    
    const expiraEm = new Date();
    expiraEm.setHours(expiraEm.getHours() + 24); // +24 hours validity

    // 4. Create Entrega and Lock Slot
    const [entrega] = await prisma.$transaction([
      prisma.entrega.create({
        data: {
          slotId: freeSlot.id,
          moradorId: morador.id,
          hashAbertura,
          expiraEm
        }
      }),
      prisma.slot.update({
        where: { id: freeSlot.id },
        data: { status: 'OCUPADO' }
      })
    ]);

    // 5. MOCK: WhatsApp Notification Trigger
    const unlockLink = `https://easybox.com.br/abrir/${hashAbertura}`;
    console.log(`\n========================================`);
    console.log(`📱 [WHATSAPP API MOCK] Enviado para ${morador.telefone}`);
    console.log(`📦 Encomenda chegou no Armário ${freeSlot.numeroPorta}`);
    console.log(`🔗 Link de Abertura: ${unlockLink}`);
    console.log(`========================================\n`);

    res.status(201).json({
      message: 'Entrega registrada com sucesso. O morador foi notificado.',
      slot: freeSlot.numeroPorta
      // Do NOT send the hash in production response to the delivery guy for security!
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao registrar entrega' });
  }
});

export default router;
