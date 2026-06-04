require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const express = require('express');
const cors = require('cors');
const { init } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/meals', require('./routes/meals'));
app.use('/api/foods', require('./routes/foods'));
app.use('/api/suggest', require('./routes/suggest'));
app.use('/api/summaries', require('./routes/summaries'));
app.use('/api/exercise', require('./routes/exercise'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve built React client in production (after all API routes)
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

const PORT = process.env.PORT || 3001;

init()
  .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1); });
