<div align="center">

# 🏗️ SitePulse — Industrial Construction Management Platform

[![Phase](https://img.shields.io/badge/Version-MVP%20V1-blue?style=flat-square)]()
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Zustand](https://img.shields.io/badge/State-Zustand-orange?style=flat-square)](https://zustand-demo.pmnd.rs/)
[![License](https://img.shields.io/badge/License-Academic-blue?style=flat-square)]()

*A structured industrial execution management platform for Oil & Gas, Infrastructure, and Construction Projects.*

[Overview](#-overview) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [Modules](#-core-modules) • [Roadmap](#-roadmap)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Core Modules](#-core-modules)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Roadmap](#-roadmap)
- [Design Principles](#-design-principles)
- [License](#-license)

---

## 🎯 Overview

**SitePulse** is a mobile-first construction execution management system designed for:

- Oil & Gas Projects  
- Infrastructure  
- Large-scale Industrial Construction  

### Problem Statement

Industrial projects suffer from:

- ❌ Informal communication (WhatsApp chaos)
- ❌ Unstructured task delegation
- ❌ No hierarchical enforcement
- ❌ Poor procurement visibility
- ❌ Delayed quality corrective actions
- ❌ No real-time execution tracking

### SitePulse Solution

✔ Structured hierarchical delegation  
✔ Punch list task management  
✔ Daily production tracking  
✔ Procurement workflow control  
✔ Quality inspection automation  
✔ Overdue detection engine  
✔ Cross-department coordination  

---

## 🏗️ Architecture

### System Overview

```mermaid
graph TB
    A[User Authentication]
    B[Organization Hierarchy Engine]
    C[Task Module]
    D[Daily Reports]
    E[Procurement Workflow]
    F[Issues Engine]
    G[Quality Module]
    H[Dashboard]

    A --> B
    B --> C
    C --> D
    D --> E
    C --> F
    F --> G
    G --> H
    E --> H
    D --> H
````

---

### Hierarchy Logic (Core Engine)

```mermaid
graph TD
    PM[Project Manager]
    CM[Construction Manager]
    SUP[Supervisor]
    FOR[Foreman]
    WRK[Worker]

    PM --> CM
    CM --> SUP
    SUP --> FOR
    FOR --> WRK
```

Assignment is strictly restricted by hierarchy:

> A user can assign tasks only to themselves or to users within their reporting chain.

---

## 🛠️ Technology Stack

| Layer        | Technology         | Purpose                      |
| ------------ | ------------------ | ---------------------------- |
| Frontend     | Next.js 16         | App Router, SSR, routing     |
| Language     | TypeScript         | Strict typing                |
| State        | Zustand + Persist  | Global state + Local storage |
| Styling      | TailwindCSS        | Industrial UI                |
| Auth         | Local state (MVP)  | Future JWT ready             |
| Storage      | LocalStorage       | Backendless MVP              |
| Architecture | Modular App Router | Clean separation             |

---

## 🧩 Core Modules

### 1️⃣ Organization Module

* Hierarchical reporting structure
* Role-based color coding
* Multi-level tree rendering
* Department filtering
* Search functionality
* `canAssign()` logic enforcement

---

### 2️⃣ Task Management (Punch List)

* Create / Assign tasks
* Due date
* Priority
* Status tracking
* Parent-child subtasks
* Activity tracking
* Hierarchy-restricted assignment

---

### 3️⃣ Daily Reports

* Target vs Actual quantity
* Delay reasons mandatory if underperformance
* Category-based delay tracking
* Production monitoring

---

### 4️⃣ Procurement Module

Workflow:

```
Draft → Submitted → Approved → Ordered → Delivered
```

Overdue logic:

```
If Today > Needed By
AND status ≠ Delivered
→ Mark as Overdue
```

---

### 5️⃣ Issues Module

Workflow:

```
Open → In Progress → Blocked → Closed
```

Overdue detection engine included.

---

### 6️⃣ Quality Module

Inspection logic:

* Checklist (Pass / Fail / NA)
* If any Fail → Inspection = FAIL
* Auto-create corrective Issue
* Linked bidirectionally

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js >= 18
npm >= 9
```

---

### Installation

```bash
git clone https://github.com/your-username/sitepulse.git
cd sitepulse
npm install
npm run dev
```

Open:

```
http://localhost:3000
```

---

## 📁 Project Structure

```
sitepulse/
├── app/
│   ├── dashboard/
│   ├── login/
│   ├── register/
│   ├── organization/
│   ├── tasks/
│   └── layout.tsx
├── store/
│   ├── useUserStore.ts
│   ├── useTaskStore.ts
├── types/
│   ├── user.ts
│   ├── task.ts
├── lib/
│   └── hierarchy.ts
├── public/
├── package.json
└── README.md
```

---

## 🗺️ Roadmap

```mermaid
timeline
    title SitePulse Development Roadmap
    V1 : Organization + Auth + Hierarchy
    V2 : Task Engine + Restriction Logic
    V3 : Daily Reports + Delay Engine
    V4 : Procurement Workflow + Overdue Logic
    V5 : Issues + Corrective Automation
    V6 : Backend (Node + PostgreSQL + JWT)
    V7 : AI Predictive Delay Engine
```

---

## 🧠 Design Principles

* Industrial workflow first, UI second
* Hierarchy enforcement mandatory
* Validation rules strict
* Clean modular architecture
* Mobile-first
* Minimal clutter
* Structured execution logic
* MVP first, backend later

---

## 🔐 Security Note (MVP)

Current version uses:

* Local state persistence
* No encryption
* No JWT

Future version:

* Backend API
* Role-based access control (RBAC)
* JWT Authentication
* Audit trail logging

## 📸 Screenshots

### 🧠 Dashboard Overview
![Dashboard 1](assets/screenshots/Dashboard1.png)
![Dashboard 2](assets/screenshots/dashboard2.png)
![Dashboard 3](assets/screenshots/dashboard3.png)
![Dashboard 4](assets/screenshots/dashboard4.png)

---

### 📊 Reports & Progress Tracking
![Reports](assets/screenshots/reports.png)

---

### 🧩 Task Management
![Task](assets/screenshots/task1.png)

---

### 🏗 Project Management
![Project](assets/screenshots/project.png)

---

### ⚠️ Issue Tracking
![Issues](assets/screenshots/issue.png)

---

### 💰 Procurement
![Procurement](assets/screenshots/proc.png)

---

### ⏱ Overdue / Monitoring
![Overdue](assets/screenshots/over.png)
---

## 👤 Author

**Linda Jerbi**
Software Engineering Student
Tunisia 🇹🇳
2026

---

<div align="center">

⬆ Back to Top

Built for real industrial execution.

</div>