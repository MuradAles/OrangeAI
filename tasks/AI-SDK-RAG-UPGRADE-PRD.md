# 📋 **AI SDK & RAG Pipeline Upgrade PRD**

## 🎯 **Product Overview**

**Feature:** Upgrade to AI SDK by Vercel with Proper RAG Pipeline  
**Goal:** Meet rubric requirements for agent framework and semantic context retrieval  
**User Value:** Better AI responses with more relevant context  
**Technical Value:** Proper agent architecture, tool calling, and semantic search

## 🚨 **Why This Upgrade is Critical**

### **Current Rubric Score Risk**
- ❌ No agent framework: **-3 to -5 points**
- ⚠️ Basic RAG only: **-2 to -3 points**
- **Current projected:** 30-35/40 (75-87%)
- **After upgrade:** 38-40/40 (95-100%) ✅

### **What We're Missing**
1. ❌ Agent framework (required by rubric)
2. ❌ Tool calling/function calling (required by rubric)
3. ❌ Proper RAG with semantic search (required by rubric)
4. ❌ Memory/state management across interactions

---

## 🎯 **Technical Requirements**

### **1. Install AI SDK by Vercel**
**Location:** `functions/` directory (Cloud Functions)

```bash
cd functions
npm install ai @ai-sdk/openai zod
```

**Dependencies:**
- `ai` - Core AI SDK framework
- `@ai-sdk/openai` - OpenAI provider
- `zod` - Schema validation for tools

### **2. Upgrade RAG Pipeline**

#### **Current Implementation (Basic)**
```typescript
// Just fetches last 10 messages chronologically
const loadContext = async (chatId: string) => {
  const snapshot = await firestore
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .orderBy('timestamp', 'desc')
    .limit(10)
    .get();
  return snapshot.docs.map(d => d.data());
};
```

#### **New Implementation (Semantic RAG)**
```typescript
// Semantic search for most RELEVANT messages
const loadRelevantContext = async (chatId: string, query: string) => {
  // 1. Get query embedding
  const queryEmbedding = await getEmbedding(query);
  
  // 2. Load candidate messages (last 50)
  const candidates = await loadRecentMessages(chatId, 50);
  
  // 3. Score by semantic similarity
  const scored = candidates.map(msg => ({
    message: msg,
    score: cosineSimilarity(queryEmbedding, msg.embedding)
  }));
  
  // 4. Return top 10 most relevant
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(s => s.message);
};
```

### **3. Agent Framework Architecture**

```typescript
// Multi-agent system with specialized agents
TranslatorAgent → Handles translation with cultural context
ReplyAgent → Generates smart replies
CulturalAgent → Explains idioms and slang
FormalityAgent → Detects/adjusts formality

Coordinator → Routes requests to appropriate agent
```

---

## 🔧 **Implementation Details**

### **Phase 1: AI SDK Integration**

#### **1.1 Install Dependencies**
```bash
cd functions
npm install ai @ai-sdk/openai zod
npm install --save-dev @types/node
```

#### **1.2 Create AI SDK Configuration**
**File:** `functions/src/config/ai-sdk.config.ts`

```typescript
import { openai } from '@ai-sdk/openai';

export const aiModel = openai('gpt-3.5-turbo', {
  apiKey: process.env.OPENAI_API_KEY,
});

export const embeddingModel = openai.embedding('text-embedding-3-small');
```

#### **1.3 Define Tools for Function Calling**
**File:** `functions/src/tools/translation.tools.ts`

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const translateMessageTool = tool({
  description: 'Translate a message to target language with cultural context',
  parameters: z.object({
    text: z.string().describe('The text to translate'),
    targetLanguage: z.string().describe('Target language code (e.g., "es", "fr")'),
    sourceLanguage: z.string().optional().describe('Source language if known'),
    includeFormality: z.boolean().optional().describe('Include formality detection'),
    includeCultural: z.boolean().optional().describe('Include cultural context'),
  }),
  execute: async ({ text, targetLanguage, sourceLanguage, includeFormality, includeCultural }) => {
    // Translation logic here
    return {
      translation: '...',
      detectedLanguage: '...',
      formality: includeFormality ? '...' : undefined,
      culturalHints: includeCultural ? [...] : undefined,
    };
  },
});

