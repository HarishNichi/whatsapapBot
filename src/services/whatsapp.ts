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
                args: ['--no-sandbox']
            }
        });

        this.initialize();
    }

    public getQr() {
        return this.lastQr;
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

        this.client.initialize();
    }

    public async sendMessage(chatId: string, content: string) {
        if (!this.ready) {
            console.warn('WhatsApp not ready yet.');
            return;
        }
        await this.client.sendMessage(chatId, content);
    }
}
