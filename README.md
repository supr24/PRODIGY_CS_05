# 🛡️ CyDR v2 – Cybersecurity Detection & Response Platform

> **Production-Grade 7-Layer OSI Stack Telemetry Engine & Active Threat Mitigation Platform**

CyDR v2 is a modular, high-performance **Network Detection and Response (NDR)** platform that monitors, analyzes, and actively mitigates network threats across **all seven layers of the OSI model**.

Unlike traditional Intrusion Detection Systems (IDS) that simply log suspicious activity, CyDR performs **real-time detection, process correlation, and automated mitigation**, allowing security analysts to identify and stop attacks within seconds.

---

# 📌 Table of Contents

- Overview
- Features
- Architecture
- OSI Layer Analysis
- Active Defense
- Technology Stack
- Project Structure
- Installation
- Running the Project
- Interface Guide
- Future Improvements
- License

---

# 🌌 Overview

CyDR v2 is designed for cybersecurity students, researchers, and SOC analysts who want to visualize network traffic from Layer 1 through Layer 7 while automatically responding to malicious activities.

The platform consists of:

- FastAPI backend
- React + Vite frontend
- WebSocket-based live telemetry
- Deep Packet Inspection (DPI)
- Process-to-network mapping
- Automated firewall blocking
- Process termination engine

Instead of treating packets independently, CyDR correlates packets with operating system processes, session states, transport protocols, and application behavior.

---

# ✨ Features

## 🔍 Real-Time Packet Monitoring

- Live packet capture
- WebSocket streaming
- Low-latency telemetry

---

## 🌐 Complete OSI Layer Inspection

Supports analysis across all seven OSI layers.

- Layer 1 – Physical
- Layer 2 – Data Link
- Layer 3 – Network
- Layer 4 – Transport
- Layer 5 – Session
- Layer 6 – Presentation
- Layer 7 – Application

---

## 🧠 Deep Packet Inspection

Identifies protocols including:

- HTTP
- HTTPS
- DNS
- SSH
- TCP
- UDP

Maps packets back to the originating application process.

---

## ⚡ Active Threat Response

Automatically responds to detected threats by:

- Blocking malicious IP addresses
- Terminating compromised processes
- Detecting reconnaissance scans
- Identifying plaintext credential leaks

---

## 📊 Interactive Dashboard

- Live telemetry feed
- Security incident log
- Layer-by-layer packet analysis
- Packet filtering
- Search functionality
- Performance optimized rendering

---

## 🎓 Learners' Corner

Educational module explaining:

- OSI model
- Packet traversal
- Network protocols
- Layer responsibilities

Designed specifically for cybersecurity students.

---

# 🏗️ System Architecture

```
                React + Vite Frontend
                        │
                  WebSocket Stream
                        │
                FastAPI + Uvicorn
                        │
        ┌──────── Packet Capture ────────┐
        │                                │
     Scapy                         psutil
        │                                │
 Packet Inspection          Process Mapping
        │                                │
        └──────── Threat Detection ──────┘
                        │
                Automated Mitigation
                        │
 Firewall Rules • Process Termination
```

---

# 🌐 OSI Layer Analysis

## Layer 1 – Physical

**Purpose**

Monitor hardware interface state.

**Collected Information**

- Interface status
- Link speed
- NIC statistics

Uses:

```
psutil.net_if_stats()
```

---

## Layer 2 – Data Link

Analyzes Ethernet frames.

Captures:

- Source MAC
- Destination MAC
- ARP activity

Uses:

```
scapy.Ether
```

---

## Layer 3 – Network

Parses:

- IPv4
- IPv6

Captures:

- Source IP
- Destination IP

Supports automated IP blocking.

---

## Layer 4 – Transport

Analyzes:

- TCP
- UDP

Captures:

- Source Port
- Destination Port
- SYN
- ACK
- FIN
- RST Flags

Used for detecting:

- Port scanning
- Suspicious connections

---

## Layer 5 – Session

Maintains session state.

Tracks:

