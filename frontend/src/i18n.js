import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    en: {
        translation: {
            common: { back: "Back", loading: "Loading...", comingSoon: "Coming soon", copy: "Copy", copied: "Copied!", connectWallet: "Connect Wallet", disconnect: "Disconnect", cancel: "Cancel", more: "More", guest: "Guest", unknown: "Unknown User", edit: "Edit", update: "Update", delete: "Delete", confirmDelete: "Are you sure you want to delete?", success: "Success", error: "Error" },
            settings: { title: "Settings", account: "Account", profileVisibility: "Profile Visibility", profilePublic: "Everyone can see your profile", profilePrivate: "Only connections can see", language: "Language", appearance: "Appearance", theme: "Theme", darkMode: "Dark Mode", lightMode: "Light Mode", notifications: "Notifications", push: "Push Notifications", email: "Email Updates", security: "Security", trust: "Trust & Verification", verified: "Verified", wallet: "Wallet", connectedWallet: "Connected Wallet", notConnected: "Not Connected" },
            inbox: { title: "Inbox", markRead: "Mark all read", empty: "No notifications", depositConfirmed: "Deposit of {{amount}} TON Confirmed", welcome: "Welcome to Credant! Complete your profile.", securityAlert: "Security Alert: New login detected", newFollower: "You have a new follower" },
            profile: { thoughts: "My Thoughts", noThoughts: "You have no thoughts", shareThoughts: "Share Thoughts", channels: "My Channels", noChannels: "You have no channels", listChannel: "List Channel", ads: "My Ads", noAds: "You have no ads", postAds: "Post Ads", offers: "Offers", noOffers: "You have no offers", deposit: "Deposit", withdraw: "Withdraw", channelStatus: "Channel Status", startPrice: "Start Price", activityScore: "Activity Score", timeStatus: "Time Status", ready: "Ready to Calculate", collectingData: "Collecting data. Please wait for 24-hour cycle.", notStarted: "Verification has not started.", check: "Check", startVerification: "Start Verification", calculateAgain: "Calculate Again" },
            wallet: { depositTitle: "Deposit TON", withdrawTitle: "Withdraw TON", connectData: "Connect your wallet to {{type}}", from: "From", to: "To", available: "Available", reserve: "(Reserve: 0.1 TON for fees)", amount: "Amount (TON)", processing: "Processing...", insufficient: "Insufficient funds. Max: {{max}} TON", successSent: "Transaction Sent!", cancelled: "Transaction cancelled or failed" },
            nav: { feed: "Feed", ads: "Ads", insights: "Insights", channels: "Channels", profile: "Profile" },
            feed: { title: "Feed", loading: "Loading Feed...", empty: "No posts yet.", like: "Likes", invited: "invited", verifiedOwner: "Verified Grand Owner" },
            ads: { title: "Campaigns", subtitle: "Manage your promotions", totalSpend: "Total Spend", activeAds: "Active Ads", impressions: "Impressions", recent: "Recent Activity", loading: "Loading Campaigns...", empty: "No campaigns found.", deal: "Deal", amount: "Amount", status: { posted: "Posted", approved: "Approved", pending: "Pending" }, campaignTitle: "Campaign Title", description: "Description / Post Text", targetLink: "Target Link / Channel", budget: "Budget (TON)", create: "Create Ad Campaign", contentPlaceholder: "Ad content...", linkPlaceholder: "https://t.me/...", titlePlaceholder: "e.g. Summer Sale" },
            channels: { title: "Marketplace", searchPlaceholder: "Find channels", create: "Create Campaign", subs: "Subscribers" },
            insights: { title: "Insights", audience: "Audience", engagement: "Engagement", avgRate: "Avg. Rate", locations: "Top Locations", trustScore: "Channel Trust Score", trustDesc: "High credibility among top advertisers.", news: "Market Intelligence", newsTag: "Ad Performance News", male: "Male", female: "Female", other: "Other", totalSubs: "Total Subscribers", time: { all: "All" } },
            listChannel: { selectStyle: "Select Post Style", title: "Verify Channel", howTo: "How to verify:", step1: "1. Add @CredantBot as Admin", step2: "2. Enter channel username", step3: "3. We fetch details", usernameLabel: "Channel Username / ID", fetch: "Continue", fetching: "Fetching...", requirements: "Requirements", readyVerify: "Ready to Verify", requirementsMissing: "Requirements Missing", botAdmin: "Bot is Admin", creator: "You are Creator", calculateNow: "Calculate Purity Now", later: "Later (Skip)", postStyleDesc: "Choose a message style to post", postVerify: "Post & Verify" }
        }
    },
    ru: {
        translation: {
            common: { back: "Назад", loading: "Загрузка...", comingSoon: "Скоро", copy: "Копировать", copied: "Скопировано", connectWallet: "Подключить кошелек", disconnect: "Отключить", cancel: "Отмена", more: "Еще", guest: "Гость", unknown: "Неизвестный" },
            settings: { title: "Настройки", account: "Аккаунт", profileVisibility: "Видимость профиля", profilePublic: "Все видят профиль", profilePrivate: "Только контакты", language: "Язык", appearance: "Внешний вид", theme: "Тема", darkMode: "Темная", lightMode: "Светлая", notifications: "Уведомления", push: "Пуш-уведомления", email: "Email рассылка", security: "Безопасность", trust: "Доверие и верификация", verified: "Подтверждено", wallet: "Кошелек", connectedWallet: "Подключен", notConnected: "Не подключен" },
            inbox: { title: "Входящие", markRead: "Прочитать все", empty: "Нет уведомлений", depositConfirmed: "Депозит {{amount}} TON подтвержден", welcome: "Добро пожаловать в Credant!", securityAlert: "Тревога: Новый вход", newFollower: "У вас новый подписчик" },
            profile: { thoughts: "Мысли", noThoughts: "Нет мыслей", shareThoughts: "Поделиться", channels: "Каналы", noChannels: "Нет каналов", listChannel: "Создать канал", ads: "Реклама", noAds: "Нет рекламы", postAds: "Разместить", offers: "Предложения", noOffers: "Нет предложений", deposit: "Депозит", withdraw: "Вывод" },
            wallet: { depositTitle: "Депозит TON", withdrawTitle: "Вывод TON", connectData: "Подключите кошелек для {{type}}", from: "От", to: "Кому", available: "Доступно", reserve: "(Резерв: 0.1 TON комиссия)", amount: "Сумма (TON)", processing: "Обработка...", insufficient: "Недостаточно средств. Макс: {{max}} TON", successSent: "Транзакция отправлена!", cancelled: "Отменено или ошибка" },
            nav: { feed: "Лента", ads: "Реклама", insights: "Инсайты", channels: "Каналы", profile: "Профиль" },
            feed: { title: "Лента", loading: "Загрузка...", empty: "Нет постов.", like: "Лайков", invited: "приглашено", verifiedOwner: "Владелец" },
            ads: { title: "Кампании", subtitle: "Управление промо", totalSpend: "Расходы", activeAds: "Активные", impressions: "Показы", recent: "Активность", loading: "Загрузка...", empty: "Нет кампаний.", deal: "Сделка", amount: "Сумма", status: { posted: "Опубликовано", approved: "Одобрено", pending: "Ожидание" } },
            channels: { title: "Маркетплейс", searchPlaceholder: "Найти каналы", create: "Создать кампанию", subs: "Подписчиков" },
            insights: { title: "Инсайты", audience: "Аудитория", engagement: "Вовлеченность", avgRate: "Ср. уровень", locations: "Топ локаций", trustScore: "Рейтинг доверия", trustDesc: "Высокое доверие рекламодателей.", news: "Аналитика рынка", newsTag: "Новости рекламы", male: "Муж", female: "Жен", other: "Другое", totalSubs: "Всего подписчиков", time: { all: "Все" } }
        }
    },
    de: {
        translation: {
            common: { back: "Zurück", loading: "Laden...", comingSoon: "Bald verfügbar", copy: "Kopieren", copied: "Kopiert", connectWallet: "Wallet verbinden", disconnect: "Trennen", cancel: "Abbrechen", more: "Mehr", guest: "Gast", unknown: "Unbekannt" },
            settings: { title: "Einstellungen", account: "Konto", profileVisibility: "Profilsichtbarkeit", profilePublic: "Öffentlich", profilePrivate: "Nur Kontakte", language: "Sprache", appearance: "Erscheinungsbild", theme: "Thema", darkMode: "Dunkel", lightMode: "Hell", notifications: "Benachrichtigungen", push: "Push-Nachrichten", email: "E-Mails", security: "Sicherheit", trust: "Verifizierung", verified: "Verifiziert", wallet: "Wallet", connectedWallet: "Verbundenes Wallet", notConnected: "Nicht verbunden" },
            inbox: { title: "Posteingang", markRead: "Alle als gelesen", empty: "Keine Nachrichten", depositConfirmed: "Einzahlung von {{amount}} TON bestätigt", welcome: "Willkommen bei Credant!", securityAlert: "Sicherheitswarnung: Neuer Login", newFollower: "Neuer Follower" },
            profile: { thoughts: "Gedanken", noThoughts: "Keine Gedanken", shareThoughts: "Teilen", channels: "Kanäle", noChannels: "Keine Kanäle", listChannel: "Kanal erstellen", ads: "Werbung", noAds: "Keine Werbung", postAds: "Werben", offers: "Angebote", noOffers: "Keine Angebote", deposit: "Einzahlen", withdraw: "Abheben" },
            wallet: { depositTitle: "TON Einzahlen", withdrawTitle: "TON Abheben", connectData: "Wallet verbinden für {{type}}", from: "Von", to: "Zu", available: "Verfügbar", reserve: "(Reserve: 0.1 TON Gebühr)", amount: "Betrag (TON)", processing: "Verarbeitung...", insufficient: "Unzureichendes Guthaben. Max: {{max}} TON", successSent: "Transaktion gesendet!", cancelled: "Abgebrochen oder Fehler" },
            nav: { feed: "Feed", ads: "Werbung", insights: "Insights", channels: "Kanäle", profile: "Profil" },
            feed: { title: "Feed", loading: "Laden...", empty: "Keine Beiträge.", like: "Gefällt mir", invited: "eingeladen", verifiedOwner: "Verifizierter Owner" },
            ads: { title: "Kampagnen", subtitle: "Werbung verwalten", totalSpend: "Ausgaben", activeAds: "Aktiv", impressions: "Impressionen", recent: "Aktivität", loading: "Laden...", empty: "Keine Kampagnen.", deal: "Deal", amount: "Betrag", status: { posted: "Gepostet", approved: "Genehmigt", pending: "Ausstehend" } },
            channels: { title: "Marktplatz", searchPlaceholder: "Kanäle finden", create: "Kampagne erstellen", subs: "Abonnenten" },
            insights: { title: "Insights", audience: "Publikum", engagement: "Engagement", avgRate: "Durchschn. Rate", locations: "Top Standorte", trustScore: "Vertrauenswert", trustDesc: "Hohe Glaubwürdigkeit.", news: "Marktintelligenz", newsTag: "Werbenews", male: "Männlich", female: "Weiblich", other: "Andere", totalSubs: "Gesamt Abonnenten", time: { all: "Alle" } }
        }
    },
    zh: {
        translation: {
            common: { back: "返回", loading: "加载中...", comingSoon: "即将推出", copy: "复制", copied: "已复制", connectWallet: "连接钱包", disconnect: "断开连接", cancel: "取消", more: "更多", guest: "访客", unknown: "未知用户" },
            settings: { title: "设置", account: "账户", profileVisibility: "资料可见性", profilePublic: "所有人可见", profilePrivate: "仅联系人可见", language: "语言", appearance: "外观", theme: "主题", darkMode: "深色模式", lightMode: "浅色模式", notifications: "通知", push: "推送通知", email: "邮件更新", security: "安全", trust: "信任与验证", verified: "已验证", wallet: "钱包", connectedWallet: "已连接钱包", notConnected: "未连接" },
            inbox: { title: "收件箱", markRead: "全部已读", empty: "暂无通知", depositConfirmed: "存款 {{amount}} TON 已确认", welcome: "欢迎来到 Credant!", securityAlert: "安全警报：检测到新登录", newFollower: "你有新的关注者" },
            profile: { thoughts: "想法", noThoughts: "暂无想法", shareThoughts: "分享想法", channels: "频道", noChannels: "暂无频道", listChannel: "创建频道", ads: "广告", noAds: "暂无广告", postAds: "发布广告", offers: "优惠", noOffers: "暂无优惠", deposit: "存款", withdraw: "提现" },
            wallet: { depositTitle: "存入 TON", withdrawTitle: "提取 TON", connectData: "连接钱包以{{type}}", from: "从", to: "到", available: "可用", reserve: "(保留: 0.1 TON 手续费)", amount: "金额 (TON)", processing: "处理中...", insufficient: "余额不足。最大: {{max}} TON", successSent: "交易已发送!", cancelled: "交易取消或失败" },
            nav: { feed: "动态", ads: "广告", insights: "洞察", channels: "频道", profile: "我的" },
            feed: { title: "动态", loading: "加载中...", empty: "暂无动态", like: "赞", invited: "已邀请", verifiedOwner: "认证所有者" },
            ads: { title: "推广", subtitle: "管理您的推广", totalSpend: "总支出", activeAds: "活跃广告", impressions: "展示次数", recent: "近期活动", loading: "加载中...", empty: "暂无活动", deal: "交易", amount: "金额", status: { posted: "已发布", approved: "已批准", pending: "待处理" } },
            channels: { title: "市场", searchPlaceholder: "搜索频道", create: "创建推广", subs: "订阅者" },
            insights: { title: "洞察", audience: "受众", engagement: "互动", avgRate: "平均率", locations: "热门地区", trustScore: "信任评分", trustDesc: "顶级广告商信誉极高", news: "市场情报", newsTag: "广告新闻", male: "男", female: "女", other: "其他", totalSubs: "总订阅", time: { all: "全部" } }
        }
    },
    ar: {
        translation: {
            common: { back: "رجوع", loading: "جار التحميل...", comingSoon: "قريبا", copy: "نسخ", copied: "تم النسخ", connectWallet: "ربط المحفظة", disconnect: "قطع الاتصال", cancel: "إلغاء", more: "المزيد", guest: "ضيف", unknown: "مجهول" },
            settings: { title: "الإعدادات", account: "الحساب", profileVisibility: "ظهور الملف الشخصي", profilePublic: "الكل", profilePrivate: "جهات الاتصال فقط", language: "الغة", appearance: "المظهر", theme: "النمط", darkMode: "داكن", lightMode: "فاتح", notifications: "الإشعارات", push: "إشعارات الدفع", email: "تحديثات البريد", security: "الأمان", trust: "الثقة والتحقق", verified: "مؤكد", wallet: "المحفظة", connectedWallet: "المحفظة المتصلة", notConnected: "غير متصل" },
            inbox: { title: "الوارد", markRead: "قراءة الكل", empty: "لا إشعارات", depositConfirmed: "تم تأكيد إيداع {{amount}} TON", welcome: "مرحبًا بك في Credant!", securityAlert: "تنبيه أمني: تسجيل دخول جديد", newFollower: "لديك متابع جديد" },
            profile: { thoughts: "أفكاري", noThoughts: "لا توجد أفكار", shareThoughts: "شارك أفكارك", channels: "قنواتي", noChannels: "لا توجد قنوات", listChannel: "أضف قناة", ads: "إعلاناتي", noAds: "لا توجد إعلانات", postAds: "نشر إعلان", offers: "عروض", noOffers: "لا توجد عروض", deposit: "إيداع", withdraw: "سحب" },
            wallet: { depositTitle: "إيداع TON", withdrawTitle: "سحب TON", connectData: "اربط المحفظة لـ {{type}}", from: "من", to: "إلى", available: "متاح", reserve: "(احتياطي: 0.1 TON رسوم)", amount: "المبلغ (TON)", processing: "معالجة...", insufficient: "رصيد غير كاف. الحد الأقصى: {{max}} TON", successSent: "تم إرسال المعاملة!", cancelled: "تم الإلغاء أو فشل" },
            nav: { feed: "موجز", ads: "إعلانات", insights: "رؤى", channels: "قنوات", profile: "ملفي" },
            feed: { title: "الموجز", loading: "جار التحميل...", empty: "لا منشورات", like: "إعجاب", invited: "دعوة", verifiedOwner: "مالك موثق" },
            ads: { title: "الحملات", subtitle: "إدارة العروض", totalSpend: "إجمالي الإنفاق", activeAds: "نشط", impressions: "ظهور", recent: "نشاط", loading: "جار التحميل...", empty: "لا حملات", deal: "صفقة", amount: "مبلغ", status: { posted: "منشور", approved: "موافق عليه", pending: "قيد الانتظار" } },
            channels: { title: "السوق", searchPlaceholder: "بحث قنوات", create: "إنشاء حملة", subs: "مشترك" },
            insights: { title: "رؤى", audience: "جمهور", engagement: "تفاعل", avgRate: "معدل", locations: "أهم المواقع", trustScore: "نقاط الثقة", trustDesc: "مصداقية عالية", news: "ذكاء السوق", newsTag: "أخبار الإعلانات", male: "ذكر", female: "أنثى", other: "آخر", totalSubs: "إجمالي المشتركين", time: { all: "الكل" } }
        }
    },
    fa: {
        translation: {
            common: { back: "بازگشت", loading: "بارگذاری...", comingSoon: "به زودی", copy: "کپی", copied: "کپی شد", connectWallet: "اتصال کیف پول", disconnect: "قطع اتصال", cancel: "لغو", more: "بیشتر", guest: "مهمان", unknown: "ناشناس" },
            settings: { title: "تنظیمات", account: "حساب کاربری", profileVisibility: "نمایش پروفایل", profilePublic: "همه", profilePrivate: "فقط مخاطبین", language: "زبان", appearance: "ظاهر", theme: "تم", darkMode: "تاریک", lightMode: "روشن", notifications: "اعلان‌ها", push: "اعلان‌ پوش", email: "ایمیل", security: "امنیت", trust: "تایید هویت", verified: "تایید شده", wallet: "کیف پول", connectedWallet: "کیف پول متصل", notConnected: "متصل نیست" },
            inbox: { title: "صندوق ورودی", markRead: "خواندن همه", empty: "هیچ اعلانی نیست", depositConfirmed: "واریز {{amount}} TON تایید شد", welcome: "به Credant خوش آمدید!", securityAlert: "هشدار امنیتی: ورود جدید", newFollower: "دنبال‌کننده جدید" },
            profile: { thoughts: "افکار من", noThoughts: "فکری نیست", shareThoughts: "اشتراک فکر", channels: "کانال‌های من", noChannels: "کانالی نیست", listChannel: "ایجاد کانال", ads: "تبلیغات من", noAds: "تبلیغی نیست", postAds: "ارسال تبلیغ", offers: "پیشنهادها", noOffers: "پیشنهادی نیست", deposit: "واریز", withdraw: "برداشت" },
            wallet: { depositTitle: "واریز TON", withdrawTitle: "برداشت TON", connectData: "اتصال کیف پول برای {{type}}", from: "از", to: "به", available: "موجود", reserve: "(رزرو: 0.1 TON کارمزد)", amount: "مقدار (TON)", processing: "پردازش...", insufficient: "موجودی ناکافی. حداکثر: {{max}} TON", successSent: "تراکنش ارسال شد!", cancelled: "لغو شد یا خطا" },
            nav: { feed: "فید", ads: "تبلیغات", insights: "بینش", channels: "کانال‌ها", profile: "پروفایل" },
            feed: { title: "فید", loading: "بارگذاری...", empty: "پستی نیست", like: "لایک", invited: "دعوت شده", verifiedOwner: "مالک تایید شده" },
            ads: { title: "کمپین‌ها", subtitle: "مدیریت تبلیغات", totalSpend: "کل هزینه", activeAds: "فعال", impressions: "بازدید", recent: "فعالیت اخیر", loading: "بارگذاری...", empty: "کمپینی نیست", deal: "قرارداد", amount: "مبلغ", status: { posted: "منتشر شده", approved: "تایید شده", pending: "در انتظار" } },
            channels: { title: "بازار", searchPlaceholder: "جستجوی کانال", create: "ایجاد کمپین", subs: "مشترک" },
            insights: { title: "بینش", audience: "مخاطبان", engagement: "تعامل", avgRate: "نرخ میانگین", locations: "مکان‌های برتر", trustScore: "امتیاز اعتماد", trustDesc: "اعتبار بالا", news: "هوش بازار", newsTag: "اخبار تبلیغات", male: "مرد", female: "زن", other: "سایر", totalSubs: "کل مشترکین", time: { all: "همه" } }
        }
    },
    hi: {
        translation: {
            common: { back: "वापस", loading: "लोड हो रहा है...", comingSoon: "जल्द आ रहा है", copy: "कॉपी", copied: "कॉपी किया गया", connectWallet: "वॉलेट जोड़ें", disconnect: "डिस्कनेक्ट", cancel: "रद्द करें", more: "अधिक", guest: "अतिथि", unknown: "अज्ञात" },
            settings: { title: "सेटिंग्स", account: "खाता", profileVisibility: "प्रोफ़ाइल दृश्यता", profilePublic: "सभी देख सकते हैं", profilePrivate: "केवल संपर्क", language: "भाषा", appearance: "दिखावट", theme: "थीम", darkMode: "डार्क मोड", lightMode: "लाइट मोड", notifications: "सूचनाएं", push: "पुश सूचनाएं", email: "ईमेल अपडेट", security: "सुरक्षा", trust: "विश्वास और सत्यापन", verified: "सत्यापित", wallet: "वॉलेट", connectedWallet: "जुड़ा हुआ वॉलेट", notConnected: "जुड़ा नहीं है" },
            inbox: { title: "इनबॉक्स", markRead: "सभी पढ़े", empty: "कोई सूचना नहीं", depositConfirmed: "{{amount}} TON जमा की पुष्टि", welcome: "Credant में आपका स्वागत है!", securityAlert: "सुरक्षा चेतावनी: नया लॉगिन", newFollower: "नया फॉलोअर" },
            profile: { thoughts: "मेरे विचार", noThoughts: "कोई विचार नहीं", shareThoughts: "विचार साझा करें", channels: "मेरे चैनल", noChannels: "कोई चैनल नहीं", listChannel: "चैनल बनाएं", ads: "मेरे विज्ञापन", noAds: "कोई विज्ञापन नहीं", postAds: "विज्ञापन दें", offers: "ऑफ़र", noOffers: "कोई ऑफ़र नहीं", deposit: "जमा करें", withdraw: "निकालें" },
            wallet: { depositTitle: "TON जमा करें", withdrawTitle: "TON निकालें", connectData: "{{type}} के लिए वॉलेट कनेक्ट करें", from: "से", to: "को", available: "उपलब्ध", reserve: "(आरक्षित: 0.1 TON शुल्क)", amount: "राशि (TON)", processing: "प्रक्रिया में...", insufficient: "अपर्याप्त धनराशि। अधिकतम: {{max}} TON", successSent: "लेनदेन भेजा गया!", cancelled: "रद्द या विफल" },
            nav: { feed: "फ़ीड", ads: "विज्ञापन", insights: "अंतर्दृष्टि", channels: "चैनल", profile: "प्रोफ़ाइल" },
            feed: { title: "फ़ीड", loading: "लोड हो रहा है...", empty: "कोई पोस्ट नहीं", like: "लाइक", invited: "आमंत्रित", verifiedOwner: "सत्यापित मालिक" },
            ads: { title: "अभियान", subtitle: "प्रचार प्रबंधित करें", totalSpend: "कुल खर्च", activeAds: "सक्रिय", impressions: "इम्प्रेशन्स", recent: "हाल की गतिविधि", loading: "लोड हो रहा है...", empty: "कोई अभियान नहीं", deal: "सौदा", amount: "राशि", status: { posted: "पोस्ट किया", approved: "स्वीकृत", pending: "लंबित" } },
            channels: { title: "बाज़ार", searchPlaceholder: "चैनल खोजें", create: "अभियान बनाएं", subs: "सब्सक्राइबर्स" },
            insights: { title: "अंतर्दृष्टि", audience: "दर्शक", engagement: "जुड़ाव", avgRate: "औसत दर", locations: "शीर्ष स्थान", trustScore: "विश्वास स्कोर", trustDesc: "उच्च विश्वसनीयता", news: "बाजार खुफिया", newsTag: "विज्ञापन समाचार", male: "पुरुष", female: "महिला", other: "अन्य", totalSubs: "कुल सब्सक्राइबर्स", time: { all: "सभी" } }
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage']
        }
    });

export default i18n;
