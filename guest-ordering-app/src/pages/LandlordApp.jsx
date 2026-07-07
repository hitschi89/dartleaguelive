import React, { useEffect, useRef, useState } from 'react';
import { ref, onValue, onChildAdded, update, serverTimestamp } from 'firebase/database';
import { db } from '../lib/firebase.js';
import { playNewOrderAlert, unlockAudio } from '../lib/alert.js';

export default function LandlordApp() {
  const [orders, setOrders] = useState({});
  const [tab, setTab] = useState('offen');
  const isInitialLoad = useRef(true);

  useEffect(() => {
    const ordersRef = ref(db, 'orders');

    const unsubscribeValue = onValue(ordersRef, (snapshot) => {
      setOrders(snapshot.val() || {});
      // The first value event fires with all existing orders; only alert on
      // orders that arrive after that initial snapshot has settled.
      isInitialLoad.current = false;
    });

    const unsubscribeAdded = onChildAdded(ordersRef, () => {
      if (!isInitialLoad.current) {
        playNewOrderAlert();
      }
    });

    return () => {
      unsubscribeValue();
      unsubscribeAdded();
    };
  }, []);

  function markDone(orderId) {
    update(ref(db, `orders/${orderId}`), {
      status: 'fertig',
      finishedAt: serverTimestamp(),
    });
  }

  const list = Object.entries(orders)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const open = list.filter((o) => o.status !== 'fertig');
  const archive = list
    .filter((o) => o.status === 'fertig')
    .sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  const visible = tab === 'offen' ? open : archive;

  return (
    <div className="page" onClick={unlockAudio}>
      <header className="page__header">
        <h1>Vermieter-Ansicht</h1>
        <p>Eingehende Bestellungen der Gäste</p>
      </header>

      <div className="tabs">
        <button
          className={`tab ${tab === 'offen' ? 'is-active' : ''}`}
          onClick={() => setTab('offen')}
        >
          Offen ({open.length})
        </button>
        <button
          className={`tab ${tab === 'archiv' ? 'is-active' : ''}`}
          onClick={() => setTab('archiv')}
        >
          Archiv ({archive.length})
        </button>
      </div>

      <div className="card-list">
        {visible.length === 0 && (
          <p className="empty-state">
            {tab === 'offen' ? 'Momentan keine offenen Bestellungen.' : 'Noch keine erledigten Bestellungen.'}
          </p>
        )}

        {visible.map((order) => (
          <OrderCard key={order.id} order={order} onMarkDone={markDone} showAction={tab === 'offen'} />
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order, onMarkDone, showAction }) {
  return (
    <section className="card order-card">
      <div className="order-card__header">
        <span className="order-card__time">{formatTime(order.createdAt)}</span>
        <span className={`badge ${order.status === 'fertig' ? 'badge--done' : 'badge--open'}`}>
          {order.status === 'fertig' ? 'Fertig' : 'Offen'}
        </span>
      </div>

      <div className="order-summary">
        {order.coffee?.wanted && (
          <p>
            ☕ Kaffee{order.coffee.milk ? ', mit Milch' : ', ohne Milch'}
            {order.coffee.sugar ? `, mit Zucker (${order.coffee.sugarSpoons} Löffel)` : ', ohne Zucker'}
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
        <p>💳 Zahlungsart: {order.payment?.method}</p>
      </div>

      {showAction && (
        <button className="btn btn--primary" onClick={() => onMarkDone(order.id)}>
          Fertig ✅
        </button>
      )}
    </section>
  );
}

function formatTime(value) {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '–';
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(value) {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
