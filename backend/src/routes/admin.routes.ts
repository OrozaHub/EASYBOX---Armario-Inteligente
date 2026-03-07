import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { publishUnlockCommand } from '../mqtt';

const router = Router();

// Dashboard Route (Admin & Provider)
router.get('/:condominioId/dashboard', authMiddleware(['ADMIN', 'PROVIDER']), async (req: AuthRequest, res) => {
  try {
    const { condominioId } = req.params;
    
    const slots = await prisma.slot.findMany({
      where: { condominioId },
      orderBy: { numeroPorta: 'asc' }
    });

    const moradores = await prisma.morador.findMany({
      where: { condominioId },
      orderBy: { apartamento: 'asc' }
    });

    res.json({ slots, moradores });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Only PROVIDERs can register new Condominiums
router.post('/condominio', authMiddleware(['PROVIDER']), async (req: AuthRequest, res) => {
  try {
    const { nome, lat, long, masterPassword } = req.body;
    
    const masterPasswordHash = await bcrypt.hash(masterPassword, 10);
    const condominio = await prisma.condominio.create({
      data: { nome, lat, long, masterPasswordHash }
    });

    res.status(201).json(condominio);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create Condominio' });
  }
});

// Create slots for a Condominio (PROVIDER or ADMIN)
router.post('/:condominioId/slots', authMiddleware(['PROVIDER', 'ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { condominioId } = req.params;
    const { numeroPorta } = req.body;
    
    // Topic is generated automatically or set conventionally
    const mqttTopic = `easybox/${condominioId}/control`;

    const slot = await prisma.slot.create({
      data: { condominioId, numeroPorta, mqttTopic }
    });

    res.status(201).json(slot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create Slot' });
  }
});

// Register a Resident (ADMIN only)
router.post('/:condominioId/morador', authMiddleware(['ADMIN', 'PROVIDER']), async (req: AuthRequest, res) => {
  try {
    const { condominioId } = req.params;
    const { apartamento, telefone } = req.body;
    
    const morador = await prisma.morador.create({
      data: { condominioId, apartamento, telefone }
    });

    res.status(201).json(morador);
  } catch (error) {
    res.status(500).json({ error: 'Failed to register Morador' });
  }
});

// Force Unlock (EMERGENCY/MAINTENANCE) - Ignores Geofencing
router.post('/force-unlock', authMiddleware(['ADMIN', 'PROVIDER']), async (req: AuthRequest, res: any) => {
  try {
    const { slotId, masterPassword } = req.body;
    const user = req.user!;

    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      include: { condominio: true }
    });

    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    const isMasterValid = await bcrypt.compare(masterPassword, slot.condominio.masterPasswordHash);
    if (!isMasterValid) return res.status(403).json({ error: 'Invalid Master Password' });

    // Send MQTT Command Immediately
    publishUnlockCommand(slot.condominio.id, slot.numeroPorta);

    // Audit Log
    await prisma.logAbertura.create({
      data: {
        slotId: slot.id,
        metodo: 'MASTER_KEY',
        quemAbriu: `${user.role}: ${user.email} (App)`
      }
    });

    // Reset slot status to Livre just in case
    await prisma.slot.update({
      where: { id: slot.id },
      data: { status: 'LIVRE' }
    });

    // Expire any pending deliveries on this slot
    await prisma.entrega.updateMany({
      where: { slotId: slot.id, status: 'PENDENTE' },
      data: { status: 'CANCELADA' }
    });

    res.json({ message: `Slot ${slot.numeroPorta} forçado a abrir. Comando enviado via MQTT.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to force unlock' });
  }
});

export default router;
