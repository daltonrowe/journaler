const express = require('express');
const path = require('path');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'env.json'), 'utf8'));

const app = express();
const PORT = process.env.PORT || 3000;



// Middleware
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'views')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/list', (req, res) => {
  res.json({ items: [] });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
