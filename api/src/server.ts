import { createServer } from "node:http";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { db } from "./db.js";
import { attachWebSocket } from "./ws.js";

const server = createServer(createApp());
attachWebSocket(server);
server.listen(config.PORT, () => console.log(`API ready on http://localhost:${config.PORT}`));

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    server.close(() => db.$disconnect().then(() => process.exit(0)));
  });
}
