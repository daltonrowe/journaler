import fs from "node:fs";
import path from "node:path";
import express from "express";
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

app.get("/feeds", async (_req, res) => {
  const feeds = Object.keys(config.feeds).map((id) => ({
    id,
    ...config.feeds[id],
  }));

  res.json({ feeds });
});

app.get("/:feed/publish", (_req, res) => {
  const html = template("publish");
  res.send(html);
});

app.get("/:feed/staged", async (req, res) => {
  const { repo } = config.feeds[req.params.feed];

  const data = await spawnAndLog(
    "git add . && git diff --name-only --staged",
    repo,
  );
  const files = data.split("\n").filter((d) => !!d);
  res.json({ files });
});

app.post("/:feed/publish", async (req, res) => {
  const { repo } = config.feeds[req.params.feed];

  const stdout = await spawnAndLog(
    `git commit -m 'Journaler Publish ${Date.now()}' && git push`,
    repo,
  );
  res.json({ stdout });
});

app.get("/:feed", (_req, res) => {
  const html = template("list");
  res.send(html);
});

app.get("/:feed/write", (req, res) => {
  const { format } = config.feeds[req.params.feed];

  let templateType = "write";

  switch (format) {
    case "markdown-ish":
      {
        templateType = "write-md";
      }
      break;

    default:
      // do nothing, use 'write'
      break;
  }

  const html = template(templateType);
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
  const { dir, visibility, title } = config.feeds[req.params.feed];

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

  res.json({ ids: dirs, title, syncKey });
});

app.get("/:feed/entry", (req, res) => {
  const { id = "new" } = req.query;
  const { dir } = config.feeds[req.params.feed];

  if (id === "new") {
    res.json({
      id: Date.now(),
      content: "",
      images: [],
      ...config.feeds[req.params.feed],
    });
  } else {
    const entryRoot = path.join(dir, String(id));
    const file = path.join(dir, String(id), "content.txt");
    const content = fs.readFileSync(file, { encoding: "utf-8" });

    const images = fs
      .readdirSync(entryRoot)
      .filter((f) => f.startsWith("image_"))
      .map((f) => f.replace(".png", ""));
    res.json({ id, content, images, ...config.feeds[req.params.feed] });
    return;
  }
});

app.post("/:feed/entry", (req, res) => {
  const { content, id } = req.body;
  const { dir } = config.feeds[req.params.feed];

  const entryPath = path.join(dir, String(id));

  try {
    fs.mkdirSync(entryPath);
  } catch (_error) {
    // already exists
  }

  const contentFile = path.join(entryPath, "content.txt");
  fs.writeFileSync(contentFile, content);

  res.json({ id });
});

app.get("/:feed/entry/image", (req, res) => {
  const { id, imageId } = req.query;
  const { dir, visibility } = config.feeds[req.params.feed];

  const imageFile = path.join(dir, id, imageId);

  if (visibility === "public") {
    const data = fs.readFileSync(`${imageFile}.png`);
    const base64 = `data:image/png;base64,${data.toString("base64")}`;
    res.send(base64);
  } else {
    const data = fs.readFileSync(imageFile);
    res.send(data);
  }
});

app.post("/:feed/entry/image", (req, res) => {
  const { id, imageId, data, width, height } = req.body;
  const { dir, visibility } = config.feeds[req.params.feed];

  const ext = visibility === "public" ? ".png" : "";
  const imageFile = path.join(
    dir,
    id,
    `image_${imageId}--${width}x${height}${ext}`,
  );

  if (visibility === "public") {
    const base64Data = data.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(imageFile, buffer);
  } else {
    fs.writeFileSync(imageFile, data);
  }

  res.send(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
