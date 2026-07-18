import queue
import time
import os
import sys
import psutil
import random
from collections import defaultdict
from scapy.all import Ether, IP, IPv6, TCP, UDP

packet_queue = queue.Queue(maxsize=10000)

class FullOSINDREngine:
    def __init__(self):
        self.session_table = {}
        self.state_map = defaultdict(lambda: {"attempts": 0, "failures": 0, "ports": set()})

    def _block_malicious_ip(self, ip_address):
        """[MITIGATION - Layer 3 Firewall]"""
        print(f"[MITIGATION] Activating firewall block rule for IP: {ip_address}")
        if sys.platform.startswith("win"):
            cmd = f'netsh advfirewall firewall add rule name="NDR_BLOCK_{ip_address}" dir=in action=block remoteip={ip_address}'
        elif sys.platform.startswith("linux"):
            cmd = f'sudo iptables -A INPUT -s {ip_address} -j DROP'
        else:
            cmd = f'echo "block drop from {ip_address} to any" | sudo pfctl -ef -'
        os.system(cmd)

    def _terminate_local_process(self, pid, name):
        """[MITIGATION - Layer 7 Execution]"""
        if pid in ["Unknown", "External", "N/A"]:
            return
        try:
            process = psutil.Process(pid)
            print(f"[MITIGATION] Terminating dangerous application: {name} (PID: {pid})")
            process.terminate()
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    def _resolve_local_process(self, local_port, proto):
        kind = "tcp" if proto.lower() == "tcp" else "udp"
        try:
            for conn in psutil.net_connections(kind=kind):
                if conn.laddr.port == local_port and conn.pid:
                    proc = psutil.Process(conn.pid)
                    return {
                        "pid": conn.pid,
                        "name": proc.name(),
                        "path": proc.exe(),
                        "user": proc.username()
                    }
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
        return {"pid": "Unknown", "name": "System/Closed", "path": "N/A", "user": "N/A"}

    def analyze(self, packet):
        # === LAYER 1: PHYSICAL LAYER ===
        interfaces = psutil.net_if_stats()
        phys_speed = "Unknown Speed"
        for name, stats in interfaces.items():
            if stats.isup and name != "Loopback Pseudo-Interface 1":
                phys_speed = f"{stats.speed} Mbps"
                break

        # === LAYER 2: DATA LINK LAYER ===
        src_mac = packet[Ether].src if Ether in packet else "00:00:00:00:00:00"
        dst_mac = packet[Ether].dst if Ether in packet else "00:00:00:00:00:00"

        # === LAYER 3: NETWORK LAYER ===
        if IP in packet:
            src_ip = packet[IP].src
            dst_ip = packet[IP].dst
            net_proto = "IPv4"
        elif IPv6 in packet:
            src_ip = packet[IPv6].src
            dst_ip = packet[IPv6].dst
            net_proto = "IPv6"
        else:
            return None

        # === LAYER 4: TRANSPORT LAYER ===
        if TCP in packet:
            proto = "TCP"
            sport = packet[TCP].sport
            dport = packet[TCP].dport
            flags = str(packet[TCP].flags)
            payload = bytes(packet[TCP].payload)
        elif UDP in packet:
            proto = "UDP"
            sport = packet[UDP].sport
            dport = packet[UDP].dport
            flags = "N/A"
            payload = bytes(packet[UDP].payload)
        else:
            return None

        # === LAYER 5: SESSION LAYER ===
        session_key = (src_ip, sport, dst_ip, dport)
        session_state = "STATELESS/UDP"
        
        if proto == "TCP":
            if "S" in flags and "A" not in flags:
                self.session_table[session_key] = "SYN_SENT"
                session_state = "SYN_SENT"
            elif "S" in flags and "A" in flags:
                self.session_table[session_key] = "SYN_RECEIVED"
                session_state = "SYN_RECEIVED"
            elif "A" in flags:
                self.session_table[session_key] = "ESTABLISHED"
                session_state = "ESTABLISHED"
            elif "F" in flags or "R" in flags:
                self.session_table.pop(session_key, None)
                session_state = "TERMINATED"
            else:
                session_state = self.session_table.get(session_key, "ESTABLISHED")

        # === LAYER 6: PRESENTATION LAYER ===
        encoding_type = "UNKNOWN/BINARY"
        is_encrypted = False
        if payload:
            if payload.startswith(b"\x16\x03\x01") or payload.startswith(b"\x16\x03\x03"):
                encoding_type = "TLS / SSL Encrypted Wrap"
                is_encrypted = True
            else:
                try:
                    payload.decode('utf-8')
                    encoding_type = "UTF-8 Standard Text"
                except UnicodeDecodeError:
                    encoding_type = "RAW Application Hex Array"

        # === LAYER 7: APPLICATION LAYER ===
        app_proto = "UNKNOWN LAYER 7"
        if dport == 80 or sport == 80: app_proto = "HTTP"
        elif dport == 443 or sport == 443: app_proto = "HTTPS"
        elif dport == 53 or sport == 53: app_proto = "DNS"
        elif dport == 22 or sport == 22: app_proto = "SSH"

        alerts = []
        mitigation_applied = False
        
        if proto == "TCP" and dport:
            host_state = self.state_map[src_ip]
            host_state["attempts"] += 1
            host_state["ports"].add(dport)
            if "R" in flags:
                host_state["failures"] += 1
            if host_state["attempts"] > 50:
                failure_rate = (host_state["failures"] / host_state["attempts"]) * 100
                if failure_rate > 80.0 and len(host_state["ports"]) > 15:
                    alerts.append("CRITICAL: Stealth Port Scan Suspected!")
                    self._block_malicious_ip(src_ip)
                    mitigation_applied = True

        process_info = {"pid": "External", "name": "Inbound Traffic", "path": "N/A", "user": "N/A"}
        if src_ip in ["127.0.0.1", "localhost"] or src_ip.startswith("192.168.") or src_ip.startswith("10."):
            process_info = self._resolve_local_process(sport, proto)

        if not is_encrypted and payload:
            if b"password" in payload.lower() or b"secret" in payload.lower():
                alerts.append("DANGER: Unencrypted Layer 7 credential leak!")
                self._terminate_local_process(process_info["pid"], process_info["name"])
                mitigation_applied = True

        return {
            "id": f"{time.time()}-{random.randint(0,10000)}",
            "timestamp": time.strftime('%H:%M:%S'),
            "l1_speed": phys_speed,
            "l2_macs": f"{src_mac} ➔ {dst_mac}",
            "l3_net": net_proto,
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "proto": proto,
            "dport": dport,
            "l5_session": session_state,
            "l6_encoding": encoding_type,
            "app_proto": app_proto,
            "size": len(packet),
            "process_context": process_info,
            "hex_dump": payload.hex() if payload else "",
            "alerts": alerts,
            "mitigation": "ACTIVE BLOCKED" if mitigation_applied else "NONE"
        }