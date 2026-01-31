const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { serviceAccount, port } = require('./config');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const dealRoutes = require('./routes/deals');
const feedRoutes = require('./routes/feed');

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/channels', require('./routes/channels'));
app.use('/api/insights', require('./routes/insights'));
app.use('/api/inbox', require('./routes/inbox'));

// Health Check
app.get('/', (req, res) => {
    res.send('Credant Backend is Live');
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
