const express = require("express");
const WebSocket = require("ws");
const axios = require("axios");

const app = express();
app.use(express.static("public"));

const server = app.listen(process.env.PORT || 3000, () =>
  console.log("Servidor rodando")
);

const wss = new WebSocket.Server({ server });

let clients = [];

wss.on("connection", (ws) => {
  clients.push(ws);
});

// Calcular RSI
function calculateRSI(closes, period = 14) {
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < closes.length; i++) {
    let diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  let rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Buscar dados Binance
async function getSignal() {
  try {
    const response = await axios.get(
      "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=15"
    );

    const closes = response.data.map(c => parseFloat(c[4]));
    const rsi = calculateRSI(closes);

    if (rsi < 30) return "ACIMA";
    if (rsi > 70) return "ABAIXO";
    return "AGUARDANDO";

  } catch (err) {
    return "ERRO";
  }
}

// Enviar sinal a cada 10 segundos
setInterval(async () => {
  const signal = await getSignal();

  clients.forEach(ws => {
    ws.send(JSON.stringify({ signal }));
  });

}, 10000);
