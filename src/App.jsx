import React, { useState, useEffect, useRef } from 'react';
import {
    MessageSquare, Clock, ThumbsUp, User, Bell, Plus, Home, Hash, LogOut, Menu, ArrowLeft, Send, MoreHorizontal,
    Image as ImageIcon, Video, Link as LinkIcon, Repeat, Share, Heart, Settings, HelpCircle, X, Camera, Mail,
    CheckCircle, ArrowRight, BookOpen, Users, Radio
} from 'lucide-react';

import logo from './assets/logo.png';
import { fetchThreads } from './services/kuroco_api';
import { login, signup, isAuthenticated, logout, verifyStudentId } from './services/auth';

// カラーパレット定義
const COLORS = {
    main: '#7ebf41',
    mainDark: '#6da638',
    mainLight: '#f2f9ec',
    subBg: '#e5ebee',
    subText: '#627a86',
    accent: '#f50000',
};

// オンボーディング用定数
const INTEREST_TAGS = [
    "地域創生", "環境政策", "国際政治", "福祉・社会保障", "NPO/NGO",
    "都市計画", "防災・復興", "経済・産業", "メディア・広報", "ジェンダー",
    "教育", "観光", "法律・行政", "持続可能性", "SDGs"
];

const REFERRAL_SOURCES = [
    "友人・知人の紹介", "先生・大学職員から", "学内ポスター・チラシ",
    "SNS (Instagram/X)", "新入生オリエンテーション", "その他"
];

const ENROLLMENT_YEARS = [
    "2025年度入学", "2024年度入学", "2023年度入学", "2022年度入学", "2021年度入学",
    "2020年度入学", "2019年度入学", "2018年度入学", "2017年度入学", "2016年度入学",
    "2015年度入学", "2014年度入学", "2013年度入学", "2012年度入学", "2011年度入学",
];

// ダミーデータ
const INITIAL_THREADS = [
    {
        id: 1,
        title: "龍谷大学周辺のランチ事情について語ろう",
        author: "2023卒 OB",
        lastUpdated: "10分前",
        likes: 12,
        comments: 5,
        tags: ["深草", "グルメ"],
        isParticipating: true,
        isEvent: false,
    },
    {
        id: 2,
        title: "【ゼミ選択】NPO・地域行政関連のおすすめゼミは？",
        author: "現役生 2回生",
        lastUpdated: "2時間前",
        likes: 24,
        comments: 18,
        tags: ["ゼミ", "相談"],
        isParticipating: false,
        isEvent: false,
    },
    {
        id: 3,
        title: "政策学部の学びを活かせる就職先とは",
        author: "教員 A",
        lastUpdated: "1日前",
        likes: 45,
        comments: 32,
        tags: ["キャリア", "就活"],
        isParticipating: true,
        isEvent: false,
    },
    {
        id: 4,
        title: "【イベント】政策学部20周年記念シンポジウム実況スレ",
        author: "広報委員",
        lastUpdated: "10秒前",
        likes: 120,
        comments: 89,
        tags: ["イベント", "実況"],
        isParticipating: true,
        isEvent: true,
    },
];

const INITIAL_COMMENTS = [
    {
        id: 1,
        user: "2023卒 OB",
        role: "卒業生",
        content: "深草キャンパス近くのあの定食屋、まだあるのかな？唐揚げ定食が懐かしい。",
        time: "2023/10/01 12:00",
        likes: 2,
        isLiked: false,
    },
    {
        id: 2,
        user: "現役生 3回生",
        role: "現役生",
        content: "まだありますよ！値上げしちゃいましたけど、味は変わってないです。",
        time: "2023/10/01 12:15",
        likes: 5,
        isLiked: true,
    },
    {
        id: 3,
        user: "教員 B",
        role: "教員",
        content: "私の時代は裏門の近くに美味しいパン屋があったんですが、ご存知ですか？",
        time: "2023/10/01 13:30",
        likes: 1,
        isLiked: false,
    }
];

const INITIAL_POSTS = [
    {
        id: 1,
        user: "現役生 4回生",
        userId: "@policy_2024",
        content: "卒論の提出期限まであと1ヶ月...！図書館にこもります。誰か差し入れ待ってます😭",
        time: "5分前",
        likes: 3,
        comments: 1,
        reposts: 0,
        isLiked: false,
        isReposted: false,
    },
    {
        id: 2,
        user: "2015卒 OG",
        userId: "@alumni_2015",
        content: "久しぶりに大学近くを通ったら、新しいカフェができてた。今度行ってみようかな。\n#深草 #カフェ",
        image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=1000",
        time: "30分前",
        likes: 8,
        comments: 0,
        reposts: 2,
        isLiked: true,
        isReposted: false,
    },
    {
        id: 3,
        user: "政策学部ニュース",
        userId: "@ryukoku_policy",
        content: "【お知らせ】来週の特別講義について、以下の記事が参考になります。ぜひ予習しておいてください。",
        time: "1時間前",
        likes: 45,
        comments: 2,
        reposts: 12,
        urlPreview: {
            title: "地域公共政策の新たな潮流 - 2024年度特別講義概要",
            domain: "ryukoku.ac.jp",
            image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=500",
            description: "次世代の公共政策における市民参加のあり方について議論します。"
        },
        isLiked: false,
        isReposted: true,
    }
];

