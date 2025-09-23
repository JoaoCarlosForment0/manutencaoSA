const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const crypto = require("crypto");

app.use(express.json({ limit: "50mb" }));
app.use((req, res, next) => {
  console.log(
    "REQ",
    new Date(),
    req.method,
    req.url,
    "body=",
    JSON.stringify(req.body)
  );
  next();
});
const DB_FILE = path.join(__dirname, "tickets.json");
let cache = [];
setInterval(() => {
  cache.push({ ts: Date.now() });
  if (cache.length > 100) { // manter apenas os 100 últimos
    cache.shift(); // remove o item mais antigo
  }
}, 1000);
function readDb() {
  const txt = fs.readFileSync(DB_FILE, "utf8") || "[]";
  return JSON.parse(txt);
}
function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}
app.get("/tickets", (req, res) => {
  let list = readDb();
  if (req.query.filterField && req.query.filterValue) {
    const allowedFields = ["title", "customer", "status"];
    const field = req.query.filterField;

    if (allowedFields.includes(field)) {
      list = list.filter(
        (ticket) => String(ticket[field]).toLowerCase() === String(req.query.filterValue).toLowerCase()
      );
    }
  }

  res.json(list);
});
app.post("/tickets", (req, res) => {
  const { title, customer, status } = req.body;

  if (!title || !customer) {
    return res.status(400).json({ error: "title e customer são obrigatórios" });
  }

  const allowedStatus = ["open", "in_progress", "closed"];
  const ticketStatus = allowedStatus.includes(status) ? status : "open";

  const db = readDb();
  const id = crypto.randomUUID();

  db.push({
    id,
    title,
    customer,
    status: ticketStatus,
    createdAt: new Date().toISOString(),
  });

  writeDb(db);
  res.status(201).json({ ok: true});
});

app.put("/tickets/:id/status", (req, res) => {
  const db = readDb();
  const t = db.find((x) => x.id == req.params.id);
  if (!t) return res.status(404).send("not found");
  t.status = req.body.status;
  writeDb(db);
  res.json({ ok: true });
});
app.listen(3000, () => console.log("HelpDesk+ on 3000"));
