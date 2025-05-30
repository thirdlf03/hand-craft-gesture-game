import React from 'react';
import { ScoreData, RoundResult, GameSession, Player } from '../types';

interface ScoreDisplayProps {
  scoreData: ScoreData | null;
  onPlayAgain: () => void;
  capturedImage: string | null;
  // マルチプレイヤー用の追加props
  gameSession?: GameSession;
  playerId?: string;
  currentRound?: number;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ 
  scoreData, 
  onPlayAgain, 
  capturedImage,
  gameSession,
  playerId,
  currentRound
}) => {
  // デバッグ情報をコンソールに出力
  console.log('ScoreDisplay Debug Info:', {
    gameSession: gameSession,
    playerId: playerId,
    currentRound: currentRound,
    roundResults: gameSession?.roundResults,
    sessionState: gameSession?.state
  });

  if (!scoreData) {
    return (
      <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl shadow-2xl">
        <p className="text-2xl text-text-dark font-bold">スコアを計算できませんでした。</p>
        <button
          onClick={onPlayAgain}
          className="mt-8 px-8 py-3 bg-primary text-text-light font-bold text-xl rounded-lg shadow-md hover:bg-red-700 transition-colors active:scale-95"
        >
          もう一度遊ぶ
        </button>
      </div>
    );
  }

  const getScoreColor = (points: number) => {
    if (points >= 80) return 'text-green-500';
    if (points >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}位`;
    }
  };

  // gameSessionが存在する場合のデフォルト値を設定
  const roundResults = gameSession?.roundResults || [];
  const totalRounds = gameSession?.totalRounds || 1;
  const sessionState = gameSession?.state || 'playing';

  // 現在のラウンド結果を取得（より柔軟な条件で）
  let currentRoundResult: RoundResult | undefined;
  
  if (roundResults.length > 0) {
    // currentRoundが指定されている場合はそれを使用
    if (currentRound !== undefined) {
      currentRoundResult = roundResults.find(
        result => result.round === currentRound
      );
    }
    
    // 見つからない場合は最新のラウンド結果を使用
    if (!currentRoundResult) {
      currentRoundResult = roundResults[roundResults.length - 1];
    }
  }

  // 自分の結果を取得
  const myResult = currentRoundResult?.playerResults?.find(
    result => result.playerId === playerId
  );

  // ランキング情報を表示するかどうか（条件を緩和）
  const showRanking = gameSession && currentRoundResult && playerId && 
                     currentRoundResult.playerResults && 
                     currentRoundResult.playerResults.length > 0;

  // ゲームが1ラウンドで終了かどうかを判定
  const isSingleRoundGame = totalRounds === 1 || 
                           (roundResults.length === 1 && sessionState === 'gameEnd');

  // デバッグ情報をコンソールに出力
  console.log('Ranking Debug Info:', {
    showRanking: showRanking,
    currentRoundResult: currentRoundResult,
    myResult: myResult,
    playerResults: currentRoundResult?.playerResults,
    leaderboard: currentRoundResult?.leaderboard,
    isSingleRoundGame: isSingleRoundGame,
    totalRounds: totalRounds,
    roundResultsLength: roundResults.length,
    sessionState: sessionState
  });

  return (
    <div className="text-center p-6 md:p-10 bg-white/90 backdrop-blur-md rounded-xl shadow-2xl max-w-4xl mx-auto">
      <h2 className="text-3xl font-mochiy text-primary mb-4">
        {isSingleRoundGame ? '🏆 最終結果 🏆' : '結果発表！'}
      </h2>
      
      {/* デバッグ情報（開発環境でのみ表示） */}
      {/* {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 bg-gray-100 rounded-lg text-xs text-left">
          <p><strong>Debug Info:</strong></p>
          <p>GameSession exists: {gameSession ? 'true' : 'false'}</p>
          <p>Player ID: {playerId || 'null'}</p>
          <p>Current Round: {currentRound}</p>
          <p>Total Rounds: {totalRounds}</p>
          <p>Round Results count: {roundResults.length}</p>
          <p>Current Round Result exists: {currentRoundResult ? 'true' : 'false'}</p>
          <p>Player Results count: {currentRoundResult?.playerResults?.length || 0}</p>
          <p>Show Ranking: {showRanking ? 'true' : 'false'}</p>
          <p>Is Single Round Game: {isSingleRoundGame ? 'true' : 'false'}</p>
          <p>Session State: {sessionState}</p>
        </div>
      )}
       */}
      {capturedImage && (
        <div className="mb-6">
          <p className="text-lg text-text-dark mb-2">あなたが作った作品：</p>
          <img 
            src={capturedImage} 
            alt="Player's creation" 
            className="w-48 h-auto mx-auto rounded-lg shadow-md border-2 border-accent"
            style={{ transform: 'scaleX(-1)' }} 
          />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* 自分のスコア表示 */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-bold text-gray-800 mb-2">あなたの結果</h3>
          <p className="text-lg text-text-dark mb-2">スコア</p>
          <p className={`text-5xl font-mochiy mb-2 ${getScoreColor(scoreData.points)}`}>
            {scoreData.points}<span className="text-2xl text-text-dark">点</span>
          </p>
          
          {showRanking && myResult && (
            <div className="mb-4">
              <p className="text-2xl font-bold text-gray-800">
                {getRankEmoji(myResult.rank)}
              </p>
              <p className="text-sm text-gray-600">
                {isSingleRoundGame ? '最終順位' : '今回のランキング'}
              </p>
            </div>
          )}

          <div className="bg-gray-100 p-3 rounded-lg shadow-inner">
            <p className="text-sm text-text-dark font-semibold mb-1">AIからのフィードバック：</p>
            <p className="text-sm text-gray-700">{scoreData.feedback}</p>
          </div>
        </div>

        {/* ランキング表示 */}
        {showRanking && currentRoundResult && (
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {isSingleRoundGame ? '🏆 最終順位 🏆' : '今回のランキング'}
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {currentRoundResult.playerResults
                .sort((a, b) => a.rank - b.rank)
                .map((result, index) => (
                  <div 
                    key={result.playerId}
                    className={`flex justify-between items-center p-3 rounded-lg ${
                      result.playerId === playerId 
                        ? 'bg-blue-100 border-2 border-blue-300' 
                        : 'bg-white'
                    } ${index < 3 && isSingleRoundGame ? 'shadow-lg' : 'shadow-md'}`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-bold">
                        {getRankEmoji(result.rank)}
                      </span>
                      <span className={`font-medium ${
                        result.playerId === playerId ? 'text-blue-800' : 'text-gray-800'
                      }`}>
                        {result.playerName}
                        {result.playerId === playerId ? ' (あなた)' : ''}
                      </span>
                    </div>
                    <span className={`text-lg font-bold ${getScoreColor(result.score)}`}>
                      {result.score}点
                    </span>
                  </div>
                ))}
            </div>
            
            {/* 参加者総数の表示 */}
            {isSingleRoundGame && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  参加者: {currentRoundResult.playerResults.length}人
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 複数ラウンドゲームの場合のみ総合ランキングを表示 */}
      {showRanking && !isSingleRoundGame && currentRoundResult && currentRoundResult.leaderboard && currentRoundResult.leaderboard.length > 0 && (
        <div className="mt-6 bg-gradient-to-br from-green-50 to-teal-50 p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-bold text-gray-800 mb-4">総合ランキング</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {currentRoundResult.leaderboard
              .sort((a, b) => a.rank - b.rank)
              .map((player) => (
                <div 
                  key={player.playerId}
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    player.playerId === playerId 
                      ? 'bg-green-100 border-2 border-green-300' 
                      : 'bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-bold">
                      {getRankEmoji(player.rank)}
                    </span>
                    <span className={`font-medium ${
                      player.playerId === playerId ? 'text-green-800' : 'text-gray-800'
                    }`}>
                      {player.playerName}
                      {player.playerId === playerId ? ' (あなた)' : ''}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-gray-800">
                    {player.totalScore}点
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* マルチプレイヤーでラウンド結果が存在しない場合の表示 */}
      {gameSession && roundResults.length === 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <h3 className="text-lg font-bold text-blue-800 mb-2">🕒 他のプレイヤーを待機中...</h3>
          <p className="text-blue-700 mb-2">
            他のプレイヤーがまだゲームを完了していません。しばらくお待ちください。
          </p>
          <div className="bg-blue-100 p-3 rounded-lg text-sm text-blue-800">
            <p>• セッション参加者: {gameSession.players?.length || 0}人</p>
            <p>• 現在のラウンド: {currentRound || 1}</p>
            <p>• セッション状態: {sessionState === 'playing' ? 'プレイ中' : sessionState}</p>
          </div>
        </div>
      )}

      {/* マルチプレイヤーでも他ユーザーの結果が表示されない場合の診断メッセージ */}
      {gameSession && roundResults.length > 0 && (!showRanking || !currentRoundResult || !currentRoundResult.playerResults || currentRoundResult.playerResults.length <= 1) && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <h3 className="text-lg font-bold text-yellow-800 mb-2">他のプレイヤーの結果について</h3>
          {!currentRoundResult && (
            <p className="text-yellow-700">ラウンド結果データが見つかりません。</p>
          )}
          {currentRoundResult && (!currentRoundResult.playerResults || currentRoundResult.playerResults.length === 0) && (
            <p className="text-yellow-700">プレイヤー結果データが見つかりません。</p>
          )}
          {currentRoundResult && currentRoundResult.playerResults && currentRoundResult.playerResults.length === 1 && (
            <p className="text-yellow-700">他のプレイヤーの結果がまだ送信されていないか、あなただけが参加しています。</p>
          )}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 text-xs text-yellow-600">
              <p>詳細：</p>
              <p>- セッションID: {gameSession.id}</p>
              <p>- プレイヤー数: {gameSession.players?.length || 0}</p>
              <p>- ラウンド結果数: {roundResults.length}</p>
              <p>- 現在のラウンド: {currentRound}</p>
            </div>
          )}
        </div>
      )}

      {/* シングルプレイヤーの場合のボタン */}
      {!gameSession && (
        <button
          onClick={onPlayAgain}
          className="mt-6 px-10 py-4 bg-secondary text-text-light font-bold text-xl rounded-lg shadow-md hover:bg-teal-600 transition-colors active:scale-95"
        >
          もう一度遊ぶ！
        </button>
      )}

      {/* マルチプレイヤーゲーム終了後のボタン */}
      {gameSession && isSingleRoundGame && sessionState === 'gameEnd' && (
        <div className="mt-6 text-center">
          <p className="text-lg text-gray-600 mb-4">ゲーム終了！お疲れ様でした！</p>
          <button
            onClick={() => {
              // 新しいゲームセッションへの移行処理は親コンポーネントで処理
              onPlayAgain();
            }}
            className="px-8 py-3 bg-accent text-text-light font-bold text-lg rounded-lg shadow-md hover:bg-purple-600 transition-colors active:scale-95"
          >
            新しいゲームを開始
          </button>
        </div>
      )}
    </div>
  );
};

export default ScoreDisplay;
