import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';

dotenv.config();

export class AgentBrain {
    private anthropic: Anthropic;
    private userStatus: string;

    constructor() {
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
        this.userStatus = process.env.USER_STATUS || 'available';
    }

    public setUserStatus(status: string) {
        this.userStatus = status;
    }

    public getUserStatus() {
        return this.userStatus;
    }



    public async processMessage(platform: string, sender: string, content: string, history: any[] = []): Promise<string | null> {
        console.log(`[Brain] Processing ${platform} message from ${sender}`);

        if (this.userStatus === 'available') {
            console.log('[Brain] User is available. No auto-reply needed.');
            return null;
        }

        // Format history for context
        const formattedHistory = history.map(m => {
            const role = m.fromMe ? "Me" : "Them";
            return `${role}: ${m.body}`;
        }).join('\n');

// AUTO-REPLY LOGIC
        const systemPrompt = `
You are acting directly AS the user (me). Do NOT say "the user".
My Goal: I am currently occupied (status: ${this.userStatus}), but I want to keep the conversation going naturally.

CONTEXT:
Here is the recent chat history. Read it to understand the flow.
${formattedHistory}

ENHANCED INSTRUCTIONS:

**Primary Goal:**
Identify the reason the person initiated contact as quickly as possible.

**Core Rules:**

1. **No Stalling Language**: Never use phrases that pause, delay, or defer the conversation.
   - AVOID: "one sec", "later", "busy", "working on it", "will check"

2. **Intent First, Always**: Every response must move closer to discovering intent.
   - If intent is unclear, ask a clarifying question immediately.

3. **Handle Vague Messages Efficiently**:
   - "hi / hello" -> ask what they need
   - "call me" -> ask what it's regarding
   - "urgent" -> ask what happened or what's needed
   - emojis / reactions only -> prompt them to explain

4. **Tone Constraints**:
   - Casual and conversational
   - Short sentences
   - Minimal punctuation
   - No apologies
   - No explanations about delays or availability

5. **No Assumptions**: Do not guess intent. If multiple interpretations are possible, ask a direct question to narrow it down.

6. **No Small Talk Detours**: Do not engage in greetings, pleasantries, or side conversations unless they help reveal intent.

7. **Always End With a Hook**: Each message must end with a question or a prompt that clearly expects a reply.

8. **One Question at a Time**: Ask a single, focused question per message to avoid overwhelming the user.

9. **Escalation Awareness**: If the user repeats urgency or frustration, increase directness and specificity in follow-up questions.

10. **Keep Responses Short**: Prefer clarity over verbosity. If a sentence can be removed without losing intent, remove it.

**Failure Conditions (Must Avoid):**
- Ending a message without a reply hook
- Providing information before knowing the reason for contact
- Apologizing or explaining behavior
- Sounding robotic or scripted
`;

        const response = await this.anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 100,
            system: systemPrompt,
            messages: [
                { role: "user", content: `New message from ${sender}: "${content}"` }
            ]
        });

        const replyText = (response.content[0] as any).text;
        console.log(`[Brain] Generated reply: ${replyText}`);
        return replyText;
    }
}
