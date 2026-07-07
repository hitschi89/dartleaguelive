# Gästeservice – Bestell-App & Vermieter-App

Zwei Ansichten einer React/Vite-App, live verbunden über eine gemeinsame
**Firebase Realtime Database**:

- **Bestell-App** (`/`) – läuft auf dem Tablet im Gästebereich
- **Vermieter-App** (`/#/vermieter`) – läuft auf Handy/Tablet des Vermieters

Beide Ansichten sind in derselben App enthalten, aber als getrennte URLs
aufrufbar (z. B. zwei Browser-Tabs / zwei Geräte / als Lesezeichen).

## 1. Firebase-Projekt einrichten

1. Auf https://console.firebase.google.com ein neues Projekt anlegen.
2. **Build → Realtime Database → Datenbank erstellen** (Standort z. B.
   `europe-west1`), im Testmodus starten.
3. Unter **Projekteinstellungen → Allgemein → Ihre Apps** eine Web-App
   hinzufügen und die SDK-Konfigurationswerte kopieren.
4. Die Realtime-Database-Regeln aus [`database.rules.json`](./database.rules.json)
   im Tab **Regeln** der Realtime Database einfügen und veröffentlichen.

> **Sicherheitshinweis:** Die mitgelieferten Regeln erlauben jedem, der die
> Datenbank-URL kennt, Bestellungen zu lesen/schreiben – es gibt bewusst
> keine Anmeldung, damit Gäste ohne Account bestellen können. Für den
> Betrieb in einem einzelnen Gästehaus mit privat gehaltenen URLs ist das
> ein üblicher Kompromiss. Wer mehr Sicherheit braucht, kann Firebase
> Anonymous Auth + Custom Claims ergänzen und die Regeln entsprechend
> verschärfen.

## 2. Umgebungsvariablen

```bash
cp .env.example .env
```

`.env` mit den Werten aus Schritt 1.3 füllen, außerdem `VITE_PAYPAL_NAME`
auf den eigenen PayPal.me-Namen setzen (z. B. `MaxMuster` für
`https://paypal.me/MaxMuster`).

## 3. Installieren & starten

```bash
npm install
npm run dev
```

- Bestell-App: http://localhost:5173/
- Vermieter-App: http://localhost:5173/#/vermieter

Für den echten Einsatz beide URLs auf den jeweiligen Geräten als
Startseite/Lesezeichen einrichten (auf dem Gäste-Tablet ggf. im
Kiosk-/Vollbildmodus des Browsers).

## 4. Bauen & deployen

```bash
npm run build
```

Der Ordner `dist/` kann auf beliebigem statischen Hosting bereitgestellt
werden, z. B. Firebase Hosting:

```bash
npm install -g firebase-tools
firebase init hosting   # "dist" als public-Verzeichnis wählen, SPA: Yes
firebase deploy
```

## Datenmodell (Realtime Database)

```
orders/
  {orderId}/
    createdAt: <server timestamp>
    status: "offen" | "fertig"
    finishedAt: <server timestamp>       // gesetzt sobald "fertig"
    coffee: { wanted, milk, sugar, sugarSpoons }
    lumpia: { wanted, quantity }
    equipment: { wanted, type, from, to }
    message: string
    payment: { method: "Bar" | "PayPal" }
```

## Funktionsübersicht

**Bestell-App**
- Kaffee (Milch/Zucker/Löffelanzahl), Lumpia (Stückzahl), Equipment-Verleih
  (GoPro / DJI Pocket 3 + Zeitraum), Nachrichtenfeld, Zahlungsart.
- Bei PayPal wird automatisch ein `paypal.me`-Link mit dem berechneten
  Betrag angezeigt.
- Nach dem Senden: "Bestellung wird bearbeitet…", live aktualisiert auf
  "✅ Fertig – bitte im Flur abholen", sobald der Vermieter die Bestellung
  abschließt. Die laufende Bestellung wird lokal gemerkt, damit ein
  Tablet-Reload den Status nicht verliert.

**Vermieter-App**
- Live-Liste aller offenen Bestellungen mit Uhrzeit, Details und Button
  "Fertig ✅".
- Akustischer Hinweis (Web Audio Beep) + Vibration bei neu eingehender
  Bestellung.
- Erledigte Bestellungen wandern automatisch in den Tab "Archiv".
