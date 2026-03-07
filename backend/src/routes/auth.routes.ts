import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../prisma';
import { createToken } from '../utils/jwt.util';

const router = Router();

// Endpoint temporarily open to register the first System Provider
router.post('/register-provider', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // In production, THIS ROUTE MUST BE PROTECTED or REMOVED after first use.
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name, role: 'PROVIDER' }
    });

    res.status(201).json({ message: 'Provider registered successfully', userId: user.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = createToken({ id: user.id, role: user.role, email: user.email, condominioId: user.condominioId });
    
    res.json({ token, role: user.role, condominioId: user.condominioId });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
