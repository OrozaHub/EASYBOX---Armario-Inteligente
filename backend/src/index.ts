import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import providerRoutes from './routes/provider.routes';
import deliveryRoutes from './routes/delivery.routes';
import residentRoutes from './routes/resident.routes';
import { mqClient } from './mqtt';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/provider', providerRoutes);
app.use('/api/entrega', deliveryRoutes);
app.use('/api/morador', residentRoutes);

app.get('/', (req, res) => {
  res.send('EasyBox V2 API (Web + MQTT) is running!');
});

app.listen(port, () => {
  console.log(`🚀 EasyBox V2 Server running at http://localhost:${port}`);
  if(mqClient.connected) {
     console.log('📡 MQTT Publisher Ready.');
  }
});
