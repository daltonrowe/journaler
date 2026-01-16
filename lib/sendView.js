import fs from "node:fs";
import path from "node:path";
import { root } from "../server.js";

export function template(file) {
  const template = fs
    .readFileSync(path.join(root, "templates", `page.html`))
    .toString();
  const content = fs
    .readFileSync(path.join(root, "views", `${file}.html`))
    .toString();

  return template.replace("<content />", content);

}

export default function sendView(req, res, next) {
  if (
    req.path.indexOf(".") !== -1 ||
    (req.path.match(/\//g) || []).length > 1
  ) {
    next();
    return;
  }

  const file = req.path === "/" ? "feeds" : req.path.split("?")[0];
  const html = template(file)

  res.send(html);
}