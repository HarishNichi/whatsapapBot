import { WhatsAppService } from './services/whatsapp';
import { AgentBrain } from './agent/brain';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

const brain = new AgentBrain();
const whatsapp = new WhatsAppService();

// Connect Brain to WhatsApp
whatsapp.on('message', async (payload: any) => {
    // payload contains { msg, history }
    const { msg, history } = payload;
    const chat = await msg.getChat();
    const contact = await msg.getContact();

    // Check for Commands (from ME)
    if (msg.fromMe && msg.body.startsWith('/')) {
        const command = msg.body.toLowerCase();
        if (command.includes('status busy')) {
            brain.setUserStatus('busy');
            await msg.reply('✅ Status set to: BUSY');
        } else if (command.includes('status available')) {
            brain.setUserStatus('available');
            await msg.reply('✅ Status set to: AVAILABLE');
        } else if (command.includes('status')) {
             await msg.reply(`ℹ️ Current Status: ${brain.getUserStatus()}`); // Need to add accessor to Brain
        }
        return;
    }

    // Check for Commands (from ME)
    if (msg.fromMe && msg.body.startsWith('/')) {
        const command = msg.body.toLowerCase();
        if (command.includes('status busy')) {
            brain.setUserStatus('busy');
            await msg.reply('✅ Status set to: BUSY');
        } else if (command.includes('status available')) {
            brain.setUserStatus('available');
            await msg.reply('✅ Status set to: AVAILABLE');
        } else if (command.includes('status')) {
             await msg.reply(`ℹ️ Current Status: ${brain.getUserStatus()}`); 
        }
        return;
    }

    // Don't reply to groups for safety in MVP
    if (chat.isGroup) return;

    const reply = await brain.processMessage(
        'WhatsApp', 
        contact.pushname || contact.number, 
        msg.body,
        history
    );
    
    if (reply) {
        await msg.reply(reply);
    }
});

// Dummy HTTP Server for Render (Web Services must bind to a port)
import * as http from 'http';
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Personal Agent is alive and running!');
}).listen(port, () => {
    console.log(`[Server] Listening on port ${port} (Required for Render)`);
});

// CLI Interface to change status
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('--- Personal Agent Started ---');
console.log('Commands: status <status>, exit');

rl.on('line', (line) => {
    const [cmd, ...args] = line.trim().split(' ');
    
    if (cmd === 'status') {
        const newStatus = args.join(' ');
        brain.setUserStatus(newStatus);
        console.log(`[System] User status set to: ${newStatus}`);
    } else if (cmd === 'exit') {
        process.exit(0);
    }
});
