
import { GoogleGenAI, Type } from "@google/genai";
import { FoodItem, UserProfile } from '../types';

// Use process.env.API_KEY as strictly instructed.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert blob/file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const foodItemSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Name of the food item" },
    calories: { type: Type.NUMBER, description: "Total calories estimate" },
    macros: {
      type: Type.OBJECT,
      properties: {
        protein: { type: Type.NUMBER },
        carbs: { type: Type.NUMBER },
        fat: { type: Type.NUMBER },
      }
    },
    confidence: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
    description: { type: Type.STRING, description: "Short appetizing description" },
    portionSize: { type: Type.STRING, description: "e.g., '1 cup', '200g'" },
    alternatives: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Healthier alternatives" },
    imageUrl: { type: Type.STRING, description: "A valid public URL of an image representing this food item. Find one using Google Search." }
  },
  required: ["name", "calories", "macros", "confidence", "description", "portionSize"]
};

// Helper to reliably parse JSON from model output (handling markdown blocks)
const cleanAndParseJSON = (text: string): FoodItem => {
  try {
    // Remove markdown code blocks (```json ... ```)
    let cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    // If text still contains other text, try to extract the JSON object
    const match = cleanText.match(/\{[\s\S]*\}/);
    if (match) {
      cleanText = match[0];
    }
    return JSON.parse(cleanText) as FoodItem;
  } catch (error) {
    console.error("Failed to parse JSON response:", text);
    throw new Error("Invalid response format from AI");
  }
};

export const analyzeFoodImage = async (base64Image: string): Promise<FoodItem> => {
  try {
    const model = 'gemini-2.5-flash'; 

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: "Analyze this food image. Provide nutritional information, estimating portion size. Be as accurate as possible."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: foodItemSchema,
        systemInstruction: "You are an expert nutritionist AI. Analyze images of food to estimate calories and macros."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as FoodItem;

  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    throw error;
  }
};

export const analyzeTextQuery = async (query: string): Promise<FoodItem> => {
  try {
    const model = 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: model,
      contents: `Analyze this food query: "${query}". Provide nutritional estimates. 
      Use Google Search to find a high-quality, public image URL for this specific food item and include it in the 'imageUrl' field.
      
      STRICTLY RETURN ONLY VALID JSON.
      Structure:
      {
        "name": "Food Name",
        "calories": 100,
        "macros": { "protein": 0, "carbs": 0, "fat": 0 },
        "confidence": "High",
        "description": "Description",
        "portionSize": "1 cup",
        "alternatives": ["alt1"],
        "imageUrl": "http://example.com/image.jpg"
      }`,
      config: {
        tools: [{googleSearch: {}}],
        // responseMimeType/responseSchema NOT allowed with tools in this model version
        systemInstruction: "You are an expert nutritionist AI. Estimate calories and macros based on text descriptions. You MUST use Google Search to find a representative public image URL."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const foodItem = cleanAndParseJSON(text);

    // Extract sources
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      foodItem.sourceUrls = response.candidates[0].groundingMetadata.groundingChunks
        .map((chunk: any) => chunk.web ? { title: chunk.web.title, url: chunk.web.uri } : null)
        .filter((item: any) => item !== null) as { title: string, url: string }[];
    }

    return foodItem;

  } catch (error) {
    console.error("Gemini Text Analysis Error:", error);
    throw error;
  }
};

export const analyzeRecipe = async (input: string): Promise<FoodItem> => {
  try {
    const model = 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: model,
      contents: `Analyze this recipe content (URL or text): "${input}". 
      Identify the dish. Calculate the total nutrition for ONE STANDARD SERVING. 
      If the number of servings is not specified, estimate based on typical serving sizes.
      
      Use Google Search to find a representative image URL for this dish and include it in the 'imageUrl' field.
      
      STRICTLY RETURN ONLY VALID JSON.
      Structure:
      {
        "name": "Dish Name",
        "calories": 500,
        "macros": { "protein": 0, "carbs": 0, "fat": 0 },
        "confidence": "High",
        "description": "Description",
        "portionSize": "1 serving",
        "alternatives": [],
        "imageUrl": "http://example.com/image.jpg"
      }`,
      config: {
        tools: [{googleSearch: {}}],
        // responseMimeType/responseSchema NOT allowed with tools in this model version
        systemInstruction: "You are an expert nutritionist AI. Analyze recipes from text or URLs. Normalize to one serving. You MUST use Google Search to find a representative public image URL."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const foodItem = cleanAndParseJSON(text);

    // Extract sources
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      foodItem.sourceUrls = response.candidates[0].groundingMetadata.groundingChunks
        .map((chunk: any) => chunk.web ? { title: chunk.web.title, url: chunk.web.uri } : null)
        .filter((item: any) => item !== null) as { title: string, url: string }[];
    }

    return foodItem;

  } catch (error) {
    console.error("Gemini Recipe Analysis Error:", error);
    throw error;
  }
};

export const generateMealNoteSuggestion = async (foodItem: FoodItem): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    // Prompt for a short, first-person note
    const prompt = `Generate a very short (max 15 words), personal, encouraging, or reflective journal note for a user who just ate ${foodItem.name}.
    It should be written in the first person (e.g., "I feel...", "Great source of...", "Enjoyed this...").
    Do not include quotes.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text?.trim() || `Enjoyed a delicious ${foodItem.name}!`;
  } catch (error) {
    console.error("Note suggestion error:", error);
    return ""; // Return empty string on failure, UI will handle
  }
};

export const generateDailyInsight = async (userProfile: UserProfile): Promise<{title: string, message: string}> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `Generate a short, friendly, and motivating daily notification for a user named ${userProfile.name}.
    They have a daily goal of ${userProfile.dailyCalorieGoal} calories.
    
    Return STRICTLY JSON:
    {
      "title": "Short Title (e.g. Daily Tip)",
      "message": "One sentence message max 20 words."
    }`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const text = response.text;
    if (!text) return { title: "Daily Tip", message: "Stay consistent and hydrate today!" };
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Insight generation error:", error);
    return { title: "Welcome Back", message: "Ready to track your meals today?" };
  }
};

export const getChatResponse = async (message: string, history: any[] = []): Promise<string> => {
  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are CalorieAI, an advanced nutrition assistant.
        
        STRICT DOMAIN CONTROL:
        You must ONLY answer questions related to:
        - Calories, macronutrients, and food composition.
        - Diet planning, healthy eating, and recipes.
        - Weight management and metabolic health.
        
        If a user asks about unrelated topics (coding, news, history, general life advice), politely REFUSE and guide them back to nutrition.
        
        RESPONSE STRATEGY:
        1. **Simple/Easy Questions** (e.g., "Calories in an apple?"):
           - Provide a concise, direct answer. 
           - Example: "A medium apple has about 95 calories."
        
        2. **Complex/Hard Questions** (e.g., "Analyze this meal plan for deficiencies", "Compare keto vs vegan for muscle gain", "Explain the metabolic pathway of fructose"):
           - Provide a detailed, step-by-step breakdown.
           - Explain your reasoning clearly.
           - Offer actionable advice.
           
        Tone: Encouraging, knowledgeable, and professional.`,
      },
      history: history
    });

    const result = await chat.sendMessage({ message });
    return result.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Sorry, I'm having trouble connecting to the AI right now.";
  }
};
