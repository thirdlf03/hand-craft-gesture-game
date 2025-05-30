export enum HandShape {
  GUU = "グー", // Rock
  CHOKI = "チョキ", // Scissors
  PAA = "パー", // Paper
}

export interface PromptItem {
  id: string;
  shape1: HandShape;
  shape2: HandShape;
  objectToMake: string; // e.g., "カニ" (Crab)
  objectToMakeEn: string; // e.g., "crab"
  fullText: string; // e.g., "グーとチョキで「カニ」を作ってね！"
}

export enum GameState {
  IDLE = "IDLE",
  INTRO = "INTRO", // "お題発表！"
  SHOWING_PROMPT = "SHOWING_PROMPT",
  COUNTDOWN = "COUNTDOWN",
  CAPTURING = "CAPTURING", // Brief state post-countdown, pre-image handling
  SCORING = "SCORING",
  SHOWING_RESULT = "SHOWING_RESULT",
  ERROR = "ERROR",
}

export interface ScoreData {
  points: number;
  feedback: string;
}

export interface GroundingChunkWeb {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web?: GroundingChunkWeb;
  retrievedContext?: {
    uri: string;
    title: string;
  };
}

// マルチプレイ対応のための型定義
export interface Player {
  id: string;
  name: string;
  score: number;
  currentHandShape?: HandShape;
  isHost: boolean;
}

export interface GameSession {
  id: string;
  players: Player[];
  state: 'waitingForPlayers' | 'lobby' | 'playing' | 'roundEnd' | 'gameEnd'; // GameStateをより具体的に
  currentPrompt?: PromptItem;
  currentRound: number; // roundからcurrentRoundに変更
  roundResults: { playerId: string; score: number; handShape: HandShape; }[]; // ラウンドごとの結果
  playerScores: { [playerId: string]: number }; // 最終スコア
  hostId: string; // ホストのIDを追加
}

export interface GameMessage {
  type: string;
}

export interface PlayerJoinedMessage extends GameMessage {
  type: "playerJoined";
  player: Player;
  isHost: boolean; // ホストかどうかを追加
  playerId: string; // 参加したプレイヤーのID
  session: GameSession; // 現在のゲームセッション情報
}

export interface PlayerLeftMessage extends GameMessage {
  type: "playerLeft";
  playerId: string;
  session: GameSession;
}

export interface GameUpdateMessage extends GameMessage {
  type: "gameUpdate";
  session: GameSession;
}

export interface PlayerActionMessage extends GameMessage {
  type: "playerAction";
  playerId: string;
  action: "selectHandShape" | "joinGame"; // 例: ハンドシェイプの選択、ゲーム参加
  handShape?: HandShape; // selectHandShapeの場合にのみ存在
}

export interface JoinGameMessage extends GameMessage {
  type: "joinGame";
  playerName: string; // playerIdではなくplayerNameを使用
}

export interface SelectHandShapeMessage extends GameMessage {
  type: "selectHandShape";
  sessionId: string; // セッションIDを追加
  playerId: string;
  handShape: HandShape;
}

export interface GameStartMessage extends GameMessage {
  type: "gameStart";
  session: GameSession;
}

export interface GameEndMessage extends GameMessage {
  type: "gameEnd";
  session: GameSession;
}

export interface NextRoundMessage extends GameMessage {
  type: "nextRound";
  session: GameSession;
}

export interface ErrorMessage extends GameMessage {
  type: "error";
  message: string;
}
