import fs from "node:fs";
import path from "node:path";
import express from "express";
import { alphaId } from "./lib/alphaId.js";
import sendView, { template } from "./lib/sendView.js";
import spawnAndLog from "./lib/spawnAndLog.js";

export const root = import.meta.dirname;

export const config = JSON.parse(
  fs.readFileSync(path.join(root, "env.json"), "utf8"),
);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(root, "assets")));

app.get("/", sendView);
app.get("/publish", sendView);

app.get("/feeds", async (_req, res) => {
  const feeds = Object.keys(config.feeds).map((id) => ({
    id,
    ...config.feeds[id],
  }));

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
  const html = template("list");
  res.send(html);
});

app.get("/:feed/write", (_req, res) => {
  const html = template("write");
  res.send(html);
});

app.post("/:feed/syncKey", (req, res) => {
  const { encrypted } = req.body;
  const { feed } = req.params;

  const { dir } = config.feeds[feed];

  const syncKeyPath = path.join(dir, "sync.txt");

  fs.writeFileSync(syncKeyPath, encrypted, {
    encoding: "UTF-8",
    flag: "wx",
  });

  res.send(200);
});

app.get("/:feed/list", (req, res) => {
  const { dir, visibility, type } = config.feeds[req.params.feed];

  let syncKey = null;

  if (visibility === "private") {
    try {
      syncKey = fs.readFileSync(path.join(dir, "sync.txt"), {
        encoding: "UTF-8",
      });
    } catch (_error) {
      syncKey = false;
    }
  }

  const files = fs.readdirSync(dir);
  const dirs = files.filter((file) =>
    fs.statSync(path.join(dir, file)).isDirectory(),
  );

  res.json({ ids: dirs, type, syncKey });
});

app.get("/:feed/entry", (req, res) => {
  const { id = 'new' } = req.query;
  const { dir } = config.feeds[req.params.feed];

  if (id === 'new') {
    res.json({ id: Date.now(), content: '', images: [], ...config.feeds[req.params.feed] });
  } else {
    const entryRoot = path.join(dir, String(id));
    const file = path.join(dir, String(id), "content.txt");
    const content = fs.readFileSync(file, { encoding: "utf-8" });

    const images = fs
      .readdirSync(entryRoot)
      .filter((f) => f.startsWith("image_"));
    res.json({ id, content, images, ...config.feeds[req.params.feed] });
    return
  }
});

app.post("/:feed/entry", (req, res) => {
  const { content, id } = req.body;
  const { dir } = config.feeds[req.params.feed]

  const entryPath = path.join(dir, String(id))

  try {
    fs.mkdirSync(entryPath);
  } catch (error) {
    // already exists
  }

  const contentFile = path.join(entryPath, "content.txt");
  fs.writeFileSync(contentFile, content);

  res.json({ id });
});

app.get("/:feed/entry/image", (req, res) => {
  const { id, imageId } = req.query;
  const { dir } = config.feeds[req.params.feed]

  const imageFile = path.join(dir, id, imageId);
  const data = fs.readFileSync(imageFile);

  res.send(data);
});

app.post("/:feed/entry/image", (req, res) => {
  const { id, data } = req.body;
  const { dir } = config.feeds[req.params.feed]

  const imageFile = path.join(dir, id, `image_${alphaId()}`);
  fs.writeFileSync(imageFile, data);

  res.send(200);
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
