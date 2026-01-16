import fs from "node:fs";
import path from "node:path";
import express from "express";
import { alphaId } from "./lib/alphaId.js";
import sendView, { template } from "./lib/sendView.js";
import spawnAndLog from "./lib/spawnAndLog.js";

export const root = import.meta.dirname;

const config = JSON.parse(fs.readFileSync(path.join(root, "env.json"), "utf8"));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(root, "assets")));
app.use(express.static(config.dir));

app.get("/", sendView);
app.get("/publish", sendView);

app.get("/feeds", async (_req, res) => {
  const feeds = Object.keys(config.feeds).map(id => ({
    id,
    ...config.feeds[id]
  }))

  res.json({ feeds });
});

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

app.get("/:feed", (_req, res) => {
  const html = template('list')
  res.send(html)
});

app.get("/:feed/write", (_req, res) => {
  const html = template('write')
  res.send(html)
});


app.get("/:feed/list", (_req, res) => {
  console.log('hey!');

  const dir = path.join(config.dir);
  const files = fs.readdirSync(dir);
  const dirs = files.filter((file) =>
    fs.statSync(path.join(dir, file)).isDirectory(),
  );

  res.json(dirs);
});

app.get("/:feed/entry", (req, res) => {
  const { id } = req.query;

  const entryRoot = path.join(config.dir, id);
  const entryFile = path.join(config.dir, String(id), "entry.txt");
  const metadataFile = path.join(config.dir, String(id), "metadata.json");

  const entry = fs.readFileSync(entryFile, { encoding: "utf-8" });
  const metadata = JSON.parse(
    fs.readFileSync(metadataFile, { encoding: "utf-8" }),
  );
  const images = fs
    .readdirSync(entryRoot)
    .filter((f) => f.startsWith("image_"));

  res.json({ id, metadata, entry, images });
});

app.post("/:feed/entry", (req, res) => {
  const { entry, metadata } = req.body;

  const id = String(Date.now());
  fs.mkdirSync(path.join(config.dir, id));

  const entryFile = path.join(config.dir, id, "entry.txt");
  const metadataFile = path.join(config.dir, id, "metadata.json");

  fs.writeFileSync(entryFile, entry);
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

  res.json({ id });
});

app.post("/:feed/entry/image", (req, res) => {
  const { id, data } = req.body;

  const imageFile = path.join(config.dir, id, `image_${alphaId()}`);
  fs.writeFileSync(imageFile, data);

  res.send(200);
});

app.put("/:feed/entry", (req, res) => {
  const { id, entry, metadata } = req.body;

  const entryFile = path.join(config.dir, id, "entry.txt");
  const metadataFile = path.join(config.dir, id, "metadata.json");
  fs.writeFileSync(entryFile, entry);
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

  res.send(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
