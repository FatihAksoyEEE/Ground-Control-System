
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ArtificialHorizon from './components/ArtificialHorizon';
import CircularGauge from './components/CircularGauge';
import VerticalBar from './components/VerticalBar';
import MissionMap from './components/MissionMap';
import TapeGraph from './components/TapeGraph';
import DraggableWindow from './components/DraggableWindow';

// Utility: Calculate Distance between two lat/lon points (Haversine)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Earth's radius in km
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat1)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d;
}
function deg2rad(deg) { return deg * (Math.PI / 180); }

function App() {
  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState('flight');
  const [setupSubTab, setSetupSubTab] = useState('frame');
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [selectedWpId, setSelectedWpId] = useState(null);

  // --- DRAGGABLE WINDOWS STATE ---
  const [windowZ, setWindowZ] = useState({ map: 1, data: 2, pfd: 3, console: 4, status: 5 });
  const [panelVisibility, setPanelVisibility] = useState({
    status: true,
    map: true,
    data: true,
    pfd: true,
    console: true
  });

  const bringToFront = (id) => {
    setWindowZ(prev => {
      const maxZ = Math.max(...Object.values(prev));
      return { ...prev, [id]: maxZ + 1 };
    });
  };

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onTogglePanel) {
      window.electronAPI.onTogglePanel(({ id, visible }) => {
        setPanelVisibility(prev => ({ ...prev, [id]: visible }));
      });
    }
  }, []);

  // --- CONFIG STATE (With Persistence) ---
  const loadLocal = (key, def) => {
    const saved = localStorage.getItem(key);
    try { return saved ? JSON.parse(saved) : def; } catch (e) { return def; }
  };
  const [theme, setTheme] = useState(() => loadLocal('gcs_theme', 'dark'));
  const [units, setUnits] = useState(() => loadLocal('gcs_units', 'metric'));
  const [baudRate, setBaudRate] = useState(() => loadLocal('gcs_baud', 57600));
  const [updateRate, setUpdateRate] = useState(() => loadLocal('gcs_rate', 100));
  const [enableVoice, setEnableVoice] = useState(() => loadLocal('gcs_voice', true));
  const [minSafeAlt, setMinSafeAlt] = useState(() => loadLocal('gcs_safe_alt', 30));

  // --- VEHICLE CONFIG STATE ---
  const [frameType, setFrameType] = useState('quad_x');
  const [motorConfig, setMotorConfig] = useState([
    { id: 1, reverse: false, testVal: 1000 },
    { id: 2, reverse: true, testVal: 1000 },
    { id: 3, reverse: false, testVal: 1000 },
    { id: 4, reverse: true, testVal: 1000 },
  ]);
  const [servoConfig, setServoConfig] = useState([
    { ch: 1, function: 'Aileron', min: 1000, max: 2000, trim: 1500, rev: false },
    { ch: 2, function: 'Elevator', min: 1000, max: 2000, trim: 1500, rev: false },
    { ch: 3, function: 'Throttle', min: 1000, max: 2000, trim: 1000, rev: false },
    { ch: 4, function: 'Rudder', min: 1000, max: 2000, trim: 1500, rev: false },
  ]);

  const [availablePorts, setAvailablePorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  // --- PERSISTENCE EFFECT ---
  useEffect(() => {
    localStorage.setItem('gcs_theme', JSON.stringify(theme));
    localStorage.setItem('gcs_units', JSON.stringify(units));
    localStorage.setItem('gcs_baud', JSON.stringify(baudRate));
    localStorage.setItem('gcs_rate', JSON.stringify(updateRate));
    localStorage.setItem('gcs_voice', JSON.stringify(enableVoice));
    localStorage.setItem('gcs_safe_alt', JSON.stringify(minSafeAlt));
  }, [theme, units, baudRate, updateRate, enableVoice, minSafeAlt]);

  // --- LOGGING ---
  const [logs, setLogs] = useState([{ time: new Date().toLocaleTimeString(), msg: "GCS Started.", type: 'info' }]);

  // --- TELEMETRY ---
  const [roll, setRoll] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [heading, setHeading] = useState(0);
  const [altitude, setAltitude] = useState(50);
  const [groundSpeed, setGroundSpeed] = useState(0);
  const [airSpeed, setAirSpeed] = useState(0);
  const [verticalSpeed, setVerticalSpeed] = useState(0);
  const [currentLat, setCurrentLat] = useState(41.0082);
  const [currentLon, setCurrentLon] = useState(28.9784);
  const [homeElevation, setHomeElevation] = useState(10);
  const [batteryPct, setBatteryPct] = useState(100);
  const [voltage, setVoltage] = useState(12.6);
  const [current, setCurrent] = useState(0);
  const [armed, setArmed] = useState(false);
  const [flightMode, setFlightMode] = useState("STABILIZE");
  const [satellites, setSatellites] = useState(0);
  const [gpsFix, setGpsFix] = useState(0);
  const [distToHome, setDistToHome] = useState(0);
  const [waypoints, setWaypoints] = useState([{ id: 1, cmd: 'TAKEOFF', p1: 0, p2: 0, p3: 0, p4: 0, lat: 41.0082, lon: 28.9784, alt: 10, groundElev: 10, agl: 10 }]);

  const totalDist = waypoints.reduce((acc, curr, idx, arr) => {
    if (idx === 0) return 0;
    const prev = arr[idx - 1];
    return acc + getDistanceFromLatLonInKm(prev.lat, prev.lon, curr.lat, curr.lon);
  }, 0);

  const fetchElevation = async (lat, lon) => {
    try {
      const res = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`);
      const data = await res.json();
      if (data && data.results && data.results.length > 0) return data.results[0].elevation;
    } catch (err) { console.warn("Elevation fetch failed:", err); }
    return 0;
  };
  useEffect(() => {
    if (gpsFix >= 3 && homeElevation === 10) {
      fetchElevation(currentLat, currentLon).then(elev => { if (elev > 0) { setHomeElevation(elev); addLog(`Home Elevation Set: ${elev}m`, "success"); } });
    }
  }, [gpsFix, currentLat, currentLon, homeElevation]);
  useEffect(() => {
    setWaypoints(prev => prev.map(wp => {
      const absAlt = homeElevation + parseFloat(wp.alt);
      const estimatedAGL = wp.groundElev ? (absAlt - wp.groundElev) : parseFloat(wp.alt);
      return { ...wp, agl: estimatedAGL };
    }));
  }, [homeElevation]);

  // Refs
  const serialBufferRef = useRef(new Uint8Array(0));
  const lastUpdateRef = useRef(0);
  const updateRateRef = useRef(100);
  const consoleEndRef = useRef(null);

  useEffect(() => { consoleEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);
  useEffect(() => { updateRateRef.current = updateRate; }, [updateRate]);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev.slice(-49), { time: new Date().toLocaleTimeString(), msg, type }]);
    if (enableVoice && (type === 'error' || type === 'warn' || type === 'critical')) {
      const utterance = new SpeechSynthesisUtterance(msg); utterance.rate = 1.1; window.speechSynthesis.speak(utterance);
    }
  };

  // --- RESIZING LOGIC ---
  const startResizingMap = useCallback(() => { isResizingMap.current = true; }, []);
  const startResizingStatusBar = useCallback(() => { isResizingStatusBar.current = true; }, []);
  const startResizingLeft = useCallback(() => { isResizingLeft.current = true; }, []);
  const startResizingRight = useCallback(() => { isResizingRight.current = true; }, []);

  const stopResizing = useCallback(() => {
    isResizingMap.current = false;
    isResizingStatusBar.current = false;
    isResizingLeft.current = false;
    isResizingRight.current = false;
    document.body.style.cursor = 'default';
  }, []);

  const resize = useCallback((e) => {
    if (isResizingMap.current) {
      setMapHeight(h => Math.max(200, Math.min(800, h + e.movementY)));
      document.body.style.cursor = 'row-resize';
    } else if (isResizingStatusBar.current) {
      setStatusBarHeight(h => Math.max(30, Math.min(100, h + e.movementY)));
      document.body.style.cursor = 'row-resize';
    } else if (isResizingLeft.current) {
      setLeftPanelWidth(l => Math.max(200, Math.min(600, l + e.movementX)));
      document.body.style.cursor = 'col-resize';
    } else if (isResizingRight.current) {
      setRightPanelWidth(r => Math.max(200, Math.min(600, r - e.movementX)));
      document.body.style.cursor = 'col-resize';
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize); window.addEventListener('mouseup', stopResizing);
    return () => { window.removeEventListener('mousemove', resize); window.removeEventListener('mouseup', stopResizing); };
  }, [resize, stopResizing]);


  // --- SERIAL PORT (Omitted detail for brevity) ---
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.listSerialPorts().then((ports) => { setAvailablePorts(ports); if (ports.length > 0 && !selectedPort) setSelectedPort(ports[0].path); });
      window.electronAPI.onSerialStatus((status) => { setIsConnected(status.connected); if (status.connected) addLog(`Connected to ${status.path}`, 'success'); else { addLog("Disconnected", 'warn'); serialBufferRef.current = new Uint8Array(0); } });
      window.electronAPI.onSerialData((incomingData) => {
        const newChunk = new Uint8Array(incomingData); const currentBuffer = serialBufferRef.current;
        const newBuffer = new Uint8Array(currentBuffer.length + newChunk.length); newBuffer.set(currentBuffer); newBuffer.set(newChunk, currentBuffer.length); serialBufferRef.current = newBuffer;
        const MIN_PACKET_SIZE = 34; let buffer = serialBufferRef.current; const now = Date.now(); let latestValues = null;
        while (buffer.length >= MIN_PACKET_SIZE) {
          if (buffer[0] === 0xAA && buffer[1] === 0xBB) {
            const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
            try {
              latestValues = {
                roll: view.getInt16(2, true) / 100.0, pitch: view.getInt16(4, true) / 100.0, yaw: view.getInt16(6, true) / 100.0, alt: view.getInt16(8, true) / 10.0, speed: view.getInt16(10, true) / 100.0, batt: view.getUint8(12) / 10.0, sats: view.getUint8(13), fix: view.getUint8(14), mode: view.getUint8(15), lat: view.getInt32(16, true) / 10000000.0, lon: view.getInt32(20, true) / 10000000.0
              }; buffer = buffer.slice(MIN_PACKET_SIZE);
            } catch (e) { buffer = buffer.slice(1); }
          } else { buffer = buffer.slice(1); }
        }
        serialBufferRef.current = buffer;
        if (latestValues && (now - lastUpdateRef.current >= updateRateRef.current)) {
          setRoll(latestValues.roll); setPitch(latestValues.pitch); setHeading(latestValues.yaw < 0 ? latestValues.yaw + 360 : latestValues.yaw); setAltitude(latestValues.alt); setGroundSpeed(latestValues.speed); setAirSpeed(latestValues.speed);
          if (latestValues.lat !== 0 && latestValues.lon !== 0) { setCurrentLat(latestValues.lat); setCurrentLon(latestValues.lon); }
          setBatteryPct(Math.max(0, Math.min(100, (latestValues.batt / 3.0 - 3.5) / (4.2 - 3.5) * 100))); setVoltage(latestValues.batt); setSatellites(latestValues.sats); setGpsFix(latestValues.fix);
          const modes = ["STABILIZE", "ACRO", "ALT_HOLD", "AUTO", "GUIDED", "LOITER", "RTL", "LAND"];
          if (latestValues.mode < modes.length) { const newMode = modes[latestValues.mode]; if (newMode !== flightMode) { setFlightMode(newMode); addLog(`Mode: ${newMode}`, 'info'); } }
          lastUpdateRef.current = now;
        }
      });
    }
  }, [gpsFix, flightMode, voltage, enableVoice, selectedPort]);

  // --- MISSION HANDLERS (Same) ---
  const handleMapClick = async (latlng) => { const elev = await fetchElevation(latlng.lat, latlng.lng); const relAlt = 50; const absAlt = homeElevation + relAlt; const agl = elev > 0 ? (absAlt - elev) : relAlt; const newWp = { id: Date.now(), cmd: 'WAYPOINT', p1: 0, p2: 0, p3: 0, p4: 0, lat: latlng.lat, lon: latlng.lng, alt: relAlt, groundElev: elev, agl: agl }; setWaypoints(prev => [...prev, newWp]); setSelectedWpId(newWp.id); };
  const handleWpDragCheck = async (id, latlng) => { setWaypoints(prev => prev.map(wp => wp.id === id ? { ...wp, lat: latlng.lat, lon: latlng.lng } : wp)); setSelectedWpId(id); const elev = await fetchElevation(latlng.lat, latlng.lng); setWaypoints(prev => prev.map(wp => { if (wp.id === id) { const absAlt = homeElevation + parseFloat(wp.alt); const agl = elev > 0 ? (absAlt - elev) : parseFloat(wp.alt); return { ...wp, lat: latlng.lat, lon: latlng.lng, groundElev: elev, agl: agl }; } return wp; })); };
  const handleWpClick = (id) => { setSelectedWpId(id); };
  const handleWpUpdate = (id, field, val) => { setWaypoints(prev => prev.map(wp => { if (wp.id === id) { const newWp = { ...wp, [field]: val }; if (field === 'alt') { const absAlt = homeElevation + parseFloat(val); newWp.agl = newWp.groundElev ? (absAlt - newWp.groundElev) : parseFloat(val); } return newWp; } return wp; })); };
  const handleWpDelete = (id) => { setWaypoints(prev => prev.filter(wp => wp.id !== id)); if (selectedWpId === id) setSelectedWpId(null); };
  const handleWpMove = (idx, dir) => { if ((dir === -1 && idx === 0) || (dir === 1 && idx === waypoints.length - 1)) return; const newWps = [...waypoints];[newWps[idx], newWps[idx + dir]] = [newWps[idx + dir], newWps[idx]]; setWaypoints(newWps); };
  const handleUploadMission = async () => { if (!isConnected) { addLog("No Connection!", "error"); return; } const unsafeWps = waypoints.filter(wp => wp.agl < minSafeAlt && wp.cmd !== 'LAND'); if (unsafeWps.length > 0) { addLog(`SAFETY WARNING: ${unsafeWps.length} WPs below safe altitude (${minSafeAlt}m)!`, "critical"); } addLog("Uploading Mission (LoRa)...", "info"); const bufferSize = 4 + (waypoints.length * 11) + 2; const buffer = new ArrayBuffer(bufferSize); const view = new DataView(buffer); let off = 0; view.setUint8(off++, 0xAA); view.setUint8(off++, 0xBB); view.setUint8(off++, 0x01); view.setUint8(off++, waypoints.length); waypoints.forEach(wp => { view.setFloat32(off, wp.lat, true); off += 4; view.setFloat32(off, wp.lon, true); off += 4; view.setInt16(off, parseInt(wp.alt), true); off += 2; let cmdId = 16; if (wp.cmd === 'TAKEOFF') cmdId = 22; else if (wp.cmd === 'RTL') cmdId = 20; else if (wp.cmd === 'LAND') cmdId = 21; view.setUint8(off++, cmdId); }); let sum1 = 0, sum2 = 0; for (let i = 2; i < bufferSize - 2; i++) { sum1 = (sum1 + view.getUint8(i)) % 255; sum2 = (sum2 + sum1) % 255; } view.setUint8(off++, sum1); view.setUint8(off++, sum2); try { if (window.electronAPI && window.electronAPI.serialWrite) { await window.electronAPI.serialWrite(new Uint8Array(buffer)); addLog(`Uploaded: ${waypoints.length} WPs`, "success"); } } catch (err) { addLog(`Failed: ${err}`, "error"); } };
  const handleSaveFile = async () => { if (!window.electronAPI) return; const data = { version: '1.0', created: new Date().toISOString(), waypoints: waypoints, mapCenter: { lat: currentLat, lon: currentLon } }; try { const result = await window.electronAPI.saveMission(data); if (result.success) addLog(`Saved: ${result.path}`, "success"); } catch (e) { addLog(`Save Failed: ${e}`, "error"); } };
  const handleLoadFile = async () => { if (!window.electronAPI) return; try { const result = await window.electronAPI.loadMission(); if (result.success && result.data) { setWaypoints(result.data.waypoints || []); if (result.data.mapCenter) { setCurrentLat(result.data.mapCenter.lat); setCurrentLon(result.data.mapCenter.lon); } addLog(`Loaded`, "success"); } } catch (e) { addLog(`Load Failed: ${e}`, "error"); } };
  const handleClearMission = () => { setWaypoints([]); addLog("Bleared", "info"); };
  const handleConnect = () => { if (isConnected) window.electronAPI.disconnectSerial(); else window.electronAPI.connectSerial(selectedPort, baudRate); };

  // --- SIMULATION ---
  useEffect(() => {
    if (isConnected) return;
    const interval = setInterval(() => {
      setRoll(prev => prev + (Math.random() - 0.5) * 1.5); setPitch(prev => prev + (Math.random() - 0.5) * 1.5); setHeading(prev => (prev + 0.5) % 360); setAltitude(a => Math.max(0, a + (Math.random() - 0.5))); setVerticalSpeed((Math.random() - 0.5) * 2); setGroundSpeed(45 + (Math.random() - 0.5)); setAirSpeed(50 + (Math.random() - 0.5));
      setBatteryPct(p => Math.max(0, p - 0.005)); setVoltage(v => Math.max(10.5, v - 0.001)); setSatellites(12); setGpsFix(3); setCurrentLat(prev => prev + (Math.random() - 0.5) * 0.0001); setCurrentLon(prev => prev + (Math.random() - 0.5) * 0.0001);
    }, updateRate);
    return () => clearInterval(interval);
  }, [isConnected, updateRate]);

  // --- RENDER CONTENT ---
  const renderContent = () => {
    switch (activeTab) {
      case 'flight':
        return (
          <div className="layout-flight flex-column" style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
            {/* FULL SCREEN WORKSPACE */}
            <div className="flight-workspace" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'radial-gradient(circle at center, #1a1a2e 0%, #000 100%)', padding: '5px', gap: '5px' }}>

              {/* 1. TOP BAR: SYSTEM CONTROL */}
              {panelVisibility.status && (
                <DraggableWindow id="status" title="System Control" initialPos={{ x: 10, y: 10, w: window.innerWidth - 100, h: 80 }} zIndex={windowZ.status} onFocus={bringToFront} resizeMode="horizontal">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: '0 10px', overflowX: 'auto', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="app-logo-small">GCS</div>
                      <div className={`status-badge ${armed ? 'armed' : 'disarmed'}`}>{armed ? 'ARMED' : 'DIS'}</div>
                      <div className="status-badge mode">{flightMode}</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <div className={`connection-pill ${isConnected ? 'active' : 'inactive'}`} style={{ fontSize: '0.7em', padding: '0.2em 0.8em' }}>
                        <div className="conn-dot" style={{ width: '0.6em', height: '0.6em' }}></div><span>{isConnected ? `LINK: ${selectedPort}` : 'NO LINK'}</span>
                      </div>
                      <div className="stat-item" style={{ fontSize: '0.8em', padding: '0.2em 0.5em' }}><span className="label">BAT:</span><span className={`value ${batteryPct < 20 ? 'bad' : 'good'}`}>{batteryPct.toFixed(0)}%</span></div>
                      <div className="stat-item" style={{ fontSize: '0.8em', padding: '0.2em 0.5em' }}><span className="label">GPS:</span><span className={`value ${gpsFix >= 3 ? 'good' : 'bad'}`}>{gpsFix >= 3 ? '3D' : 'NO'} ({satellites})</span></div>
                      <div className="stat-item clock" style={{ fontSize: '0.8em' }}>{new Date().toLocaleTimeString()}</div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={handleClearMission}>Clear</button>
                      <button className="btn-primary" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={handleUploadMission}>Upload</button>
                    </div>
                  </div>
                </DraggableWindow>
              )}

              {/* 2. DRAGGABLE WINDOWS (Restored) */}

              {/* MAP WINDOW */}
              {panelVisibility.map && (
                <DraggableWindow id="map" title="Mission Map" initialPos={{ x: 440, y: 110, w: '40%', h: 400 }} zIndex={windowZ.map} onFocus={bringToFront}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <MissionMap heading={heading} lat={currentLat} lon={currentLon} waypoints={waypoints} selectedWpId={selectedWpId} />
                    <div className="map-overlay-info" style={{ bottom: '5px', left: '5px', position: 'absolute', background: 'rgba(0,0,0,0.5)', padding: '2px 5px', borderRadius: '3px', fontSize: '0.8em' }}>Dist: {distToHome.toFixed(1)}m</div>
                  </div>
                </DraggableWindow>
              )}

              {/* PFD WINDOW */}
              {panelVisibility.pfd && (
                <DraggableWindow id="pfd" title="Primary Flight Display" initialPos={{ x: 20, y: 110, w: 400, h: 300 }} zIndex={windowZ.pfd} onFocus={bringToFront}>
                  <div className="panel pfd" style={{ height: '100%', background: 'transparent', border: 'none' }}>
                    <div className="pfd-container">
                      <div className="tape-left"><TapeGraph value={airSpeed} label="AIR" unit="m/s" alignLeft={true} /></div>
                      <div className="horizon-wrapper"><ArtificialHorizon roll={roll} pitch={pitch} /></div>
                      <div className="tape-right"><TapeGraph value={altitude} label="ALT" unit="m" alignLeft={false} /></div>
                    </div>
                  </div>
                </DraggableWindow>
              )}

              {/* CONSOLE WINDOW */}
              {panelVisibility.console && (
                <DraggableWindow id="console" title="System Log" initialPos={{ x: 20, y: 430, w: 400, h: 200 }} zIndex={windowZ.console} onFocus={bringToFront}>
                  <div className="panel console" style={{ height: '100%', border: 'none', background: 'transparent', display: 'flex', flexDirection: 'column' }}>
                    <div className="console-body" style={{ flex: 1, overflowY: 'auto', padding: '5px' }}>
                      {logs.map((l, i) => (<div key={i} className={`log-line ${l.type}`}><span className="log-time">[{l.time}]</span> {l.msg}</div>))}
                      <div ref={consoleEndRef} />
                    </div>
                  </div>
                </DraggableWindow>
              )}

              {/* DATA WINDOW */}
              {panelVisibility.data && (
                <DraggableWindow id="data" title="Telemetry Data" initialPos={{ x: window.innerWidth - 320, y: 110, w: 300, h: 500 }} zIndex={windowZ.data} onFocus={bringToFront}>
                  <div className="panel telemetry" style={{ height: '100%', background: 'transparent' }}>
                    <div className="telemetry-scroll">
                      <div className="telemetry-section">
                        <h3>POWER</h3>
                        <div className="data-row"><span className="d-label">Battery %</span><div className="d-bar-container"><div className="d-bar" style={{ width: `${batteryPct}%`, background: batteryPct < 20 ? 'red' : '#00ff66' }}></div></div><span className="d-value">{batteryPct.toFixed(0)}%</span></div>
                        <div className="data-grid-2"><div className="d-box"><span className="d-sub">VOLTAGE</span><span className="d-val-big">{voltage.toFixed(1)} <small>V</small></span></div><div className="d-box"><span className="d-sub">CURRENT</span><span className="d-val-big">{current.toFixed(1)} <small>A</small></span></div></div>
                      </div>
                      <div className="telemetry-section"><h3>GPS</h3><div className="data-row"><span className="d-label">Sats</span><span className="d-value">{satellites}</span></div><div className="data-row"><span className="d-label">Lat</span><span className="d-value">{currentLat.toFixed(6)}</span></div><div className="data-row"><span className="d-label">Lon</span><span className="d-value">{currentLon.toFixed(6)}</span></div></div>
                      <div className="telemetry-section"><h3>ATTITUDE</h3><div className="data-row"><span className="d-label">Roll</span><span className="d-value">{roll.toFixed(1)}°</span></div><div className="data-row"><span className="d-label">Pitch</span><span className="d-value">{pitch.toFixed(1)}°</span></div><div className="data-row"><span className="d-label">Hdg</span><span className="d-value">{heading.toFixed(0)}°</span></div></div>
                    </div>
                  </div>
                </DraggableWindow>
              )}

            </div>
          </div>
        );
      case 'plan': return (<div className="plan-view glass-panel"> {/* ... Plan view content same ... */} <div className="plan-sidebar"><h2>Mission Editor</h2><div className="mission-stats"><div className="m-stat"><span>WPs:</span> {waypoints.length}</div><div className="m-stat"><span>Dist:</span> {totalDist.toFixed(2)} km</div></div><div className="waypoint-list-container">{waypoints.length === 0 ? (<div className="empty-msg">Click on map to add waypoints</div>) : (<div className="wp-list">{waypoints.map((wp, idx) => { const isUnsafe = wp.agl < minSafeAlt && wp.cmd !== 'LAND'; return (<div key={wp.id} className={`wp-item ${selectedWpId === wp.id ? 'active' : ''} ${isUnsafe ? 'unsafe' : ''}`} onClick={() => setSelectedWpId(wp.id)}><div className="wp-header"><span className="wp-idx">{idx + 1}</span><select className="wp-cmd-select" value={wp.cmd} onChange={(e) => handleWpUpdate(wp.id, 'cmd', e.target.value)}><option>WAYPOINT</option><option>TAKEOFF</option><option>LAND</option><option>RTL</option></select><div className="wp-controls"><button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleWpMove(idx, -1); }}>▲</button><button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleWpMove(idx, 1); }}>▼</button><button className="icon-btn danger" onClick={(e) => { e.stopPropagation(); handleWpDelete(wp.id); }}>✖</button></div></div><div className="wp-details"><div className="wp-input-grp"><label>Alt</label><input type="number" value={wp.alt} onChange={(e) => handleWpUpdate(wp.id, 'alt', e.target.value)} /></div><div className="wp-coords">{wp.lat.toFixed(5)}, {wp.lon.toFixed(5)}</div></div><div className="wp-agl-info"><span>Gnd: {wp.groundElev?.toFixed(0) || '?'}m</span><span className={isUnsafe ? 'warn-text' : 'safe-text'}>AGL: {wp.agl?.toFixed(0) || '?'}m</span></div></div>) })}</div>)}</div><div className="mission-actions"><button className="btn-secondary" onClick={handleSaveFile}>Save</button><button className="btn-secondary" onClick={handleLoadFile}>Load</button><button className="btn-secondary danger" onClick={handleClearMission}>Clear</button><button className="btn-primary" style={{ flex: 2 }} onClick={handleUploadMission}>Upload</button></div></div><div className="plan-map-area"><MissionMap heading={heading} lat={currentLat} lon={currentLon} waypoints={waypoints} selectedWpId={selectedWpId} onMapClick={(e) => handleMapClick(e)} onWpDragEnd={handleWpDragCheck} onWpClick={handleWpClick} /></div></div>);
      case 'setup': return (<div className="setup-view glass-panel"> {/* ... Setup View Same ... */} <div className="setup-sidebar"><h2>Setup</h2>{['frame', 'motors', 'servos', 'calib'].map(s => (<div key={s} className={`setup-item ${setupSubTab === s ? 'active' : ''}`} onClick={() => setSetupSubTab(s)}>{s.charAt(0).toUpperCase() + s.slice(1)}</div>))}</div><div className="setup-content">{setupSubTab === 'frame' && (<div className="grid-config-panel"><h3>Select Vehicle Architecture</h3><div className="frame-options">{['quad_x', 'quad_plus', 'hexa', 'octa', 'plane', 'vtol'].map(type => (<div key={type} className={`frame-card ${frameType === type ? 'selected' : ''}`} onClick={() => setFrameType(type)}><div className="frame-icon"><div className={`icon-${type}`}></div></div><span className="frame-name">{type.replace('_', ' ').toUpperCase()}</span></div>))}</div><div className="config-box" style={{ marginTop: '20px' }}><h4>Configuration</h4><p>Selected: <b>{frameType.toUpperCase().replace('_', ' ')}</b></p><button className="btn-primary" onClick={() => addLog(`Frame ${frameType} applied`, 'success')}>Apply & Reboot</button></div></div>)}{setupSubTab === 'motors' && (<div className="grid-config-panel"><h3>Motor Configuration & Test</h3><div className="warning-box">⚠️ WARNING: Remove props before testing motors!</div><div className="motors-grid">{motorConfig.map((m, idx) => (<div key={idx} className="motor-card"><div className="motor-header"><span>Motor {m.id}</span></div><div className="motor-controls"><div className="slider-group"><label>Test (1000-2000)</label><input type="range" min="1000" max="2000" defaultValue="1000" className="motor-slider" /></div><div className="check-group"><input type="checkbox" checked={m.reverse} onChange={() => { const newConf = [...motorConfig]; newConf[idx].reverse = !newConf[idx].reverse; setMotorConfig(newConf); }} /><label>Reverse Direction</label></div></div></div>))}</div><button className="btn-primary" style={{ marginTop: '20px' }}>Save Motor Config</button></div>)}{setupSubTab === 'servos' && (<div className="grid-config-panel"><h3>Servo Output Limits</h3><div className="servos-list">{servoConfig.map((s, idx) => (<div key={idx} className="servo-row"><div className="servo-label">CH{s.ch}: {s.function}</div><div className="servo-controls"><div className="s-input"><label>MIN</label><input type="number" value={s.min} onChange={e => { const newC = [...servoConfig]; newC[idx].min = parseInt(e.target.value); setServoConfig(newC); }} /></div><div className="s-bar"><div className="s-range" style={{ left: `${(s.min - 800) / 14}%`, right: `${100 - (s.max - 800) / 14}%` }}></div><div className="s-trim" style={{ left: `${(s.trim - 800) / 14}%` }}></div></div><div className="s-input"><label>MAX</label><input type="number" value={s.max} onChange={e => { const newC = [...servoConfig]; newC[idx].max = parseInt(e.target.value); setServoConfig(newC); }} /></div><div className="check-group"><input type="checkbox" checked={s.rev} onChange={() => { const newC = [...servoConfig]; newC[idx].rev = !newC[idx].rev; setServoConfig(newC); }} /><label>REV</label></div></div></div>))}</div><button className="btn-primary" style={{ marginTop: '20px' }}>Save Servo Limits</button></div>)}</div></div>);
      case 'config': return (<div className="config-view glass-panel"><h2>App Settings</h2>{/* Config UI same */} <div className="config-cols"><div className="config-col"><h3>Connection</h3><div className="config-box"><div className="form-group"><label>Comm Link</label><select value={'serial'} disabled><option value="serial">Serial / USB</option></select></div><div className="form-group"><label>Port</label><select value={selectedPort} onChange={(e) => setSelectedPort(e.target.value)}><option value="" disabled>Select</option>{availablePorts.map(p => <option key={p.path} value={p.path}>{p.path}</option>)}</select></div><div className="form-group"><label>Baud</label><select value={baudRate} onChange={(e) => setBaudRate(e.target.value)}><option>57600</option><option>115200</option></select></div><button className={`btn-primary ${isConnected ? 'btn-danger' : ''}`} onClick={handleConnect}>{isConnected ? 'Disconnect' : 'Connect'}</button></div></div><div className="config-col"><h3>Preferences</h3><div className="config-box"><div className="form-group"><label>Update Rate</label><select value={updateRate} onChange={e => setUpdateRate(Number(e.target.value))}><option value="100">10 Hz</option><option value="50">20 Hz</option></select></div><div className="form-group"><label>Min Safe Alt (m)</label><input type="number" value={minSafeAlt} onChange={e => setMinSafeAlt(Number(e.target.value))} /></div><div className="form-group row-check"><input type="checkbox" checked={enableVoice} onChange={e => setEnableVoice(e.target.checked)} /><label>Voice Warnings</label></div></div></div></div></div>);
      default: return <div>Select a menu item</div>;
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar glass-panel">
        <div className="logo-area"><h1 className="title text-glow">GCS</h1></div>
        <nav className="nav-menu">
          {['flight', 'plan', 'setup', 'config'].map(tab => (
            <div key={tab} className={`nav-item ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</div>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <div className="content-area">{renderContent()}</div>
      </main>

      <style>{`
        /* --- MAIN LAYOUT --- */
        .app-container { display: grid; grid-template-columns: 70px 1fr; height: 100vh; width: 100vw; background: #121212; color: #eee; font-family: 'Inter', sans-serif; overflow: hidden; }
        .sidebar { background: #0a0a0a; border-right: 1px solid #333; display: flex; flex-direction: column; align-items: center; padding: 20px 0; z-index: 100; }
        .title { font-size: 1.2rem; font-weight: 900; color: var(--primary-color); letter-spacing: 2px; margin-bottom: 40px; }
        .nav-item { writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); padding: 20px 10px; margin: 10px 0; border-left: 2px solid transparent; color: #666; cursor: pointer; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px; transition: all 0.2s; }
        .nav-item:hover, .nav-item.active { color: var(--primary-color); background: rgba(255,255,255,0.05); border-left-color: var(--primary-color); }

        .main-content { display: flex; flex-direction: column; padding: 5px; gap: 0; background: radial-gradient(circle at 50% 50%, #1a1a2e 0%, #0a0a12 100%); height: 100vh; overflow: hidden; }
        .content-area { flex: 1; overflow: hidden; display: flex; width:100%; height:100%; }
        
        .top-header { height: 35px; min-height:35px; background: #0a0a0a; border-bottom: 1px solid #333; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; flex-shrink: 0; box-shadow: 0 2px 10px rgba(0,0,0,0.5); z-index: 1000; overflow: hidden; }
        .h-left, .h-right { display:flex; align-items:center; }
        .status-badge { padding: 0.2em 0.8em; border-radius: 4px; font-weight: bold; color: #fff; background: #333; margin-right: 10px; font-size:0.8rem; }
        .status-badge.armed { background: #ff3333; } .status-badge.disarmed { background: #2ecc71; color:black; } .status-badge.mode { background: #3498db; }
        .app-logo-small { font-weight: 900; color: var(--primary-color); letter-spacing: 2px; margin-right: 15px; font-size:1rem; }
        
        .status-bar-area { background: #0c0c0c; border-bottom: 1px solid #333; display: flex; align-items: center; justify-content: space-between; padding: 0 15px; flex-shrink: 0; overflow: hidden; }
        .sb-stats { display:flex; align-items:center; gap:10px; }

        .connection-pill { 
            display: flex; align-items: center; gap: 6px; 
            border-radius: 20px; text-transform: uppercase;
            background: #151515; border: 1px solid #333; 
            color: #888; letter-spacing: 0.5px; font-weight: bold;
            transition: all 0.3s;
        }
        .connection-pill.active { border-color: #2ecc71; background: rgba(46, 204, 113, 0.1); color: #fff; }
        .connection-pill.inactive { border-color: #e74c3c; background: rgba(231, 76, 60, 0.1); color: #aaa; }
        
        .conn-dot { border-radius: 50%; background: #555; box-shadow: 0 0 5px rgba(0,0,0,0.5); }
        .connection-pill.active .conn-dot { background: #2ecc71; box-shadow: 0 0 8px #2ecc71; animation: pulse-green 2s infinite; }
        .connection-pill.inactive .conn-dot { background: #e74c3c; box-shadow: 0 0 8px #e74c3c; animation: pulse-red 2s infinite; }
        @keyframes pulse-green { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        @keyframes pulse-red { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

        .stat-item { display: flex; gap: 5px; color: #ccc; align-items: center; background: #151515; border-radius: 4px; border: 1px solid #222; }
        .stat-item .label { color: #666; font-weight: bold; font-size: 0.9em; }
        .stat-item .value.good { color: #2ecc71; }
        .stat-item .value.bad { color: #e74c3c; }

        /* --- DASHBOARD RESIZABLE --- */
        .layout-flight { flex: 1; display:flex; flex-direction:column; overflow:hidden; width:100%; height:100%; }
        .resizable-panel { display: flex; flex-direction: column; overflow: hidden; min-width: 200px; }
        .flex-row { display:flex; flex-direction:row; }
        .flex-column { display:flex; flex-direction:column; }
        
        .resizer-handle { background: #222; display: flex; align-items: center; justify-content: center; transition: all 0.2s; z-index: 999; }
        .resizer-handle:hover, .resizer-handle:active { background: var(--primary-color); }
        
        .resizer-handle.col { width: 6px; cursor: col-resize; border-left: 1px solid #333; border-right: 1px solid #333; height: 100%; }
        .resizer-handle.col::after { content: '⋮'; color: #666; font-size: 14px; }
        
        .resizer-handle.row { height: 6px; cursor: row-resize; border-top: 1px solid #333; border-bottom: 1px solid #333; width: 100%; flex-shrink:0; }
        .resizer-handle.row::after { content: '···'; color: #666; font-size: 14px; line-height: 0; }
        
        .panel, .glass-panel { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; display: flex; flex-direction: column; position: relative; flex: 1; }
        h2 { font-size: 0.75rem; color: #666; margin: 0; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); letter-spacing: 1px; text-transform: uppercase; }
        
        /* --- SETUP & CONFIG UI (Same) --- */
        .setup-view { display: flex; flex-direction: column; width: 100%; height: 100%; }
        .setup-sidebar { width: 100%; background: rgba(0,0,0,0.3); border-bottom: 1px solid #333; display: flex; flex-direction: row; align-items: center; flex-shrink: 0; }
        .setup-sidebar h2 { display: none; }
        .setup-item { flex: 1; padding: 15px 10px; cursor: pointer; border-bottom: 2px solid transparent; color: #aaa; font-size: 0.9rem; transition: all 0.2s; text-align: center; font-weight: bold; letter-spacing: 1px; }
        .setup-item:hover { background: rgba(255,255,255,0.05); color: #fff; }
        .setup-item.active { background: rgba(var(--primary-rgb), 0.1); color: var(--primary-color); border-bottom-color: var(--primary-color); }
        .setup-content { flex: 1; padding: 30px; overflow-y: auto; background: rgba(0,0,0,0.2); }
        .grid-config-panel { max-width: 900px; margin: 0 auto; }
        .grid-config-panel h3 { color: var(--primary-color); border-bottom: 2px solid var(--primary-color); padding-bottom: 10px; margin-bottom: 20px; }
        
        .frame-options { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px; }
        .frame-card { background: rgba(255,255,255,0.05); border: 2px solid transparent; border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s; }
        .frame-card:hover { background: rgba(255,255,255,0.1); }
        .frame-card.selected { border-color: var(--primary-color); background: rgba(var(--primary-rgb), 0.1); box-shadow: 0 0 15px rgba(var(--primary-rgb), 0.2); }
        .frame-icon { width: 60px; height: 60px; background: #333; border-radius: 50%; margin: 0 auto 10px; display:flex; align-items:center; justify-content:center; }
        .config-box { background: rgba(0,0,0,0.3); padding: 20px; border-radius: 8px; border: 1px solid #333; }
        .warning-box { background: #e74c3c; color: white; padding: 10px; border-radius: 4px; font-weight: bold; margin-bottom: 20px; text-align: center; }
        .motors-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
        .motor-card { background: rgba(255,255,255,0.05); border-radius: 6px; padding: 15px; border: 1px solid #333; }
        .motor-header { margin-bottom: 10px; font-weight: bold; color: var(--primary-color); border-bottom: 1px solid #444; padding-bottom: 5px; }
        .motor-controls { display: flex; flex-direction: column; gap: 10px; }
        .slider-group { display: flex; flex-direction: column; gap: 5px; }
        .motor-slider { width: 100%; }
        .check-group { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #ccc; }
        .servos-list { display: flex; flex-direction: column; gap: 10px; }
        .servo-row { display: flex; align-items: center; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; }
        .servo-label { width: 120px; font-weight: bold; color: #ddd; }
        .servo-controls { flex: 1; display: flex; align-items: center; gap: 15px; }
        .s-input { display: flex; flex-direction: column; align-items: center; }
        .s-input input { width: 60px; background: #111; border: 1px solid #444; color: #fff; text-align: center; padding: 4px; border-radius: 4px; }
        .s-input label { font-size: 0.7rem; color: #888; }
        .s-bar { flex: 1; height: 10px; background: #222; border-radius: 5px; position: relative; overflow: hidden; }
        .s-range { position: absolute; height: 100%; background: #3498db; top: 0; opacity: 0.5; }
        .s-trim { position: absolute; height: 100%; width: 4px; background: #fff; top: 0; transform: translateX(-50%); }

        /* --- PLANNER & COMMON (Same) --- */
        .plan-view { display: flex; flex-direction: row; width: 100%; height: 100%; } .plan-sidebar { width: 340px; display:flex; flex-direction: column; border-right: 1px solid #333; }
        .plan-map-area { flex: 1; height: 100%; position: relative; }
        .mission-stats { display: flex; justify-content: space-between; padding: 10px; background: #1a1a1a; font-size: 0.85rem; }
        .waypoint-list-container { flex: 1; overflow-y: auto; background: rgba(0,0,0,0.2); }
        .wp-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 8px; margin: 2px; cursor: pointer; }
        .wp-item.active { background: rgba(var(--primary-rgb), 0.1); border-color: var(--primary-color); }
        .wp-item.unsafe { border-color: #e74c3c; background: rgba(231, 76, 60, 0.1); }
        .warn-text { color: #e74c3c; } .safe-text { color: #2ecc71; }
        .wp-header { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .wp-cmd-select { background: #222; color: white; border: 1px solid #444; }
        .mission-actions { padding: 10px; display: flex; gap: 10px; background: #1a1a1a; }
        .btn-primary { padding: 8px 16px; background: var(--primary-color); border: none; font-weight: bold; border-radius: 4px; cursor: pointer; transition: all 0.2s; color: black; }
        .btn-primary:hover { filter: brightness(1.1); box-shadow: 0 0 10px var(--primary-color); }
        .btn-secondary { padding: 8px 12px; background: #333; border: 1px solid #555; color: #ddd; border-radius: 4px; cursor: pointer; }
        .btn-danger { background: #c0392b; color: white; }
        
        /* PFD & Telemetry (Same) */
        .pfd-container { flex: 1; display: flex; justify-content: space-between; align-items: center; position: relative; }
        .horizon-wrapper { position: absolute; width: 100%; height: 100%; z-index: 0; display:flex; justify-content:center; align-items:center; }
        .tape-left, .tape-right { z-index: 10; margin: 0 2px; }
        .telemetry-scroll { flex: 1; overflow-y: auto; padding: 10px; }
        .data-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .d-value { font-family: monospace; color: var(--primary-color); }
        .d-bar-container { flex: 1; height: 6px; background: #333; margin: 0 10px; border-radius: 3px; }
        .d-bar { height: 100%; }

        /* Console (Same) */
        .console { background: rgba(0,0,0,0.9); border-top: 1px solid var(--primary-color); }
        .console-header { background: rgba(var(--primary-rgb), 0.15); color: var(--primary-color); padding: 5px 10px; cursor: pointer; display: flex; justify-content: space-between; font-weight: bold; font-size: 0.8rem; }
        .console-body { font-family: monospace; font-size: 0.8rem; padding: 5px; height: 100px; overflow-y: auto; }
        .log-line { border-bottom: 1px solid rgba(255,255,255,0.05); padding: 2px 0; }
        .log-line.error { color: #e74c3c; } .log-line.success { color: #2ecc71; }
        
        /* Config Cols (Same) */
        .config-cols { display: flex; gap: 20px; padding: 20px; flex-wrap: wrap; }
        .config-col { flex: 1; min-width: 300px; }
        .form-group { margin-bottom: 15px; } .form-group label { display: block; margin-bottom: 5px; color: #888; font-size:0.85rem; }
        .form-group select, .form-group input { width: 100%; padding: 8px; background: #111; border: 1px solid #444; color: white; border-radius: 4px; }
        
        /* Icons (Simple CSS placeholders) */
        .icon-quad_x, .icon-quad_plus, .icon-hexa, .icon-octa, .icon-plane, .icon-vtol { width: 40px; height: 40px; border: 2px solid #666; border-radius: 5px; position: relative; }
        .icon-quad_x::after { content:'X'; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#666; font-weight:bold; }
        .icon-plane::after { content:'✈'; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#666; }
      `}</style>
    </div>
  );
}

export default App;
