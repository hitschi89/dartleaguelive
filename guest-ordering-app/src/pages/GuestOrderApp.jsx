import React, { useEffect, useState } from 'react';
import { ref, push, onValue, serverTimestamp } from 'firebase/database';
import { db } from '../lib/firebase.js';
import { calculateTotal } from '../lib/pricing.js';

const STORAGE_KEY = 'guestOrderApp.currentOrderId';

const EQUIPMENT_OPTIONS = ['GoPro', 'DJI Pocket 3'];

const emptyForm = {
  coffeeWanted: false,
  coffeeMilk: false,
  coffeeSugar: false,
  coffeeSpoons: 1,
  lumpiaWanted: false,
  lumpiaQuantity: 1,
  equipmentWanted: false,
  equipmentType: EQUIPMENT_OPTIONS[0],
  equipmentFrom: '',
  equipmentTo: '',
  message: '',
  payment: 'Bar',
};

function buildOrderPayload(form) {
  return {
    createdAt: serverTimestamp(),
    status: 'offen',
    coffee: {
      wanted: form.coffeeWanted,
      milk: form.coffeeMilk,
      sugar: form.coffeeSugar,
      sugarSpoons: form.coffeeSugar ? Number(form.coffeeSpoons) || 0 : 0,
    },
    lumpia: {
      wanted: form.lumpiaWanted,
      quantity: form.lumpiaWanted ? Number(form.lumpiaQuantity) || 0 : 0,
    },
    equipment: {
      wanted: form.equipmentWanted,
      type: form.equipmentWanted ? form.equipmentType : null,
      from: form.equipmentWanted ? form.equipmentFrom : null,
      to: form.equipmentWanted ? form.equipmentTo : null,
    },
    message: form.message.trim(),
    payment: {
      method: form.payment,
    },
  };
}

