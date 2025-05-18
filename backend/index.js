const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'YOUR_SUPER_SECRET_KEY'; // Use env var in prod
const USERS_FILE = './users.json';
const PAYMENTS_FILE = './payments.json';

// Helper: load/save users/payments
const load = (file) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
const save = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// ----- USER AUTH ROUTES -----
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    const users = load(USERS_FILE);
    if (users.find(u => u.email === email)) return res.status(400).json({ error: "Email already exists" });
    const hashed = await bcrypt.hash(password, 10);
    users.push({ id: uuidv4(), name, email, password: hashed, role: 'user' });
    save(USERS_FILE, users);
    res.json({ message: "Signup successful" });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const users = load(USERS_FILE);
    const user = users.find(u => u.email === email);
    if (!user) return res.status(400).json({ error: "Invalid credentials" });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
    res.json({ token, name: user.name, email: user.email });
});

// Middleware: Auth
function requireAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "No token" });
    try {
        req.user = jwt.verify(auth.split(" ")[1], JWT_SECRET);
        next();
    } catch (e) {
        res.status(401).json({ error: "Invalid token" });
    }
}

// ----- PAYMENTS (AUTH PROTECTED) -----
app.post('/payments', requireAuth, (req, res) => {
    const { amount, method } = req.body;
    if (!amount || !method) return res.status(400).json({ error: "Amount/method required" });
    const payments = load(PAYMENTS_FILE);
    const txn = {
        id: uuidv4(),
        userId: req.user.id,
        amount, method,
        status: "SUCCESS",
        date: new Date().toISOString()
    };
    payments.unshift(txn);
    save(PAYMENTS_FILE, payments);
    res.json(txn);
});

app.get('/payments', requireAuth, (req, res) => {
    const payments = load(PAYMENTS_FILE).filter(txn => txn.userId === req.user.id);
    res.json(payments);
});

app.get('/me', requireAuth, (req, res) => {
    const users = load(USERS_FILE);
    const user = users.find(u => u.id === req.user.id);
    res.json({ name: user.name, email: user.email, role: user.role });
});

app.listen(3000, () => console.log('Backend running at http://localhost:3000'));
