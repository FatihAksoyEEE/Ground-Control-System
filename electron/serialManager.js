
const { SerialPort } = require('serialport');
const { app } = require('electron');

class SerialManager {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.port = null;
        this.baudRate = 57600;
        this.isConnected = false;

        // Mock veri gönderme intervali (eğer bağlantı yoksa veya test modundaysak)
        this.mockInterval = null;
    }

    // Mevcut portları listele
    async listPorts() {
        try {
            const ports = await SerialPort.list();
            return ports.map(p => ({
                path: p.path,
                manufacturer: p.manufacturer || 'Unknown',
                serialNumber: p.serialNumber,
                pnpId: p.pnpId,
            }));
        } catch (err) {
            console.error('Error listing ports:', err);
            return [];
        }
    }

    // Porta bağlan
    async connect(path, baudRate = 57600) {
        if (this.isConnected) {
            await this.disconnect();
        }

        return new Promise((resolve, reject) => {
            try {
                this.port = new SerialPort({ path, baudRate, autoOpen: false });

                this.port.open((err) => {
                    if (err) {
                        console.error('Error opening port:', err);
                        reject(err.message);
                        return;
                    }

                    this.isConnected = true;
                    this.baudRate = baudRate;

                    // Port açıldığında renderer'a bildir
                    this.mainWindow.webContents.send('serial-status', { connected: true, path });

                    // Veri geldiğinde
                    this.port.on('data', (data) => {
                        this.handleData(data);
                    });

                    // Hata durumunda
                    this.port.on('error', (err) => {
                        console.error('Serial port error:', err);
                        this.disconnect();
                        this.mainWindow.webContents.send('serial-error', err.message);
                    });

                    // Kapandığında
                    this.port.on('close', () => {
                        this.isConnected = false;
                        this.mainWindow.webContents.send('serial-status', { connected: false });
                    });

                    resolve(true);
                });

            } catch (error) {
                console.error("Connection exception:", error);
                reject(error.message);
            }
        });
    }

    // Bağlantıyı kes
    async disconnect() {
        if (this.port && this.port.isOpen) {
            return new Promise((resolve) => {
                this.port.close(() => {
                    this.isConnected = false;
                    this.port = null;
                    resolve(true);
                });
            });
        }
        return Promise.resolve(true);
    }

    // Gelen veriyi işle
    handleData(data) {
        // Ham veriyi (Buffer) renderer process'e gönder
        // İleride burada parsing işlemi yapabiliriz (MavLink vb.)
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            // ArrayBuffer olarak gönderelim
            this.mainWindow.webContents.send('serial-data', data);
        }
    }
}

module.exports = SerialManager;
