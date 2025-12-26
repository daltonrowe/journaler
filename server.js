import express from 'express';
import path from 'path';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'env.json'), 'utf8'));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(import.meta.dirname, 'views'), {
  extensions: ['html']
}));

app.get('/list', (_req, res) => {
  const dir = path.join(import.meta.dirname, config.dir)
  const files = fs.readdirSync(dir);
  const dirs = files.filter(file => fs.statSync(path.join(dir, file)).isDirectory())

  res.json(dirs);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
