// ==========================================================================
// App Version
// ==========================================================================
const APP_VERSION = '1.0.0';

// ==========================================================================
// Firebase Configuration & Database Logic
// ==========================================================================
// ★ ここにご自身のFirebaseプロジェクトの設定を貼り付けてください ★
const firebaseConfig = {
    apiKey: "AIzaSyB4HWNaGfVBIqqSTDSRwpMW6uHkp3eK_zc",
    authDomain: "msggenie-b8eb0.firebaseapp.com",
    projectId: "msggenie-b8eb0",
    storageBucket: "msggenie-b8eb0.firebasestorage.app",
    messagingSenderId: "6317505830",
    appId: "1:6317505830:web:0f099e83ec1caed65b55e7"
};

// APIキーが初期値から変更されていればFirebaseが設定されたとみなす
const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";
let db = null;
let templatesCache = [];

async function initDatabase() {
    if (isFirebaseConfigured) {
        try {
            // Firebase SDK v10を動的にインポート（HTMLにScriptタグを書かずに済むスマートな手法）
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
            const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            const app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            console.log("🔥 Firebase Firestore Initialize Success.");
        } catch (e) {
            console.error("Firebase initialization failed:", e);
        }
    } else {
        console.warn("⚠️ Firebase is not configured. Falling back to LocalStorage.");
    }
}

