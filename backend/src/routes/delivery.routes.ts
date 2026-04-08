import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../prisma';
import { publishUnlockCommand } from '../mqtt';
import axios from 'axios';

const router = Router();

// Haversine formula (Fallback)
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Google Maps Distance Estimation (Optional)
async function getGoogleDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat1},${lon1}&destinations=${lat2},${lon2}&key=${apiKey}`;
    const response = await axios.get(url);
    if (response.data.rows[0].elements[0].status === 'OK') {
      return response.data.rows[0].elements[0].distance.value; // in meters
    }
  } catch (err) {
    console.error('Google Maps API Error:', err);
  }
  return null;
}

// POST /api/entrega/detectar-local
router.post('/detectar-local', async (req: any, res: any) => {
  try {
    const { lat, long } = req.body;
    if (!lat || !long) return res.status(400).json({ error: 'Localização é obrigatória' });

    const condominios = await prisma.condominio.findMany();
    
    const nearby = condominios
      .map(c => ({ 
        ...c, 
        distance: getDistanceFromLatLonInMeters(lat, long, c.lat, c.long) 
      }))
      .filter(c => c.distance <= 500) // 500m radius for detection
      .sort((a, b) => a.distance - b.distance);

    if (nearby.length === 0) {
      return res.status(404).json({ error: 'Nenhum armário EasyBox encontrado nesta localização.' });
    }

    res.json({ 
      id: nearby[0].id, 
      nome: nearby[0].nome,
      distance: Math.round(nearby[0].distance)
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao detectar localização' });
  }
});

// POST /api/entrega/verificar-ap
router.post('/verificar-ap', async (req: any, res: any) => {
  try {
    const { condominioId, apartamento } = req.body;
    
    const morador = await prisma.morador.findUnique({
      where: { condominioId_apartamento: { condominioId, apartamento } }
    });

    if (!morador) return res.status(404).json({ error: 'Apartamento não encontrado neste condomínio' });

    res.json({ 
      success: true, 
      moradorId: morador.id 
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao verificar apartamento' });
  }
});

// POST /api/entrega/abrir-vago
router.post('/abrir-vago', async (req: any, res: any) => {
  try {
    const { condominioId, lat, long } = req.body;

    const condo = await prisma.condominio.findUnique({ where: { id: condominioId } });
    if (!condo) return res.status(404).json({ error: 'Condomínio não encontrado' });

    // Validate Distance
    let distance = await getGoogleDistance(lat, long, condo.lat, condo.long);
    if (distance === null) {
      distance = getDistanceFromLatLonInMeters(lat, long, condo.lat, condo.long);
    }

    if (distance > 60) {
      return res.status(403).json({ error: `Você está longe demais do armário (${Math.round(distance)}m).` });
    }

    const freeSlot = await prisma.slot.findFirst({
      where: { 
        armario: { condominioId: condominioId },
        status: 'LIVRE' 
      },
      include: { armario: true }
    }) as any;

    if (!freeSlot) return res.status(400).json({ error: 'Nenhum armário disponível no momento' });

    publishUnlockCommand(freeSlot.armario.serialHash, freeSlot.numeroPorta, 'COURIER_ACCESS');

    await prisma.slot.update({
      where: { id: freeSlot.id },
      data: { status: 'OCUPADO' }
    });

    res.json({ slot: freeSlot.numeroPorta, slotId: freeSlot.id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao abrir armário' });
  }
});

// POST /api/entrega/finalizar
router.post('/finalizar', async (req: any, res: any) => {
  try {
    const { slotId, moradorId } = req.body;

    const hashAbertura = crypto.randomBytes(16).toString('hex');
    const expiraEm = new Date();
    expiraEm.setHours(expiraEm.getHours() + 24);

    const morador: any = await prisma.morador.findUnique({ 
      where: { id: moradorId },
      include: { telefones: true }
    });
    const slot = await prisma.slot.findUnique({ where: { id: slotId } });

    if (!morador || !slot) return res.status(404).json({ error: 'Dados inválidos' });

    await prisma.entrega.create({
      data: {
        slotId,
        moradorId,
        hashAbertura,
        expiraEm
      }
    });

    // Verification Code (Masked Phones)
    const maskedPhones = morador.telefones.map(t => `****${t.numero.slice(-4)}`);

    // MOCK: Notification
    const unlockLink = `http://localhost:5173/cliente-final/${hashAbertura}`;
    console.log(`\n📦 [EASYBOX] NOTIFICAÇÃO ENVIADA PARA: ${morador.telefones[0]?.numero}`);
    console.log(`Olá! Sua encomenda chegou no armário ${slot.numeroPorta}.`);
    console.log(`Link: ${unlockLink}`);

    res.json({ 
      success: true, 
      maskedPhones,
      message: 'Entrega finalizada. Confira os números acima!' 
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao finalizar entrega' });
  }
});

export default router;
