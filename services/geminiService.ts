import { GoogleGenAI, Type } from "@google/genai";
import { AppData, Priority } from '../types';

// Safely retrieve API Key checking multiple environment variable standards
const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  if ((import.meta as any).env && (import.meta as any).env.VITE_API_KEY) {
    return (import.meta as any).env.VITE_API_KEY;
  }
  return "";
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

interface ChatResponse {
    text: string;
    tasks: { title: string; priority: Priority }[];
}

// Robust error handler to explain issues to the user
const handleError = (error: any): string => {
    console.error("AI Service Error:", error);
    const msg = error.toString();
    
    if (msg.includes('API key') || msg.includes('400') || msg.includes('401') || msg.includes('403')) {
        return "⚠️ Configuration Error: The API Key is missing or invalid. If you are running this locally, ensure you have a `.env` file with `VITE_API_KEY=your_key` (for Vite) or `API_KEY=your_key`.";
    }
    if (msg.includes('FetchError') || msg.includes('Failed to fetch') || msg.includes('Network')) {
        return "🌐 Connection Error: I couldn't reach the Google servers. Please check your internet connection.";
    }
    if (msg.includes('429')) {
        return "🛑 I'm thinking too hard (Rate Limit Exceeded). Please give me a moment to cool down.";
    }
    return "❌ I encountered an unexpected error connecting to my brain. Please try again.";
};

// Existing Task Extraction Chat
export const chatWithAI = async (message: string, context: AppData): Promise<ChatResponse> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Create a summarized context of the user's data
    const pendingTasks = context.todos.filter(t => !t.completed && t.date === today).map(t => t.title).join(", ");
    
    const systemInstruction = `
      You are a highly intelligent, encouraging, and practical Life Management Assistant for a user named ${context.user.name}.
      Current Date: ${today}
      
      YOUR MAIN GOAL:
      1. Analyze the user's input deeply.
      2. IF the user provides a list of goals, random thoughts, or actionable items (e.g., "clean pc", "learn sql", "stop doing x", "make video editor"), YOU MUST EXTRACT THEM as distinct tasks.
      3. Assign a priority (TOP, HIGH, MEDIUM, LOW) based on urgency or importance implied in the text. Use "TOP" for critical life goals or immediate demands.
      4. Return a JSON object containing your conversational reply and the list of extracted tasks.
      
      User's Context:
      - Pending Tasks: ${pendingTasks || "None"}
      
      If the input is just a question, return an empty "extractedTasks" array.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                reply: { type: Type.STRING },
                extractedTasks: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            priority: { type: Type.STRING }
                        }
                    }
                }
            }
        }
      }
    });

    const jsonResponse = JSON.parse(response.text || "{}");
    
    return {
        text: jsonResponse.reply || "I processed your request.",
        tasks: jsonResponse.extractedTasks || []
    };

  } catch (error) {
    return { 
        text: handleError(error), 
        tasks: [] 
    };
  }
};

// New Generic Chat with Image Support
export const generateChatResponse = async (history: {role: 'user'|'model', text: string, image?: string}[], newMessage: string, newImage?: string): Promise<string> => {
    try {
        const parts: any[] = [{ text: newMessage }];
        
        if (newImage) {
            // Remove data URL prefix if present for the API
            const base64Data = newImage.split(',')[1];
            parts.unshift({
                inlineData: {
                    mimeType: 'image/jpeg', // Assuming jpeg from compression or upload
                    data: base64Data
                }
            });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: parts
            },
            config: {
                systemInstruction: "You are a helpful, friendly AI assistant. You can see images if the user uploads them."
            }
        });

        return response.text || "";
    } catch (error) {
        return handleError(error);
    }
};

export const analyzeJournalEntry = async (entry: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze this journal entry and provide a 1-sentence supportive insight or observation about the user's mindset: "${entry}"`,
        });
        return response.text || "";
    } catch (e) {
        console.error("Journal Analysis Error", e);
        return ""; // Fail silently for background insights
    }
}

export const continueJournalEntry = async (currentContent: string): Promise<string> => {
    try {
        if (!currentContent) return "";
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `The user is writing a personal journal entry. Read the content below and write the next 2-3 sentences to continue their thought process naturally. Maintain their tone (whether happy, sad, frustrated, or productive). Do NOT repeat the existing text. Just provide the continuation.
            
            Current Entry: "${currentContent}"`,
        });
        return response.text || "";
    } catch (e) {
        return "";
    }
}

export const generateJournalFromDay = async (date: string, data: AppData): Promise<string> => {
    try {
        const todos = data.todos.filter(t => t.date === date);
        const completedTodos = todos.filter(t => t.completed).map(t => t.title).join(", ");
        const incompleteTodos = todos.filter(t => !t.completed).map(t => t.title).join(", ");
        const habits = data.habits.filter(h => h.logs[date]).map(h => h.name).join(", ");
        const nnLogs = data.nonNegotiableLogs[date] || [];
        const nonNegotiables = data.nonNegotiables.filter(nn => nnLogs.includes(nn.id)).map(nn => nn.title).join(", ");
        const expenses = data.expenses.filter(e => e.date === date).map(e => `${e.description} ($${e.amount})`).join(", ");

        const prompt = `
            Write a first-person daily journal entry for ${data.user.name} for the date ${date}.
            
            Here is what happened today:
            - Completed Tasks: ${completedTodos || "None"}
            - Pending Tasks: ${incompleteTodos || "None"}
            - Habits Maintained: ${habits || "None"}
            - Non-Negotiables Met: ${nonNegotiables || "None"}
            - Expenses: ${expenses || "None"}
            
            Style: Reflective, personal, and productive. Focus on progress made and lessons learned. 
            Keep it under 150 words.
            Start directly with the entry, do not add titles like "Journal Entry".
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        return response.text || "";
    } catch (error) {
        return handleError(error);
    }
};