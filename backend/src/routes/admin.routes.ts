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
    
    // Get all armarios for this condominio
    const armarios = await prisma.armario.findMany({
      where: { condominioId },
      include: {
        slots: {
          orderBy: { numeroPorta: 'asc' }
        }
      }
    });

    // Flatten slots for the UI if needed, or send grouped by armario
    const moradores = await prisma.morador.findMany({
      where: { condominioId },
      include: { telefones: true },
      orderBy: { apartamento: 'asc' }
    });

    res.json({ armarios, moradores });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Create slots for an Armario (PROVIDER or ADMIN)
router.post('/armario/:armarioId/slots', authMiddleware(['PROVIDER', 'ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { armarioId } = req.params;
    const { numeroPorta } = req.body;
    
    const armario = await prisma.armario.findUnique({ where: { id: armarioId } });
    if (!armario) return res.status(404).json({ error: 'Armário não encontrado' });

    // Topic is generated automatically or set conventionally
    const mqttTopic = `easybox/hardware/${armario.serialHash}/control`;

    const slot = await prisma.slot.create({
      data: { armarioId, numeroPorta, mqttTopic }
    });

    res.status(201).json(slot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create Slot' });
  }
});

// Register a Resident (ADMIN or PROVIDER)
router.post('/:condominioId/morador', authMiddleware(['ADMIN', 'PROVIDER']), async (req: AuthRequest, res) => {
  try {
    const { condominioId } = req.params;
    const { apartamento, telefones } = req.body; // telefones: string[]

    const morador = await prisma.morador.create({
      data: {
        condominioId,
        apartamento,
        telefones: {
          create: telefones.map((num: string) => ({ numero: num }))
        }
      },
      include: { telefones: true }
    });

    res.status(201).json(morador);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register Morador' });
  }
});

// Update Resident (ADMIN or PROVIDER)
router.put('/morador/:id', authMiddleware(['ADMIN', 'PROVIDER']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { apartamento, telefones } = req.body;

    // We replace all phones for this resident for simplicity
    await prisma.telefone.deleteMany({ where: { moradorId: id } });

    const morador = await prisma.morador.update({
      where: { id },
      data: {
        apartamento,
        telefones: {
          create: telefones.map((num: string) => ({ numero: num }))
        }
      },
      include: { telefones: true }
    });

    res.json(morador);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update Morador' });
  }
});

// Delete Resident (ADMIN or PROVIDER)
router.delete('/morador/:id', authMiddleware(['ADMIN', 'PROVIDER']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.morador.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete Morador' });
  }
});

// Force Unlock (EMERGENCY/MAINTENANCE) - Ignores Geofencing
router.post('/force-unlock', authMiddleware(['ADMIN', 'PROVIDER']), async (req: AuthRequest, res: any) => {
  try {
    const { slotId, masterPassword } = req.body;
    const user = req.user!;

    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      include: { armario: { include: { condominio: true } } }
    });

    if (!slot || !slot.armario.condominio) return res.status(404).json({ error: 'Slot or Condominio not found' });

    const isMasterValid = await bcrypt.compare(masterPassword, slot.armario.condominio.masterPasswordHash);
    if (!isMasterValid) return res.status(403).json({ error: 'Invalid Master Password' });

    // Send MQTT Command Immediately to the ARMARIO
    publishUnlockCommand(slot.armario.serialHash, slot.numeroPorta);

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

// Admin Setup (First Login)
router.put('/setup', authMiddleware(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    const { password, masterPassword } = req.body;
    const user = req.user!;
    const bcrypt = await import('bcrypt');

    const adminUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { condominio: true }
    });

    if (!adminUser || !adminUser.condominio) {
      return res.status(404).json({ error: 'Admin or Condominio not found' });
    }

    const updates: any = { mustChangePassword: false };
    if (password) {
      updates.passwordHash = await bcrypt.hash(password, 10);
    }

    // Update User
    await prisma.user.update({
      where: { id: adminUser.id },
      data: updates
    });

    // Update Condominio Master Password
    if (masterPassword) {
      const masterPasswordHash = await bcrypt.hash(masterPassword, 10);
      await prisma.condominio.update({
        where: { id: adminUser.condominio.id },
        data: { masterPasswordHash }
      });
    }

    res.json({ message: 'Configuração concluída com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar setup do administrador' });
  }
});

export default router;
