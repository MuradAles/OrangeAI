import * as admin from "firebase-admin";
import OpenAI from "openai";

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

interface TranslationResult {
  success: boolean;
  original: string;
  translated?: string;
  targetLanguage?: string;
  detectedLanguage?: string;
  messageId?: string;
  chatId?: string;
  error?: string;
}

interface TranslationParams {
  messageId: string;
  chatId: string;
  targetLanguage: string;
  messageText: string;
  userId: string;
}

export class TranslationService {
  private openai: OpenAI | null = null;

  /**
   * Get or initialize OpenAI client (lazy initialization)
   */
  private getOpenAI(): OpenAI {
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.openai;
  }
  /**
   * Translate a message with conversation context
   */
  async translateMessage(params: TranslationParams): Promise<TranslationResult> {
    try {
      // Use the messageText passed from client instead of fetching from Firestore
      const messageText = params.messageText;

      if (!messageText || messageText.trim().length === 0) {
        return {
          success: false,
          original: "",
          error: "No text to translate",
        };
      }

      // Note: Translations are now stored locally on client, not in Firestore
      // So we always generate a new translation

      // Step 2: Load conversation context (last 10 messages)
      const context = await this.loadContext(params.chatId, params.messageId);

      // Step 3: Build prompt for OpenAI
      const prompt = this.buildPrompt({
        message: messageText,
        context: context,
        targetLang: params.targetLanguage,
      });

      // Step 4: Call OpenAI to translate
      const translation = await this.callOpenAI(prompt);

      // Step 5: Detect source language (for display purposes)
      const detectedLanguage = await this.detectLanguage(messageText);

      // Step 6: Return result (translation is saved locally by client, not in Firestore)
      return {
        success: true,
        original: messageText,
        translated: translation,
        targetLanguage: params.targetLanguage,
        detectedLanguage: detectedLanguage,
        messageId: params.messageId,
        chatId: params.chatId,
      };
    } catch (error: any) {
      console.error("Translation error:", error);
      return {
        success: false,
        original: "",
        error: error.message || "Translation failed",
      };
    }
  }

  /**
   * Load last 10 messages for context
   */
  private async loadContext(chatId: string, currentMessageId: string): Promise<string> {
    try {
      const snapshot = await admin.firestore()
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .orderBy("timestamp", "desc")
        .limit(15) // Get 15 to ensure we have 10 before current
        .get();

      if (snapshot.empty) {
        return "";
      }

      // Filter out current message and reverse to chronological order
      const messages = snapshot.docs
        .filter((doc) => doc.id !== currentMessageId)
        .slice(0, 10) // Take only 10
        .reverse() // Oldest to newest
        .map((doc) => {
          const data = doc.data();
          const senderName = data.senderName || "User";
          return `- ${senderName}: ${data.text}`;
        });

      return messages.join("\n");
    } catch (error) {
      console.error("Context loading error:", error);
      return ""; // Return empty context if fails
    }
  }

  /**
   * Build translation prompt with context
   */
  private buildPrompt(data: {
    message: string;
    context: string;
    targetLang: string;
  }): string {
    const languageNames: Record<string, string> = {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ru: "Russian",
      ja: "Japanese",
      ko: "Korean",
      zh: "Chinese",
      ar: "Arabic",
      hi: "Hindi",
      tr: "Turkish",
      nl: "Dutch",
      pl: "Polish",
      sv: "Swedish",
      no: "Norwegian",
      da: "Danish",
      fi: "Finnish",
      el: "Greek",
      he: "Hebrew",
      th: "Thai",
      vi: "Vietnamese",
      id: "Indonesian",
      ms: "Malay",
      fil: "Filipino",
    };

    const targetLanguage = languageNames[data.targetLang] || data.targetLang;

    let prompt = "You are a professional translator specializing in casual conversations.\n\n";

    if (data.context) {
      prompt += `RECENT CONVERSATION CONTEXT:\n${data.context}\n\n`;
    }

    prompt += `CURRENT MESSAGE TO TRANSLATE:\n"${data.message}"\n\n`;
    prompt += `TASK:\n`;
    prompt += `Translate this message to ${targetLanguage} naturally.\n`;
    prompt += `- Consider the conversation context above\n`;
    prompt += `- Maintain casual, friendly tone\n`;
    prompt += `- Handle slang and idioms appropriately\n`;
    prompt += `- Keep emojis unchanged\n`;
    prompt += `- Preserve formatting\n\n`;
    prompt += `Respond with ONLY the translation, no explanations or additional text.`;

    return prompt.trim();
  }

  /**
   * Call OpenAI API for translation
   */
  private async callOpenAI(prompt: string): Promise<string> {
    try {
      const response = await this.getOpenAI().chat.completions.create({
        model: "gpt-3.5-turbo", // Using 3.5-turbo for cost efficiency
        messages: [
          {
            role: "system",
            content: "You are a context-aware translator. Respond only with the translation, nothing else.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, // Low temperature for consistent translations
        max_tokens: 500,
      });

      const translation = response.choices[0].message.content?.trim();

      if (!translation) {
        throw new Error("Empty translation received from OpenAI");
      }

      return translation;
    } catch (error: any) {
      console.error("OpenAI API error:", error);
      throw new Error(`Translation API failed: ${error.message}`);
    }
  }

  /**
   * Detect the source language of a message
   */
  private async detectLanguage(text: string): Promise<string> {
    try {
      const response = await this.getOpenAI().chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Detect the language of the following text. Respond with ONLY the two-letter ISO 639-1 language code (e.g., 'en', 'es', 'fr'). Nothing else.",
          },
          {
            role: "user",
            content: text,
          },
        ],
        temperature: 0,
        max_tokens: 10,
      });

      const languageCode = response.choices[0].message.content?.trim().toLowerCase();
      return languageCode || "unknown";
    } catch (error) {
      console.error("Language detection error:", error);
      return "unknown";
    }
  }
}

