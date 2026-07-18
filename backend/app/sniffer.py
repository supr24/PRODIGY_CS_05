import sys
from scapy.all import sniff
from app.analyzer import packet_queue

def packet_callback(packet):
    try:
        packet_queue.put_nowait(packet)
    except Exception:
        pass

def start_sniffer_engine(interface=None):
    try:
        sniff(iface=interface, prn=packet_callback, store=0, filter="tcp or udp")
    except PermissionError:
        print("[FATAL] Administrative/root privileges missing for raw sockets.", file=sys.stderr)
    except Exception as e:
        print(f"[FATAL] Sniffer engine error: {e}", file=sys.stderr)