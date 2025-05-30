import { WebSocketServer } from 'ws';
import { GameMessage, JoinGameMessage, GameUpdateMessage, PlayerJoinedMessage, Player, GameSession } from './types';

const wss = new WebSocketServer({ port: 8080 });

// ゲームセッションの管理
const players: Map<string, Player> = new Map();
let gameSession: GameSession | null = null;

wss.on('connection', ws => {
  console.log('Client connected');

  ws.on('message', message => {
    try {
      console.log(`Received message: ${message}`);
      const data: GameMessage = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'joinGame':
          const joinData = data as JoinGameMessage;
          const playerId = generatePlayerId();
          const isFirstPlayer = players.size === 0;
          
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
            session: gameSession
          };
          
          // 全クライアントに通知
          wss.clients.forEach(client => {
            if (client.readyState === client.OPEN) {
              client.send(JSON.stringify(joinResponse));
            }
          });
          break;
          
        case 'startGame':
          if (gameSession) {
            // ゲームセッションの状態を更新
            gameSession.state = 'playing';
            gameSession.currentRound = 1;
            
            // ゲーム開始の通知
            const gameStartResponse = {
              type: 'gameStart',
              session: gameSession
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
    // TODO: プレイヤーリストからの削除処理
  });

  ws.on('error', error => {
    console.error('WebSocket error:', error);
  });
});

function generatePlayerId(): string {
  return 'player_' + Math.random().toString(36).substr(2, 9);
}

function generateSessionId(): string {
  return 'session_' + Math.random().toString(36).substr(2, 9);
}

console.log('WebSocket server started on port 8080');