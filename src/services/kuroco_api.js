import axios from 'axios';

// KurocoのAPIエンドポイント設定
// 実際のエンドポイントに合わせて変更してください
const BASE_URL = 'https://your-kuroco-domain.g.kuroco.app';

const client = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * スレッド一覧を取得する
 * @returns {Promise<Array>} スレッドのリスト
 */
export const fetchThreads = async () => {
    try {
        constresponse = await client.get('/rcms-api/v1/threads');
        // Kurocoのリスト系APIは通常 { list: [...] } の形式で返ることを想定
        // レスポンス形式に応じて調整が必要な可能性があります
        return response.data.list || response.data || [];
    } catch (error) {
        console.error('Failed to fetch threads:', error);
        // エラー時は空配列を返すか、エラーを再スローするか検討
        // 現状はUIを壊さないために空配列を返し、呼び出し元でダミーデータにフォールバックさせるなどの制御を行う
        throw error;
    }
};