const DB = {
    _key: 'qcda_msggenie_templates',
    
    async getTemplates() {
        if (isFirebaseConfigured && db) {
            const { collection, getDocs, orderBy, query } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            try {
                // 作成日時順（降順）で取得
                const q = query(collection(db, "templates"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                templatesCache = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                return templatesCache;
            } catch (e) {
                console.error("Error getting documents: ", e);
                alert("データの取得に失敗しました。Firestoreのセキュリティルールをご確認ください。");
                return [];
            }
        } else {
            // LocalStorage フォールバック
            const data = localStorage.getItem(this._key);
            templatesCache = data ? JSON.parse(data) : [];
            return templatesCache;
        }
    },
    
    async saveTemplate(template) {
        if (isFirebaseConfigured && db) {
            const { collection, doc, setDoc, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            if (template.id) {
                // 更新
                const docRef = doc(db, "templates", template.id);
                await setDoc(docRef, {
                    name: template.name,
                    content: template.content,
                    variables: template.variables,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            } else {
                // 新規作成
                const docRef = await addDoc(collection(db, "templates"), {
                    name: template.name,
                    content: template.content,
                    variables: template.variables,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                template.id = docRef.id;
            }
        } else {
            // LocalStorage フォールバック
            if (template.id) {
                const index = templatesCache.findIndex(t => t.id === template.id);
                if (index !== -1) templatesCache[index] = template;
            } else {
                template.id = 'tmpl_' + Date.now();
                templatesCache.push(template);
            }
            localStorage.setItem(this._key, JSON.stringify(templatesCache));
        }
        return template;
    },
    
    async deleteTemplate(id) {
        if (isFirebaseConfigured && db) {
            const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            await deleteDoc(doc(db, "templates", id));
        } else {
            templatesCache = templatesCache.filter(t => t.id !== id);
            localStorage.setItem(this._key, JSON.stringify(templatesCache));
        }
    },

    getTemplateById(id) {
        // IDからの取得はすでに読み込み済みのキャッシュから同期的に返す
        return templatesCache.find(t => t.id === id);
    }
};

// ==========================================================================
// App Initialization
// ==========================================================================
async function initApp() {
    initHamburgerMenu();
    await initDatabase(); // Firebaseの初期化を待つ
    await setupInitialData(); // 初期データのセットアップを待つ
    
    // DBの準備が完了したことを他のJSに通知する
    document.dispatchEvent(new CustomEvent('dbReady'));
}

// DOMの読み込み状態を判定して、安全に初期化関数を呼び出す
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// ==========================================================================
// Hamburger Menu Logic
// ==========================================================================
function initHamburgerMenu() {
    const header = document.querySelector('header');
    if (!header) {
        console.error('Header element not found. Cannot render hamburger menu.');
        return;
    }

    // 既存のボタンがあれば削除（多重生成防止）
    const existingBtn = header.querySelector('.hamburger-btn');
    if (existingBtn) existingBtn.remove();

    // Hamburger Button
    const btn = document.createElement('button');
    btn.className = 'hamburger-btn';
    btn.setAttribute('aria-label', 'メニュー');
    btn.innerHTML = '<span></span><span></span><span></span>';
    
    // Header Title Link
    const title = header.querySelector('.header-title');
    if (title) {
        title.style.cursor = 'pointer';
        title.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    header.appendChild(btn);

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    overlay.id = 'menuOverlay'; // 識別用ID
    
    const navUrls = {
        guide: 'guide.html',
        contact: 'https://docs.google.com/forms/d/e/1FAIpQLSdlvIr5ehyy3dInl_XTkA5F64H7yFIigL2dzFW0IoXnl8ajdw/viewform?usp=dialog',
        release: 'release-notes.html',
        about: 'https://qcda-dev.github.io/HP/',
        terms: 'https://qcda-dev.github.io/HP/terms-of-service.html',
        community: 'https://qcda-dev.github.io/HP/community-guidelines.html'
    };

    overlay.innerHTML = `
        <ul class="menu-list">
            <li><a href="${navUrls.guide}" target="_blank">使い方ガイド</a></li>
            <li><a href="${navUrls.contact}" target="_blank">お問い合わせ</a></li>
            <li class="menu-separator"><a href="${navUrls.release}" target="_blank" style="text-decoration: underline;">リリースノート</a></li>
            
            <li><a href="${navUrls.about}" target="_blank">QcDa Projectとは</a></li>
            <li class="menu-sub-item"><a href="${navUrls.terms}" target="_blank">利用規約</a></li>
            <li class="menu-sub-item"><a href="${navUrls.community}" target="_blank">コミュニティガイドライン</a></li>
        </ul>
        <div class="menu-version">ver ${APP_VERSION}</div>
    `;

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'menu-backdrop';
    backdrop.id = 'menuBackdrop';

    // 既存のメニューがあれば削除して再追加
    const oldOverlay = document.getElementById('menuOverlay');
    const oldBackdrop = document.getElementById('menuBackdrop');
    if (oldOverlay) oldOverlay.remove();
    if (oldBackdrop) oldBackdrop.remove();

    document.body.appendChild(overlay);
    document.body.appendChild(backdrop);

    // Toggle logic
    const toggleMenu = () => {
        btn.classList.toggle('active');
        overlay.classList.toggle('active');
        backdrop.classList.toggle('active');
        document.body.style.overflow = overlay.classList.contains('active') ? 'hidden' : '';
    };

    btn.addEventListener('click', toggleMenu);
    backdrop.addEventListener('click', toggleMenu);
}

// ==========================================================================
// Setup Initial Mock Data (GASのデフォルトテンプレートを再現)
// ==========================================================================
async function setupInitialData() {
    const templates = await DB.getTemplates();
    if (templates.length === 0) {
        const defaultContent = `{名前}さん\nお疲れ様です！\n\n{用件}についてのご相談で連絡しました。\nもしご都合が合えば、以下の日程で対応をお願いできないでしょうか？\n科目名で「or」になっているところは、対応可能な科目を教えていただけるとありがたいです。\n\n■お願いしたい日時\n{日程}\n\nお手数ですが、【{返信期限}】までに対応可能かどうかご返信をお願いします。\n\nご予定が合わなければ全く問題ありませんので、遠慮なく教えてください！\nよろしくお願いします🙇`;
        
        await DB.saveTemplate({
            name: "新規打診テンプレート",
            content: defaultContent,
            variables: extractVariables(defaultContent)
        });
    }
}

// テンプレートテキストから {変数} を抽出するユーティリティ関数
function extractVariables(text) {
    const regex = /\{([^}]+)\}/g;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        matches.push(match[1]);
    }
    // 重複を削除して返す
    return [...new Set(matches)];
}
