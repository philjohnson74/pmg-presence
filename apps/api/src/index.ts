import { createServer } from './presentation/server.js';

const PORT = Number(process.env['PORT'] ?? 4000);

const app = createServer();

app.listen(PORT, () => {
  console.log(`PMG Presence API listening on http://localhost:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/api/health`);
});
