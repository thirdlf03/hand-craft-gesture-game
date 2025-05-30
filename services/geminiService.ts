import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ScoreData, PromptItem } from '../types';

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("GEMINI_API_KEY environment variable is not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || " " }); // Fallback to empty string if not set, constructor handles it.

export const evaluateHandShapeCreation = async (
  imageDataBase64: string,
  promptItem: PromptItem
): Promise<ScoreData> => {
  if (!API_KEY) {
    return { points: 0, feedback: "APIキーが設定されていません。ゲームをプレイするには設定が必要です。" };
  }

  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: imageDataBase64.split(',')[1], // Remove "data:image/jpeg;base64," prefix
    },
  };

  const textPrompt = `The user was asked to create a "${promptItem.objectToMakeEn}" (in Japanese: "${promptItem.objectToMake}") using one hand showing "${promptItem.shape1}" and the other hand showing "${promptItem.shape2}".
Evaluate the image based on these criteria:
1. Are the hand shapes for "${promptItem.shape1}" and "${promptItem.shape2}" clearly visible and correct?
2. Does the combination of these hand shapes resemble a "${promptItem.objectToMakeEn}"?
Provide a score from 0 to 100, where 100 is a perfect and creative representation.
Also provide a short, encouraging, and fun feedback message in Japanese, suitable for a child.
Return your response ONLY as a JSON object with keys "points" (number, integer) and "feedback" (string). Example: {"points": 75, "feedback": "すごい！カニさんに見えるよ！"}`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: { parts: [imagePart, { text: textPrompt }] },
      config: {
        responseMimeType: "application/json",
        temperature: 0.7, // Allow for some creativity in feedback
      }
    });

    let jsonStr = response.text?.trim() || '';
    if (!jsonStr) {
      console.error("Gemini response text is empty or undefined");
      return { points: 0, feedback: "AIから評価をもらえませんでした。もう一度試してみてね！" };
    }
    
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsedData = JSON.parse(jsonStr);
    if (typeof parsedData.points === 'number' && typeof parsedData.feedback === 'string') {
      return {
        points: Math.max(0, Math.min(100, Math.round(parsedData.points))), // Ensure score is 0-100 integer
        feedback: parsedData.feedback,
      };
    } else {
      console.error("Gemini response did not match expected JSON structure:", parsedData);
      return { points: 0, feedback: "AIからの評価をうまく読み取れませんでした。もう一度試してみてね！" };
    }
  } catch (error) {
    console.error("Error calling Gemini API or parsing response:", error);
    let errorMessage = "AIとの通信でエラーが発生しました。時間をおいてもう一度試してみてね。";
    if (error instanceof Error && error.message.includes("API key not valid")) {
        errorMessage = "APIキーが無効です。正しいAPIキーを設定してください。";
    } else if (error instanceof Error && error.message.includes("quota")) {
        errorMessage = "APIの利用上限に達したようです。時間をおいて試してください。";
    }
    return { points: 0, feedback: errorMessage };
  }
};
