import axios from 'axios';

// KurocoのAPIエンドポイント設定
// 実際のエンドポイントに合わせて変更してください
const BASE_URL = 'https://your-kuroco-domain.g.kuroco.app';

const authClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * ログイン処理（モック実装）
 * 将来的にKurocoの認証APIに接続する想定
 * @param {string} email - メールアドレス
 * @param {string} password - パスワード
 * @returns {Promise<Object>} ユーザー情報とトークン
 */
export const login = async (email, password) => {
    // モック実装: 実際のAPI呼び出しはコメントアウト
    /*
    try {
      const response = await authClient.post('/rcms-api/v1/login', {
        email,
        password,
      });
      // レスポンスからアクセストークンとユーザー情報を取得
      const { access_token, member } = response.data;
      // トークンをlocalStorageに保存
      localStorage.setItem('access_token', access_token);
      return { success: true, user: member };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.message };
    }
    */

    // モック実装: 簡易的なログイン成功シミュレーション
    return new Promise((resolve) => {
        setTimeout(() => {
            // ダミーユーザー情報
            const mockUser = {
                id: 1,
                name: '現役生 3回生',
                email: email,
                role: '現役生',
                enrollYear: '2023年度入学',
            };

            // モックトークンを保存
            localStorage.setItem('access_token', 'mock_token_' + Date.now());
            localStorage.setItem('user', JSON.stringify(mockUser));

            resolve({ success: true, user: mockUser });
        }, 500); // ネットワーク遅延をシミュレート
    });
};

/**
 * 新規登録処理（モック実装）
 * 将来的にKurocoの会員登録APIに接続する想定
 * @param {string} email - メールアドレス
 * @param {string} password - パスワード
 * @param {Object} profile - プロフィール情報
 * @returns {Promise<Object>} ユーザー情報とトークン
 */
export const signup = async (email, password, profile = {}) => {
    // モック実装: 実際のAPI呼び出しはコメントアウト
    /*
    try {
      const response = await authClient.post('/rcms-api/v1/signup', {
        email,
        password,
        ...profile,
      });
      const { access_token, member } = response.data;
      localStorage.setItem('access_token', access_token);
      return { success: true, user: member };
    } catch (error) {
      console.error('Signup failed:', error);
      return { success: false, error: error.message };
    }
    */

    // モック実装
    return new Promise((resolve) => {
        setTimeout(() => {
            const mockUser = {
                id: Date.now(),
                name: profile.name || 'New User',
                email: email,
                role: profile.role || '現役生',
                enrollYear: profile.enrollYear || '2025年度入学',
                interests: profile.interests || [],
            };

            localStorage.setItem('access_token', 'mock_token_' + Date.now());
            localStorage.setItem('user', JSON.stringify(mockUser));

            resolve({ success: true, user: mockUser });
        }, 500);
    });
};

/**
 * ログアウト処理
 */
export const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
};

/**
 * 現在のログイン状態を確認
 * @returns {boolean} ログイン済みかどうか
 */
export const isAuthenticated = () => {
    return !!localStorage.getItem('access_token');
};

/**
 * 学籍番号による本人確認（モック実装）
 * 将来的にKurocoのAPIで学籍番号を検証する想定
 * @param {string} studentId - 学籍番号
 * @returns {Promise<Object>} 検証結果と匿名化された名前
 */
export const verifyStudentId = async (studentId) => {
    // モック実装: 実際のAPI呼び出しはコメントアウト
    /*
    try {
      const response = await authClient.post('/rcms-api/v1/verify-student', {
        student_id: studentId,
      });
      const { masked_name, full_name } = response.data;
      return { success: true, maskedName: masked_name, fullName: full_name };
    } catch (error) {
      console.error('Student ID verification failed:', error);
      return { success: false, error: '学籍番号が見つかりません' };
    }
    */

    // モック実装: サンプルデータ
    const mockStudentDatabase = {
        '2023001234': { fullName: '伊藤悠希', maskedName: 'it**Yu**' },
        '2022005678': { fullName: '田中太郎', maskedName: 'ta**Ta**' },
        '2021009012': { fullName: '佐藤花子', maskedName: 'sa**Ha**' },
        '2024003456': { fullName: '鈴木一郎', maskedName: 'su**Ic**' },
    };

    return new Promise((resolve) => {
        setTimeout(() => {
            const student = mockStudentDatabase[studentId];
            if (student) {
                resolve({
                    success: true,
                    maskedName: student.maskedName,
                    fullName: student.fullName,
                });
            } else {
                resolve({
                    success: false,
                    error: '学籍番号が見つかりません。政策学部に在籍中または在籍していた方のみ登録できます。',
                });
            }
        }, 500); // ネットワーク遅延をシミュレート
    });
};

/**
 * 現在のユーザー情報を取得
 * @returns {Object|null} ユーザー情報
 */
export const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
};
