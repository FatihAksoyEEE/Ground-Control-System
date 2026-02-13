"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronAPI", {
  // Gerekli IPC fonksiyonlarını buraya ekleyeceğiz
  // Örn: sendData: (data) => ipcRenderer.send('data-tx', data)
  platform: process.platform
});