export default function GuestOrderApp() {
  const [form, setForm] = useState(emptyForm);
  const [orderId, setOrderId] = useState(() => localStorage.getItem(STORAGE_KEY) || null);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!orderId) return undefined;
    const orderRef = ref(db, `orders/${orderId}`);
    const unsubscribe = onValue(orderRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        localStorage.removeItem(STORAGE_KEY);
        setOrderId(null);
        setOrder(null);
        return;
      }
      setOrder(data);
    });
    return () => unsubscribe();
  }, [orderId]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.coffeeWanted && !form.lumpiaWanted && !form.equipmentWanted) {
      setError('Bitte wähle mindestens einen Wunsch aus (Kaffee, Lumpia oder Equipment).');
      return;
    }
    if (form.equipmentWanted && (!form.equipmentFrom || !form.equipmentTo)) {
      setError('Bitte gib für den Equipment-Verleih einen Zeitraum an.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildOrderPayload(form);
      const newRef = await push(ref(db, 'orders'), payload);
      localStorage.setItem(STORAGE_KEY, newRef.key);
      setOrderId(newRef.key);
      setOrder({ ...payload, createdAt: Date.now() });
    } catch (err) {
      setError('Bestellung konnte nicht gesendet werden. Bitte erneut versuchen.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  function startNewOrder() {
    localStorage.removeItem(STORAGE_KEY);
    setOrderId(null);
    setOrder(null);
    setForm(emptyForm);
  }

  if (order) {
    return <OrderStatus order={order} onNewOrder={startNewOrder} />;
  }

  const total = calculateTotal({
    coffee: { wanted: form.coffeeWanted },
    lumpia: { wanted: form.lumpiaWanted, quantity: form.lumpiaQuantity },
    equipment: {
      wanted: form.equipmentWanted,
      type: form.equipmentType,
      from: form.equipmentFrom,
      to: form.equipmentTo,
    },
  });

  const paypalName = import.meta.env.VITE_PAYPAL_NAME || 'DEINNAME';
  const paypalLink = `https://paypal.me/${paypalName}/${total.toFixed(2)}`;

  return (
    <div className="page">
      <header className="page__header">
        <h1>Herzlich willkommen 👋</h1>
        <p>Bestelle dir Kaffee, Lumpia oder leih dir Equipment aus.</p>
      </header>

      <form className="card-list" onSubmit={handleSubmit}>
        <section className="card">
          <label className="card__toggle">
            <input
              type="checkbox"
              checked={form.coffeeWanted}
              onChange={(e) => updateField('coffeeWanted', e.target.checked)}
            />
            <span>☕ Kaffee</span>
          </label>
          {form.coffeeWanted && (
            <div className="card__body">
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.coffeeMilk}
                  onChange={(e) => updateField('coffeeMilk', e.target.checked)}
                />
                Mit Milch
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.coffeeSugar}
                  onChange={(e) => updateField('coffeeSugar', e.target.checked)}
                />
                Mit Zucker
              </label>
              {form.coffeeSugar && (
                <label className="field">
                  Anzahl Löffel
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={form.coffeeSpoons}
                    onChange={(e) => updateField('coffeeSpoons', e.target.value)}
                  />
                </label>
              )}
            </div>
          )}
        </section>

        <section className="card">
          <label className="card__toggle">
            <input
              type="checkbox"
              checked={form.lumpiaWanted}
              onChange={(e) => updateField('lumpiaWanted', e.target.checked)}
            />
            <span>🥟 Lumpia</span>
          </label>
          {form.lumpiaWanted && (
            <div className="card__body">
              <label className="field">
                Stückzahl
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={form.lumpiaQuantity}
                  onChange={(e) => updateField('lumpiaQuantity', e.target.value)}
                />
              </label>
            </div>
          )}
        </section>

        <section className="card">
          <label className="card__toggle">
            <input
              type="checkbox"
              checked={form.equipmentWanted}
              onChange={(e) => updateField('equipmentWanted', e.target.checked)}
            />
            <span>📷 Equipment-Verleih</span>
          </label>
          {form.equipmentWanted && (
            <div className="card__body">
              <label className="field">
                Gerät
                <select
                  value={form.equipmentType}
                  onChange={(e) => updateField('equipmentType', e.target.value)}
                >
                  {EQUIPMENT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Von
                <input
                  type="datetime-local"
                  value={form.equipmentFrom}
                  onChange={(e) => updateField('equipmentFrom', e.target.value)}
                />
              </label>
              <label className="field">
                Bis
                <input
                  type="datetime-local"
                  value={form.equipmentTo}
                  onChange={(e) => updateField('equipmentTo', e.target.value)}
                />
              </label>
            </div>
          )}
        </section>

        <section className="card">
          <label className="field">
            💬 Sonderwünsche / Nachricht
            <textarea
              rows="3"
              placeholder="z. B. Kaffee bitte extra heiß..."
              value={form.message}
              onChange={(e) => updateField('message', e.target.value)}
            />
          </label>
        </section>

        <section className="card">
          <h2 className="card__title">Zahlungsart</h2>
          <div className="payment-options">
            <label className={`payment-option ${form.payment === 'Bar' ? 'is-active' : ''}`}>
              <input
                type="radio"
                name="payment"
                value="Bar"
                checked={form.payment === 'Bar'}
                onChange={() => updateField('payment', 'Bar')}
              />
              💶 Bar
            </label>
            <label className={`payment-option ${form.payment === 'PayPal' ? 'is-active' : ''}`}>
              <input
                type="radio"
                name="payment"
                value="PayPal"
                checked={form.payment === 'PayPal'}
                onChange={() => updateField('payment', 'PayPal')}
              />
              🅿️ PayPal
            </label>
          </div>

          {total > 0 && (
            <p className="total-line">
              Voraussichtlicher Betrag: <strong>{total.toFixed(2)} €</strong>
            </p>
          )}

          {form.payment === 'PayPal' && total > 0 && (
            <a className="paypal-link" href={paypalLink} target="_blank" rel="noreferrer">
              Jetzt mit PayPal bezahlen ({total.toFixed(2)} €)
            </a>
          )}
        </section>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Wird gesendet…' : 'Bestellung senden'}
        </button>
      </form>
    </div>
  );
}

function OrderStatus({ order, onNewOrder }) {
  const isDone = order.status === 'fertig';

  return (
    <div className="page page--status">
      <div className={`status-card ${isDone ? 'status-card--done' : ''}`}>
        {isDone ? (
          <>
            <div className="status-icon">✅</div>
            <h1>Fertig – bitte im Flur abholen</h1>
          </>
        ) : (
          <>
            <div className="status-icon spin">⏳</div>
            <h1>Bestellung wird bearbeitet…</h1>
          </>
        )}

        <div className="order-summary">
          {order.coffee?.wanted && (
            <p>
              ☕ Kaffee{order.coffee.milk ? ', mit Milch' : ''}
              {order.coffee.sugar ? `, mit Zucker (${order.coffee.sugarSpoons} Löffel)` : ''}
            </p>
          )}
          {order.lumpia?.wanted && <p>🥟 Lumpia x{order.lumpia.quantity}</p>}
          {order.equipment?.wanted && (
            <p>
              📷 {order.equipment.type} ({formatDateTime(order.equipment.from)} –{' '}
              {formatDateTime(order.equipment.to)})
            </p>
          )}
          {order.message && <p>💬 „{order.message}“</p>}
          <p>Zahlungsart: {order.payment?.method}</p>
        </div>

        {isDone && (
          <button className="btn btn--primary" onClick={onNewOrder}>
            Neue Bestellung
          </button>
        )}
      </div>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
