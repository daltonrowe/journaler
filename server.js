import fs from "node:fs";
import path from "node:path";
import express from "express";

const config = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "env.json"), "utf8"),
);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(
  express.static(path.join(import.meta.dirname, config.dir), {
    extensions: ["txt"],
  }),
);
app.use(express.static(path.join(import.meta.dirname, "assets")));

function sendView(req, res, next) {
  if (
    req.path.indexOf(".") !== -1 ||
    (req.path.match(/\//g) || []).length > 1
  ) {
    next();
    return;
  }

  const file = req.path === "/" ? "list" : req.path.split("?")[0];
  const template = fs
    .readFileSync(path.join(import.meta.dirname, "templates", `page.html`))
    .toString();
  const body = fs
    .readFileSync(path.join(import.meta.dirname, "views", `${file}.html`))
    .toString();

  const key = "<body>";
  const start = template.indexOf(key) + key.length;
  const content = template.slice(0, start) + body + template.slice(start);

  res.send(content);
}

app.get("/", sendView);
app.get("/write", sendView);

app.get("/list", (_req, res) => {
  const dir = path.join(import.meta.dirname, config.dir);
  const files = fs.readdirSync(dir);
  const dirs = files.filter((file) =>
    fs.statSync(path.join(dir, file)).isDirectory(),
  );

  res.json(dirs);
});

app.post("/entry", (req, res) => {
  const { entry } = req.body;

  const id = String(Date.now());
  fs.mkdirSync(path.join(config.dir, id));

  const file = path.join(import.meta.dirname, config.dir, id, "entry.txt");
  fs.writeFileSync(file, entry);

  res.json({ id });
});

app.put("/entry", (req, res) => {
  const { id, entry } = req.body;

  const file = path.join(import.meta.dirname, config.dir, id, "entry.txt");
  fs.writeFileSync(file, entry);

  res.send(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