export default function App() {
    // ローディング状態を追加
    const [isLoading, setIsLoading] = useState(true);

    const [activeTab, setActiveTab] = useState('threads');
    const [selectedThread, setSelectedThread] = useState(null);

    // 認証State
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showLoginForm, setShowLoginForm] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    // 新規登録用State
    const [studentId, setStudentId] = useState('');
    const [maskedName, setMaskedName] = useState('');
    const [fullName, setFullName] = useState('');
    const [verifyError, setVerifyError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [signupNickname, setSignupNickname] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
    const [signupError, setSignupError] = useState('');

    // オンボーディング用State
    const [showOnboarding, setShowOnboarding] = useState(true);
    const [onboardingStep, setOnboardingStep] = useState(0); // 0: ウェルカム, 1: 学籍番号, 2: 本人確認, 3: ニックネーム・メアド登録, 4: ようこそ, 5: 興味選択, 6: 参照元
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [referralSource, setReferralSource] = useState("");

    // データState
    // Kurocoから取得するため、初期値は空配列に設定。取得失敗時にINITIAL_THREADSを使用
    const [threads, setThreads] = useState([]);

    // APIからデータ取得
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const fetchedThreads = await fetchThreads();
                // 配列かつ中身がある場合のみセット
                if (Array.isArray(fetchedThreads) && fetchedThreads.length > 0) {
                    setThreads(fetchedThreads);
                } else {
                    console.log("No data from API, using dummy data");
                    setThreads(INITIAL_THREADS);
                }
            } catch (error) {
                console.error("Failed to fetch threads, falling back to dummy data:", error);
                setThreads(INITIAL_THREADS);
            } finally {
                setIsLoading(false);
            }
        };

        // ログイン済みの場合のみデータ取得
        if (isAuthenticated()) {
            setIsLoggedIn(true);
            setShowOnboarding(false);
            loadData();
        } else {
            setIsLoading(false);
        }
    }, []);
    const [comments, setComments] = useState(INITIAL_COMMENTS);
    const [posts, setPosts] = useState(INITIAL_POSTS);

    // プロフィールState
    const [myProfile, setMyProfile] = useState({
        name: "現役生 3回生",
        userId: "@policy_student_03",
        bio: "政策学部で地域活性化について学んでいます。趣味はカフェ巡りとサッカー観戦。気軽に絡んでください！",
        enrollmentYear: "2022年度入学",
        avatarColor: COLORS.main,
        avatarImage: null
    });

    // UI State
    const [commentText, setCommentText] = useState('');
    const [timelineText, setTimelineText] = useState('');
    const [filterType, setFilterType] = useState('all');

    // モーダル制御用State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [viewingUser, setViewingUser] = useState(null);
    const [showNewThreadModal, setShowNewThreadModal] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // 新規スレッド作成用State
    const [newThreadTitle, setNewThreadTitle] = useState('');
    const [newThreadContent, setNewThreadContent] = useState('');
    const [newThreadTags, setNewThreadTags] = useState('');

    // 通知データ
    const [notifications, setNotifications] = useState([
        { id: 1, type: 'like', user: '現役生 2回生', content: 'あなたのコメントにいいねしました', time: '5分前', isRead: false },
        { id: 2, type: 'comment', user: '教員 A', content: '「政策学部の学びを活かせる就職先とは」に新しいコメントがあります', time: '1時間前', isRead: false },
    ]);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const avatarInputRef = useRef(null);

    // Functions
    const toggleInterest = (interest) => {
        if (selectedInterests.includes(interest)) {
            setSelectedInterests(selectedInterests.filter(i => i !== interest));
        } else {
            setSelectedInterests([...selectedInterests, interest]);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        const result = await login(loginEmail, loginPassword);
        if (result.success) {
            setIsLoggedIn(true);
            setShowOnboarding(false);
            setShowLoginForm(false);
            // データ再取得
            window.location.reload();
        } else {
            setLoginError('ログインに失敗しました');
        }
    };

    const handleSignupStart = () => {
        // 新規登録フローに進む（学籍番号入力から開始）
        setOnboardingStep(1);
    };

    const handleVerifyStudentId = async () => {
        setVerifyError('');
        setIsVerifying(true);
        const result = await verifyStudentId(studentId);
        setIsVerifying(false);

        if (result.success) {
            setMaskedName(result.maskedName);
            setFullName(result.fullName);
            setOnboardingStep(2); // 本人確認画面へ
        } else {
            setVerifyError(result.error);
        }
    };

    const handleConfirmIdentity = () => {
        // 本人確認OK → メールアドレス・パスワード登録へ
        setOnboardingStep(3);
    };

    const handleCompleteSignup = async (e) => {
        e.preventDefault();
        setSignupError('');

        // パスワード確認
        if (signupPassword !== signupPasswordConfirm) {
            setSignupError('パスワードが一致しません');
            return;
        }

        // 新規登録実行
        const result = await signup(signupEmail, signupPassword, {
            name: signupNickname || fullName, // ニックネームを優先的に使用
            studentId: studentId,
        });

        if (result.success) {
            // ようこそ画面（Step 4）へ
            setOnboardingStep(4);
        } else {
            setSignupError('登録に失敗しました');
        }
    };

    const handleNextStep = () => {
        if (onboardingStep < 6) {
            setOnboardingStep(onboardingStep + 1);
        } else {
            // 最終ステップ完了時、メイン画面へ
            setIsLoggedIn(true);
            setShowOnboarding(false);
            window.location.reload();
        }
    };

    const handleLogout = () => {
        logout();
        setIsLoggedIn(false);
        setShowOnboarding(true);
        setOnboardingStep(0);
        setShowLogoutConfirm(false);
    };

    const openThread = (thread) => {
        setSelectedThread(thread);
        setComments(INITIAL_COMMENTS);
    };

    const closeThread = () => {
        setSelectedThread(null);
    };

    const openProfile = () => {
        setActiveTab('profile');
        setSelectedThread(null);
    };

    const handleUserClick = (e, userName) => {
        e.stopPropagation();
        if (userName === myProfile.name) {
            openProfile();
            return;
        }
        setViewingUser({
            name: userName,
            userId: `@user_${Math.floor(Math.random() * 1000)}`,
            bio: "これはモックアップのプロフィールです。実際にはユーザーIDに基づいた情報が表示されます。",
            enrollmentYear: "202X年度入学",
            role: userName.includes("卒") ? "卒業生" : userName.includes("教員") ? "教員" : "現役生",
            avatarColor: userName.includes("卒") ? 'bg-emerald-500' : userName.includes("教員") ? 'bg-amber-500' : 'bg-indigo-500'
        });
    };

    const handleUpdateProfile = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        setMyProfile({
            ...myProfile,
            name: formData.get('name'),
            bio: formData.get('bio'),
            enrollmentYear: formData.get('enrollmentYear'),
        });
        setIsEditingProfile(false);
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setMyProfile({ ...myProfile, avatarImage: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCreateThread = () => {
        if (!newThreadTitle.trim()) return;

        const newThread = {
            id: threads.length + 1,
            title: newThreadTitle,
            author: myProfile.name,
            lastUpdated: "たった今",
            likes: 0,
            comments: 0,
            tags: newThreadTags.split(',').map(t => t.trim()).filter(t => t),
            isParticipating: true,
            isEvent: false,
        };

        setThreads([newThread, ...threads]);
        setNewThreadTitle('');
        setNewThreadContent('');
        setNewThreadTags('');
        setShowNewThreadModal(false);
    };

    const handlePostComment = () => {
        if (!commentText.trim()) return;

        const newComment = {
            id: comments.length + 1,
            user: myProfile.name,
            role: "現役生",
            content: commentText,
            time: new Date().toLocaleString('ja-JP'),
            likes: 0,
            isLiked: false,
        };

        setComments([...comments, newComment]);
        setCommentText('');
    };

    const handlePostTimeline = () => {
        if (!timelineText.trim()) return;

        const newPost = {
            id: posts.length + 1,
            user: myProfile.name,
            userId: myProfile.userId,
            content: timelineText,
            time: "たった今",
            likes: 0,
            comments: 0,
            reposts: 0,
            isLiked: false,
            isReposted: false,
        };

        setPosts([newPost, ...posts]);
        setTimelineText('');
    };

    const getFilteredThreads = () => {
        switch (filterType) {
            case 'participating':
                return threads.filter(t => t.isParticipating);
            case 'event':
                return threads.filter(t => t.isEvent || t.tags.includes('イベント'));
            default:
                return threads;
        }
    };

    const togglePostLike = (postId) => {
        setPosts(posts.map(post => {
            if (post.id === postId) {
                return {
                    ...post,
                    isLiked: !post.isLiked,
                    likes: post.isLiked ? post.likes - 1 : post.likes + 1
                };
            }
            return post;
        }));
    };

    const togglePostRepost = (postId) => {
        setPosts(posts.map(post => {
            if (post.id === postId) {
                return {
                    ...post,
                    isReposted: !post.isReposted,
                    reposts: post.isReposted ? post.reposts - 1 : post.reposts + 1
                };
            }
            return post;
        }));
    };

    const toggleCommentLike = (commentId) => {
        setComments(comments.map(comment => {
            if (comment.id === commentId) {
                return {
                    ...comment,
                    isLiked: !comment.isLiked,
                    likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
                };
            }
            return comment;
        }));
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (selectedThread) scrollToBottom();
    }, [selectedThread, comments]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // オンボーディング・ログイン画面
    if (showOnboarding) {
        return (
            <div className="flex flex-col h-screen font-sans max-w-md mx-auto shadow-2xl overflow-hidden relative"
                style={{ background: `linear-gradient(135deg, ${COLORS.mainLight} 0%, #ffffff 50%, ${COLORS.mainLight} 100%)` }}>

                {/* ウェルカム画面 (Step 0) */}
                {onboardingStep === 0 && (
                    <div className="flex-1 flex flex-col p-8 animate-in fade-in duration-700">
                        <div className="flex-1 flex flex-col justify-center items-center text-center">
                            {/* ロゴとアニメーション */}
                            <div className="mb-8 animate-in zoom-in duration-1000">
                                <img src={logo} alt="SOTOTUNA" className="h-32 mb-4 drop-shadow-xl" />
                                <p className="text-sm font-bold text-gray-500 tracking-widest animate-pulse">WEAK TIES, NEW VALUES</p>
                            </div>

                            <div className="space-y-4 text-gray-700 mb-12">
                                <div className="bg-white/70 backdrop-blur-sm p-5 rounded-2xl shadow-lg transform hover:scale-105 transition-transform">
                                    <h3 className="font-bold text-lg mb-2 flex items-center justify-center gap-2">
                                        <Users size={22} style={{ color: COLORS.main }} />
                                        つながる
                                    </h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        現役生・卒業生・教員。政策学部の「緩やかなつながり」が新しい可能性を広げます。
                                    </p>
                                </div>

                                <div className="bg-white/70 backdrop-blur-sm p-5 rounded-2xl shadow-lg transform hover:scale-105 transition-transform">
                                    <h3 className="font-bold text-lg mb-2 flex items-center justify-center gap-2">
                                        <MessageSquare size={22} style={{ color: COLORS.main }} />
                                        語り合う
                                    </h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        興味のあるテーマで語り合い、日常の気づきを共有しましょう。
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ログイン・新規登録ボタン */}
                        {!showLoginForm ? (
                            <div className="space-y-3 pb-4">
                                <button
                                    onClick={handleSignupStart}
                                    className="w-full py-4 rounded-full text-white font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                                    style={{ backgroundColor: COLORS.main }}
                                >
                                    新規登録（はじめる） <ArrowRight size={20} />
                                </button>
                                <button
                                    onClick={() => setShowLoginForm(true)}
                                    className="w-full py-4 rounded-full text-gray-700 font-bold border-2 hover:bg-white/50 transition-all transform hover:scale-105"
                                    style={{ borderColor: COLORS.main }}
                                >
                                    ログイン
                                </button>
                            </div>
                        ) : (
                            // ログインフォーム
                            <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-xl animate-in slide-in-from-bottom duration-300">
                                <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.main }}>ログイン</h2>
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">メールアドレス</label>
                                        <input
                                            type="email"
                                            value={loginEmail}
                                            onChange={(e) => setLoginEmail(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                                            style={{ '--tw-ring-color': COLORS.main }}
                                            placeholder="email@example.com"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">パスワード</label>
                                        <input
                                            type="password"
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                                            style={{ '--tw-ring-color': COLORS.main }}
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                    {loginError && (
                                        <p className="text-sm text-red-600">{loginError}</p>
                                    )}
                                    <button
                                        type="submit"
                                        className="w-full py-3.5 rounded-full text-white font-bold shadow-md hover:opacity-90 transition-all"
                                        style={{ backgroundColor: COLORS.main }}
                                    >
                                        ログイン
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowLoginForm(false)}
                                        className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                    >
                                        戻る
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 1: 学籍番号入力 */}
                {onboardingStep === 1 && (
                    <div className="flex-1 flex flex-col p-8 animate-in fade-in duration-500 bg-white">
                        <div className="flex-1 flex flex-col justify-center items-center">
                            <img src={logo} alt="SOTOTUNA" className="h-20 mb-6" />
                            <h2 className="text-xl font-bold mb-2 text-gray-800">新規登録</h2>
                            <p className="text-sm text-gray-500 mb-8">
                                政策学部に在籍中または在籍していた方のみ登録できます
                            </p>

                            <div className="w-full max-w-sm">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">学籍番号</label>
                                <input
                                    type="text"
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 mb-2"
                                    style={{ '--tw-ring-color': COLORS.main }}
                                    placeholder="2023001234"
                                    maxLength={10}
                                />
                                {verifyError && (
                                    <p className="text-sm text-red-600 mb-4">{verifyError}</p>
                                )}
                                <button
                                    onClick={handleVerifyStudentId}
                                    disabled={!studentId || isVerifying}
                                    className="w-full py-3.5 rounded-full text-white font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50"
                                    style={{ backgroundColor: COLORS.main }}
                                >
                                    {isVerifying ? '確認中...' : '次へ'}
                                </button>
                                <button
                                    onClick={() => setOnboardingStep(0)}
                                    className="w-full py-2 mt-3 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    戻る
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: 本人確認 */}
                {onboardingStep === 2 && (
                    <div className="flex-1 flex flex-col p-8 animate-in fade-in duration-500 bg-white">
                        <div className="flex-1 flex flex-col justify-center items-center text-center">
                            <img src={logo} alt="SOTOTUNA" className="h-20 mb-6" />
                            <h2 className="text-xl font-bold mb-2 text-gray-800">本人確認</h2>
                            <p className="text-sm text-gray-500 mb-8">
                                以下の名前はあなたですか？
                            </p>

                            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-8 rounded-2xl mb-8 shadow-lg">
                                <p className="text-3xl font-black tracking-widest" style={{ color: COLORS.main }}>
                                    {maskedName}
                                </p>
                            </div>

                            <div className="w-full max-w-sm space-y-3">
                                <button
                                    onClick={handleConfirmIdentity}
                                    className="w-full py-3.5 rounded-full text-white font-bold shadow-md hover:opacity-90 transition-all"
                                    style={{ backgroundColor: COLORS.main }}
                                >
                                    はい、この名前は自分です
                                </button>
                                <button
                                    onClick={() => {
                                        setOnboardingStep(1);
                                        setStudentId('');
                                        setMaskedName('');
                                    }}
                                    className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    違います（学籍番号を再入力）
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: メールアドレス・パスワード登録 */}
                {onboardingStep === 3 && (
                    <div className="flex-1 flex flex-col p-8 animate-in fade-in duration-500 bg-white overflow-y-auto">
                        <div className="flex-1 flex flex-col justify-center">
                            <img src={logo} alt="SOTOTUNA" className="h-16 mb-4 mx-auto" />
                            <h2 className="text-xl font-bold mb-2 text-gray-800 text-center">アカウント登録</h2>
                            <p className="text-sm text-gray-500 mb-6 text-center">
                                ログイン用のメールアドレスとパスワードを設定してください
                            </p>

                            <form onSubmit={handleCompleteSignup} className="space-y-4 max-w-sm mx-auto w-full">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">ニックネーム</label>
                                    <input
                                        type="text"
                                        value={signupNickname}
                                        onChange={(e) => setSignupNickname(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                                        style={{ '--tw-ring-color': COLORS.main }}
                                        placeholder="表示名を入力"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">メールアドレス</label>
                                    <input
                                        type="email"
                                        value={signupEmail}
                                        onChange={(e) => setSignupEmail(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                                        style={{ '--tw-ring-color': COLORS.main }}
                                        placeholder="email@example.com"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">パスワード</label>
                                    <input
                                        type="password"
                                        value={signupPassword}
                                        onChange={(e) => setSignupPassword(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                                        style={{ '--tw-ring-color': COLORS.main }}
                                        placeholder="8文字以上"
                                        minLength={8}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">パスワード（確認）</label>
                                    <input
                                        type="password"
                                        value={signupPasswordConfirm}
                                        onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                                        style={{ '--tw-ring-color': COLORS.main }}
                                        placeholder="もう一度入力"
                                        minLength={8}
                                        required
                                    />
                                </div>
                                {signupError && (
                                    <p className="text-sm text-red-600">{signupError}</p>
                                )}
                                <button
                                    type="submit"
                                    className="w-full py-3.5 rounded-full text-white font-bold shadow-md hover:opacity-90 transition-all"
                                    style={{ backgroundColor: COLORS.main }}
                                >
                                    登録してオンボーディングへ
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Step 4: ようこそ（説明） */}
                {onboardingStep === 4 && (
                    <div className="flex-1 flex flex-col p-8 animate-in fade-in duration-500 bg-white">
                        <div className="flex-1 flex flex-col justify-center items-center text-center">
                            <img src={logo} alt="SOTOTUNA" className="h-20 mb-6" />
                            <h2 className="text-xl font-bold mb-2 text-gray-800">SOTOTUNAへようこそ！</h2>
                            <p className="text-sm text-gray-500 mb-8">
                                登録が完了しました。SOTOTUNAの使い方を簡単に説明します。
                            </p>

                            <div className="space-y-6 text-gray-700">
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <h3 className="font-bold text-lg mb-2 flex items-center justify-center gap-2">
                                        <Users size={20} style={{ color: COLORS.main }} />
                                        つながる
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        現役生・卒業生・教員。<br />
                                        政策学部の「緩やかなつながり」が<br />
                                        あなたの新しい可能性を広げます。
                                    </p>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <h3 className="font-bold text-lg mb-2 flex items-center justify-center gap-2">
                                        <MessageSquare size={20} style={{ color: COLORS.main }} />
                                        語り合う
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        興味のあるテーマでスレッドを立てたり<br />
                                        日常の気づきをタイムラインで共有。<br />
                                        ここだけの話、しませんか？
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleNextStep}
                            className="w-full py-3.5 rounded-full text-white font-bold shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2 mt-8"
                            style={{ backgroundColor: COLORS.main }}
                        >
                            次へ <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {/* Step 5: 興味選択 */}
                {onboardingStep === 5 && (
                    <div className="flex-1 flex flex-col p-6 animate-in slide-in-from-right duration-300 bg-white">
                        <div className="flex-1">
                            <div className="mb-6">
                                <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded">STEP 1/2</span>
                                <h2 className="text-xl font-bold mt-2 text-gray-800">関心のある分野は？</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    興味のあるトピックを選ぶと、<br />関連するスレッドが見つかりやすくなります。
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {INTEREST_TAGS.map((tag) => {
                                    const isSelected = selectedInterests.includes(tag);
                                    return (
                                        <button
                                            key={tag}
                                            onClick={() => toggleInterest(tag)}
                                            className={`px-4 py-2.5 rounded-full text-sm font-bold border transition-all ${isSelected ? 'text-white border-transparent shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                            style={isSelected ? { backgroundColor: COLORS.main } : {}}
                                        >
                                            {tag}
                                            {isSelected && <CheckCircle size={14} className="inline ml-1.5 -mt-0.5" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <button
                            onClick={handleNextStep}
                            disabled={selectedInterests.length === 0}
                            className="w-full py-3.5 rounded-full text-white font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4"
                            style={{ backgroundColor: COLORS.main }}
                        >
                            次へ
                        </button>
                        <p className="text-center mt-3">
                            <button onClick={handleNextStep} className="text-sm text-gray-400 hover:text-gray-600">スキップする</button>
                        </p>
                    </div>
                )}

                {/* Step 6: 参照元 */}
                {onboardingStep === 6 && (
                    <div className="flex-1 flex flex-col p-6 animate-in slide-in-from-right duration-300 bg-white">
                        <div className="flex-1">
                            <div className="mb-6">
                                <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded">STEP 2/2</span>
                                <h2 className="text-xl font-bold mt-2 text-gray-800">SOTOTUNAをどこで知りましたか？</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    今後の運営の参考にさせていただきます。<br />（ひとつだけ選択）
                                </p>
                            </div>

                            <div className="space-y-3">
                                {REFERRAL_SOURCES.map((source) => {
                                    const isSelected = referralSource === source;
                                    return (
                                        <button
                                            key={source}
                                            onClick={() => setReferralSource(source)}
                                            className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all flex items-center justify-between ${isSelected ? 'border-2 bg-green-50' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                            style={{ borderColor: isSelected ? COLORS.main : '' }}
                                        >
                                            <span className={`text-sm font-bold ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>{source}</span>
                                            <div
                                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-transparent' : 'border-gray-300'}`}
                                                style={isSelected ? { backgroundColor: COLORS.main } : {}}
                                            >
                                                {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <button
                            onClick={handleNextStep}
                            disabled={!referralSource}
                            className="w-full py-3.5 rounded-full text-white font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4"
                            style={{ backgroundColor: COLORS.main }}
                        >
                            はじめる
                        </button>
                    </div>
                )}



            </div>
        );
    }

    // メインアプリ画面
    return (
        <div
            className="flex flex-col h-screen font-sans max-w-md mx-auto shadow-2xl overflow-hidden relative"
            style={{ backgroundColor: COLORS.subBg, color: '#333' }}
        >

            {/* ヘッダーエリア */}
            <header className="bg-white/90 backdrop-blur-sm shadow-sm shrink-0 z-20 sticky top-0">
                <div className="px-4 py-3 flex justify-between items-center">
                    {selectedThread ? (
                        <div className="flex items-center gap-3">
                            <button onClick={closeThread} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                                <ArrowLeft size={20} style={{ color: COLORS.subText }} />
                            </button>
                            <h1 className="text-lg font-bold truncate max-w-[200px]" style={{ color: '#333' }}>{selectedThread.title}</h1>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <img src={logo} alt="SOTOTUNA" className="h-8 object-contain" />
                            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>}
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        {!selectedThread && (
                            <>
                                <button onClick={() => setShowNotifications(true)} className="relative cursor-pointer hover:bg-gray-100 p-2 rounded-full transition-colors">
                                    <Bell size={24} style={{ color: COLORS.subText }} />
                                    {unreadCount > 0 && (
                                        <span
                                            className="absolute top-1 right-1.5 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white"
                                            style={{ backgroundColor: COLORS.accent }}
                                        >
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>

                                <button
                                    onClick={openProfile}
                                    className={`p-1 rounded-full border-2 transition-all ${activeTab === 'profile' ? 'ring-2 ring-offset-2' : ''}`}
                                    style={{
                                        borderColor: activeTab === 'profile' ? COLORS.main : 'transparent',
                                        '--tw-ring-color': COLORS.main
                                    }}
                                >
                                    {myProfile.avatarImage ? (
                                        <img src={myProfile.avatarImage} alt="プロフィール" className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                                            style={{ backgroundColor: COLORS.main }}
                                        >
                                            私
                                        </div>
                                    )}
                                </button>
                            </>
                        )}

                        {selectedThread && (
                            <button className="p-2 rounded-full hover:bg-gray-100"><MoreHorizontal size={24} style={{ color: COLORS.subText }} /></button>
                        )}
                    </div>
                </div>

                {!selectedThread && (
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('threads')}
                            className={`flex-1 py-3 text-sm font-bold text-center border-b-[3px] transition-colors relative hover:bg-gray-50`}
                            style={{
                                borderColor: activeTab === 'threads' ? COLORS.main : 'transparent',
                                color: activeTab === 'threads' ? COLORS.main : COLORS.subText
                            }}
                        >
                            スレッド
                        </button>
                        <button
                            onClick={() => setActiveTab('timeline')}
                            className={`flex-1 py-3 text-sm font-bold text-center border-b-[3px] transition-colors relative hover:bg-gray-50`}
                            style={{
                                borderColor: activeTab === 'timeline' ? COLORS.main : 'transparent',
                                color: activeTab === 'timeline' ? COLORS.main : COLORS.subText
                            }}
                        >
                            タイムライン
                        </button>
                    </div>
                )}
            </header>

            {/* メインコンテンツエリア */}
            <main className="flex-1 overflow-y-auto bg-white relative scroll-smooth" style={{ backgroundColor: COLORS.subBg }}>

                {/* スレッド詳細画面 */}
                {selectedThread ? (
                    <div className="flex flex-col min-h-full" style={{ backgroundColor: COLORS.subBg }}>
                        <div className="p-4 space-y-4 pb-24">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {selectedThread.tags.map(tag => (
                                        <span key={tag} className="text-xs px-2 py-1 rounded-md font-medium" style={{ backgroundColor: COLORS.mainLight, color: COLORS.main }}>
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                                <h2 className="text-lg font-bold mb-2 text-gray-900">{selectedThread.title}</h2>
                                <div className="text-xs flex justify-between items-center border-t border-gray-100 pt-2 mt-2" style={{ color: COLORS.subText }}>
                                    <span className="flex items-center gap-1"><User size={12} /> {selectedThread.author}</span>
                                    <span className="flex items-center gap-1"><Clock size={12} /> {selectedThread.lastUpdated}</span>
                                </div>
                            </div>

                            {comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <button
                                        onClick={(e) => handleUserClick(e, comment.user)}
                                        className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-sm hover:opacity-80 transition-opacity
                                        ${comment.role === '卒業生' ? 'bg-emerald-500' : comment.role === '教員' ? 'bg-amber-500' : 'bg-gray-500'}`}
                                        style={comment.role === '現役生' ? { backgroundColor: COLORS.main } : {}}
                                    >
                                        {comment.user.slice(0, 2)}
                                    </button>
                                    <div className="flex-1">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span
                                                onClick={(e) => handleUserClick(e, comment.user)}
                                                className="font-bold text-sm text-gray-800 cursor-pointer hover:underline"
                                            >
                                                {comment.user}
                                            </span>
                                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded font-medium">{comment.role}</span>
                                            <span className="text-xs ml-auto" style={{ color: COLORS.subText }}>{comment.time.split(' ')[1]}</span>
                                        </div>
                                        <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 text-sm text-gray-800 leading-relaxed">
                                            {comment.content}
                                        </div>
                                        <div className="flex gap-4 mt-1 ml-1">
                                            <button
                                                onClick={() => toggleCommentLike(comment.id)}
                                                className={`text-xs flex items-center gap-1 transition-colors ${comment.isLiked ? 'font-bold' : ''}`}
                                                style={{ color: comment.isLiked ? COLORS.main : COLORS.subText }}
                                            >
                                                <ThumbsUp size={12} fill={comment.isLiked ? COLORS.main : 'none'} /> {comment.likes}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 safe-area-pb">
                            <div className="flex items-end gap-2 bg-gray-100 rounded-2xl px-3 py-2">
                                <div className="flex gap-2 pb-1.5">
                                    <button onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-gray-600 transition-colors"><ImageIcon size={20} /></button>
                                    <button className="text-gray-400 hover:text-gray-600 transition-colors"><LinkIcon size={20} /></button>
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
                                </div>
                                <textarea
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handlePostComment();
                                        }
                                    }}
                                    placeholder="コメントを入力..."
                                    className="flex-1 bg-transparent text-sm focus:outline-none resize-none max-h-24 py-1.5"
                                    rows={1}
                                />
                                <button
                                    onClick={handlePostComment}
                                    className="p-2 mb-0.5 text-white rounded-full transition-all disabled:opacity-50 disabled:scale-90 shadow-sm"
                                    style={{ backgroundColor: COLORS.main }}
                                    disabled={!commentText}
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* スレッド一覧タブ */}
                        {activeTab === 'threads' && (
                            <div className="p-4 space-y-4 min-h-full" style={{ backgroundColor: COLORS.subBg }}>
                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                    <button onClick={() => setFilterType('all')} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shadow-sm transition-all ${filterType === 'all' ? 'text-white' : 'bg-white border'}`} style={filterType === 'all' ? { backgroundColor: COLORS.main } : { borderColor: '#e5e7eb', color: COLORS.subText }}>すべて</button>
                                    <button onClick={() => setFilterType('participating')} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shadow-sm transition-all ${filterType === 'participating' ? 'text-white' : 'bg-white border'}`} style={filterType === 'participating' ? { backgroundColor: COLORS.main } : { borderColor: '#e5e7eb', color: COLORS.subText }}>参加中</button>
                                    <button onClick={() => setFilterType('event')} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shadow-sm transition-all ${filterType === 'event' ? 'text-white' : 'bg-white border'}`} style={filterType === 'event' ? { backgroundColor: COLORS.main } : { borderColor: '#e5e7eb', color: COLORS.subText }}>イベント中のテーマ</button>
                                </div>

                                {getFilteredThreads().map((thread) => (
                                    <div key={thread.id} onClick={() => openThread(thread)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:scale-[0.98] transition-all cursor-pointer hover:shadow-md">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-lg leading-snug text-gray-800">{thread.title}</h3>
                                            {thread.isParticipating && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold whitespace-nowrap ml-2">参加中</span>}
                                        </div>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {thread.tags.map(tag => <span key={tag} className="text-xs px-2 py-1 rounded-md font-medium" style={{ backgroundColor: COLORS.mainLight, color: COLORS.main }}>#{tag}</span>)}
                                        </div>
                                        <div className="flex items-center justify-between text-xs sm:text-sm border-t border-gray-50 pt-3" style={{ color: COLORS.subText }}>
                                            <div className="flex items-center gap-3">
                                                <span onClick={(e) => handleUserClick(e, thread.author)} className="flex items-center gap-1 hover:text-gray-800"><User size={14} /> {thread.author}</span>
                                                <span className="flex items-center gap-1"><Clock size={14} /> {thread.lastUpdated}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="flex items-center gap-1"><MessageSquare size={16} /> {thread.comments}</span>
                                                <span className="flex items-center gap-1"><ThumbsUp size={16} /> {thread.likes}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={() => setShowNewThreadModal(true)}
                                    className="fixed bottom-6 right-4 text-white rounded-full shadow-lg hover:scale-105 transition-all z-20 flex items-center justify-center"
                                    style={{ backgroundColor: COLORS.main, width: '60px', height: '60px' }}
                                >
                                    <Plus size={32} />
                                </button>
                            </div>
                        )}

                        {/* タイムラインタブ */}
                        {activeTab === 'timeline' && (
                            <div className="pb-20 bg-white">
                                <div className="border-b border-gray-100 p-4">
                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold" style={{ backgroundColor: COLORS.mainLight, color: COLORS.main }}>私</div>
                                        <div className="flex-1">
                                            <textarea value={timelineText} onChange={(e) => setTimelineText(e.target.value)} placeholder="今どうしてる？（政策学部限定）" className="w-full text-base placeholder-gray-400 focus:outline-none resize-none h-20" />
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex gap-3" style={{ color: COLORS.main }}>
                                                    <button className="hover:bg-gray-50 p-1.5 rounded-full transition-colors"><ImageIcon size={20} /></button>
                                                    <button className="hover:bg-gray-50 p-1.5 rounded-full transition-colors"><Video size={20} /></button>
                                                    <button className="hover:bg-gray-50 p-1.5 rounded-full transition-colors"><LinkIcon size={20} /></button>
                                                </div>
                                                <button onClick={handlePostTimeline} disabled={!timelineText} className="text-white px-4 py-1.5 rounded-full font-bold text-sm disabled:opacity-50 transition-colors" style={{ backgroundColor: COLORS.main }}>ポストする</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {posts.map((post) => (
                                    <div key={post.id} className="border-b border-gray-100 p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                                        <div className="flex gap-3">
                                            <button
                                                onClick={(e) => handleUserClick(e, post.user)}
                                                className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-gray-500 hover:opacity-80 transition-opacity"
                                            >
                                                {post.user[0]}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1 mb-0.5">
                                                    <span
                                                        onClick={(e) => handleUserClick(e, post.user)}
                                                        className="font-bold text-gray-900 truncate hover:underline"
                                                    >
                                                        {post.user}
                                                    </span>
                                                    <span className="text-sm truncate" style={{ color: COLORS.subText }}>{post.userId}</span>
                                                    <span className="text-gray-400 text-sm">·</span>
                                                    <span className="text-sm" style={{ color: COLORS.subText }}>{post.time}</span>
                                                </div>
                                                <p className="text-gray-900 text-base leading-snug whitespace-pre-wrap mb-3">{post.content}</p>
                                                {post.image && <div className="mb-3 rounded-2xl overflow-hidden border border-gray-100"><img src={post.image} alt="投稿画像" className="w-full h-auto object-cover max-h-80" /></div>}
                                                {post.urlPreview && (
                                                    <div className="mb-3 rounded-2xl overflow-hidden border border-gray-200 hover:bg-gray-50 transition-colors">
                                                        {post.urlPreview.image && <div className="h-32 w-full bg-gray-100 overflow-hidden"><img src={post.urlPreview.image} alt="OGP" className="w-full h-full object-cover" /></div>}
                                                        <div className="p-3">
                                                            <p className="text-xs text-gray-500 mb-0.5">{post.urlPreview.domain}</p>
                                                            <p className="text-sm font-bold text-gray-900 leading-tight mb-1">{post.urlPreview.title}</p>
                                                            <p className="text-xs text-gray-500 line-clamp-1">{post.urlPreview.description}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex justify-between max-w-xs mt-2" style={{ color: COLORS.subText }}>
                                                    <button className="group flex items-center gap-1 text-sm">
                                                        <div className="p-2 rounded-full group-hover:bg-gray-100 transition-colors group-hover:text-green-600"><MessageSquare size={18} /></div>
                                                        <span className="text-xs group-hover:text-green-600">{post.comments > 0 ? post.comments : ''}</span>
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); togglePostRepost(post.id); }} className={`group flex items-center gap-1 text-sm transition-colors ${post.isReposted ? 'text-green-600' : ''}`}>
                                                        <div className="p-2 rounded-full group-hover:bg-green-50 transition-colors group-hover:text-green-600"><Repeat size={18} /></div>
                                                        <span className={`text-xs group-hover:text-green-600 ${post.isReposted ? 'font-bold' : ''}`}>{post.reposts > 0 ? post.reposts : ''}</span>
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); togglePostLike(post.id); }} className={`group flex items-center gap-1 text-sm transition-colors ${post.isLiked ? 'text-pink-500' : ''}`}>
                                                        <div className="p-2 rounded-full group-hover:bg-pink-50 transition-colors group-hover:text-pink-500"><Heart size={18} fill={post.isLiked ? "currentColor" : "none"} /></div>
                                                        <span className={`text-xs group-hover:text-pink-500 ${post.isLiked ? 'font-bold' : ''}`}>{post.likes > 0 ? post.likes : ''}</span>
                                                    </button>
                                                    <button className="group flex items-center gap-1 text-sm">
                                                        <div className="p-2 rounded-full group-hover:bg-gray-100 transition-colors group-hover:text-green-600"><Share size={18} /></div>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* マイページ */}
                        {activeTab === 'profile' && (
                            <div className="p-4 space-y-4 animate-in fade-in duration-300">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-gray-200 to-gray-300 z-0"></div>
                                    <div className="relative z-10 pt-10">
                                        {myProfile.avatarImage ? (
                                            <img src={myProfile.avatarImage} alt="プロフィール" className="w-24 h-24 rounded-full mx-auto border-4 border-white shadow-md object-cover mb-3" />
                                        ) : (
                                            <div
                                                className="w-24 h-24 rounded-full mx-auto border-4 border-white shadow-md flex items-center justify-center text-3xl font-bold text-white mb-3"
                                                style={{ backgroundColor: COLORS.main }}
                                            >
                                                私
                                            </div>
                                        )}
                                        <h2 className="text-xl font-bold text-gray-900">{myProfile.name}</h2>
                                        <p className="text-sm mb-2" style={{ color: COLORS.subText }}>{myProfile.userId}</p>
                                        <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full mb-4">
                                            {myProfile.enrollmentYear}
                                        </span>

                                        <p className="text-sm text-gray-600 mb-6 px-4 whitespace-pre-wrap">
                                            {myProfile.bio}
                                        </p>

                                        <button
                                            onClick={() => setIsEditingProfile(true)}
                                            className="w-full py-2 rounded-full border border-gray-300 font-bold text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            プロフィールを編集
                                        </button>
                                    </div>
                                </div>

                                {/* 設定メニュー */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    <button onClick={() => setShowSettings(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100 transition-colors text-left">
                                        <div className="flex items-center gap-3">
                                            <Settings size={20} style={{ color: COLORS.subText }} />
                                            <span className="font-medium text-gray-700">アカウント設定</span>
                                        </div>
                                        <span className="text-gray-400">›</span>
                                    </button>
                                    <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100 transition-colors text-left">
                                        <div className="flex items-center gap-3">
                                            <Bell size={20} style={{ color: COLORS.subText }} />
                                            <span className="font-medium text-gray-700">通知設定</span>
                                        </div>
                                        <span className="text-gray-400">›</span>
                                    </button>
                                    <button onClick={() => setShowHelp(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100 transition-colors text-left">
                                        <div className="flex items-center gap-3">
                                            <HelpCircle size={20} style={{ color: COLORS.subText }} />
                                            <span className="font-medium text-gray-700">ヘルプ・お問い合わせ</span>
                                        </div>
                                        <span className="text-gray-400">›</span>
                                    </button>
                                    <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors text-left group">
                                        <div className="flex items-center gap-3 text-red-500">
                                            <LogOut size={20} />
                                            <span className="font-medium">ログアウト</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* モーダル: プロフィール編集 */}
            {isEditingProfile && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <h3 className="font-bold text-lg">プロフィールを編集</h3>
                            <button onClick={() => setIsEditingProfile(false)} className="p-1 rounded-full hover:bg-gray-100">
                                <X size={24} className="text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="p-4 overflow-y-auto max-h-[70vh]">
                            <div className="flex justify-center mb-6 relative">
                                <div
                                    onClick={() => avatarInputRef.current?.click()}
                                    className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white relative overflow-hidden group cursor-pointer"
                                    style={{ backgroundColor: COLORS.main }}
                                >
                                    {myProfile.avatarImage ? (
                                        <img src={myProfile.avatarImage} alt="プロフィール" className="w-full h-full object-cover" />
                                    ) : (
                                        '私'
                                    )}
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera size={24} className="text-white" />
                                    </div>
                                </div>
                                <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1">名前</label>
                                <input
                                    name="name"
                                    type="text"
                                    defaultValue={myProfile.name}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1">自己紹介 (一言)</label>
                                <textarea
                                    name="bio"
                                    defaultValue={myProfile.bio}
                                    rows={3}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-700 mb-1">入学年度</label>
                                <div className="relative">
                                    <select
                                        name="enrollmentYear"
                                        defaultValue={myProfile.enrollmentYear}
                                        className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        {ENROLLMENT_YEARS.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 mt-1 ml-1">※この情報はプロフィールに表示されます。</p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditingProfile(false)}
                                    className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-full font-bold text-sm hover:bg-gray-200"
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 text-white rounded-full font-bold text-sm hover:opacity-90"
                                    style={{ backgroundColor: COLORS.main }}
                                >
                                    保存する
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* モーダル: 他ユーザープロフィール閲覧 */}
            {viewingUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200"
                    onClick={() => setViewingUser(null)}
                >
                    <div
                        className="bg-white w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="h-20 bg-gradient-to-r from-gray-200 to-gray-300 relative">
                            <button
                                onClick={() => setViewingUser(null)}
                                className="absolute top-2 right-2 p-1 bg-black/20 rounded-full text-white hover:bg-black/40"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="px-6 pb-6 pt-0 relative text-center">
                            <div
                                className={`w-20 h-20 rounded-full mx-auto border-4 border-white shadow-md flex items-center justify-center text-2xl font-bold text-white mb-3 -mt-10 ${viewingUser.avatarColor || 'bg-gray-500'}`}
                            >
                                {viewingUser.name.slice(0, 2)}
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">{viewingUser.name}</h2>
                            <p className="text-xs mb-2" style={{ color: COLORS.subText }}>{viewingUser.userId}</p>
                            <div className="flex justify-center gap-2 mb-4">
                                <span className="inline-block bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">
                                    {viewingUser.enrollmentYear}
                                </span>
                                <span className="inline-block bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">
                                    {viewingUser.role}
                                </span>
                            </div>

                            <p className="text-sm text-gray-600 mb-6 text-left bg-gray-50 p-3 rounded-lg">
                                {viewingUser.bio}
                            </p>

                            <button
                                onClick={() => setViewingUser(null)}
                                className="w-full py-2 rounded-full border border-gray-200 font-bold text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* モーダル: 新規スレッド作成 */}
            {showNewThreadModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <h3 className="font-bold text-lg">新規スレッド作成</h3>
                            <button onClick={() => setShowNewThreadModal(false)} className="p-1 rounded-full hover:bg-gray-100">
                                <X size={24} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1">タイトル</label>
                                <input
                                    type="text"
                                    value={newThreadTitle}
                                    onChange={(e) => setNewThreadTitle(e.target.value)}
                                    placeholder="スレッドのタイトルを入力"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1">内容（任意）</label>
                                <textarea
                                    value={newThreadContent}
                                    onChange={(e) => setNewThreadContent(e.target.value)}
                                    placeholder="スレッドの説明や最初の投稿内容"
                                    rows={4}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-700 mb-1">タグ（任意）</label>
                                <input
                                    type="text"
                                    value={newThreadTags}
                                    onChange={(e) => setNewThreadTags(e.target.value)}
                                    placeholder="カンマ区切りで入力（例: ゼミ, 相談）"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowNewThreadModal(false)}
                                    className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-full font-bold text-sm hover:bg-gray-200"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={handleCreateThread}
                                    disabled={!newThreadTitle.trim()}
                                    className="flex-1 py-2.5 text-white rounded-full font-bold text-sm hover:opacity-90 disabled:opacity-50"
                                    style={{ backgroundColor: COLORS.main }}
                                >
                                    作成する
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* モーダル: 通知 */}
            {showNotifications && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300 max-h-[80vh]">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <h3 className="font-bold text-lg">通知</h3>
                            <button onClick={() => setShowNotifications(false)} className="p-1 rounded-full hover:bg-gray-100">
                                <X size={24} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="overflow-y-auto max-h-[60vh]">
                            {notifications.map((notif) => (
                                <div key={notif.id} className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notif.isRead ? 'bg-blue-50' : ''}`}>
                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0 flex items-center justify-center">
                                            {notif.type === 'like' ? <Heart size={18} className="text-pink-500" /> : <MessageSquare size={18} style={{ color: COLORS.main }} />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-900">
                                                <span className="font-bold">{notif.user}</span> {notif.content}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* モーダル: ヘルプ */}
            {showHelp && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <h3 className="font-bold text-lg">ヘルプ・お問い合わせ</h3>
                            <button onClick={() => setShowHelp(false)} className="p-1 rounded-full hover:bg-gray-100">
                                <X size={24} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-6">
                                <h4 className="font-bold text-gray-900 mb-2">よくある質問</h4>
                                <div className="space-y-3">
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p className="font-bold text-sm text-gray-900 mb-1">Q. スレッドの作成方法は？</p>
                                        <p className="text-xs text-gray-600">スレッド一覧画面の右下にある「+」ボタンをタップしてください。</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p className="font-bold text-sm text-gray-900 mb-1">Q. 誰がこのアプリを使えますか？</p>
                                        <p className="text-xs text-gray-600">龍谷大学政策学部の現役生、卒業生、教員の方が利用できます。</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="font-bold text-gray-900 mb-2">お問い合わせ</h4>
                                <p className="text-sm text-gray-600 mb-3">ご不明な点がございましたら、以下までお問い合わせください。</p>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-700">Email: support@sototuna.example.com</p>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowHelp(false)}
                                className="w-full py-2.5 text-white rounded-full font-bold text-sm"
                                style={{ backgroundColor: COLORS.main }}
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* モーダル: ログアウト確認 */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <LogOut size={32} className="text-red-500" />
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 mb-2">ログアウトしますか？</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                ログアウトすると、オンボーディング画面に戻ります。
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-full font-bold text-sm hover:bg-gray-200"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex-1 py-2.5 bg-red-500 text-white rounded-full font-bold text-sm hover:bg-red-600"
                                >
                                    ログアウト
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* モーダル: 設定 */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <h3 className="font-bold text-lg">アカウント設定</h3>
                            <button onClick={() => setShowSettings(false)} className="p-1 rounded-full hover:bg-gray-100">
                                <X size={24} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-4">
                                アカウント設定機能は現在開発中です。プロフィール編集は「マイページ」から行えます。
                            </p>

                            <button
                                onClick={() => setShowSettings(false)}
                                className="w-full py-2.5 text-white rounded-full font-bold text-sm"
                                style={{ backgroundColor: COLORS.main }}
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .safe-area-pb {
                    padding-bottom: max(12px, env(safe-area-inset-bottom));
                }
            `}</style>
        </div>
    );
}
