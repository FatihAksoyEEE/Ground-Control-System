"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronAPI", {
  // --- SERIAL ---
  listSerialPorts: () => ipcRenderer.invoke("serial:list-ports"),
  connectSerial: (portPath, baudRate) => ipcRenderer.invoke("serial:connect", { path: portPath, baudRate }),
  disconnectSerial: () => ipcRenderer.invoke("serial:disconnect"),
  serialWrite: (data) => ipcRenderer.invoke("serial:write", data),
  saveMission: (data) => ipcRenderer.invoke("mission:save", data),
  loadMission: () => ipcRenderer.invoke("mission:load"),
  onSerialStatus: (callback) => ipcRenderer.on("serial-status", (event, value) => {
    callback(value);
  }),
  // --- DATA ---
  onSerialData: (callback) => ipcRenderer.on("serial-data", (event, data) => {
    callback(data);
  }),
  // --- UI CONTROL ---
  onTogglePanel: (callback) => ipcRenderer.on("toggle-panel", (event, data) => {
    callback(data);
  })
});
