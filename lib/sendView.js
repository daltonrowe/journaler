import fs from "fs"
import path from "path"

export default function sendView(req, res, next) {
  if (
    req.path.indexOf(".") !== -1 ||
    (req.path.match(/\//g) || []).length > 1
  ) {
    next();
    return;
  }

  const file = req.path === "/" ? "list" : req.path.split("?")[0];
  const template = fs
    .readFileSync(path.join(process.cwd(), "templates", `page.html`))
    .toString();
  const body = fs
    .readFileSync(path.join(process.cwd(), "views", `${file}.html`))
    .toString();

  const key = "<body>";
  const start = template.indexOf(key) + key.length;
  const content = template.slice(0, start) + body + template.slice(start);

  res.send(content);
}