import { WebSocketServer } from 'ws';
import { GameMessage, JoinGameMessage, GameUpdateMessage, PlayerJoinedMessage, Player, GameSession, SelectHandShapeMessage, HandShape, RoundResult, NewPlayerJoinedMessage } from './types';

const wss = new WebSocketServer({ port: 8080 });

// ゲームセッションの管理
const players: Map<string, Player> = new Map();
const playerConnections: Map<string, any> = new Map(); // プレイヤーIDとWebSocket接続の紐付け
let gameSession: GameSession | null = null;

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
              hostId: playerId
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
            // ゲームセッションの状態を更新
            gameSession.state = 'playing';
            gameSession.currentRound = 1;
            
            // ゲーム開始の通知（プライバシー保護）
            const gameStartResponse = {
              type: 'gameStart',
              session: {
                id: gameSession.id,
                state: gameSession.state,
                currentRound: gameSession.currentRound,
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
            
            console.log('Game started!');
          } else {
            console.error('No game session found when trying to start game');
          }
          break;

        case 'selectHandShape':
          const selectData = data as SelectHandShapeMessage;
          if (gameSession && players.has(selectData.playerId)) {
            const player = players.get(selectData.playerId)!;
            player.currentHandShape = selectData.handShape;
            
            // 全プレイヤーがハンドシェイプを選択したかチェック
            const allPlayersSelected = Array.from(players.values()).every(p => p.currentHandShape);
            
            if (allPlayersSelected) {
              // ラウンド終了処理
              gameSession.state = 'roundEnd';
              gameSession.roundResults.push({
                round: gameSession.currentRound,
                playerResults: Array.from(players.values()).map(p => ({
                  playerId: p.id,
                  playerName: p.name,
                  handShape: p.currentHandShape!,
                  score: calculateScore(p.currentHandShape!) // スコア計算ロジックを追加
                }))
              });
              
              // プレイヤーのスコアを更新
              Array.from(players.values()).forEach(player => {
                const roundResult = gameSession!.roundResults[gameSession!.roundResults.length - 1];
                const playerResult = roundResult.playerResults.find(r => r.playerId === player.id);
                if (playerResult) {
                  player.score += playerResult.score;
                  gameSession!.playerScores[player.id] = player.score;
                }
              });
            }
            
            // ゲーム状態更新を全クライアントに通知
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
                  // ゲーム進行中は他人の手の形は見せない
                  hasSelected: p.currentHandShape !== undefined
                })),
                // ラウンド結果は最新のもののみ、かつゲーム終了時のみ送信
                ...(gameSession.state === 'roundEnd' && {
                  roundResults: gameSession.roundResults.slice(-1) // 最新のラウンド結果のみ
                })
              }
            };
            
            wss.clients.forEach(client => {
              if (client.readyState === client.OPEN) {
                client.send(JSON.stringify(gameUpdateResponse));
              }
            });
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
            }
            
            gameSession.players = Array.from(players.values());
            
            // ゲーム状態更新を全クライアントに通知（プライバシー保護）
            const nextRoundResponse = {
              type: gameSession.state === 'gameEnd' ? 'gameEnd' : 'nextRound',
              session: {
                id: gameSession.id,
                state: gameSession.state,
                currentRound: gameSession.currentRound,
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
  // 適切なハンドシェイプに基づいてスコアを計算
  // この例では、すべてのハンドシェイプに10ポイントを与える
  return 10;
}

function generatePlayerId(): string {
  return 'player_' + Math.random().toString(36).substr(2, 9);
}

function generateSessionId(): string {
  return 'session_' + Math.random().toString(36).substr(2, 9);
}

console.log('WebSocket server started on port 8080');