import { WebSocketServer } from 'ws';
import { GameMessage, JoinGameMessage, GameUpdateMessage, PlayerJoinedMessage, Player, GameSession, SelectHandShapeMessage, HandShape, RoundResult, NewPlayerJoinedMessage, PromptItem } from './types';

// お題の定義をサーバー側にも追加
const PROMPTS: PromptItem[] = [
  {
    id: "p1",
    shape1: "グー" as HandShape,
    shape2: "チョキ" as HandShape,
    objectToMake: "カニ",
    objectToMakeEn: "crab",
    fullText: "グーとチョキで「カニ」を作ってね！",
  },
  {
    id: "p2",
    shape1: "パー" as HandShape,
    shape2: "パー" as HandShape,
    objectToMake: "ちょうちょ",
    objectToMakeEn: "butterfly",
    fullText: "パーとパーで「ちょうちょ」を作ってね！",
  },
  {
    id: "p3",
    shape1: "グー" as HandShape,
    shape2: "パー" as HandShape,
    objectToMake: "かたつむり",
    objectToMakeEn: "snail",
    fullText: "グーとパーで「かたつむり」を作ってね！",
  },
  {
    id: "p4",
    shape1: "チョキ" as HandShape,
    shape2: "パー" as HandShape,
    objectToMake: "キツネ",
    objectToMakeEn: "fox",
    fullText: "チョキとパーで「キツネ」を作ってね！",
  },
  {
    id: "p5",
    shape1: "グー" as HandShape,
    shape2: "グー" as HandShape,
    objectToMake: "双眼鏡",
    objectToMakeEn: "binoculars",
    fullText: "グーとグーで「双眼鏡」を作ってね！",
  },
];

const wss = new WebSocketServer({ port: 8080 });

// ゲームセッションの管理
const players: Map<string, Player> = new Map();
const playerConnections: Map<string, any> = new Map(); // プレイヤーIDとWebSocket接続の紐付け
let gameSession: GameSession | null = null;
let usedPrompts: Set<string> = new Set(); // 使用済みお題の管理

