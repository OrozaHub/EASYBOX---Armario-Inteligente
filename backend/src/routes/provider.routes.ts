import { Router } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/provider/dashboard
// Fetch all Condominios and Admins registered in the system
router.get('/dashboard', authMiddleware(['PROVIDER']), async (req: AuthRequest, res) => {
  try {
    const condominios = await prisma.condominio.findMany({
      include: {
        _count: {
          select: { slots: true, moradores: true }
        }
      }
    });

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, name: true, email: true }
    });

    res.json({ condominios, admins });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch provider dashboard data' });
  }
});

export default router;
