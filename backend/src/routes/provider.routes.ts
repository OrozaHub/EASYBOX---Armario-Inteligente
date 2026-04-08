import { Router } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { pendingHardwareSpecs } from '../mqtt';

const router = Router();

// GET /api/provider/dashboard
// Fetch all Condominios, Armarios and Admins
router.get('/dashboard', authMiddleware(['PROVIDER']), async (req: AuthRequest, res) => {
  try {
    const condominios = await prisma.condominio.findMany({
      include: {
        _count: {
          select: { moradores: true, armarios: true }
        }
      }
    });

    const armarios = await prisma.armario.findMany({
      include: {
        condominio: { select: { nome: true } },
        _count: { select: { slots: true } }
      }
    });

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, name: true, email: true, condominio: { select: { nome: true } } }
    });

    res.json({ condominios, armarios, admins });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch provider dashboard data' });
  }
});

// --- ARMARIO MANAGEMENT ---

// POST /api/provider/armario
// Create a new virtual cabinet with a serialHash
router.post('/armario', authMiddleware(['PROVIDER']), async (req: AuthRequest, res) => {
  try {
    const { nome } = req.body;
    const serialHash = req.body.serialHash?.trim().toUpperCase();

    if (!serialHash) return res.status(400).json({ error: 'Serial Hash é obrigatório.' });

    const armario = await prisma.armario.create({
      data: { serialHash, nome }
    });

    // CHECK FOR PENDING HARDWARE ANNOUNCEMENTS
    const pendingSlots = pendingHardwareSpecs.get(serialHash);
    if (pendingSlots) {
      console.log(`📦 [Provider Import] Found pending spec for ${serialHash}. Importing ${pendingSlots.length} slots...`);
      for (const numeroPorta of pendingSlots) {
        await prisma.slot.create({
          data: {
            armarioId: armario.id,
            numeroPorta: numeroPorta.toString(),
            status: 'LIVRE',
            mqttTopic: `easybox/hardware/${serialHash}/control`
          }
        });
      }
      // Remove from cache after import
      pendingHardwareSpecs.delete(serialHash);
    }

    res.status(201).json(armario);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create Armario. Serial hash might be in use.' });
  }
});

// PUT /api/provider/armario/:id/assign
// Assign an Armario to a Condominio
router.put('/armario/:id/assign', authMiddleware(['PROVIDER']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { condominioId } = req.body;
    const armario = await prisma.armario.update({
      where: { id },
      data: { condominioId: condominioId || null }
    });
    res.json(armario);
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign Armario' });
  }
});

// DELETE /api/provider/armario/:id
router.delete('/armario/:id', authMiddleware(['PROVIDER']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.armario.delete({ where: { id } });
    res.json({ message: 'Armario deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete Armario' });
  }
});

// --- CONDOMINIO MANAGEMENT ---

// POST /api/provider/condominio
// Create a new Condominium
router.post('/condominio', authMiddleware(['PROVIDER']), async (req: AuthRequest, res) => {
  try {
    const { nome, lat, long, masterPassword } = req.body;
    const bcrypt = await import('bcrypt');
    const masterPasswordHash = await bcrypt.hash(masterPassword, 10);
    
    const condominio = await prisma.condominio.create({
      data: { nome, lat, long, masterPasswordHash }
    });

    res.status(201).json(condominio);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create Condominio' });
  }
});

// PUT /api/provider/condominio/:id
// Update an existing Condominium
router.put('/condominio/:id', authMiddleware(['PROVIDER']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { nome, lat, long, masterPassword } = req.body;
    const updateData: any = { nome, lat, long };

    if (masterPassword) {
      const bcrypt = await import('bcrypt');
      updateData.masterPasswordHash = await bcrypt.hash(masterPassword, 10);
    }

    const condominio = await prisma.condominio.update({
      where: { id },
      data: updateData
    });

    res.json(condominio);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update Condominio' });
  }
});

// DELETE /api/provider/condominio/:id
// Delete a Condominium (Warning: Cascades)
router.delete('/condominio/:id', authMiddleware(['PROVIDER']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.condominio.delete({ where: { id } });
    res.json({ message: 'Condominio deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete Condominio' });
  }
});

// --- ADMIN MANAGEMENT ---

// POST /api/provider/admin
// Create a new Admin user and link to a Condominio
router.post('/admin', authMiddleware(['PROVIDER']), async (req: AuthRequest, res) => {
  try {
    const { email, password, name, condominioId } = req.body;
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'ADMIN',
        condominioId
      }
    });

    res.status(201).json({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create Admin' });
  }
});

// DELETE /api/provider/admin/:id
// Delete an Admin user
router.delete('/admin/:id', authMiddleware(['PROVIDER']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete Admin' });
  }
});

// PUT /api/provider/admin/:id
// Update Admin details
router.put('/admin/:id', authMiddleware(['PROVIDER']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, condominioId } = req.body;
    const bcrypt = await import('bcrypt');
    
    const updateData: any = { name, email };
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    if (condominioId) {
      updateData.condominioId = condominioId;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData
    });

    res.json({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update Admin' });
  }
});

export default router;
