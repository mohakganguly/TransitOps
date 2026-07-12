# TransitOps — Smart Transport Operations Platform

TransitOps is an end-to-end intelligent fleet management platform that streamlines transport operations including vehicle management, driver administration, trip dispatching, maintenance tracking, fuel & expense management, fleet analytics, real-time vehicle tracking, and an AI-powered natural language assistant.

---

# Tech Stack

### Frontend
- React 18 (Vite)
- Tailwind CSS v4
- React Router
- Recharts
- React Leaflet
- Socket.io Client

### Backend
- Node.js
- Express.js
- JWT Authentication
- bcrypt Password Hashing
- Socket.io

### AI Service
- FastAPI
- Groq LLM
- Text-to-SQL Pipeline
- SQLite
- Prompt Engineering

### Database
- SQLite (better-sqlite3)

---

# Project Architecture

```
                   React Frontend
                         │
         ┌───────────────┼────────────────┐
         │               │                │
         ▼               ▼                ▼
     Express API    Socket.io       FastAPI AI
         │               │                │
         └───────────────┼────────────────┘
                         │
                   SQLite Database
```

The platform consists of:

- MERN-based Transport Management System
- AI Chat Assistant Microservice
- Real-Time Fleet Tracking Engine

---

# Quick Start

### Backend (Port 4000)

```bash
cd server
npm install
npm run dev
```

### Frontend (Port 5173)

```bash
cd client
npm install
npm run dev
```

### AI Assistant (Port 8000)

```bash
cd chat_assistant

python -m venv .venv

# Windows
.venv\Scripts\activate

pip install -r requirements.txt

uvicorn chat_assistant.backend.app.main:app --reload
```

Swagger Documentation

```
http://127.0.0.1:8000/docs
```

---

# Demo Accounts

Password for all accounts

```
demo1234
```

| Role | Email |
|------|------|
| Fleet Manager | manager@transitops.com |
| Driver | driver@transitops.com |
| Safety Officer | safety@transitops.com |
| Financial Analyst | finance@transitops.com |

---

# Core Features

## Authentication & RBAC

- JWT Authentication
- Secure Password Hashing
- Role-Based Authorization
- Protected API Endpoints

---

## Dashboard

- Fleet KPIs
- Active Trips
- Fleet Utilization
- Driver Availability
- Vehicle Status Overview
- License Expiry Alerts
- Interactive Charts

---

## Vehicle Management

- Complete CRUD
- Vehicle Status Management
- Region Assignment
- Load Capacity Tracking
- Odometer Tracking
- Acquisition Cost Tracking

Vehicle Status

- Available
- On Trip
- In Shop
- Retired

---

## Driver Management

- Driver CRUD
- License Validation
- License Expiry Tracking
- Safety Score
- Driver Availability

Driver Status

- Available
- On Trip
- Off Duty
- Suspended

---

## Trip Management

Trip Lifecycle

```
Draft
      ↓
Dispatched
      ↓
Completed
      ↓
Cancelled
```

Automatic updates

- Vehicle Status
- Driver Status
- Odometer
- Revenue
- Fuel Consumption

---

## Maintenance Management

- Open/Close Maintenance Logs
- Vehicle Service History
- Maintenance Cost Tracking
- Automatic Vehicle Locking During Repairs

---

## Fuel & Expense Tracking

- Fuel Logs
- Fuel Cost
- Operational Expenses
- Maintenance Cost
- ROI Calculation
- Vehicle-wise Cost Reports

---

## Reports & Analytics

- Fleet Utilization
- Fuel Efficiency
- Revenue Reports
- Operational Cost
- Vehicle ROI
- CSV Export

---

# AI Fleet Assistant

TransitOps includes an enterprise-style AI assistant capable of answering fleet-related questions in natural language.

## Architecture

```
User Question
        │
        ▼
FastAPI
        │
        ▼
Groq LLM
        │
        ▼
Text-to-SQL
        │
        ▼
SQL Validation
        │
        ▼
SQLite Database
        │
        ▼
Query Results
        │
        ▼
Groq Response Generation
        │
        ▼
Natural Language Answer
```

## Features

- Natural Language Queries
- Text-to-SQL Generation
- SQL Validation
- Safe Read-Only Queries
- Natural Language Responses
- Swagger API Documentation
- REST API Integration
- Production SQLite Database Integration

Example Questions

```
Show available vehicles

Show completed trips

Which driver has the highest safety score?

Which vehicle has the highest maintenance cost?

Show suspended drivers

Which vehicle generated the highest revenue?

Show operational expenses by vehicle.
```

---

# Real-Time Fleet Tracking

TransitOps features a live fleet monitoring dashboard that displays every dispatched vehicle simultaneously on an interactive map.

## Backend

- Socket.io WebSocket Streaming
- Live Telemetry Engine
- Background Fleet Simulation
- SQLite-backed Active Trip Loading
- Route Waypoint Interpolation
- In-Memory Fleet State
- Unified Telemetry Broadcasts

Every 2 seconds

```
SQLite
      ↓
Load Active Trips
      ↓
Advance Vehicle Position
      ↓
Generate Fleet Frame
      ↓
Socket.io Broadcast
```

Channel

```
fleet:telemetry
```

Payload

```json
[
  {
    "trip_id": 1,
    "vehicle_name": "Truck-01",
    "reg_no": "DL08CD2001",
    "route": "Delhi → Jaipur",
    "lat": 28.6139,
    "lng": 77.2090
  }
]
```

---

## Frontend

Built using

- React Leaflet
- OpenStreetMap
- Socket.io Client

Features

- Multi-Vehicle Live Tracking
- Automatic Marker Movement
- Dynamic Vehicle Popups
- Auto Zoom & Fit Bounds
- Smooth Position Updates
- Route Visualization
- Responsive Map Interface

Vehicle Popup

- Vehicle Name
- Registration Number
- Trip ID
- Source
- Destination

---

# Business Rules

Server-side validations enforce

1. Unique vehicle registration numbers.
2. Retired/In-Shop vehicles cannot be dispatched.
3. Suspended or expired-license drivers cannot be assigned.
4. Vehicles and drivers cannot be double-booked.
5. Cargo weight cannot exceed vehicle capacity.
6. Dispatch automatically updates vehicle and driver status.
7. Completing a trip restores availability and updates odometer.
8. Cancelling dispatched trips restores vehicle and driver status.
9. Active maintenance locks vehicles from dispatch.
10. AI Assistant executes only validated read-only SQL queries.

---

# REST APIs

## Express Backend

- Authentication
- Vehicles
- Drivers
- Trips
- Fuel
- Maintenance
- Reports

## FastAPI AI

```
POST /api/v1/assistant/chat
```

Request

```json
{
    "question": "Show available vehicles"
}
```

Response

```json
{
    "success": true,
    "answer": "There are 5 available vehicles..."
}
```

# Highlights

- Enterprise Fleet Management Platform
- AI-Powered Fleet Assistant
- Real-Time Fleet Tracking
- Live Socket.io Telemetry
- Interactive Maps
- Role-Based Access Control
- Analytics & Reporting
- Production SQLite Integration
- FastAPI Microservice Architecture
- REST APIs
- Responsive UI