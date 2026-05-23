
require("dotenv").config();
const http = require("http");
const createApp = require("./app");

const { attachws } = require("./wsHandler");

const PORT_1 = parseInt(process.env.PORT_1 || "3001", 10);

const PORT_2 = parseInt(process.env.PORT_2 || "3002", 10);

function connectcanvas(port) {
  const app    = createApp();
  
const server = http.createServer(app);

  attachws(server);

  server.listen(port, () => {
    console.log(`[server] listening on http://localhost:${port}`);
  }
);
return server;
}

connectcanvas(PORT_1);
connectcanvas(PORT_2);