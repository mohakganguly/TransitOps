import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { seedIfEmpty } from './db.js';
import { startTelemetryLoop } from './telemetry.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import vehicleRoutes from './routes/vehicles.js';
import driverRoutes from './routes/drivers.js';
import tripRoutes from './routes/trips.js';
import maintenanceRoutes from './routes/maintenance.js';
import fuelRoutes from './routes/fuel.js';
import expenseRoutes from './routes/expenses.js';
import dashboardRoutes from './routes/dashboard.js';
import reportRoutes from './routes/reports.js';
import assistantRoutes from './routes/assistant.js';

seedIfEmpty();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'TransitOps API' }));

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', requireAuth, vehicleRoutes);
app.use('/api/drivers', requireAuth, driverRoutes);
app.use('/api/trips', requireAuth, tripRoutes);
app.use('/api/maintenance', requireAuth, maintenanceRoutes);
app.use('/api/fuel', requireAuth, fuelRoutes);
app.use('/api/expenses', requireAuth, expenseRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/reports', requireAuth, reportRoutes);
app.use('/api/assistant', requireAuth, assistantRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
startTelemetryLoop(io);

httpServer.listen(PORT, () => console.log(`TransitOps API running on http://localhost:${PORT}`));
