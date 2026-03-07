import { Router } from 'express';
import prisma from '../prisma';
import { publishUnlockCommand } from '../mqtt';

const router = Router();
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

// Haversine formula to calculate distance between two lat/long points in meters
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; 
  return distance;
}

// POST /api/morador/abrir/:hash
router.post('/abrir/:hash', async (req: any, res: any) => {
  try {
    const { hash } = req.params;
    const { lat, long } = req.body;
    const clientIp = req.ip || 'unknown';

    // 1. Strict Rate Limiting (Prevent Brute Force on Hashes)
    // Max 5 attempts per minute per IP
    const now = Date.now();
    const rateData = rateLimitMap.get(clientIp) || { count: 0, timestamp: now };
    
    if (now - rateData.timestamp > 60000) {
      rateData.count = 1;
      rateData.timestamp = now;
    } else {
      rateData.count++;
      if (rateData.count > 5) {
        return res.status(429).json({ error: 'Muitas tentativas. Bloqueado por 1 minuto.' });
      }
    }
    rateLimitMap.set(clientIp, rateData);

    if (!lat || !long) {
      return res.status(400).json({ error: 'Permissao de localizacao (GPS) e obrigatoria!' });
    }

    // 2. Find Pending Delivery by Hash
    const entrega = await prisma.entrega.findUnique({
      where: { hashAbertura: hash },
      include: {
        slot: { include: { condominio: true } },
        morador: true
      }
    });

    if (!entrega) return res.status(404).json({ error: 'Link invalido ou inexistente' });
    if (entrega.status !== 'PENDENTE') return res.status(400).json({ error: `Esta entrega ja foi ${entrega.status}` });
    if (new Date() > entrega.expiraEm) {
        // Automatically mark as expired if caught
        await prisma.entrega.update({ where: { id: entrega.id }, data: { status: 'EXPIRADA' } });
        return res.status(400).json({ error: 'Link Expirado' });
    }

    // 3. Geofencing Check (Max 30 meters to account for GPS inaccuracy)
    const distanceMeters = getDistanceFromLatLonInMeters(
      lat, long, 
      entrega.slot.condominio.lat, entrega.slot.condominio.long
    );

    if (distanceMeters > 30) {
      return res.status(403).json({ 
        error: 'Voce esta muito longe do armario!', 
        distanceMeters: Math.round(distanceMeters) 
      });
    }

    // 4. APPROVED! Open the door via MQTT
    publishUnlockCommand(entrega.slot.condominio.id, entrega.slot.numeroPorta, hash);

    // 5. Update Database State
    await prisma.$transaction([
      prisma.entrega.update({
        where: { id: entrega.id },
        data: { status: 'FINALIZADA', dataAbertura: new Date() }
      }),
      prisma.slot.update({
        where: { id: entrega.slot.id },
        data: { status: 'LIVRE' }
      }),
      prisma.logAbertura.create({
        data: {
          slotId: entrega.slot.id,
          metodo: 'HASH_ENTREGA',
          quemAbriu: `Morador (Apto ${entrega.morador.apartamento})`
        }
      })
    ]);

    res.json({ message: 'Porta Aberta com Sucesso!', slot: entrega.slot.numeroPorta });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao validar abertura' });
  }
});

export default router;
