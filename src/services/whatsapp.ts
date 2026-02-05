import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import { EventEmitter } from 'events';
import pino from 'pino';

export class WhatsAppService extends EventEmitter {
    private sock: any;
    private ready: boolean = false;
    private lastQr: string | null = null;
    private saveCreds: any;

    constructor() {
        super();
        this.initialize();
    }

    public getQr() {
        return this.lastQr;
    }

    public isReady() {
        return this.ready;
    }

    private async initialize() {
        console.log('[WhatsApp] Initializing Baileys...');
        
        // Use file-based auth state
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        this.saveCreds = saveCreds;

        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`[WhatsApp] Using WA v${version.join('.')} (isLatest: ${isLatest})`);

        this.sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }) as any,
            printQRInTerminal: false, // We handle QR manually
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }) as any),
            },
            generateHighQualityLinkPreview: true,
        });

        // Handle Connection Updates (QR, Connect, Disconnect)
        this.sock.ev.on('connection.update', (update: any) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('QR RECEIVED');
                this.lastQr = qr;
                qrcode.generate(qr, { small: true });
                console.log('Scan the QR code above to log in to WhatsApp.');
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('[WhatsApp] Connection closed. Reconnecting:', shouldReconnect);
                this.ready = false;
                if (shouldReconnect) {
                    this.initialize();
                } else {
                    console.log('[WhatsApp] Logged out. Delete auth_info_baileys to re-scan.');
                }
            } else if (connection === 'open') {
                console.log('[WhatsApp] Opened connection! ✅');
                this.ready = true;
                this.emit('ready');
            }
        });

        // Save Credentials
        this.sock.ev.on('creds.update', this.saveCreds);

        // Handle Incoming Messages
        this.sock.ev.on('messages.upsert', async (m: any) => {
            if (m.type !== 'notify') return;
            
            for (const msg of m.messages) {
                if (!msg.message) continue;

                const isFromMe = msg.key.fromMe;
                const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

                if (isFromMe) {
                    if (text.startsWith('/')) {
                        console.log(`[WhatsApp] Self-Command: ${text}`);
                    } else {
                        continue; 
                    }
                } else {
                     console.log(`[WhatsApp] Message from ${msg.key.remoteJid}`);
                }

                // Emit simplified event for Brain
                this.emit('message', { 
                    msg: {
                        from: msg.key.remoteJid,
                        body: text,
                        fromMe: isFromMe,
                        reply: async (replyText: string) => this.sendMessage(msg.key.remoteJid, replyText)
                    }, 
                    history: [] // History fetching is complex in Baileys, omitting for now
                });
            }
        });
    }

    public async sendMessage(chatId: string, content: string) {
        if (!this.sock) {
             console.warn('WhatsApp socket not initialized.');
             return;
        }
        await this.sock.sendMessage(chatId, { text: content });
    }
}
