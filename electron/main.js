const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const { SerialPort } = require('serialport');
const fs = require('fs');

// INTERNAL SERIAL MANAGER CLASS (To handle port logic in Main Process)
class SerialManager {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.port = null;
        this.parser = null;
    }

    // List available serial ports
    async listPorts() {
        try {
            const ports = await SerialPort.list();
            return ports.map(port => ({
                path: port.path,
                manufacturer: port.manufacturer,
                serialNumber: port.serialNumber,
                locationId: port.locationId,
                vendorId: port.vendorId,
                productId: port.productId,
            }));
        } catch (err) {
            console.error('Error listing ports:', err);
            return [];
        }
    }

    // Connect to a specific port
    connect(portPath, baudRate) {
        return new Promise((resolve, reject) => {
            if (this.port && this.port.isOpen) {
                this.port.close((err) => {
                    if (err) return reject(err);
                    this.openPort(portPath, baudRate, resolve, reject);
                });
            } else {
                this.openPort(portPath, baudRate, resolve, reject);
            }
        });
    }

    openPort(portPath, baudRate, resolve, reject) {
        this.port = new SerialPort({ path: portPath, baudRate: baudRate, autoOpen: false });

        this.port.open((err) => {
            if (err) {
                console.error('Error opening port:', err);
                return reject(err.message);
            }

            console.log(`Connected to ${portPath} at ${baudRate}`);

            // Send connection status to renderer
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('serial-status', { connected: true, path: portPath });
            }

            // Listen for data
            this.port.on('data', (data) => {
                this.handleData(data);
            });

            this.port.on('close', () => {
                console.log('Port closed');
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.mainWindow.webContents.send('serial-status', { connected: false });
                }
            });

            this.port.on('error', (err) => {
                console.error('Serial Port Error:', err);
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.mainWindow.webContents.send('serial-status', { connected: false, error: err.message });
                }
            });

            resolve(true);
        });
    }

    // Disconnect
    disconnect() {
        return new Promise((resolve, reject) => {
            if (this.port && this.port.isOpen) {
                this.port.close((err) => {
                    if (err) return reject(err);
                    resolve(true);
                });
            } else {
                resolve(true); // Already closed
            }
        });
    }

    // Handle incoming data
    handleData(data) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('serial-data', data);
        }
    }

    // Write data to port
    async write(data) {
        if (this.port && this.port.isOpen) {
            return new Promise((resolve, reject) => {
                this.port.write(data, (err) => {
                    if (err) return reject(err);
                    resolve(true);
                });
            });
        }
        return Promise.reject("Port not open");
    }
}

// --- MAIN PROCESS ---

let mainWindow;
let serialManager;

const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#1a1a2e', // Uygulama arka plan rengiyle uyumlu
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false, // Node modüllerine preload üzerinden erişim için bazen gerekebilir
        },
        title: "Ground Control Station"
    });

    // SerialManager'ı başlat
    serialManager = new SerialManager(mainWindow);

    // Geliştirme ortamı (Dev)
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        // DevTools'u aç (Geliştirme sırasında)
        mainWindow.webContents.openDevTools();
    } else {
        // Üretim ortamı (Prod)
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // --- MENU YAPILANDIRMASI ---
    const template = [
        {
            label: 'Dosya',
            submenu: [
                { role: 'quit', label: 'Çıkış' }
            ]
        },
        {
            label: 'Düzenle',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' }
            ]
        },
        {
            label: 'Ekle',
            submenu: [
                {
                    label: 'Sistem Kontrol',
                    type: 'checkbox',
                    checked: true,
                    click: (menuItem) => {
                        mainWindow.webContents.send('toggle-panel', { id: 'status', visible: menuItem.checked });
                    }
                },
                {
                    label: 'Görev Haritası',
                    type: 'checkbox',
                    checked: true,
                    click: (menuItem) => {
                        mainWindow.webContents.send('toggle-panel', { id: 'map', visible: menuItem.checked });
                    }
                },
                {
                    label: 'Telemetri Verileri',
                    type: 'checkbox',
                    checked: true,
                    click: (menuItem) => {
                        mainWindow.webContents.send('toggle-panel', { id: 'data', visible: menuItem.checked });
                    }
                },
                {
                    label: 'Uçuş Ekranı (PFD)',
                    type: 'checkbox',
                    checked: true,
                    click: (menuItem) => {
                        mainWindow.webContents.send('toggle-panel', { id: 'pfd', visible: menuItem.checked });
                    }
                },
                {
                    label: 'Sistem Günlüğü',
                    type: 'checkbox',
                    checked: true,
                    click: (menuItem) => {
                        mainWindow.webContents.send('toggle-panel', { id: 'console', visible: menuItem.checked });
                    }
                }
            ]
        },
        {
            label: 'Görünüm',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
};

// --- IPC HANDLERS (Renderer -> Main) ---
app.whenReady().then(() => {
    // Portları listele
    ipcMain.handle('serial:list-ports', async () => {
        if (serialManager) {
            return await serialManager.listPorts();
        }
        return [];
    });

    // Porta bağlan
    ipcMain.handle('serial:connect', async (event, { path, baudRate }) => {
        if (serialManager) {
            try {
                await serialManager.connect(path, parseInt(baudRate));
                return { success: true };
            } catch (err) {
                return { success: false, error: err };
            }
        }
        return { success: false, error: "Manager not initialized" };
    });

    // Bağlantıyı kes
    ipcMain.handle('serial:disconnect', async () => {
        if (serialManager) {
            await serialManager.disconnect();
            return { success: true };
        }
        return { success: false };
    });

    // Veri Gönder (Write)
    ipcMain.handle('serial:write', async (event, data) => {
        if (serialManager) {
            try {
                // Gelen data (Array veya Uint8Array) -> Buffer'a çevir
                const buffer = Buffer.from(data);
                await serialManager.write(buffer);
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message || err };
            }
        }
        return { success: false, error: "Manager not initialized" };
    });

    // --- MISSION FILE HANDLERS ---

    // Save Mission to File
    ipcMain.handle('mission:save', async (event, data) => {
        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Save Mission',
            defaultPath: 'mission.gcs',
            filters: [{ name: 'GCS Mission Files', extensions: ['gcs', 'json'] }]
        });

        if (canceled || !filePath) return { success: false };

        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            return { success: true, path: filePath };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    // Load Mission from File
    ipcMain.handle('mission:load', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            title: 'Load Mission',
            filters: [{ name: 'GCS Mission Files', extensions: ['gcs', 'json'] }],
            properties: ['openFile']
        });

        if (canceled || filePaths.length === 0) return { success: false };

        try {
            const content = fs.readFileSync(filePaths[0], 'utf-8');
            const data = JSON.parse(content);
            return { success: true, data };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
