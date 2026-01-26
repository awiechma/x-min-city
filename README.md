cd ./backend
py -11.3 -m venv .venv
.venv/scripts/activate
pip install -r requirements.txt
uvicorn app:app --reload

cd ./frontend
npm install
npm run dev

JAVA
Python 3.11

# 🏙️ x-Minute-City Remscheid

[![Status](https://img.shields.io/badge/status-active-brightgreen)](#)
[![License](https://img.shields.io/badge/license-MIT-blue)](#license)
[![Python](https://img.shields.io/badge/python-3.11-blue?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-backend-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-frontend-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-build-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![OSM](https://img.shields.io/badge/Data-OpenStreetMap-7EBC6F?logo=openstreetmap&logoColor=white)](https://www.openstreetmap.org/)
[![R5](https://img.shields.io/badge/Routing-R5%20%2F%20R5Py-orange)](https://github.com/conveyal/r5py)

Webbasierte Analyse- und Visualisierungsplattform zur **bevölkerungsbezogenen Erreichbarkeit zentraler Alltagsfunktionen** im Sinne der **x-Minuten-Stadt**, umgesetzt am Beispiel der Stadt **Remscheid**.

Das Projekt entstand im Rahmen einer Bachelorarbeit im Studiengang **Geoinformatik**.

---

## ✨ Funktionen

- ⏱️ Zeitbasierte Erreichbarkeitsanalyse
- 🚶‍♂️🚴 Aktive Mobilität: Fuß- und Radverkehr
- 👥 Bevölkerungsgewichtete Kennzahlen (Zensus 2022)
- 🗺️ Stadtweite & quartiersbezogene Auswertung
- 🧩 Interaktive Szenarien (POIs hinzufügen/entfernen)
- 📊 Zwei zentrale Indikatoren:
  - Bevölkerungsabdeckung (%)
  - Mediane Reisezeit (Minuten)
- ⛰️ Berücksichtigung der Topografie (Routing mit Höhenmodell)

---

## 🧠 Methodischer Ansatz

- Routing: R5 / R5Py (netzwerkbasiert, inkl. Topografie)
- Daten:
  - OpenStreetMap (Straßennetz & POIs)
  - Zensus 2022 (100 m Raster)
  - Stadtteilgrenzen Remscheid

- Analyseebenen:
  - Zensuszellen
  - Aggregation auf Stadtteilebene

---

## 🧱 Systemarchitektur

```
Frontend (React + Vite)
        │
        │  HTTP / JSON
        ▼
Backend (FastAPI)
        │
        │  R5Py
        ▼
Routing & Accessibility (R5)
```

---

## 🚀 Installation (lokale Entwicklung)

### Voraussetzungen

- Python 3.11
- Node.js ≥ 18
- Java (für R5)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 📁 Projektstruktur (vereinfacht)

```
x-minute-city/
├── backend/
│ ├── app.py # FastAPI App Entry Point
│ ├── requirements.txt
│ ├── core/
│ │ ├── config.py # Zentrale Konfiguration
│ │ ├── schemas.py # Pydantic-Modelle
│ │ └── state.py # Globaler Analyse-/App-State
│ ├── routes/ # API-Endpunkte
│ │ ├── cityscope.py # Stadtweite Erreichbarkeitsanalyse
│ │ ├── districts.py # Stadtteil-Aggregationen
│ │ ├── grid.py # Zensuszellen-Logik
│ │ ├── isochrone.py # Isochronenberechnung
│ │ └── pois.py # POI-Endpunkte
│ ├── services/ # Fachlogik / Datenzugriff
│ │ ├── routing.py # R5Py-Routing & Reisezeiten
│ │ ├── overpass.py # OSM-POI-Abfragen
│ │ ├── zensus.py # Bevölkerungsdaten
│ │ └── districts.py # Bezirksverarbeitung
│ └── data/ # OSM, Höhenmodell, Bezirke
│
├── frontend/
│ ├── index.html
│ ├── vite.config.js
│ ├── package.json
│ ├── public/
│ │ └── images/
│ │     └── cityscope-preview.png
│ └── src/
│ ├── App.jsx
│ ├── main.jsx
│ ├── App.css
│ ├── tagConfig.js # POI-Kategorien & Labels
│ └── components/
│ ├── CityScopeComponents/
│ ├── css/
│ ├── CategorySidebar.jsx
│ ├── CityScope.jsx
│ ├── Header.jsx
│ ├── Impressum.jsx
│ ├── Landingpage.jsx
│ ├── LoadingOverlay.jsx
│ ├── ReachMap.jsx
│ ├── Sidebar.jsx
│ └── Tooltip.jsx
│
├── scripts/ # Hilfsskripte
├── .gitignore
└── README.md
```

---

## ⚠️ Einschränkungen

- Kein ÖPNV
- Keine individuellen Präferenzen oder Kosten
- Szenario-POIs werden nicht persistent gespeichert

---

## 📌 Ausblick

- Erweiterung auf weitere Städte
- Parallele Analyse mehrerer Zeitbudgets
- ÖPNV-Integration als separates Modul

---

## 📄 Lizenz

MIT License – siehe `LICENSE`
