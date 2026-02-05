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
