import dotenv from 'dotenv';
// Load environment variables before importing app
dotenv.config();

import app from './app';

const PORT = Number(process.env.PORT || 5000);
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`==================================================`);
  console.log(`PHARMACY MANAGEMENT SERVER RUNNING`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Host:        ${HOST}`);
  console.log(`Port:        ${PORT}`);
  console.log(`URL:         http://${HOST}:${PORT}`);
  console.log(`==================================================`);
});

// Graceful Shutdown support
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed.');
  });
});
