import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { EventEmitter } from 'events';

export class WhatsAppService extends EventEmitter {
    private client: Client;
    private ready: boolean = false;
    private lastQr: string | null = null;

    constructor() {
        super();
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote', 
                    '--single-process', 
                    '--disable-gpu'
                ],
                protocolTimeout: 300000
            }
        });

        this.initialize();
    }

    public getQr() {
        return this.lastQr;
    }

    public isReady() {
        return this.ready;
    }

    private pendingReplies: Map<string, NodeJS.Timeout> = new Map();

    private initialize() {
        this.client.on('qr', (qr) => {
            console.log('QR RECEIVED', qr);
            this.lastQr = qr;
            qrcode.generate(qr, { small: true });
            console.log('Scan the QR code above to log in to WhatsApp.');
        });

        this.client.on('ready', () => {
            console.log('WhatsApp Client is ready!');
            this.ready = true;
            this.emit('ready');
        });

        this.client.on('message_create', async (msg) => {
            // Handle Self-Commands
            if (msg.fromMe) {
                if (msg.body.startsWith('/')) {
                    console.log(`[WhatsApp] Self-Command received: ${msg.body}`);
                    // Fallthrough to emit
                } else {
                    return; // Ignore regular self-messages
                }
            } else {
                console.log(`[WhatsApp] Message received from ${msg.from}`);
            }
            
            const chat = await msg.getChat();
            const history = await chat.fetchMessages({ limit: 10 });
            
            // Emit the message AND the history
            this.emit('message', { msg, history });
        });


        
        console.log('[WhatsApp] Initializing client...');
        try {
            this.client.initialize().then(() => {
                console.log('[WhatsApp] Client initialize() call resolved.');
            }).catch(err => {
                console.error('[WhatsApp] Client initialize() FAILED:', err);
            });
        } catch (error) {
            console.error('[WhatsApp] Unexpected error during initialize:', error);
        }
    }

    public async sendMessage(chatId: string, content: string) {
        if (!this.ready) {
            console.warn('WhatsApp not ready yet.');
            return;
        }
        await this.client.sendMessage(chatId, content);
    }
}
