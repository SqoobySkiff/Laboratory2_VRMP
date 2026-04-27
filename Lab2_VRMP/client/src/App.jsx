import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import './App.css';

function MainApp() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [orderMessage, setOrderMessage] = useState("");

  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [username, setUsername] = useState(localStorage.getItem('username') || null);
  const [userOrders, setUserOrders] = useState([]);

  const [recommendations, setRecommendations] = useState([]);
  
  const navigate = useNavigate(); 

  useEffect(() => {
    fetch('http://localhost:3000/api/products')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => console.error("Помилка:", err));
  }, []);

  useEffect(() => {
    if (token) {
      fetch('http://localhost:3000/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setUserOrders(data); })
        .catch(console.error);

      fetch('http://localhost:3000/api/recommendations', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setRecommendations(data); })
        .catch(console.error);
    }
  }, [token, orderMessage]);

  useEffect(() => {
    const interval = setInterval(() => {
      setUserOrders(prevOrders => {
        const hasPending = prevOrders.some(order => order.status === "В обробці");
        if (!hasPending) return prevOrders;

        return prevOrders.map(order => {
          if (order.status === "В обробці" && order.timestamp && (Date.now() - order.timestamp >= 10000)) {
            return { ...order, status: "Оброблено" };
          }
          return order;
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const addToCart = (product) => {
    setCart([...cart, product]);
    setOrderMessage("");
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  const handleCheckout = (e) => {
    e.preventDefault();
    if (!token) {
      alert("Будь ласка, увійдіть в акаунт для оформлення замовлення.");
      return;
    }

    const deliveryData = {
      city: e.target.city.value,
      street: e.target.street.value,
      apartment: e.target.apartment.value,
      cardNumber: e.target.cardNumber.value,
      cvv: e.target.cvv.value
    };

    fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ items: cart, total: cartTotal, delivery: deliveryData }),
    })
      .then((res) => res.json())
      .then((data) => {
        alert(data.message);

        const newOrder = {
          id: data.orderId,
          items: cart,
          total: cartTotal,
          delivery: deliveryData,
          date: new Date().toLocaleDateString('uk-UA') + ' ' + new Date().toLocaleTimeString('uk-UA'),
          status: "В обробці",
          timestamp: Date.now()
        };
        setUserOrders(prev => [...prev, newOrder]);

        setCart([]);

        navigate('/profile'); 
      })
      .catch((err) => {
        console.error("Помилка оформлення:", err);
        alert("Помилка при оформленні замовлення");
      });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const form = e.target;
    
    fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.username.value,
        password: form.password.value
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          setToken(data.token);
          setUsername(data.username);
          localStorage.setItem('token', data.token);
          localStorage.setItem('username', data.username);
        } else {
          alert(data.message);
        }
      });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    const form = e.target;
    const username = form.username.value;
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;

    if (password !== confirmPassword) {
      alert("Паролі не співпадають!");
      return;
    }

    fetch('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message);
        if (data.message.includes("успішна")) {
          navigate("/login");
        }
      })
      .catch(err => console.error("Помилка реєстрації:", err));
  };

  const logout = () => {
    setToken(null);
    setUsername(null);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setCart([]);
    setUserOrders([]);
    setRecommendations([]);
    navigate("/");
  };

  return (
    <div className="container">
      <nav className="navbar">
        <Link to="/" className="nav-logo">Baltic Data</Link>
        <div className="nav-links">
          <Link to="/" className="catalog-link">Каталог</Link>
          <Link to="/cart" className="cart-link">
            Кошик
            {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
          </Link>
          {token ? (
            <>
              <Link to="/profile" className="catalog-link">{username}</Link>
              <button onClick={logout} className="logout-btn">Вийти</button>
            </>
          ) : (
            <Link to="/login" className="catalog-link">Увійти</Link>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={
          <div className="products-section">
            <h1>Каталог товарів</h1>
            {loading ? (
              <p className="loading-text">Завантаження…</p>
            ) : (
              <div className="products-grid">
                {products.map((product) => (
                  <div key={product.id} className="product-card">
                    <span className="product-image">{product.emoji}</span>
                    <h2 className="product-name">{product.name}</h2>
                    <div className="product-info">
                      <p className="category">{product.category}</p>
                      <p className="price">${product.price}</p>
                      <button className="buy-btn" onClick={() => addToCart(product)}>
                        + У кошик
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        } />

        <Route path="/cart" element={
          <div className="cart-page">
            <h1>Кошик</h1>
            <div className="cart-section">
              {cart.length === 0 ? (
                <p className="empty-cart">Кошик порожній</p>
              ) : (
                <div>
                  <ul className="cart-list">
                    {cart.map((item, index) => (
                      <li key={index} className="cart-item">
                        <span>{item.emoji} {item.name}</span>
                        <strong>${item.price}</strong>
                      </li>
                    ))}
                  </ul>
                  <div className="cart-total">
                    Разом: <strong>${cartTotal}</strong>
                  </div>
                  <Link to="/checkout" style={{textDecoration: 'none'}}>
                    <button className="checkout-btn" style={{width: '100%'}}>
                      Перейти до оформлення →
                    </button>
                  </Link>
                </div>
              )}
              {orderMessage && <div className="order-message">{orderMessage}</div>}
            </div>
          </div>
        } />

        <Route path="/checkout" element={
          token ? (
            <div className="auth-page" style={{ maxWidth: '450px' }}>
              <h1>Доставка</h1>
              <form className="auth-form" onSubmit={handleCheckout}>
                <input name="city" type="text" placeholder="Місто / Область" required />
                <input name="street" type="text" placeholder="Вулиця" required />
                <input name="apartment" type="text" placeholder="Номер будинку / квартири" required />
                <input name="cardNumber" type="text" placeholder="Номер картки" required />
                <input name="cvv" type="text" placeholder="CVV" required maxLength="3" />

                <div className="cart-total" style={{textAlign: 'center', marginTop: '15px'}}>
                  До сплати: <strong style={{color: 'var(--text-primary)'}}>${cartTotal}</strong>
                </div>

                <button type="submit" className="login-btn" style={{marginTop: '10px'}}>
                  Підтвердити замовлення
                </button>
              </form>
              <Link to="/cart" className="register-btn" style={{ display: 'inline-block', marginTop: '15px' }}>
                ← Назад до кошика
              </Link>
            </div>
          ) : <Navigate to="/login" />
        } />

        <Route path="/login" element={
          !token ? (
            <div className="auth-page">
              <h1>Вхід</h1>
              <form className="auth-form" onSubmit={handleLogin}>
                <input name="username" type="text" placeholder="Логін" required />
                <input name="password" type="password" placeholder="Пароль" required />
                <button type="submit" className="login-btn">Увійти</button>
              </form>
              <Link to="/register" className="register-btn" style={{ display: 'inline-block', marginTop: '15px' }}>
                Або зареєструватися
              </Link>
            </div>
          ) : <Navigate to="/profile" />
        } />

        <Route path="/register" element={
          !token ? (
            <div className="auth-page">
              <h1>Реєстрація</h1>
              <form className="auth-form" onSubmit={handleRegister}>
                <input name="username" type="text" placeholder="Логін" required />
                <input name="password" type="password" placeholder="Пароль" required />
                <input name="confirmPassword" type="password" placeholder="Підтвердіть пароль" required />
                <button type="submit" className="login-btn">Зареєструватися</button>
              </form>
              <Link to="/login" className="register-btn" style={{ display: 'inline-block', marginTop: '15px' }}>
                ← Назад до входу
              </Link>
            </div>
          ) : <Navigate to="/profile" />
        } />

        <Route path="/profile" element={
          token ? (
            <div className="profile-page">
              <h1>Особистий кабінет</h1>

              <div className="profile-content">
                <h2>Замовлення</h2>
                {userOrders.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'var(--mono)' }}>
                    Замовлень ще немає
                  </p>
                ) : (
                  <div className="orders-list">
                    {userOrders.map(order => (
                      <div key={order.id} className="order-card">
                        <h3>Order #{order.id}</h3>
                        <p className="order-date">{order.date}</p>
                        <p className="order-status" style={order.status === 'Оброблено' ?
                        {
                          background: 'rgba(37, 193, 45, 0.56)'
                        } : {}}>
                          {order.status}
                        </p>

                        {order.delivery && (
                          <div style={{
                            marginBottom: '12px', 
                            padding: '10px', 
                            background: 'var(--border)', 
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontFamily: 'var(--mono)'
                          }}>
                            <span style={{color: 'var(--text-secondary)'}}>Доставка:</span><br/>
                            м. {order.delivery.city}, вул. {order.delivery.street}, кв./буд. {order.delivery.apartment}
                          </div>
                        )}

                        <p>Сума: <strong>${order.total}</strong></p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {recommendations.length > 0 && (
                <div className="profile-content">
                  <h2>Рекомендовано</h2>
                  <p>На основі ваших покупок</p>
                  <div className="products-grid">
                    {recommendations.map((product) => (
                      <div key={product.id} className="product-card recommended-card">
                        <span className="product-image">{product.emoji}</span>
                        <h2 className="product-name">{product.name}</h2>
                        <div className="product-info">
                          <p className="category">{product.category}</p>
                          <p className="price">${product.price}</p>
                          <button className="buy-btn" onClick={() => addToCart(product)}>
                            + У кошик
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : <Navigate to="/login" />
        } />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  );
}

export default App;