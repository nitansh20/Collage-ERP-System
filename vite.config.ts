import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import express from 'express';
import cors from 'cors';
import { apiRouter } from './server/routes/api.js';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'dev-api-server',
      configureServer(server) {
        const app = express();
        app.use(cors());
        app.use(express.json({ limit: '50mb' }));
        app.use(express.urlencoded({ extended: true, limit: '50mb' }));
        app.use('/api', apiRouter);
        server.middlewares.use(app);
      },
    },
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
  },
});
