import fs from "node:fs";
import path from "node:path";
import express from "express";
import sendView from "./lib/sendView.js";
import spawnAndLog from "./lib/spawnAndLog.js";

const config = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "env.json"), "utf8"),
);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(process.cwd(), "assets")));

app.get("/", sendView);
app.get("/write", sendView);
app.get("/publish", sendView);

app.get("/staged", async (_req, res) => {
  const data = await spawnAndLog(
    "git add . && git diff --name-only --staged",
    config.repo,
  );
  const files = data.split("\n").filter((d) => !!d);
  res.json({ files });
});

app.post("/publish", async (_req, res) => {
  const stdout = await spawnAndLog(
    `git commit -m 'Journaler Publish ${Date.now()}' && git push`,
    config.repo,
  );
  res.json({ stdout });
});

app.get("/list", (_req, res) => {
  const dir = path.join(config.dir);
  const files = fs.readdirSync(dir);
  const dirs = files.filter((file) =>
    fs.statSync(path.join(dir, file)).isDirectory(),
  );

  res.json(dirs);
});

app.get("/entry", (req, res) => {
  const { id } = req.query;

  const entryFile = path.join(config.dir, String(id), "entry.txt");
  const metadataFile = path.join(config.dir, String(id), "metadata.json");
  const entry = fs.readFileSync(entryFile, { encoding: 'utf-8' });
  const metadata = fs.readFileSync(metadataFile, { encoding: 'utf-8' });

  res.json({ id, metadata, entry });
});

app.post("/entry", (req, res) => {
  const { entry, metadata } = req.body;

  const id = String(Date.now());
  fs.mkdirSync(path.join(config.dir, id));

  const entryFile = path.join(config.dir, id, "entry.txt");
  const metadataFile = path.join(config.dir, id, "metadata.json");
  fs.writeFileSync(entryFile, entry);
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

  res.json({ id });
});

app.put("/entry", (req, res) => {
  const { id, entry, metadata } = req.body;

  const entryFile = path.join(config.dir, id, "entry.txt");
  const metadataFile = path.join(config.dir, id, "metadata.json");
  fs.writeFileSync(entryFile, entry);
  fs.writeFileSync(metadataFile, metadata);

  res.send(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
