const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const compression = require('compression'); 

const app = express();
const PORT = 3000;
const SECRET_KEY = "secret_key_baltic_data"; 

app.use(compression()); 
app.use(cors());
app.use(express.json());

const products = [
  { id: 1, name: "Ноутбук Apple MacBook Air", price: 1200, category: "Комп'ютери", emoji: "💻" },
  { id: 2, name: "Смартфон Samsung Galaxy", price: 800, category: "Телефони", emoji: "📱" },
  { id: 3, name: "Навушники Sony WH-1000XM5", price: 350, category: "Аудіо", emoji: "🎧" },
  { id: 4, name: "Розумний годинник Apple Watch", price: 400, category: "Гаджети", emoji: "⌚" },
  { id: 5, name: "Планшет Apple iPad Pro", price: 900, category: "Комп'ютери", emoji: "📱" },
  { id: 6, name: "Ігрова консоль PlayStation 5", price: 550, category: "Гаджети", emoji: "🎮" }
];

const orders = [];
const users = []; 

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ message: "Користувач з таким ім'ям вже існує" });
  }
  const newUser = { id: users.length + 1, username, password };
  users.push(newUser);
  res.status(201).json({ message: "Реєстрація успішна! Тепер ви можете увійти." });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  
  if (!user) {
    return res.status(401).json({ message: "Невірне ім'я користувача або пароль" });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token, username: user.username });
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: "Потрібна авторизація" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: "Токен недійсний" });
    req.user = user; 
    next();
  });
};

app.get('/api/products', (req, res) => {
  res.json(products);
});

app.post('/api/orders', authenticateToken, (req, res) => {
  const { items, total, delivery } = req.body; 
  if (!items || items.length === 0) return res.status(400).json({ message: "Кошик порожній!" });

  const newOrder = {
    id: orders.length + 1,
    userId: req.user.id, 
    items,
    total,
    delivery, 
    date: new Date().toLocaleDateString('uk-UA') + ' ' + new Date().toLocaleTimeString('uk-UA'),
    status: "В обробці", 
    timestamp: Date.now() 
  };

  orders.push(newOrder);

  setTimeout(() => {
    const order = orders.find(o => o.id === newOrder.id);
    if (order) {
      order.status = "Оброблено";
    }
  }, 10000);

  res.status(201).json({ message: "Замовлення успішно оформлено!", orderId: newOrder.id });
});

app.get('/api/recommendations', authenticateToken, (req, res) => {
  const userOrders = orders.filter(order => order.userId === req.user.id);
  const boughtItemIds = new Set();
  userOrders.forEach(order => order.items.forEach(item => boughtItemIds.add(item.id)));
  let recommended = products.filter(p => !boughtItemIds.has(p.id));
  if (recommended.length === 0 || boughtItemIds.size === 0) recommended = products.slice(0, 3);
  else recommended = recommended.slice(0, 3);
  res.json(recommended);
});

app.listen(PORT, () => {
  console.log(`Server works at ${PORT}`);
});