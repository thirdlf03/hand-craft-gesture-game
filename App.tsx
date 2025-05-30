import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, PromptItem, ScoreData, HandShape, GameSession, Player, GameUpdateMessage, PlayerJoinedMessage, GameStartMessage, GameEndMessage, SelectHandShapeMessage, NewPlayerJoinedMessage, PlayerLeftMessage, RoundResult } from './types';
import { PROMPTS, INTRO_DURATION_MS, PROMPT_DISPLAY_DURATION_MS, COUNTDOWN_SECONDS, CAPTURE_DELAY_MS, API_KEY_WARNING } from './constants';
import CameraFeed, { CameraFeedHandle } from './components/CameraFeed';
import PromptDisplay from './components/PromptDisplay';
import TimerDisplay from './components/TimerDisplay';
import ScoreDisplay from './components/ScoreDisplay';
import { evaluateHandShapeCreation } from './services/geminiService';
import HandShapeIcon from './components/HandShapeIcon'; // For intro animation
import GameService from './services/gameService';
import { GameMessage, RoundEndMessage } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [currentPrompt, setCurrentPrompt] = useState<PromptItem | null>(null);
  const [score, setScore] = useState<ScoreData | null>(null);
  const [lastCapturedImage, setLastCapturedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usedPrompts, setUsedPrompts] = useState<Set<string>>(new Set());
  
  const [introShapes, setIntroShapes] = useState<HandShape[]>([HandShape.GUU, HandShape.CHOKI, HandShape.PAA]);
  const [currentIntroShapeIndex, setCurrentIntroShapeIndex] = useState(0);

  // Multiplayer states
  const gameServiceRef = useRef<GameService | null>(null);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerList, setPlayerList] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [roundResults, setRoundResults] = useState<any[]>([]); // Adjust type as per your GameSession structure
  const [multiplayerErrorMessage, setMultiplayerErrorMessage] = useState<string | null>(null);

  const cameraRef = useRef<CameraFeedHandle>(null);
  const apiKeyExists = !!process.env.GEMINI_API_KEY;

  const startGame = () => {
    if (!apiKeyExists) {
      setErrorMessage(API_KEY_WARNING);
      setGameState(GameState.ERROR);
      return;
    }
    setErrorMessage(null);
    setCurrentIntroShapeIndex(0); // Reset intro animation
    setGameState(GameState.INTRO);
  };

  const handleCameraReady = useCallback(() => {
    // Optional: handle camera ready event if needed
  }, []);

  const handleCameraError = useCallback((error: string) => {
    setErrorMessage(error);
    setGameState(GameState.ERROR);
  }, []);

  const handleCaptureAndScore = useCallback(async () => {
    if (cameraRef.current && currentPrompt) {
      const imageData = cameraRef.current.captureImage();
      if (imageData) {
        setLastCapturedImage(imageData);
        setGameState(GameState.SCORING);
        const result = await evaluateHandShapeCreation(imageData, currentPrompt);
        setScore(result);
        
        // マルチプレイヤーの場合はサーバーに結果を送信
        if (gameSession && playerId && gameServiceRef.current) {
          gameServiceRef.current.submitScore(
            gameSession.id,
            playerId,
            result.points,
            result.feedback,
            imageData
          );
        }
        
        setGameState(GameState.SHOWING_RESULT);
      } else {
        setErrorMessage("写真の撮影に失敗しました。もう一度試してください。");
        setGameState(GameState.ERROR);
      }
    }
  }, [currentPrompt, gameSession, playerId]);
  
  const handleTimeout = useCallback(() => {
    setGameState(GameState.CAPTURING);
    // Short delay to allow UI to update (e.g., show "SNAP!") before capturing
    setTimeout(async () => {
        if (cameraRef.current && currentPrompt) {
          const imageData = cameraRef.current.captureImage();
          if (imageData) {
            setLastCapturedImage(imageData);
            setGameState(GameState.SCORING);
            const result = await evaluateHandShapeCreation(imageData, currentPrompt);
            setScore(result);
            
            // マルチプレイヤーの場合はサーバーに結果を送信
            if (gameSession && playerId && gameServiceRef.current) {
              gameServiceRef.current.submitScore(
                gameSession.id,
                playerId,
                result.points,
                result.feedback,
                imageData
              );
            }
            
            setGameState(GameState.SHOWING_RESULT);
          } else {
            setErrorMessage("写真の撮影に失敗しました。もう一度試してください。");
            setGameState(GameState.ERROR);
          }
        }
    }, CAPTURE_DELAY_MS);
  }, [currentPrompt, gameSession, playerId]);

  const playAgain = () => {
    setScore(null);
    setLastCapturedImage(null);
    setCurrentPrompt(null); // Clear current prompt
    startGame(); // This will go to INTRO, then select a new prompt
  };
  
  // Game State Transitions
  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined;
    let intervalId: NodeJS.Timeout | undefined;

    if (gameState === GameState.INTRO) {
      // お題が設定されていない場合は、サーバーからの受信を待つかローカルで選択する
      if (!currentPrompt) {
        // マルチプレイヤーでサーバーからお題が来ている場合はそれを使用
        if (gameSession?.currentPrompt) {
          setCurrentPrompt(gameSession.currentPrompt);
        } 
        // シングルプレイヤーモード、またはマルチプレイヤーでもサーバーからお題が来ない場合はローカルで選択
        else if (!gameSession || gameSession.state === 'waitingForPlayers' || gameSession.state === 'lobby' || !gameSession.currentPrompt) {
          setUsedPrompts((currentUsedPrompts) => {
            const availablePrompts = PROMPTS.filter(p => !currentUsedPrompts.has(p.id));
            let selectedPrompt: PromptItem;
            
            if (availablePrompts.length === 0) {
              // All prompts used, reset
              const randomIndex = Math.floor(Math.random() * PROMPTS.length);
              selectedPrompt = PROMPTS[randomIndex];
              setCurrentPrompt(selectedPrompt);
              return new Set([selectedPrompt.id]);
            } else {
              const randomIndex = Math.floor(Math.random() * availablePrompts.length);
              selectedPrompt = availablePrompts[randomIndex];
              setCurrentPrompt(selectedPrompt);
              return new Set(currentUsedPrompts).add(selectedPrompt.id);
            }
          });
        }
      }
      
      // お題が設定されている場合のみ次の状態に進む
      if (currentPrompt) {
        timerId = setTimeout(() => setGameState(GameState.SHOWING_PROMPT), INTRO_DURATION_MS);
      }
    } else if (gameState === GameState.SHOWING_PROMPT) {
      // お題が設定されている場合のみカウントダウンに進む
      if (currentPrompt) {
        timerId = setTimeout(() => setGameState(GameState.COUNTDOWN), PROMPT_DISPLAY_DURATION_MS);
      }
    }
    
    // Intro animation effect
    if (gameState === GameState.INTRO) {
        intervalId = setInterval(() => {
            setCurrentIntroShapeIndex((prevIndex: number) => (prevIndex + 1) % introShapes.length);
        }, 700);
    }
 
    return () => {
      if (timerId) clearTimeout(timerId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [gameState, introShapes.length, gameSession, currentPrompt]);

  // Multiplayer useEffect
  useEffect(() => {
    gameServiceRef.current = new GameService();
    const gameService = gameServiceRef.current;

    gameService.onOpen = () => {
      setIsConnected(true);
      setMultiplayerErrorMessage(null);
      console.log("WebSocket connected.");
    };

    gameService.onClose = () => {
      setIsConnected(false);
      setGameSession(null);
      setPlayerId(null);
      setIsHost(false);
      setPlayerList([]);
      setMultiplayerErrorMessage("サーバーとの接続が切れました。");
      console.log("WebSocket disconnected.");
    };

    gameService.onError = (event: Event) => {
      console.error("WebSocket error:", event);
      setMultiplayerErrorMessage("WebSocketエラーが発生しました。");
    };

    gameService.onMessage = (message: any) => {
      console.log("Received message:", message);
      switch (message.type) {
        case 'gameUpdate':
          const gameUpdateMessage = message as GameUpdateMessage;
          setGameSession(gameUpdateMessage.session);
          setPlayerList(gameUpdateMessage.session.players);
          setCurrentRound(gameUpdateMessage.session.currentRound);
          setRoundResults(gameUpdateMessage.session.roundResults);
          
          // サーバーからお題が送信された場合は設定する
          if (gameUpdateMessage.session.currentPrompt) {
            setCurrentPrompt(gameUpdateMessage.session.currentPrompt);
          }
          
          // Update game state based on session state
          if (gameUpdateMessage.session.state === 'waitingForPlayers' || gameUpdateMessage.session.state === 'lobby') {
            // ロビー状態では現在のGameStateを保持し、強制的にIDLEに変更しない
          } else if (gameUpdateMessage.session.state === 'playing') {
            // ゲーム中の場合、お題表示またはカウントダウンに移行
            if (gameState === GameState.IDLE || gameState === GameState.INTRO) {
              setGameState(GameState.SHOWING_PROMPT);
            }
          } else if (gameUpdateMessage.session.state === 'roundEnd' || gameUpdateMessage.session.state === 'gameEnd') {
            setGameState(GameState.SHOWING_RESULT);
          }
          break;
        case 'playerJoined':
          const playerJoinedMessage = message as PlayerJoinedMessage;
          // 自分自身が参加した場合のみplayerIdとisHostを更新
          if (!playerId) {
            setPlayerId(playerJoinedMessage.playerId);
            setIsHost(playerJoinedMessage.isHost);
          }
          setGameSession(playerJoinedMessage.session);
          setPlayerList(playerJoinedMessage.session.players);
          setMultiplayerErrorMessage(null);
          break;
        case 'newPlayerJoined':
          const newPlayerJoinedMessage = message as NewPlayerJoinedMessage;
          // 既存プレイヤーの場合、playerId と isHost の状態は変更せず、セッション情報のみ更新
          setGameSession(newPlayerJoinedMessage.session);
          setPlayerList(newPlayerJoinedMessage.session.players);
          setMultiplayerErrorMessage(null);
          break;
        case 'gameStart':
          const gameStartMessage = message as GameStartMessage;
          setGameSession(gameStartMessage.session);
          setPlayerList(gameStartMessage.session.players);
          setCurrentRound(gameStartMessage.session.currentRound);
          
          // サーバーからお題が送信された場合は設定する
          if (gameStartMessage.session.currentPrompt) {
            setCurrentPrompt(gameStartMessage.session.currentPrompt);
          }
          
          setUsedPrompts(new Set()); // Reset used prompts for new game
          setGameState(GameState.INTRO); // Start game intro
          break;
        case 'roundEnd':
          const roundEndMessage = message as RoundEndMessage;
          console.log("Round end message received:", roundEndMessage);
          console.log("Round results from server:", roundEndMessage.session.roundResults);
          console.log("Number of round results:", roundEndMessage.session.roundResults?.length);
          setGameSession(roundEndMessage.session);
          setPlayerList(roundEndMessage.session.players);
          setCurrentRound(roundEndMessage.session.currentRound);
          setRoundResults(roundEndMessage.session.roundResults);
          
          // 結果表示状態に移行
          setGameState(GameState.SHOWING_RESULT);
          break;
        case 'gameEnd':
          const gameEndMessage = message as GameEndMessage;
          setGameSession(gameEndMessage.session);
          setPlayerList(gameEndMessage.session.players);
          setRoundResults(gameEndMessage.session.roundResults);
          setGameState(GameState.SHOWING_RESULT); // Show final results
          break;
        case 'error':
          setMultiplayerErrorMessage(message.message);
          break;
        case 'playerLeft':
          // プレイヤーが退出した場合の処理
          const playerLeftMessage = message as PlayerLeftMessage;
          if (gameSession) {
            // プレイヤーリストから退出したプレイヤーを削除
            const updatedPlayers = playerList.filter(player => player.id !== playerLeftMessage.playerId);
            setPlayerList(updatedPlayers);
            
            // セッション情報を更新
            const updatedSession = {
              ...gameSession,
              players: updatedPlayers
            };
            setGameSession(updatedSession);
          }
          break;
        default:
          console.warn("Unknown message type:", message.type);
      }
    };

    return () => {
      gameService.close();
    };
  }, []);

  const handleJoinGame = () => {
    if (gameServiceRef.current && playerName) {
      gameServiceRef.current.joinGame(playerName);
    } else {
      setMultiplayerErrorMessage("プレイヤー名を入力してください。");
    }
  };

  const handleStartGame = () => {
    if (gameServiceRef.current && isHost) {
      gameServiceRef.current.startGame();
    } else {
      setMultiplayerErrorMessage("ゲームを開始する権限がありません。");
    }
  };

  const handleSelectHandShape = (handShape: HandShape) => {
    if (gameServiceRef.current && playerId && gameSession?.id) {
      const message: SelectHandShapeMessage = {
        type: 'selectHandShape',
        sessionId: gameSession.id,
        playerId: playerId,
        handShape: handShape,
      };
      console.log("Sending selectHandShape message:", message);
      gameServiceRef.current.sendMessage(message);
    }
  };


  const renderContent = () => {
    if (!isConnected) {
      return (
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-mochiy text-primary mb-4">てづくりジェスチャーゲーム！</h1>
          <p className="text-xl md:text-2xl text-text-dark mb-8">サーバーに接続中...</p>
          {multiplayerErrorMessage && (
            <p className="text-red-500 font-bold mt-4">{multiplayerErrorMessage}</p>
          )}
        </div>
      );
    }

    if (!playerId) {
      return (
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-mochiy text-primary mb-4">てづくりジェスチャーゲーム！</h1>
          <p className="text-xl md:text-2xl text-text-dark mb-8">「グー・チョキ・パー」でなにつくろ？</p>
          
          <div className="mb-6">
            <input
              type="text"
              placeholder="プレイヤー名を入力"
              value={playerName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlayerName(e.target.value)}
              className="px-4 py-2 mb-4 text-lg rounded-lg border-2 border-gray-300 focus:outline-none focus:border-secondary"
            />
          </div>
          
          <div className="space-y-4">
            <button
              onClick={handleJoinGame}
              className="block mx-auto px-10 py-4 bg-secondary text-text-light font-bold text-2xl rounded-lg shadow-xl hover:bg-teal-600 transition-colors active:scale-95 transform hover:scale-105"
            >
              マルチプレイヤーゲームに参加！
            </button>
            
            <button
              onClick={() => {
                // シングルプレイヤーモードを開始
                setPlayerId('single-player');
                setPlayerName('シングルプレイヤー');
                setGameSession(null);
                startGame();
              }}
              className="block mx-auto px-10 py-4 bg-accent text-text-light font-bold text-2xl rounded-lg shadow-xl hover:bg-purple-600 transition-colors active:scale-95 transform hover:scale-105"
            >
              ひとりで遊ぶ！
            </button>
          </div>
          
          {multiplayerErrorMessage && (
            <p className="text-red-500 font-bold mt-4">{multiplayerErrorMessage}</p>
          )}
        </div>
      );
    }

    // ゲームセッションがロビー状態の場合は、GameStateに関係なくロビー画面を表示
    if (gameSession && (gameSession.state === 'waitingForPlayers' || gameSession.state === 'lobby')) {
      return (
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-mochiy text-primary mb-4">ロビー</h1>
          <p className="text-xl md:text-2xl text-text-dark mb-4">セッションID: {gameSession.id}</p>
          <h2 className="text-2xl font-bold mb-2">参加中のプレイヤー: {playerList.length}人</h2>
          <ul className="list-disc list-inside mb-6">
            {playerList.map((player: Player) => (
              <li key={player.id} className="text-lg">{player.name} {player.id === playerId ? '(あなた)' : ''} {player.isHost ? '(ホスト)' : ''}</li>
            ))}
          </ul>
          {isHost && (
            <button
              onClick={handleStartGame}
              className="px-10 py-4 bg-accent text-text-light font-bold text-2xl rounded-lg shadow-xl hover:bg-purple-600 transition-colors active:scale-95 transform hover:scale-105"
            >
              ゲームを開始！
            </button>
          )}
          {!isHost && (
            <p className="text-xl text-text-dark">ホストがゲームを開始するのを待っています...</p>
          )}
          {multiplayerErrorMessage && (
            <p className="text-red-500 font-bold mt-4">{multiplayerErrorMessage}</p>
          )}
        </div>
      );
    }

    switch (gameState) {
      case GameState.IDLE: // This state will now primarily be for initial connection/joining
        return (
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-mochiy text-primary mb-4">てづくりジェスチャーゲーム！</h1>
            <p className="text-xl md:text-2xl text-text-dark mb-8">ゲームセッションを待っています...</p>
            {multiplayerErrorMessage && (
              <p className="text-red-500 font-bold mt-4">{multiplayerErrorMessage}</p>
            )}
          </div>
        );
      case GameState.INTRO:
        return (
          <div className="text-center">
            <h2 className="text-5xl font-mochiy text-accent mb-8 animate-pulse">お題発表！</h2>
            <div className="flex justify-center space-x-4">
              {introShapes.map((shape: HandShape, index: number) => (
                <HandShapeIcon
                    key={shape}
                    shape={shape}
                    className={`transition-all duration-500 ${index === currentIntroShapeIndex ? 'opacity-100 scale-110' : 'opacity-50 scale-90'}`}
                />
              ))}
            </div>
          </div>
        );
      case GameState.SHOWING_PROMPT:
        return currentPrompt ? (
          <div className="w-full">
            <PromptDisplay prompt={currentPrompt} />
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-3xl font-mochiy text-primary mb-4">お題を準備中...</h2>
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-secondary mx-auto"></div>
            <p className="text-lg text-gray-600 mt-4">
              {gameSession ? 'サーバーからお題を受信しています...' : 'お題を選択しています...'}
            </p>
          </div>
        );
      case GameState.COUNTDOWN:
      case GameState.CAPTURING: // CameraFeed visible during CAPTURING too (for the "SNAP!" moment)
        return (
          <div className="w-full">
            {currentPrompt && <PromptDisplay prompt={currentPrompt} />}
            <div className="mt-6">
              <CameraFeed
                ref={cameraRef}
                width={640}
                height={480}
                onCameraError={handleCameraError}
                onCameraReady={handleCameraReady}
              />
            </div>
            {gameState === GameState.COUNTDOWN && (
                 <TimerDisplay
                    initialSeconds={COUNTDOWN_SECONDS}
                    onTimeout={handleTimeout}
                    start={true}
                />
            )}
          </div>
        );
      case GameState.SCORING:
        return (
          <div className="text-center">
            <h2 className="text-4xl font-mochiy text-primary mb-4">採点中...</h2>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-secondary mx-auto"></div>
            {lastCapturedImage && (
              <img
                src={lastCapturedImage}
                alt="Captured for scoring"
                className="w-40 h-auto mx-auto mt-4 rounded-lg shadow-md border-2 border-accent"
                style={{ transform: 'scaleX(-1)' }}
              />
            )}
          </div>
        );
      case GameState.SHOWING_RESULT:
        return (
          <div>
            <ScoreDisplay 
              scoreData={score} 
              onPlayAgain={playAgain} 
              capturedImage={lastCapturedImage}
              gameSession={gameSession || undefined}
              playerId={playerId || undefined}
              currentRound={currentRound}
            />
            {gameSession && gameSession.state === 'gameEnd' && gameSession.finalLeaderboard && (
              <div className="mt-8 text-center">
                <h2 className="text-3xl font-mochiy text-primary mb-4">🏆 最終結果 🏆</h2>
                <div className="bg-gradient-to-br from-gold-50 to-yellow-50 p-6 rounded-xl shadow-lg">
                  <div className="space-y-3">
                    {gameSession.finalLeaderboard
                      .sort((a, b) => a.rank - b.rank)
                      .map((player, index) => (
                        <div 
                          key={player.playerId}
                          className={`flex justify-between items-center p-4 rounded-lg ${
                            player.playerId === playerId 
                              ? 'bg-blue-100 border-2 border-blue-300' 
                              : 'bg-white'
                          } ${index < 3 ? 'shadow-lg' : 'shadow-md'}`}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl font-bold">
                              {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : `${player.rank}位`}
                            </span>
                            <span className={`text-xl font-bold ${
                              player.playerId === playerId ? 'text-blue-800' : 'text-gray-800'
                            }`}>
                              {player.playerName}
                              {player.playerId === playerId ? ' (あなた)' : ''}
                            </span>
                          </div>
                          <span className="text-2xl font-bold text-gray-800">
                            {player.totalScore}点
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setGameSession(null);
                    setPlayerId(null);
                    setIsHost(false);
                    setPlayerList([]);
                    setGameState(GameState.IDLE);
                    if (gameServiceRef.current) {
                      gameServiceRef.current.close();
                      gameServiceRef.current = new GameService(); // Reinitialize for new game
                    }
                  }}
                  className="px-8 py-3 bg-secondary text-text-light font-bold text-lg rounded-lg shadow-md hover:bg-teal-600 transition-colors active:scale-95 mt-6"
                >
                  新しいゲームを開始
                </button>
              </div>
            )}
            {gameSession && gameSession.state === 'roundEnd' && isHost && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => gameServiceRef.current?.startNextRound()}
                  className="px-8 py-3 bg-accent text-text-light font-bold text-lg rounded-lg shadow-md hover:bg-purple-600 transition-colors active:scale-95"
                >
                  次のラウンドへ
                </button>
              </div>
            )}
          </div>
        );
      case GameState.ERROR:
        return (
          <div className="text-center p-6 bg-red-100 border-2 border-red-500 rounded-lg shadow-md">
            <h2 className="text-3xl font-mochiy text-red-700 mb-4">エラー発生</h2>
            <p className="text-xl text-red-600 mb-6">{errorMessage || multiplayerErrorMessage}</p>
            <button
              onClick={() => {
                setGameState(GameState.IDLE);
                setMultiplayerErrorMessage(null);
                if (gameServiceRef.current) {
                  gameServiceRef.current.close();
                  gameServiceRef.current = new GameService(); // Reinitialize for new game
                }
              }}
              className="px-8 py-3 bg-primary text-text-light font-bold text-lg rounded-lg shadow-md hover:bg-red-700 transition-colors active:scale-95"
            >
              最初の画面に戻る
            </button>
          </div>
        );
      default:
        return <p>不明なゲーム状態です。</p>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-accent/30 via-game-bg to-secondary/30 text-text-dark">
      <main className="container mx-auto w-full max-w-3xl p-4 md:p-8 bg-white/70 backdrop-blur-lg rounded-2xl shadow-2xl">
        {renderContent()}
      </main>
       <footer className="text-center mt-8 text-sm text-gray-600">
        <p>&copy; 2024 てづくりジェスチャーゲーム. Gemini API を利用しています。</p>
        {!apiKeyExists && gameState !== GameState.ERROR && (
             <p className="text-red-500 font-bold mt-2">{API_KEY_WARNING}</p>
        )}
      </footer>
    </div>
  );
};

export default App;
