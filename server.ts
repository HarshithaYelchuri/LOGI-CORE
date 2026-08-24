import http from 'http';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/apiRoutes';
import { initWebSocketServer } from './server/wsServer';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Mount API router FIRST
  app.use('/api', apiRouter);

  // Create HTTP server instance
  const server = http.createServer(app);

  // Attach WebSocket server for real-time dispatch updates
  initWebSocketServer(server);

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Last-Mile Delivery Tracker running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
