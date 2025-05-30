import { GameMessage, GameUpdateMessage, PlayerJoinedMessage, Player, GameSession, HandShape, JoinGameMessage, SelectHandShapeMessage, GameStartMessage, GameEndMessage, NextRoundMessage, ErrorMessage } from '../types';
import { WEBSOCKET_URL } from '../constants';

/**
 * WebSocket通信を処理し、ゲームセッションの状態を管理するサービス。
 */
class GameService { // export default に変更
    private ws: WebSocket | null = null;
    private url: string;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectInterval: number = 3000; // 3秒

    // コールバック関数
    public onOpen: () => void = () => {};
    public onClose: (event: CloseEvent) => void = () => {};
    public onError: (event: Event) => void = () => {};
    public onMessage: (message: GameMessage) => void = () => {};

    constructor(url: string = WEBSOCKET_URL) { // デフォルトURLを指定されたエンドポイントに変更
        this.url = url;
        this.connect(); // コンストラクタで自動的に接続を開始
    }

    /**
     * WebSocketサーバーに接続します。
     */
    private connect(): void {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            console.warn('WebSocketはすでに接続済みか、接続中です。');
            return;
        }

        this.ws = new WebSocket(this.url);

        this.ws.onopen = (event) => {
            console.log('WebSocket接続が確立されました。');
            this.reconnectAttempts = 0; // 接続成功時にリセット
            this.onOpen();
        };

        this.ws.onmessage = (event) => {
            try {
                const message: GameMessage = JSON.parse(event.data);
                this.onMessage(message); // 外部にメッセージを渡す
            } catch (error) {
                console.error('受信メッセージのパースに失敗しました:', error);
                this.onMessage({ type: 'error', message: '受信メッセージのパースに失敗しました。' } as ErrorMessage);
            }
        };

        this.ws.onclose = (event) => {
            console.log('WebSocket接続が閉じられました:', event.code, event.reason);
            this.ws = null;
            this.onClose(event);
            if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) { // 正常終了(1000)以外で再接続を試みる
                this.reconnectAttempts++;
                console.log(`再接続を試みます... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                setTimeout(() => this.connect(), this.reconnectInterval);
            } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('最大再接続試行回数に達しました。再接続を諦めます。');
                this.onMessage({ type: 'error', message: 'サーバーへの再接続に失敗しました。' } as ErrorMessage);
            }
        };

        this.ws.onerror = (event) => {
            console.error('WebSocketエラー:', event);
            this.onError(event);
            // エラー発生時もoncloseが呼ばれるため、ここでは再接続ロジックは不要
        };
    }

    /**
     * WebSocket接続を切断します。
     */
    public close(): void { // disconnectからcloseに名称変更
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close(1000, 'クライアントからの切断'); // 正常終了コード1000
        } else {
            console.warn('WebSocketは接続されていません。');
        }
    }

    /**
     * サーバーにメッセージを送信します。
     * @param message 送信するGameMessageオブジェクト。
     */
    public sendMessage(message: GameMessage): void { // privateからpublicに変更
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocketが接続されていないため、メッセージを送信できません。');
            this.onMessage({ type: 'error', message: 'サーバーに接続されていません。' } as ErrorMessage);
        }
    }

    /**
     * プレイヤーがゲームセッションに参加するアクションをサーバーに送信します。
     * @param playerName 参加するプレイヤーの名前。
     */
    public joinGame(playerName: string): void {
        const message: JoinGameMessage = {
            type: 'joinGame',
            playerName: playerName, // playerIdからplayerNameに変更
        };
        this.sendMessage(message);
    }

    /**
     * ホストがゲームを開始するアクションをサーバーに送信します。
     */
    public startGame(): void {
        this.sendMessage({ type: 'startGame' } as GameMessage); // GameStartMessageはサーバーから受信する型なので、送信時はGameMessageで十分
    }

    /**
     * ホストが次のラウンドを開始するアクションをサーバーに送信します。
     */
    public startNextRound(): void {
        this.sendMessage({ type: 'nextRound' } as GameMessage); // NextRoundMessageはサーバーから受信する型なので、送信時はGameMessageで十分
    }

    /**
     * プレイヤーがハンドシェイプを選択するアクションをサーバーに送信します。
     * @param sessionId 現在のゲームセッションID。
     * @param playerId ハンドシェイプを選択したプレイヤーのID。
     * @param handShape 選択されたハンドシェイプ。
     */
    public selectHandShape(sessionId: string, playerId: string, handShape: HandShape): void {
        const message: SelectHandShapeMessage = {
            type: 'selectHandShape',
            sessionId: sessionId, // sessionIdを追加
            playerId: playerId,
            handShape: handShape,
        };
        this.sendMessage(message);
    }
}

export default GameService; // デフォルトエクスポート