export const detectCulturalContextTool = tool({
  description: 'Detect cultural references, idioms, and slang in text',
  parameters: z.object({
    text: z.string(),
    language: z.string(),
  }),
  execute: async ({ text, language }) => {
    // Cultural detection logic
    return {
      idioms: [...],
      slang: [...],
      culturalReferences: [...],
    };
  },
});
```

---

### **Phase 2: RAG Pipeline with Embeddings**

#### **2.1 Message Embeddings Storage**

**Update Firestore Schema:**
```typescript
// Add embedding field to messages
interface Message {
  id: string;
  text: string;
  // ... existing fields
  embedding?: number[]; // NEW: 1536-dimensional vector for text-embedding-3-small
  embeddingGenerated?: boolean; // NEW: Track if embedding exists
}
```

**Update SQLite Schema:**
```typescript
// Add to migrations
ALTER TABLE messages ADD COLUMN embedding TEXT; // JSON array
ALTER TABLE messages ADD COLUMN embedding_generated INTEGER DEFAULT 0;
```

#### **2.2 Generate Embeddings for Messages**
**File:** `functions/src/services/EmbeddingService.ts`

```typescript
import { embed } from 'ai';
import { embeddingModel } from '../config/ai-sdk.config';

export class EmbeddingService {
  /**
   * Generate embedding for text
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: embeddingModel,
      value: text,
    });
    return embedding;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Find most semantically relevant messages
   */
  static async findRelevantMessages(
    query: string,
    messages: Array<{ text: string; embedding?: number[] }>,
    limit: number = 10
  ): Promise<Array<{ text: string; score: number }>> {
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Score all messages by similarity
    const scored = messages
      .filter(m => m.embedding) // Only messages with embeddings
      .map(m => ({
        text: m.text,
        score: this.cosineSimilarity(queryEmbedding, m.embedding!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  }
}
```

#### **2.3 Background Embedding Generation**
**File:** `functions/src/index.ts` (add new trigger)

```typescript
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { EmbeddingService } from './services/EmbeddingService';

/**
 * Automatically generate embedding when new message created
 */
export const generateMessageEmbedding = onDocumentCreated(
  'chats/{chatId}/messages/{messageId}',
  async (event) => {
    const messageData = event.data?.data();
    if (!messageData?.text) return;

    try {
      // Generate embedding
      const embedding = await EmbeddingService.generateEmbedding(messageData.text);

      // Save back to Firestore
      await event.data?.ref.update({
        embedding,
        embeddingGenerated: true,
      });

      logger.info('Generated embedding for message', { messageId: event.params.messageId });
    } catch (error) {
      logger.error('Failed to generate embedding', error);
    }
  }
);
```

---

### **Phase 3: Agent Architecture**

#### **3.1 Create Base Agent Class**
**File:** `functions/src/agents/BaseAgent.ts`

```typescript
import { generateText } from 'ai';
import { aiModel } from '../config/ai-sdk.config';
import { Message } from '../types';

export interface AgentContext {
  chatId: string;
  userId: string;
  conversationHistory: Message[];
  userPreferences?: any;
}

export abstract class BaseAgent {
  abstract name: string;
  abstract description: string;
  abstract systemPrompt: string;

  /**
   * Execute agent with context
   */
  async execute(input: string, context: AgentContext): Promise<any> {
    // Load relevant context using RAG
    const relevantMessages = await this.loadRelevantContext(input, context);

    // Generate response
    const result = await generateText({
      model: aiModel,
      system: this.systemPrompt,
      prompt: this.buildPrompt(input, relevantMessages, context),
      tools: this.getTools(),
    });

    return this.parseResult(result);
  }

  /**
   * Load relevant context using semantic search
   */
  protected async loadRelevantContext(
    query: string,
    context: AgentContext
  ): Promise<Message[]> {
    // Use RAG pipeline
    const messages = context.conversationHistory;
    const relevant = await EmbeddingService.findRelevantMessages(
      query,
      messages.map(m => ({ text: m.text, embedding: m.embedding })),
      10
    );
    return messages.filter(m => relevant.some(r => r.text === m.text));
  }

  protected abstract buildPrompt(input: string, context: Message[], agentContext: AgentContext): string;
  protected abstract getTools(): any;
  protected abstract parseResult(result: any): any;
}
```

#### **3.2 Create Specialized Agents**

**TranslatorAgent:**
**File:** `functions/src/agents/TranslatorAgent.ts`

```typescript
import { BaseAgent, AgentContext } from './BaseAgent';
import { translateMessageTool, detectCulturalContextTool } from '../tools/translation.tools';

export class TranslatorAgent extends BaseAgent {
  name = 'Translator';
  description = 'Translates messages with cultural context and formality detection';
  systemPrompt = `
    You are an expert translator specializing in cultural context.
    Analyze the conversation history to understand tone and formality.
    Provide translations that match the conversation's style.
  `;

  protected buildPrompt(input: string, context: Message[], agentContext: AgentContext): string {
    const contextStr = context.map(m => `${m.senderName}: ${m.text}`).join('\n');
    return `
      CONVERSATION CONTEXT:
      ${contextStr}
      
      MESSAGE TO TRANSLATE:
      ${input}
      
      TARGET LANGUAGE: ${agentContext.userPreferences?.preferredLanguage || 'en'}
      
      Translate this message naturally, matching the conversation's tone.
    `;
  }

  protected getTools() {
    return {
      translateMessage: translateMessageTool,
      detectCulturalContext: detectCulturalContextTool,
    };
  }

  protected parseResult(result: any) {
    return {
      translation: result.text,
      toolCalls: result.toolCalls,
    };
  }
}
```

**ReplyAgent:**
**File:** `functions/src/agents/ReplyAgent.ts`

```typescript
import { BaseAgent, AgentContext } from './BaseAgent';
import { tool } from 'ai';
import { z } from 'zod';

export class ReplyAgent extends BaseAgent {
  name = 'ReplyGenerator';
  description = 'Generates smart reply suggestions matching user style';
  systemPrompt = `
    You are an expert at generating personalized reply suggestions.
    Analyze the user's previous messages to understand their style.
    Generate 3 reply options with different tones.
  `;

  protected buildPrompt(input: string, context: Message[], agentContext: AgentContext): string {
    const userMessages = context.filter(m => m.senderId === agentContext.userId);
    const userStyle = this.analyzeUserStyle(userMessages);
    
    return `
      USER'S WRITING STYLE:
      - Average length: ${userStyle.avgLength} characters
      - Emoji usage: ${userStyle.emojiFreq > 0.5 ? 'Frequent' : 'Rare'}
      - Formality: ${userStyle.formality}
      
      RECENT CONVERSATION:
      ${context.slice(-5).map(m => `${m.senderName}: ${m.text}`).join('\n')}
      
      MESSAGE TO REPLY TO:
      ${input}
      
      Generate 3 reply suggestions matching this user's style.
    `;
  }

  protected getTools() {
    return {
      generateReplies: tool({
        description: 'Generate reply suggestions',
        parameters: z.object({
          replies: z.array(z.string()).describe('Array of 3 reply suggestions'),
          tones: z.array(z.enum(['casual', 'neutral', 'polite'])),
        }),
        execute: async ({ replies, tones }) => ({ replies, tones }),
      }),
    };
  }

  protected parseResult(result: any) {
    return result.toolCalls?.[0]?.args || { replies: [], tones: [] };
  }

  private analyzeUserStyle(messages: Message[]) {
    // Analyze user's writing patterns
    const avgLength = messages.reduce((sum, m) => sum + m.text.length, 0) / messages.length;
    const emojiFreq = messages.filter(m => /[\u{1F600}-\u{1F64F}]/u.test(m.text)).length / messages.length;
    
    return { avgLength, emojiFreq, formality: avgLength > 50 ? 'formal' : 'casual' };
  }
}
```

#### **3.3 Agent Coordinator**
**File:** `functions/src/agents/AgentCoordinator.ts`

```typescript
import { TranslatorAgent } from './TranslatorAgent';
import { ReplyAgent } from './ReplyAgent';
import { AgentContext } from './BaseAgent';

export class AgentCoordinator {
  private agents: Map<string, BaseAgent>;

  constructor() {
    this.agents = new Map([
      ['translator', new TranslatorAgent()],
      ['reply', new ReplyAgent()],
      // Add more agents as needed
    ]);
  }

  /**
   * Route request to appropriate agent
   */
  async execute(agentType: string, input: string, context: AgentContext): Promise<any> {
    const agent = this.agents.get(agentType);
    if (!agent) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    return await agent.execute(input, context);
  }
}
```

---

### **Phase 4: Update Cloud Functions**

#### **4.1 New Auto-Translate Function with AI SDK**
**File:** `functions/src/index.ts`

```typescript
import { onCall } from 'firebase-functions/v2/https';
import { AgentCoordinator } from './agents/AgentCoordinator';

const coordinator = new AgentCoordinator();

export const autoTranslateMessage = onCall(
  { invoker: 'public' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { messageId, chatId, messageText } = request.data;

    // Load conversation history
    const conversationHistory = await loadChatMessages(chatId, 50);

    // Build agent context
    const context: AgentContext = {
      chatId,
      userId: request.auth.uid,
      conversationHistory,
      userPreferences: await loadUserPreferences(request.auth.uid),
    };

    // Execute translator agent with RAG
    const result = await coordinator.execute('translator', messageText, context);

    return {
      success: true,
      translation: result.translation,
      detectedLanguage: result.detectedLanguage,
      formality: result.formality,
      culturalHints: result.culturalHints,
    };
  }
);
```

---

## 📊 **Data Models**

### **Updated Message Interface**
```typescript
interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  
  // Translation fields (existing)
  translations?: { [languageCode: string]: string };
  detectedLanguage?: string;
  
  // Formality detection (existing)
  formalityLevel?: 'casual' | 'formal' | 'professional' | 'friendly';
  
  // NEW: Embeddings for RAG
  embedding?: number[]; // 1536-dimensional vector
  embeddingGenerated?: boolean;
  
  // NEW: Cultural context
  culturalHints?: Array<{
    phrase: string;
    explanation: string;
    type: 'idiom' | 'slang' | 'cultural';
  }>;
}
```

---

## 🧪 **Testing Strategy**

### **Phase 1 Testing (AI SDK)**
- [ ] Install AI SDK dependencies successfully
- [ ] AI SDK configuration works
- [ ] Tool definitions valid
- [ ] Can call AI SDK generate functions

### **Phase 2 Testing (RAG)**
- [ ] Embeddings generate correctly
- [ ] Background trigger fires for new messages
- [ ] Semantic similarity calculations accurate
- [ ] Top-k retrieval returns relevant messages
- [ ] Performance acceptable (<500ms for retrieval)

### **Phase 3 Testing (Agents)**
- [ ] TranslatorAgent executes successfully
- [ ] ReplyAgent generates appropriate suggestions
- [ ] Agent coordination works
- [ ] Tool calling functions properly
- [ ] Context loaded correctly via RAG

### **Phase 4 Testing (Integration)**
- [ ] Cloud functions deploy successfully
- [ ] End-to-end translation with RAG works
- [ ] Smart replies use proper context
- [ ] Error handling functions correctly

---

## 📈 **Success Metrics**

### **Rubric Compliance**
- ✅ Agent framework implemented (AI SDK)
- ✅ Tool calling/function calling working
- ✅ Proper RAG pipeline with semantic search
- ✅ Memory/state management
- **Target:** 38-40/40 points (95-100%)

### **Performance**
- Embedding generation: <200ms per message
- Semantic search: <500ms for top-10
- Agent execution: <3 seconds total
- Memory efficient: <100MB per request

### **Quality**
- Translation accuracy: >90%
- Context relevance: >85%
- Smart reply acceptance: >30%

---

## 💰 **Cost Analysis**

### **Embedding Costs**
- Model: text-embedding-3-small
- Cost: $0.00002 per 1K tokens
- Average message: ~50 tokens
- **Cost per embedding:** ~$0.000001 (negligible)

### **AI SDK Usage Costs**
- Same as before: ~$0.0016 per message
- Slight increase from tool calling overhead
- **Total:** ~$0.002 per message

### **Total Cost**
- **1000 messages:** ~$2.00 (very affordable)

---

## 🚀 **Implementation Timeline**

### **Week 1: AI SDK Integration**
- Install dependencies
- Create configuration
- Define tools
- Update one Cloud Function as proof-of-concept

### **Week 2: RAG Pipeline**
- Add embedding generation
- Create background trigger
- Implement semantic search
- Test retrieval accuracy

### **Week 3: Agent Architecture**
- Create base agent class
- Implement specialized agents
- Build coordinator
- Test agent system

### **Week 4: Integration & Testing**
- Update all Cloud Functions
- Comprehensive testing
- Performance optimization
- Deploy to production

---

*Created: January 2025*
*Priority: CRITICAL - Required for rubric compliance*
*Status: Ready for Implementation*