- SYN_SENT
- SYN_RECEIVED
- ESTABLISHED
- TERMINATED

---

## Layer 6 – Presentation

Inspects payload formatting.

Detects:

- UTF-8
- ASCII
- Binary
- TLS
- SSL

Determines whether traffic is encrypted.

---

## Layer 7 – Application

Performs Deep Packet Inspection.

Maps packets to:

- Application name
- Process ID
- Running service

Detects:

- HTTP
- HTTPS
- DNS
- SSH
- Credential leaks

---

# 🚨 Active Defense Engine

CyDR doesn't simply detect attacks—it actively mitigates them.

## 🛡️ Automated Firewall Isolation

When excessive scanning behavior is detected:

### Windows

```
netsh advfirewall firewall add rule
```

### Linux

```
iptables
```

### macOS

```
pfctl
```

The offending IP is immediately blocked.

---

## 🔥 Process Containment

If plaintext credentials are detected:

- Finds owning process
- Maps socket
- Terminates process

Using:

```
psutil.Process().terminate()
```

---

# 💻 Technology Stack

## Backend

- Python 3.11+
- FastAPI
- Uvicorn
- Scapy
- psutil
- WebSockets

---

## Frontend

- React 18
- Vite
- JavaScript
- CSS

---

## Networking

- TCP/IP
- IPv4
- IPv6
- Ethernet
- HTTP
- HTTPS
- DNS
- SSH

---

# 📁 Project Structure

```
CyDR-v2/
│
├── backend/
│   ├── app/
│   ├── requirements.txt
│   └── ...
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
│
└── README.md
```

---

# ⚙️ Installation

## Prerequisites

- Python 3.11+
- Node.js (LTS)
- Git

### Windows Users

Install **Npcap** to enable packet capture.

---

# 🚀 Backend Setup

```bash
cd backend

python -m venv venv
```

Activate virtual environment.

### Windows

```bash
venv\Scripts\activate
```

### Linux/macOS

```bash
source venv/bin/activate
```

Install dependencies.

```bash
pip install --upgrade pip

pip install -r requirements.txt
```

---

# ▶️ Start Backend

Run with Administrator/root privileges.

```bash
python -m uvicorn app.main:app --reload
```

Backend starts at:

```
http://127.0.0.1:8000
```

---

# 🌐 Frontend Setup

```bash
cd frontend

npm install
```

Run the development server.

```bash
npm run dev -- --force
```

Frontend launches at:

```
http://localhost:5173
```

---

# 🖥️ User Interface

The dashboard provides:

- 📡 Live network telemetry
- 📊 Packet history
- 🔍 Search functionality
- 🧠 OSI layer explorer
- 🚨 Security incident log
- 🎓 Learners' Corner

---

# 🛡️ Threat Detection Examples

### Port Scan Detection

```
[11:44:02]

⚠️ CRITICAL

Stealth Port Scan Detected

Countermeasure:
Firewall rule added to block attacker.
```

---

### Credential Leak Detection

```
[11:45:15]

⚠️ DANGER

Unencrypted credentials detected.

Countermeasure:
Associated process terminated.
```

---

# 🚀 Future Improvements

- Machine Learning threat detection
- Threat Intelligence integration
- SIEM integration
- Geo-IP visualization
- Dark mode dashboard
- Historical packet storage
- Docker deployment
- Kubernetes support
- Role-Based Access Control (RBAC)
- Alert notifications via Email/Slack

---

# 🎯 Use Cases

- Cybersecurity Labs
- Academic Research
- SOC Training
- Network Forensics
- Blue Team Exercises
- Security Monitoring
- Educational Demonstrations

---

# 📜 License

This project is licensed under the **MIT License**.

You are free to use, modify, distribute, and enhance the project for educational, research, or professional purposes.

---

# 👨‍💻 Author

**Supriya**

Cybersecurity Student | Network Security Enthusiast | Blue Team Learner

---

## ⭐ Support

If you found this project useful, consider giving it a **⭐ Star** on GitHub to support the project.
