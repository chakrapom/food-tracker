require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/meals', require('./routes/meals'));
app.use('/api/foods', require('./routes/foods'));
app.use('/api/suggest', require('./routes/suggest'));
app.use('/api/summaries', require('./routes/summaries'));
app.use('/api/exercise', require('./routes/exercise'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
