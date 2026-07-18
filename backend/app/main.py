import asyncio
import threading
import time
import random
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.analyzer import packet_queue, FullOSINDREngine
from app.sniffer import start_sniffer_engine
import psutil

analyzer = FullOSINDREngine()

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    async def broadcast(self, data: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                pass

manager = ConnectionManager()

async def pipeline_worker():
    loop = asyncio.get_running_loop()
    while True:
        packet = await loop.run_in_executor(None, packet_queue.get)
        try:
            telemetry = analyzer.analyze(packet)
            if telemetry:
                await manager.broadcast({"type": "PACKET", "data": telemetry})
        except Exception as e:
            print(f"Pipeline error: {e}")
        finally:
            packet_queue.task_done()

async def network_info_streamer():
    last_io = psutil.net_io_counters()
    last_time = time.time()
    interfaces = psutil.net_if_stats()
    active_iface = "Loopback Adapter"
    for name, stats in interfaces.items():
        if stats.isup and name != "Loopback Pseudo-Interface 1":
            active_iface = name
            break

    while True:
        await asyncio.sleep(1.0)
        current_io = psutil.net_io_counters()
        current_time = time.time()
        elapsed = current_time - last_time
        download_speed = ((current_io.bytes_recv - last_io.bytes_recv) * 8) / (1024 * 1024) / elapsed
        upload_speed = ((current_io.bytes_sent - last_io.bytes_sent) * 8) / (1024 * 1024) / elapsed
        
        await manager.broadcast({
            "type": "NET_INFO",
            "data": {
                "interface": active_iface,
                "download": f"{download_speed:.2f} Mbps",
                "upload": f"{upload_speed:.2f} Mbps"
            }
        })
        last_io = current_io
        last_time = current_time

async def mock_packet_generator():
    while True:
        protos = [("TCP", 443, "HTTPS"), ("TCP", 80, "HTTP"), ("UDP", 53, "DNS"), ("TCP", 22, "SSH")]
        p_choice = random.choice(protos)
        mock_telemetry = {
            "id": f"{time.time()}-{random.randint(0,100000)}",
            "timestamp": time.strftime('%H:%M:%S'),
            "src_ip": random.choice(["192.168.1.105", "10.0.0.4", "127.0.0.1"]),
            "dst_ip": random.choice(["8.8.8.8", "142.250.190.46", "1.1.1.1"]),
            "proto": p_choice[0],
            "app_proto": p_choice[2],
            "dport": p_choice[1],
            "size": random.randint(64, 1500),
            "process_context": {
                "pid": random.choice([4122, 8912, 1044]),
                "name": random.choice(["chrome.exe", "spotify.exe", "discord.exe", "python.exe"]),
                "path": "C:\\Program Files\\Application\\binary.exe",
                "user": "NetRunner"
            },
            "hex_dump": "4500003c2e1c40004006bda5c0a80132a0f0776562736f636b6574",
            "alerts": random.choice([[], [], [], ["WARNING: Potential network scanner matching rule."], ["DANGER: Cleartext password leak flagged!"]]),
            "mitigation": random.choice(["NONE", "NONE", "NONE", "ACTIVE BLOCKED"])
        }
        await manager.broadcast({"type": "PACKET", "data": mock_telemetry})
        await asyncio.sleep(0.5) # Balanced rate to protect laptop resource consumption

@asynccontextmanager
async def lifespan(app: FastAPI):
    sniffer_thread = threading.Thread(target=start_sniffer_engine, daemon=True)
    sniffer_thread.start()
    asyncio.create_task(pipeline_worker())
    asyncio.create_task(network_info_streamer())
    asyncio.create_task(mock_packet_generator()) 
    yield

app = FastAPI(title="CyDR Core Telemetry", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)