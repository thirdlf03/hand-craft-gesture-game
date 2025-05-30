import { PromptItem, HandShape } from './types';

export const PROMPTS: PromptItem[] = [
  {
    id: "p1",
    shape1: HandShape.GUU,
    shape2: HandShape.CHOKI,
    objectToMake: "カニ",
    objectToMakeEn: "crab",
    fullText: "グーとチョキで「カニ」を作ってね！",
  },
  {
    id: "p2",
    shape1: HandShape.PAA,
    shape2: HandShape.PAA,
    objectToMake: "ちょうちょ",
    objectToMakeEn: "butterfly",
    fullText: "パーとパーで「ちょうちょ」を作ってね！",
  },
  {
    id: "p3",
    shape1: HandShape.GUU,
    shape2: HandShape.PAA,
    objectToMake: "かたつむり",
    objectToMakeEn: "snail",
    fullText: "グーとパーで「かたつむり」を作ってね！",
  },
  {
    id: "p4",
    shape1: HandShape.CHOKI,
    shape2: HandShape.PAA,
    objectToMake: "キツネ",
    objectToMakeEn: "fox",
    fullText: "チョキとパーで「キツネ」を作ってね！",
  },
  {
    id: "p5",
    shape1: HandShape.GUU,
    shape2: HandShape.GUU,
    objectToMake: "双眼鏡",
    objectToMakeEn: "binoculars",
    fullText: "グーとグーで「双眼鏡」を作ってね！",
  },
];

export const INTRO_DURATION_MS = 2000; // Duration for "お題発表！"
export const PROMPT_DISPLAY_DURATION_MS = 3000; // How long prompt is shown before countdown
export const COUNTDOWN_SECONDS = 5;
export const CAPTURE_DELAY_MS = 300; // Small delay after countdown ends for capture
export const API_KEY_WARNING = "APIキーが設定されていません。環境変数 `GEMINI_API_KEY` を設定してください。";
export const WEBSOCKET_URL = "wss://hand-ws.thirdlf03.com"; // WebSocketサーバーのエンドポイント
