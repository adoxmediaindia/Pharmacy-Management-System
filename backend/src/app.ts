import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth-routes';
import userRoutes from './routes/user-routes';
import orderRoutes from './routes/order-routes';
import notificationRoutes from './routes/notification-routes';

const app = express();

// 1. CORS Configuration (Wildcard enabled to support local physical devices via Expo Go)
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 2. Body Parser
app.use(express.json());

// 3. Health Check route
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, status: 'healthy', timestamp: new Date() });
});

// 4. API Route Registration
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);

// 5. Global 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.url}` });
});

// 6. Global Error Handler Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'An unexpected error occurred on the server',
  });
});

export default app;
