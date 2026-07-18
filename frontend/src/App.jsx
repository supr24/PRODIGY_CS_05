import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [packets, setPackets] = useState([]);
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const [currentMenu, setCurrentMenu] = useState('dashboard'); 
  const [activeTab, setActiveTab] = useState('osi'); 
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [isPaused, setIsPaused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProto, setFilterProto] = useState('ALL');
  
  const [metrics, setMetrics] = useState({ totalBytes: 0, alertCount: 0 });
  const [netInfo, setNetInfo] = useState({ interface: "Initializing...", download: "0.00 Mbps", upload: "0.00 Mbps" });

  const bufferRef = useRef([]);

  useEffect(() => {
    const ws = new WebSocket('ws://127.0.0.1:8000/ws');

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "NET_INFO") {
        setNetInfo(msg.data);
        return;
      }
      
      if (msg.type === "PACKET") {
        const packet = msg.data;
        setMetrics(m => ({
          totalBytes: m.totalBytes + packet.size,
          alertCount: m.alertCount + (packet.alerts.length > 0 ? 1 : 0)
        }));

        if (!isPaused) {
          bufferRef.current.push(packet);
        }
        
        if (packet.alerts && packet.alerts.length > 0) {
          setAlerts(prev => [
            { time: packet.timestamp, messages: packet.alerts, src: packet.src_ip, procName: packet.process_context?.name, mit: packet.mitigation },
            ...prev.slice(0, 49)
          ]);
        }
      }
    };

    const uiFlushInterval = setInterval(() => {
      if (bufferRef.current.length > 0) {
        const newBatch = [...bufferRef.current];
        bufferRef.current = [];
        // Optimized render batch slice to eliminate terminal rendering laptop lag
        setPackets(prev => [...newBatch, ...prev].slice(0, 30));
      }
    }, 150);

    return () => {
      ws.close();
      clearInterval(uiFlushInterval);
    };
  }, [isPaused]);

  const formatHexDump = (hexStr) => {
    if (!hexStr) return "No payload data signals captured.";
    let result = "";
    for (let i = 0; i < hexStr.length; i += 32) {
      const line = hexStr.substring(i, i + 32);
      let formattedLine = "";
      let asciiLine = "";
      for (let j = 0; j < line.length; j += 2) {
        const byte = line.substring(j, j + 2);
        formattedLine += byte + " ";
        const charCode = parseInt(byte, 16);
        asciiLine += (charCode >= 32 && charCode <= 126) ? String.fromCharCode(charCode) : ".";
      }
      result += `${String(i/2).padStart(4, '0')}:  ${formattedLine.padEnd(48)} | ${asciiLine}\n`;
    }
    return result;
  };

  const filteredPackets = packets.filter(p => {
    const matchesProto = filterProto === 'ALL' || p.proto === filterProto || p.app_proto === filterProto;
    const matchesSearch = p.src_ip.includes(searchTerm) || 
                          p.dst_ip.includes(searchTerm) || 
                          (p.process_context?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesProto && matchesSearch;
  });

  return (
    <div className="cy-app-frame">
      <aside className={`cy-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="cy-logo-zone">
          <div className="cy-svg-logo">
            <svg viewBox="0 0 100 100" className="logo-vector">
              <polygon points="50,15 90,35 90,75 50,95 10,75 10,35" className="logo-shield" />
              <polyline points="30,45 50,25 70,45" className="logo-lines" />
              <line x1="50" y1="25" x2="50" y2="75" className="logo-lines" />
              <circle cx="50" cy="50" r="8" className="logo-core" />
            </svg>
          </div>
          <span className="cy-brand-text">CyDR v.2</span>
          <button className="cy-toggle-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} title="Toggle Side Bar">☰</button>
        </div>

        <nav className="cy-nav-list">
          <button className={`cy-nav-item ${currentMenu === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentMenu('dashboard')} title="Operational Console">
            <span className="nav-icon">📊</span> <span className="nav-label">Operational Console</span>
          </button>
          <button className={`cy-nav-item ${currentMenu === 'learners' ? 'active' : ''}`} onClick={() => setCurrentMenu('learners')} title="Learners' Corner">
            <span className="nav-icon">🎓</span> <span className="nav-label">Learners' Corner</span>
          </button>
        </nav>

        <div className="sidebar-status-node">
          <div className={`status-badge ${isConnected ? 'online' : 'offline'}`}>
            <span className="status-dot"></span>
            <span className="status-text">{isConnected ? "CORE ACTIVE" : "DISCONNECTED"}</span>
          </div>
        </div>
      </aside>

      <main className="cy-main-content">
          {/* TOP INTERFACE STATS */}
          <div className="net-status-banner">
          <div className="banner-item"><span className="label">INTERFACE:</span> <span className="value text-cyan">{netInfo.interface}</span></div>
          <div className="banner-item"><span className="label">DOWNLINK:</span> <span className="value text-teal">{netInfo.download}</span></div>
          <div className="banner-item"><span className="label">UPLINK:</span> <span className="value text-amber">{netInfo.upload}</span></div>
        </div>

        {currentMenu === 'dashboard' && (
          <div className="dashboard-subview">
            <section className="cyber-metrics">
              <div className="cyber-card"><label>Data Ingested</label><div className="value">{(metrics.totalBytes / 1024).toFixed(2)} KB</div></div>
              <div className="cyber-card danger-card"><label>Active Mitigations</label><div className="value">{metrics.alertCount}</div></div>
              <div className="cyber-card"><label>Buffer Cache</label><div className="value">{filteredPackets.length} <span className="unit">pkts</span></div></div>
            </section>

            <section className="cyber-toolbar">
              <div className="cyber-search">🔍 <input type="text" placeholder="Search network segments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
              <div className="cyber-filters">
                {['ALL', 'TCP', 'UDP', 'HTTP', 'DNS'].map(p => (
                  <button key={p} className={`cyber-chip ${filterProto === p ? 'active' : ''}`} onClick={() => setFilterProto(p)}>{p}</button>
                ))}
              </div>
              <button className={`cyber-pause ${isPaused ? 'paused' : ''}`} onClick={() => setIsPaused(!isPaused)}>{isPaused ? "▶ Resume Stream" : "⏸ Freeze Matrix"}</button>
            </section>

            <div className="cyber-workspace">
              <section className="cyber-panel main-stream">
                <div className="table-wrapper">
                  <table className="cyber-table">
                    <thead>
                      <tr><th>TIMESTAMP</th><th>PROTO</th><th>LAYER_7</th><th>SOURCE IP</th><th>TARGET IP</th><th>PORT</th><th>PROCESS OWNER</th></tr>
                    </thead>
                    <tbody>
                      {filteredPackets.map((p) => (
                        <tr key={p.id} onClick={() => setSelectedPacket(p)} className={`${selectedPacket?.id === p.id ? 'selected' : ''} ${p.alerts.length ? 'threat-row' : ''}`}>
                          <td>{p.timestamp}</td>
                          <td><span className={`proto-badge ${p.proto.toLowerCase()}`}>{p.proto}</span></td>
                          <td><span className="app-proto-text">{p.app_proto || 'UNKNOWN'}</span></td>
                          <td className="text-cyan">{p.src_ip}</td>
                          <td>{p.dst_ip}</td>
                          <td className="text-amber">{p.dport || 'N/A'}</td>
                          <td className="text-teal font-mono">{p.process_context?.name || 'SYSTEM'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="cyber-inspector">
                  <div className="cyber-tabs">
                    <button className={`cyber-tab ${activeTab === 'osi' ? 'active' : ''}`} onClick={() => setActiveTab('osi')}>1-7 OSI Stack Visualizer</button>
                    <button className={`cyber-tab ${activeTab === 'process' ? 'active' : ''}`} onClick={() => setActiveTab('process')}>OS Process Context</button>
                    <button className={`cyber-tab ${activeTab === 'hex' ? 'active' : ''}`} onClick={() => setActiveTab('hex')}>Raw Payload Decode</button>
                  </div>
                  <div className="inspector-content">
                    {selectedPacket ? (
                      activeTab === 'osi' ? (
                        <div className="osi-stack-box">
                          <div className="osi-layer"><span className="layer-num">L7 Application:</span> <span className="layer-val text-teal">{selectedPacket.app_proto} Protocol ({selectedPacket.process_context?.name})</span></div>
                          <div className="osi-layer"><span className="layer-num">L6 Presentation:</span> <span className="layer-val">{selectedPacket.l6_encoding}</span></div>
                          <div className="osi-layer"><span className="layer-num">L5 Session:</span> <span className="layer-val text-amber">{selectedPacket.l5_session}</span></div>
                          <div className="osi-layer"><span className="layer-num">L4 Transport:</span> <span className="layer-val">{selectedPacket.proto} Flow (Port: {selectedPacket.dport || 'N/A'})</span></div>
                          <div className="osi-layer"><span className="layer-num">L3 Network:</span> <span className="layer-val text-cyan">{selectedPacket.l3_net} ({selectedPacket.src_ip} ➔ {selectedPacket.dst_ip})</span></div>
                          <div className="osi-layer"><span className="layer-num">L2 Data Link:</span> <span className="layer-val font-mono">{selectedPacket.l2_macs}</span></div>
                          <div className="osi-layer"><span className="layer-num">L1 Physical:</span> <span className="layer-val text-muted">Link Speed Bound @ {selectedPacket.l1_speed || netInfo.download}</span></div>
                        </div>
                      ) : activeTab === 'process' ? (
                        <div className="cyber-meta-box">
                          <div className="cyber-grid">
                            <div className="grid-cell"><label>Application</label><span className="text-teal font-semibold">{selectedPacket.process_context?.name}</span></div>
                            <div className="grid-cell"><label>PID Reference</label><span className="text-amber font-mono">{selectedPacket.process_context?.pid}</span></div>
                            <div className="grid-cell"><label>User Context</label><span>{selectedPacket.process_context?.user}</span></div>
                          </div>
                          <div className="path-box"><label>Binary Location</label><code>{selectedPacket.process_context?.path}</code></div>
                          <div className="mitigation-status-box"><label>Automated Response Action</label><span className={`mit-status ${selectedPacket.mitigation !== 'NONE' ? 'fired' : ''}`}>{selectedPacket.mitigation}</span></div>
                        </div>
                      ) : (<pre className="cyber-hex">{formatHexDump(selectedPacket.hex_dump)}</pre>)
                    ) : (<div className="cyber-placeholder">Select a frame sequence row above to initiate 7-layer OSI compilation analysis.</div>)}
                  </div>
                </div>
              </section>

              <section className="cyber-panel panel-alerts">
                <h2>Security Incident Log</h2>
                <div className="cyber-alert-list">
                  {alerts.length === 0 ? (
                    <div className="cyber-alert calm">No anomalies flagged in active session.</div>
                  ) : (
                    alerts.map((a, idx) => (
                      <div key={idx} className="cyber-alert danger">
                        <div className="alert-meta"><span>[{a.time}]</span><strong>Host: {a.src}</strong></div>
                        {a.messages.map((m, i) => (
                          <div key={i} className="alert-content-wrapper">
                            <div className="warn-text">⚠️ {m}</div>
                            <div className="mit-receipt">Mitigation Triggered: {a.mit} — Target: PID {a.procName}</div>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {currentMenu === 'learners' && (
          <div className="learners-subview">
            <h2>🎓 Learners' Corner: Understanding the 7-Layer OSI Model</h2>
            <p className="learners-intro">CyDR tracks raw network frames interactively and categorizes packet parameters into their respective architectural layers.</p>
            <div className="osi-education-grid">
              <div className="edu-card"><h3>Layer 7: Application</h3><p>The user interface interaction layer. CyDR tracks higher protocols like <strong>HTTP, DNS, and SSH</strong> here, executing targeted Deep Packet Inspection (DPI) pattern checks.</p></div>
              <div className="edu-card"><h3>Layer 6: Presentation</h3><p>Handles syntactic representations, character conversions, and data encodings. CyDR assesses data fields here to distinguish between unencrypted text encodings (ASCII/UTF-8) and cryptographic streams (TLS/SSL binary wraps).</p></div>
              <div className="edu-card"><h3>Layer 5: Session</h3><p>Establishes, controls, and coordinates persistent cross-host tracking metrics. CyDR uses an in-memory session table to actively deduce full transport states (e.g., <strong>SYN_SENT, ESTABLISHED</strong>).</p></div>
              <div className="edu-card"><h3>Layer 4: Transport</h3><p>Coordinates end-to-end data stream deliveries. This is where CyDR segments packet headers into either <strong>TCP</strong> or <strong>UDP</strong> logic parameters and extracts port addresses.</p></div>
              <div className="edu-card"><h3>Layer 3: Network</h3><p>Manages logical packet routing paths across distinct network switches. CyDR extracts source/destination <strong>IPv4 or IPv6 network addresses</strong> at this stage.</p></div>
              <div className="edu-card"><h3>Layer 2: Data Link</h3><p>Encodes and decodes raw physical bits into clean data packets. CyDR isolates the underlying hardware frame wrappers to inspect physical source/target <strong>MAC addresses</strong>.</p></div>
              <div className="edu-card"><h3>Layer 1: Physical</h3><p>Exposes raw hardware structures (e.g., cables, pins, interface cards). CyDR hooks directly into the host OS system interface stats to check physical network card capacity limits.</p></div>
            </div>
          </div>
        )}

        <footer className="cy-footer">
          <span>&copy; {new Date().getFullYear()} CyDR Security Platforms Inc. All Rights Reserved.</span>
          <span className="footer-tag">CLASSIFICATION: LOCAL LAB Telemetry Engine</span>
        </footer>
      </main>
    </div>
  );
}