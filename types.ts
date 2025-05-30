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
  hasSelected?: boolean; // 他のプレイヤーの選択状況を安全に表示するため
}

export interface RoundResult {
  round: number;
  prompt: PromptItem; // お題情報を追加
  playerResults: {
    playerId: string;
    playerName: string;
    handShape?: HandShape; // オプショナルに変更（まだ選択していない場合もある）
    score: number;
    feedback?: string; // AIフィードバックを追加
    capturedImage?: string; // キャプチャされた画像を追加
    rank: number; // ランキング順位を追加
  }[];
  leaderboard: {
    playerId: string;
    playerName: string;
    totalScore: number;
    rank: number;
  }[]; // 総合ランキング情報を追加
}

export interface GameSession {
  id: string;
  players: Player[];
  state: 'waitingForPlayers' | 'lobby' | 'playing' | 'roundEnd' | 'gameEnd';
  currentPrompt?: PromptItem;
  currentRound: number;
  roundResults: RoundResult[];
  playerScores: { [playerId: string]: number };
  hostId: string;
  totalRounds: number; // 総ラウンド数を追加
  finalLeaderboard?: { // 最終ランキング情報を追加
    playerId: string;
    playerName: string;
    totalScore: number;
    rank: number;
  }[];
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

export interface SubmitScoreMessage extends GameMessage {
  type: "submitScore";
  sessionId: string;
  playerId: string;
  score: number;
  feedback: string;
  capturedImage?: string;
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

export interface RoundEndMessage extends GameMessage {
  type: "roundEnd";
  session: GameSession;
}

export interface ErrorMessage extends GameMessage {
  type: "error";
  message: string;
}

export interface NewPlayerJoinedMessage extends GameMessage {
  type: "newPlayerJoined";
  newPlayer: Player; // 新しく参加したプレイヤーの情報
  session: GameSession; // 現在のゲームセッション情報
}
