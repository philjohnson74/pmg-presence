import { createContainer } from './container.js';
import { createServer } from './presentation/server.js';
import { config } from './config/index.js';

const container = createContainer();
const app = createServer(container);

app.listen(config.port, () => {
  console.log(`PMG Presence API listening on http://localhost:${config.port}`);
  console.log(`  Health: http://localhost:${config.port}/api/health`);
});