wss.on('connection', ws => {
  console.log('Client connected');
  let currentPlayerId: string | null = null; // この接続に紐付けられたプレイヤーID

  ws.on('message', message => {
    try {
      console.log(`Received message: ${message}`);
      const data: GameMessage = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'joinGame':
          const joinData = data as JoinGameMessage;
          const playerId = generatePlayerId();
          const isFirstPlayer = players.size === 0;
          
          currentPlayerId = playerId; // この接続にプレイヤーIDを紐付け
          playerConnections.set(playerId, ws); // プレイヤーIDとWebSocket接続を紐付け
          
          const newPlayer: Player = {
            id: playerId,
            name: joinData.playerName,
            score: 0,
            isHost: isFirstPlayer
          };
          
          players.set(playerId, newPlayer);
          
          // ゲームセッションを作成または更新
          if (!gameSession) {
            gameSession = {
              id: generateSessionId(),
              players: Array.from(players.values()),
              state: 'waitingForPlayers',
              currentRound: 1,
              roundResults: [],
              playerScores: {},
              hostId: playerId,
              totalRounds: 3 // 総ラウンド数を設定
            };
          } else {
            gameSession.players = Array.from(players.values());
          }
          
          // プレイヤー参加の通知
          const joinResponse: PlayerJoinedMessage = {
            type: 'playerJoined',
            player: newPlayer,
            isHost: isFirstPlayer,
            playerId: playerId,
            session: {
              ...gameSession,
              // 個人情報を削除したプレイヤーリスト
              players: gameSession.players.map(p => ({
                id: p.id,
                name: p.name,
                score: p.score,
                isHost: p.isHost
                // currentHandShape は除外（他人の手の形は見えないようにする）
              }))
            }
          };
          
          // 参加者本人には完全な情報を送信
          ws.send(JSON.stringify(joinResponse));
          
          // 他のクライアントには新しいプレイヤーの参加通知のみ送信（既存プレイヤーの状態は変更しない）
          const publicJoinResponse = {
            type: 'newPlayerJoined', // 異なるタイプにして既存プレイヤーの状態に影響しないようにする
            newPlayer: {
              id: newPlayer.id,
              name: newPlayer.name,
              score: newPlayer.score,
              isHost: newPlayer.isHost
            },
            session: {
              id: gameSession.id,
              state: gameSession.state,
              currentRound: gameSession.currentRound,
              players: gameSession.players.map(p => ({
                id: p.id,
                name: p.name,
                score: p.score,
                isHost: p.isHost
              }))
            }
          };
          
          // 新規参加者以外の全クライアントに公開情報のみ送信
          wss.clients.forEach(client => {
            if (client.readyState === client.OPEN && client !== ws) {
              client.send(JSON.stringify(publicJoinResponse));
            }
          });
          break;
          
        case 'startGame':
          if (gameSession) {
            // お題をランダムに選択
            const availablePrompts = PROMPTS.filter(p => !usedPrompts.has(p.id));
            let selectedPrompt: PromptItem;
            
            if (availablePrompts.length === 0) {
              // 全てのお題を使い切った場合はリセット
              usedPrompts.clear();
              const randomIndex = Math.floor(Math.random() * PROMPTS.length);
              selectedPrompt = PROMPTS[randomIndex];
            } else {
              const randomIndex = Math.floor(Math.random() * availablePrompts.length);
              selectedPrompt = availablePrompts[randomIndex];
            }
            
            usedPrompts.add(selectedPrompt.id);
            
            // ゲームセッションの状態を更新
            gameSession.state = 'playing';
            gameSession.currentRound = 1;
            gameSession.currentPrompt = selectedPrompt; // お題を設定
            
            // ゲーム開始の通知（お題を含む）
            const gameStartResponse = {
              type: 'gameStart',
              session: {
                id: gameSession.id,
                state: gameSession.state,
                currentRound: gameSession.currentRound,
                currentPrompt: gameSession.currentPrompt, // お題を含める
                players: gameSession.players.map(p => ({
                  id: p.id,
                  name: p.name,
                  score: p.score,
                  isHost: p.isHost
                  // currentHandShape は除外
                }))
                // roundResults や playerScores などの詳細情報は除外
              }
            };
            
            // 全クライアントに通知
            wss.clients.forEach(client => {
              if (client.readyState === client.OPEN) {
                client.send(JSON.stringify(gameStartResponse));
              }
            });
            
            console.log('Game started with prompt:', selectedPrompt.fullText);
          } else {
            console.error('No game session found when trying to start game');
          }
          break;

        case 'selectHandShape':
          const selectData = data as SelectHandShapeMessage;
          if (gameSession && players.has(selectData.playerId)) {
            const player = players.get(selectData.playerId)!;
            player.currentHandShape = selectData.handShape;
            
            console.log(`Player ${player.name} selected ${selectData.handShape}. Total players: ${players.size}, Players with shapes: ${Array.from(players.values()).filter(p => p.currentHandShape).length}`);
            
            // 全プレイヤーがハンドシェイプを選択したかチェック
            const playersWithShapes = Array.from(players.values()).filter(p => p.currentHandShape);
            const allPlayersSelected = playersWithShapes.length === players.size && players.size > 0;
            
            console.log(`All players selected check: ${allPlayersSelected} (${playersWithShapes.length}/${players.size})`);
            console.log('Players with shapes:', playersWithShapes.map(p => ({ name: p.name, shape: p.currentHandShape })));
            console.log('All players:', Array.from(players.values()).map(p => ({ name: p.name, shape: p.currentHandShape })));
            
            if (allPlayersSelected) {
              console.log('All players have selected their hand shapes. Processing round end...');
              
              // ラウンド終了処理
              gameSession.state = 'roundEnd';
              
              // プレイヤーの結果を作成（スコア順でランク付け）
              const playerResultsWithScores = Array.from(players.values()).map(p => ({
                playerId: p.id,
                playerName: p.name,
                handShape: p.currentHandShape!,
                score: calculateScore(p.currentHandShape!)
              }));
              
              console.log('Player results:', playerResultsWithScores);
              
              // スコア順でソートしてランクを付与
              const sortedResults = playerResultsWithScores
                .sort((a, b) => b.score - a.score)
                .map((result, index) => ({
                  ...result,
                  rank: index + 1
                }));
              
              const roundResult: RoundResult = {
                round: gameSession.currentRound,
                prompt: gameSession.currentPrompt!, // 現在のお題を追加
                playerResults: sortedResults,
                leaderboard: [] // 後で計算
              };
              
              gameSession.roundResults.push(roundResult);
              
              // プレイヤーのスコアを更新
              Array.from(players.values()).forEach(player => {
                const playerResult = sortedResults.find(r => r.playerId === player.id);
                if (playerResult) {
                  player.score += playerResult.score;
                  gameSession!.playerScores[player.id] = player.score;
                }
              });
              
              // 総合ランキング（leaderboard）を計算
              const currentRoundIndex = gameSession.roundResults.length - 1;
              const leaderboard = Array.from(players.values())
                .map(player => ({
                  playerId: player.id,
                  playerName: player.name,
                  totalScore: player.score,
                  rank: 0 // 後で設定
                }))
                .sort((a, b) => b.totalScore - a.totalScore)
                .map((player, index) => ({
                  ...player,
                  rank: index + 1
                }));
              
              console.log('Calculated leaderboard:', leaderboard);
              
              // ラウンド結果に総合ランキングを追加
              gameSession.roundResults[currentRoundIndex].leaderboard = leaderboard;
              
              console.log('Round results with leaderboard:', gameSession.roundResults[currentRoundIndex]);
              
              // 即座にラウンド結果を全クライアントに送信
              const roundEndResponse = {
                type: 'roundEnd',
                session: {
                  id: gameSession.id,
                  state: gameSession.state,
                  currentRound: gameSession.currentRound,
                  totalRounds: gameSession.totalRounds,
                  players: gameSession.players.map(p => ({
                    id: p.id,
                    name: p.name,
                    score: p.score,
                    isHost: p.isHost
                  })),
                  roundResults: gameSession.roundResults, // 全ラウンド結果を送信
                  playerScores: gameSession.playerScores
                }
              };
              
              console.log('Sending roundEnd response with results:', JSON.stringify(roundEndResponse, null, 2));
              
              // 接続中のクライアント数を確認
              const connectedClients = Array.from(wss.clients).filter(client => client.readyState === client.OPEN);
              console.log(`Sending roundEnd to ${connectedClients.length} connected clients`);
              
              wss.clients.forEach(client => {
                if (client.readyState === client.OPEN) {
                  client.send(JSON.stringify(roundEndResponse));
                }
              });
            } else {
              // まだ全員選択していない場合は選択状況のみ通知
              const gameUpdateResponse = {
                type: 'gameUpdate',
                session: {
                  id: gameSession.id,
                  state: gameSession.state,
                  currentRound: gameSession.currentRound,
                  players: gameSession.players.map(p => ({
                    id: p.id,
                    name: p.name,
                    score: p.score,
                    isHost: p.isHost,
                    hasSelected: p.currentHandShape !== undefined
                  }))
                }
              };
              
              wss.clients.forEach(client => {
                if (client.readyState === client.OPEN) {
                  client.send(JSON.stringify(gameUpdateResponse));
                }
              });
            }
          }
          break;

        case 'nextRound':
          if (gameSession && gameSession.state === 'roundEnd') {
            // 次のラウンドまたはゲーム終了の判定
            if (gameSession.currentRound >= 3) { // 3ラウンドでゲーム終了
              gameSession.state = 'gameEnd';
            } else {
              gameSession.currentRound++;
              gameSession.state = 'playing';
              
              // プレイヤーのハンドシェイプをリセット
              Array.from(players.values()).forEach(player => {
                player.currentHandShape = undefined;
              });
              
              // 新しいお題を選択
              const availablePrompts = PROMPTS.filter(p => !usedPrompts.has(p.id));
              let selectedPrompt: PromptItem;
              
              if (availablePrompts.length === 0) {
                // 全てのお題を使い切った場合はリセット
                usedPrompts.clear();
                const randomIndex = Math.floor(Math.random() * PROMPTS.length);
                selectedPrompt = PROMPTS[randomIndex];
              } else {
                const randomIndex = Math.floor(Math.random() * availablePrompts.length);
                selectedPrompt = availablePrompts[randomIndex];
              }
              
              usedPrompts.add(selectedPrompt.id);
              gameSession.currentPrompt = selectedPrompt; // 新しいお題を設定
            }
            
            gameSession.players = Array.from(players.values());
            
            // ゲーム状態更新を全クライアントに通知（プライバシー保護）
            const nextRoundResponse = {
              type: gameSession.state === 'gameEnd' ? 'gameEnd' : 'nextRound',
              session: {
                id: gameSession.id,
                state: gameSession.state,
                currentRound: gameSession.currentRound,
                currentPrompt: gameSession.currentPrompt, // お題を含める
                players: gameSession.players.map(p => ({
                  id: p.id,
                  name: p.name,
                  score: p.score,
                  isHost: p.isHost
                })),
                // ゲーム終了時のみ全ラウンド結果を送信
                ...(gameSession.state === 'gameEnd' && {
                  roundResults: gameSession.roundResults,
                  playerScores: gameSession.playerScores
                })
              }
            };
            
            wss.clients.forEach(client => {
              if (client.readyState === client.OPEN) {
                client.send(JSON.stringify(nextRoundResponse));
              }
            });
            
            console.log(gameSession.state === 'gameEnd' ? 'Game ended!' : `Round ${gameSession.currentRound} started with prompt:`, gameSession.currentPrompt?.fullText);
          }
          break;
          
        default:
          console.log('Unknown message type:', data.type);
          break;
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
      const errorResponse = {
        type: 'error',
        message: 'Invalid message format'
      };
      ws.send(JSON.stringify(errorResponse));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    
    // プレイヤーリストからの削除処理
    if (currentPlayerId) {
      players.delete(currentPlayerId);
      playerConnections.delete(currentPlayerId);
      
      if (gameSession) {
        // ゲームセッションからプレイヤーを削除
        gameSession.players = Array.from(players.values());
        
        // ホストが切断した場合、新しいホストを選出
        if (gameSession.hostId === currentPlayerId && players.size > 0) {
          const newHost = Array.from(players.values())[0];
          newHost.isHost = true;
          gameSession.hostId = newHost.id;
          // ゲームセッションのプレイヤー配列も更新
          gameSession.players = Array.from(players.values());
        }
        
        // 全プレイヤーが切断した場合、ゲームセッションをリセット
        if (players.size === 0) {
          gameSession = null;
        } else {
          // プレイヤー離脱を他のクライアントに通知
          const playerLeftResponse = {
            type: 'playerLeft',
            playerId: currentPlayerId,
            session: {
              id: gameSession.id,
              state: gameSession.state,
              currentRound: gameSession.currentRound,
              players: gameSession.players.map(p => ({
                id: p.id,
                name: p.name,
                score: p.score,
                isHost: p.isHost
              }))
              // 詳細な情報は除外
            }
          };
          
          wss.clients.forEach(client => {
            if (client.readyState === client.OPEN) {
              client.send(JSON.stringify(playerLeftResponse));
            }
          });
        }
      }
      
      console.log(`Player ${currentPlayerId} removed from game`);
    }
  });

  ws.on('error', error => {
    console.error('WebSocket error:', error);
  });
});

// スコア計算ロジック（簡単な例）
function calculateScore(handShape: HandShape): number {
  // ランダムなスコアを生成（20-100ポイント）してランキングに差を出す
  // 実際のプロジェクトでは、AIによる評価スコアがここに入る
  return Math.floor(Math.random() * 81) + 20; // 20-100の範囲でランダムスコア
}

function generatePlayerId(): string {
  return 'player_' + Math.random().toString(36).substr(2, 9);
}

function generateSessionId(): string {
  return 'session_' + Math.random().toString(36).substr(2, 9);
}

console.log('WebSocket server started on port 8080');