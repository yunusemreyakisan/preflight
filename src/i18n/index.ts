import {
  SUPPORTED_LOCALES,
  type SupportedLocale,
  type TranslationVars,
  type Translator
} from "../types";

type MessageCatalog = Record<string, string>;

const englishMessages: MessageCatalog = {
  "language.en": "English",
  "language.tr": "Turkish",
  "language.de": "German",
  "language.fr": "French",
  "language.es": "Spanish",
  "language.it": "Italian",
  "language.pt-BR": "Brazilian Portuguese",
  "language.ja": "Japanese",
  "language.ko": "Korean",
  "language.zh-CN": "Simplified Chinese",

  "cli.description": "CI-grade App Store submission risk engine.",
  "cli.option.lang": "Output language",
  "cli.option.config": "Path to an optional preflight override file",
  "cli.option.ci": "Emit concise CI-oriented output",
  "cli.option.json": "Emit JSON output",
  "cli.option.plain": "Disable branded terminal formatting",
  "cli.option.strict": "Treat medium risk as a blocking failure",
  "cli.option.force": "Overwrite the target file if it already exists",
  "cli.option.output": "Output path for the generated config",
  "cli.error.unexpected": "Preflight failed: {message}",
  "cli.error.langFallback":
    "Unsupported language `{requested}`. Falling back to English.",

  "command.scan.description":
    "Run an auto-discovery-first local submission risk scan.",
  "command.reviewer-pack.description": "Validate and generate the reviewer pack only.",
  "command.rules.description": "List bundled active rules.",
  "command.rules.option.update":
    "Show bundled rule metadata and explain local update status.",
  "command.init.description": "Create an optional preflight override template.",

  "output.scan.title": "PREFLIGHT SCAN RESULTS",
  "output.reviewerPack.title": "REVIEWER PACK",
  "output.rules.title": "ACTIVE RULES",
  "output.riskLevel": "Risk Level",
  "output.riskScore": "Risk Score",
  "output.likelyReject": "Likely Reject",
  "output.primaryReason": "Primary Reason",
  "output.blockingIssues": "Blocking Issues",
  "output.warnings": "Warnings",
  "output.passed": "Passed",
  "output.none": "None",
  "output.configPath": "Override Config",
  "output.scannedAt": "Scanned At",
  "output.reviewerPack.status": "Reviewer Pack Status",
  "output.reviewerPack.missing": "Missing",
  "output.reviewerPack.notes": "Notes",
  "output.reviewerPack.generatedTemplate": "Generated Review Notes Template",
  "output.reviewerPack.copyInstruction":
    "Copy this into App Store Connect -> Review Notes",
  "output.reviewerPack.complete": "REVIEWER PACK IS COMPLETE",
  "output.reviewerPack.incomplete": "REVIEWER PACK IS INCOMPLETE",
  "output.configWarnings": "Config Warnings",
  "output.yes": "YES",
  "output.no": "NO",
  "output.complete": "COMPLETE",
  "output.incomplete": "INCOMPLETE",
  "output.brand.tagline": "App Store submission risk engine",
  "output.surface.title": "Submission Surface",
  "output.surface.reviewerPack": "Reviewer Pack",
  "output.surface.discovery": "Project Discovery",
  "output.surface.missingInputs": "Missing Human Inputs",
  "output.surface.config": "Config Health",
  "output.discovery.title": "Project Discovery",
  "output.discovery.projectType": "Project Type",
  "output.discovery.projectRoot": "Project Root",
  "output.discovery.iosRoot": "iOS Root",
  "output.discovery.sources": "Detected Sources",
  "output.discovery.evidence": "Discovery Evidence",
  "output.discovery.warnings": "Discovery Warnings",
  "output.missingInputs.title": "Missing Human Inputs",
  "output.source.config": "user-provided",
  "output.source.discovered": "detected",
  "output.source.default": "default",
  "output.source.missing": "missing",
  "output.verdict": "Verdict",
  "output.verdict.ready": "READY TO SUBMIT",
  "output.verdict.review": "REVIEW BEFORE SUBMIT",
  "output.verdict.block": "BLOCK THIS SUBMISSION",
  "output.issue.guideline": "Guideline",
  "output.issue.fix": "Fix",
  "output.issue.details": "Details",
  "output.coverageNote":
    "Preflight covers {ruleCount} deterministic rules. It does not evaluate content policy, design quality, or human-judgment guideline interpretations.",
  "output.passedSummary": "{passedCount}/{ruleCount} checks passed",
  "output.passedCheckTitle": "Passed check: {id}",
  "output.issuesNone": "No blocking issues or warnings were found.",
  "output.nextSteps": "Next Steps",
  "output.rule.version": "Bundled Rule Version",
  "output.rule.lastVerified": "Last Verified",
  "output.rule.remoteDeferred":
    "Remote rule sync is a post-MVP feature. This command reports bundled metadata only.",
  "output.rule.total": "{count} bundled rules",
  "output.rule.column.id": "ID",
  "output.rule.column.category": "Category",
  "output.rule.column.severity": "Severity",
  "output.rule.column.guideline": "Guideline",
  "output.rule.column.lastVerified": "Last Verified",
  "output.init.created": "Created optional override template `{path}`.",
  "output.init.exists":
    "Refusing to overwrite `{path}`. Re-run with `--force` to replace it.",
  "output.init.gitignoreHint":
    "Add `preflight.config.json` to `.gitignore` if you store real reviewer credentials.",
  "template.init.appName": "Example App",
  "template.init.contactName": "Release Team",
  "template.init.reviewNotes":
    "Test account: reviewer@example.com / password123. Open the signed-in home screen, then go to Settings -> Upgrade to reach the paywall and validate the core flow.",
  "template.init.loginInstructions":
    "1. Open app\n2. Tap Sign In\n3. Use the reviewer account above\n4. Open Settings -> Upgrade to review the paywall",
  "template.init.subtitle": "Release safety",
  "template.init.description":
    "Prevent avoidable App Store review issues before submission.",

  "category.configuration": "Configuration",
  "category.reviewer-access": "Reviewer Access",
  "category.app-completeness": "App Completeness",
  "category.metadata": "Metadata",
  "category.privacy": "Privacy",
  "category.business-iap": "Business / IAP",
  "category.content": "Content / Age Rating",

  "projectType.native-ios": "Native iOS",
  "projectType.flutter-ios": "Flutter iOS",
  "projectType.react-native-ios": "React Native iOS",
  "projectType.unknown": "Unknown",

  "severity.high": "HIGH",
  "severity.medium": "MEDIUM",
  "severity.low": "LOW",

  "config.warning.legacyFlatAliases":
    "Flat alias fields were detected and normalized into the canonical config shape.",
  "config.warning.legacyNestedShape":
    "The legacy nested config shape is still supported. Keep it or migrate gradually.",

  "reviewerPack.item.demoAccount": "Demo account",
  "reviewerPack.item.reviewNotes": "Review notes",
  "reviewerPack.item.loginInstructions": "Login instructions",
  "reviewerPack.item.contact": "Reviewer contact",
  "reviewerPack.note.demoAccount":
    "Supply a stable review account with a username/email and password.",
  "reviewerPack.note.reviewNotes":
    "Add review notes that explain setup, credentials, and gated flows.",
  "reviewerPack.note.loginInstructions":
    "Explain how reviewers should sign in and reach the core features.",
  "reviewerPack.note.contact":
    "Add reviewer contact name and email for follow-up.",
  "reviewerPack.template.testAccount": "Test Account",
  "reviewerPack.template.email": "Email",
  "reviewerPack.template.password": "Password",
  "reviewerPack.template.loginSteps": "Login Steps",
  "reviewerPack.template.notes": "Notes",
  "reviewerPack.template.step1": "1. Open the app",
  "reviewerPack.template.step2": "2. Tap the sign-in entry point",
  "reviewerPack.template.step3": "3. Use the credentials provided above",
  "reviewerPack.template.step4":
    "4. Validate all features from the signed-in home screen",
  "reviewerPack.template.internetRequired": "Internet connection required",
  "reviewerPack.template.regionRestriction":
    "Region or VPN restriction: {value}",
  "reviewerPack.template.paywallPath":
    "Premium access path: {value}",
  "reviewerPack.template.noIap":
    "No in-app purchases are required to review core features",

  "missing.demoAccount.label": "Demo account",
  "missing.demoAccount.message":
    "Provide reviewer credentials so App Review can access the gated flow.",
  "missing.reviewNotes.label": "Review notes",
  "missing.reviewNotes.message":
    "Add review notes that explain setup, credentials, and gated flows.",
  "missing.loginInstructions.label": "Login instructions",
  "missing.loginInstructions.message":
    "Document how the reviewer should sign in and reach the core experience.",
  "missing.contact.label": "Reviewer contact",
  "missing.contact.message":
    "Add a release contact name and email for follow-up during review.",
  "missing.screenshots.label": "Screenshot assets",
  "missing.screenshots.message":
    "Provide screenshot paths in config or keep App Store screenshot assets in the repository.",
  "missing.privacyPolicy.label": "Privacy policy URL",
  "missing.privacyPolicy.message":
    "Add a privacy policy URL in the override config when it cannot be discovered locally.",
  "missing.nutritionLabel.label": "Privacy nutrition label status",
  "missing.nutritionLabel.message":
    "Confirm that the App Store privacy nutrition label is complete.",
  "missing.subscriptionTerms.label": "Subscription terms disclosure",
  "missing.subscriptionTerms.message":
    "Confirm that subscription terms are visible in the purchase flow.",
  "missing.restorePurchases.label": "Restore purchases action",
  "missing.restorePurchases.message":
    "Confirm that users can restore purchases from the app.",
  "missing.freeTrialTerms.label": "Free trial disclosure",
  "missing.freeTrialTerms.message":
    "Confirm that the free trial duration, renewal terms, and pricing are visible.",
  "missing.ugcModeration.label": "UGC moderation disclosure",
  "missing.ugcModeration.message":
    "Describe moderation/reporting controls for user-generated content.",

  "issue.CONFIG_001.title": "Preflight config file is missing",
  "issue.CONFIG_001.message":
    "Preflight cannot evaluate submission readiness because `preflight.config.json` was not found.",
  "issue.CONFIG_001.fix":
    "Create `preflight.config.json` in the project root or pass `--config <path>`.",
  "issue.CONFIG_002.title": "Preflight config could not be read",
  "issue.CONFIG_002.message":
    "A config file exists, but Preflight could not read it from disk.",
  "issue.CONFIG_002.fix":
    "Verify file permissions and ensure the config path is accessible.",
  "issue.CONFIG_003.title": "Preflight config JSON is invalid",
  "issue.CONFIG_003.message":
    "The config file could not be parsed as valid JSON.",
  "issue.CONFIG_003.fix": "Fix the JSON syntax and run the scan again.",
  "issue.CONFIG_004.title": "Preflight config schema is invalid",
  "issue.CONFIG_004.message":
    "The override config is present, but one or more values are malformed or unsupported.",
  "issue.CONFIG_004.fix":
    "Update the override file to match the documented schema and re-run the scan.",
  "issue.DISCOVERY_001.title": "No supported iOS project was discovered",
  "issue.DISCOVERY_001.message":
    "Preflight could not find a native iOS, Flutter iOS, or React Native iOS project at `{path}`.",
  "issue.DISCOVERY_001.fix":
    "Run Preflight from the mobile app root or point it at a supported iOS project directory.",
  "discovery.warning.configFallback":
    "No supported local iOS project was discovered. Continuing with config-only inputs.",
  "discovery.warning.pbxprojUnreadable":
    "The Xcode project file exists, but `project.pbxproj` could not be read.",

  "issue.REVIEWER_001.title": "Demo account is missing",
  "issue.REVIEWER_001.message":
    "The app requires reviewer access, but no demo account was provided.",
  "issue.REVIEWER_001.fix":
    "Add `review.demoAccount.username` and `review.demoAccount.password`, or the flat `demoEmail` and `demoPassword` aliases.",
  "issue.REVIEWER_002.title": "Demo credentials format is invalid",
  "issue.REVIEWER_002.message":
    "The demo credentials are incomplete or malformed for App Review.",
  "issue.REVIEWER_002.fix":
    "Provide a non-empty username/email and password for the demo account.",
  "issue.REVIEWER_003.title": "Login flow is not documented",
  "issue.REVIEWER_003.message":
    "Login-required apps must explain how reviewers should sign in.",
  "issue.REVIEWER_003.fix":
    "Add login steps in `review.loginInstructions` or mention them clearly in `review.notes`.",
  "issue.REVIEWER_004.title": "Reviewer contact information is incomplete",
  "issue.REVIEWER_004.message":
    "App Review does not have a complete contact name and email for follow-up.",
  "issue.REVIEWER_004.fix":
    "Populate `review.contact.name` and `review.contact.email`.",
  "issue.REVIEWER_005.title": "Region or VPN restrictions are undocumented",
  "issue.REVIEWER_005.message":
    "The config marks region or VPN restrictions, but the review notes do not explain them.",
  "issue.REVIEWER_005.fix":
    "Describe the region restriction or VPN dependency in the review notes.",

  "issue.COMPLETE_001.title": "Placeholder content is enabled",
  "issue.COMPLETE_001.message":
    "The app is marked as using placeholder or demo content.",
  "issue.COMPLETE_001.fix":
    "Ship production-ready content or declare a fully functional reviewer-safe demo dataset.",
  "issue.COMPLETE_002.title": "Some declared features are inaccessible",
  "issue.COMPLETE_002.message":
    "One or more declared features are marked as inaccessible.",
  "issue.COMPLETE_002.fix":
    "Remove inaccessible features from the release or make them reachable for review.",
  "issue.COMPLETE_003.title": "Paywall is not reachable",
  "issue.COMPLETE_003.message":
    "The app includes a paywall, but reviewers cannot reliably reach it.",
  "issue.COMPLETE_003.fix":
    "Make the paywall reachable with the demo account and document the access path.",
  "issue.COMPLETE_004.title": "Broken navigation flows are declared",
  "issue.COMPLETE_004.message":
    "The config reports broken flows that would block feature validation.",
  "issue.COMPLETE_004.fix":
    "Fix or remove the broken flows before submission.",
  "issue.COMPLETE_005.title": "Onboarding depends on an external dependency",
  "issue.COMPLETE_005.message":
    "Onboarding cannot be completed without an external dependency.",
  "issue.COMPLETE_005.fix":
    "Provide a reviewer-safe path that completes onboarding without manual external setup.",

  "issue.META_001.title": "Required screenshot device coverage is incomplete",
  "issue.META_001.message":
    "The configured screenshot set does not cover every required device type.",
  "issue.META_001.fix":
    "Add screenshot assets for each required device type.",
  "issue.META_002.title": "Minimum screenshot count is not met",
  "issue.META_002.message":
    "At least three iOS screenshots are required for the current metadata policy.",
  "issue.META_002.fix": "Provide at least three screenshot assets.",
  "issue.META_003.title": "Description references a competitor",
  "issue.META_003.message":
    "The description mentions competitor brand names.",
  "issue.META_003.fix":
    "Remove competitor references from App Store descriptions.",
  "issue.META_004.title": "Title exceeds 30 characters",
  "issue.META_004.message":
    "At least one app title exceeds the App Store title limit.",
  "issue.META_004.fix": "Keep every title within 30 characters.",
  "issue.META_005.title": "Subtitle exceeds 30 characters",
  "issue.META_005.message":
    "At least one subtitle exceeds the App Store subtitle limit.",
  "issue.META_005.fix": "Keep every subtitle within 30 characters.",
  "issue.META_006.title": "Keywords exceed 100 characters",
  "issue.META_006.message":
    "At least one keyword field exceeds the App Store keyword limit.",
  "issue.META_006.fix":
    "Keep each keyword string at or below 100 characters.",
  "issue.META_007.title": "Pricing claims appear in the description",
  "issue.META_007.message":
    "The description contains pricing or promotional claims that increase rejection risk.",
  "issue.META_007.fix":
    "Remove pricing claims from App Store descriptions.",
  "issue.META_008.title": "Localization coverage is incomplete",
  "issue.META_008.message":
    "Primary markets are missing matching metadata localizations.",
  "issue.META_008.fix":
    "Add localized metadata for each primary market.",

  "issue.PRIVACY_001.title": "Privacy policy URL is missing or unreachable",
  "issue.PRIVACY_001.message":
    "The privacy policy URL is absent, invalid, or marked unreachable.",
  "issue.PRIVACY_001.fix":
    "Provide a valid privacy policy URL and confirm it is reachable.",
  "issue.PRIVACY_002.title": "Privacy nutrition label is incomplete",
  "issue.PRIVACY_002.message":
    "The config indicates the privacy nutrition label is incomplete.",
  "issue.PRIVACY_002.fix":
    "Complete the App Store privacy nutrition label before submission.",
  "issue.PRIVACY_003.title": "Tracking usage description is missing",
  "issue.PRIVACY_003.message":
    "Tracking is enabled, but the required usage description is missing.",
  "issue.PRIVACY_003.fix":
    "Add `NSUserTrackingUsageDescription` and confirm it is present.",
  "issue.PRIVACY_004.title": "Required reason APIs are not declared",
  "issue.PRIVACY_004.message":
    "The privacy manifest does not declare required reason APIs.",
  "issue.PRIVACY_004.fix":
    "Declare required reason APIs in the privacy manifest.",
  "issue.PRIVACY_005.title":
    "Data collection does not match the nutrition label",
  "issue.PRIVACY_005.message":
    "The config indicates data collection does not match the declared nutrition label.",
  "issue.PRIVACY_005.fix":
    "Align the collected data with the nutrition label disclosures.",

  "issue.IAP_001.title": "IAP products are not reviewer-accessible",
  "issue.IAP_001.message":
    "At least one in-app purchase cannot be reached by the reviewer.",
  "issue.IAP_001.fix":
    "Make every declared IAP reachable from the review build and document the access path.",
  "issue.IAP_002.title": "Subscription terms are not displayed",
  "issue.IAP_002.message":
    "Subscription products exist, but the required terms are not displayed.",
  "issue.IAP_002.fix":
    "Display subscription terms clearly in the paywall or purchase flow.",
  "issue.IAP_003.title": "External payment links are present",
  "issue.IAP_003.message":
    "The config indicates external payment links are present in the app.",
  "issue.IAP_003.fix": "Remove external payment links from the iOS app.",
  "issue.IAP_004.title": "Restore purchases is missing",
  "issue.IAP_004.message":
    "In-app purchases are enabled, but restore purchases is not available.",
  "issue.IAP_004.fix": "Add a restore purchases action for users.",
  "issue.IAP_005.title": "Free trial terms are incomplete",
  "issue.IAP_005.message":
    "A free trial is offered, but the disclosure terms are incomplete.",
  "issue.IAP_005.fix":
    "Show the free trial duration, renewal terms, and pricing clearly.",

  "issue.CONTENT_001.title": "Age rating does not match the content",
  "issue.CONTENT_001.message":
    "The declared age rating is lower than the recommended content rating.",
  "issue.CONTENT_001.fix":
    "Raise the App Store age rating or reduce the sensitive content.",
  "issue.CONTENT_002.title": "UGC moderation is not declared",
  "issue.CONTENT_002.message":
    "User-generated content is present, but moderation is not declared.",
  "issue.CONTENT_002.fix":
    "Describe moderation and reporting controls for user-generated content."
};

const turkishMessages: MessageCatalog = {
  "language.en": "Ingilizce",
  "language.tr": "Turkce",
  "language.de": "Almanca",
  "language.fr": "Fransizca",
  "language.es": "Ispanyolca",
  "language.it": "Italyanca",
  "language.pt-BR": "Brezilya Portekizcesi",
  "language.ja": "Japonca",
  "language.ko": "Korece",
  "language.zh-CN": "Basitlestirilmis Cince",

  "cli.description": "CI seviyesi App Store gonderim risk motoru.",
  "cli.option.lang": "Cikti dili",
  "cli.option.config": "Opsiyonel preflight override dosya yolu",
  "cli.option.ci": "Kisa CI ciktilari uret",
  "cli.option.json": "JSON cikti uret",
  "cli.option.plain": "Branded terminal bicimini kapat",
  "cli.option.strict": "Orta riski engelleyici hata say",
  "cli.option.force": "Hedef dosya varsa ustune yaz",
  "cli.option.output": "Uretilecek config dosya yolu",
  "cli.error.unexpected": "Preflight basarisiz oldu: {message}",
  "cli.error.langFallback":
    "Desteklenmeyen dil `{requested}`. Inglizceye geri donuluyor.",

  "command.scan.description": "Otomatik kesif once yerel gonderim risk taramasini calistir.",
  "command.reviewer-pack.description":
    "Sadece reviewer pack dogrulamasi ve uretimini calistir.",
  "command.rules.description": "Paketle gelen aktif kurallari listele.",
  "command.rules.option.update":
    "Paketli kural metadata bilgisini ve guncelleme durumunu goster.",
  "command.init.description": "Opsiyonel preflight override sablonu olustur.",

  "output.scan.title": "PREFLIGHT TARAMA SONUCLARI",
  "output.reviewerPack.title": "REVIEWER PACK",
  "output.rules.title": "AKTIF KURALLAR",
  "output.riskLevel": "Risk Seviyesi",
  "output.riskScore": "Risk Skoru",
  "output.likelyReject": "Muhtemel Red",
  "output.primaryReason": "Ana Neden",
  "output.blockingIssues": "Engelleyici Sorunlar",
  "output.warnings": "Uyarilar",
  "output.passed": "Gecenler",
  "output.none": "Yok",
  "output.configPath": "Override Config",
  "output.scannedAt": "Tarama Zamani",
  "output.reviewerPack.status": "Reviewer Pack Durumu",
  "output.reviewerPack.missing": "Eksikler",
  "output.reviewerPack.notes": "Notlar",
  "output.reviewerPack.generatedTemplate": "Uretilen Review Notes Sablonu",
  "output.reviewerPack.copyInstruction":
    "Bunu App Store Connect -> Review Notes alanina kopyalayin",
  "output.reviewerPack.complete": "REVIEWER PACK TAM",
  "output.reviewerPack.incomplete": "REVIEWER PACK EKSIK",
  "output.configWarnings": "Config Uyarilari",
  "output.yes": "EVET",
  "output.no": "HAYIR",
  "output.complete": "TAM",
  "output.incomplete": "EKSIK",
  "output.brand.tagline": "App Store gonderim risk motoru",
  "output.surface.title": "Gonderim Yuzeyi",
  "output.surface.reviewerPack": "Reviewer Pack",
  "output.surface.discovery": "Proje Kesfi",
  "output.surface.missingInputs": "Eksik Insan Girdileri",
  "output.surface.config": "Config Sagligi",
  "output.discovery.title": "Proje Kesfi",
  "output.discovery.projectType": "Proje Tipi",
  "output.discovery.projectRoot": "Proje Koku",
  "output.discovery.iosRoot": "iOS Koku",
  "output.discovery.sources": "Tespit Edilen Kaynaklar",
  "output.discovery.evidence": "Kesif Kanitlari",
  "output.discovery.warnings": "Kesif Uyarilari",
  "output.missingInputs.title": "Eksik Insan Girdileri",
  "output.source.config": "kullanici",
  "output.source.discovered": "tespit",
  "output.source.default": "varsayilan",
  "output.source.missing": "eksik",
  "output.verdict": "Karar",
  "output.verdict.ready": "GONDERIME HAZIR",
  "output.verdict.review": "GONDERIM ONCESI GOZDEN GECIR",
  "output.verdict.block": "BU GONDERIMI BLOKLA",
  "output.issue.guideline": "Guideline",
  "output.issue.fix": "Duzeltme",
  "output.issue.details": "Detaylar",
  "output.coverageNote":
    "Preflight {ruleCount} deterministik kurali kapsar. Icerik politikasi, tasarim kalitesi veya insan yorumu gerektiren guideline yorumlarini degerlendirmez.",
  "output.passedSummary": "{passedCount}/{ruleCount} kontrol gecti",
  "output.passedCheckTitle": "Gecen kontrol: {id}",
  "output.issuesNone": "Engelleyici sorun veya uyari bulunmadi.",
  "output.nextSteps": "Sonraki Adimlar",
  "output.rule.version": "Paketli Kural Surumu",
  "output.rule.lastVerified": "Son Dogrulama",
  "output.rule.remoteDeferred":
    "Uzak kural senkronizasyonu post-MVP ozelligidir. Bu komut sadece paketli metadata raporlar.",
  "output.rule.total": "{count} paketli kural",
  "output.rule.column.id": "ID",
  "output.rule.column.category": "Kategori",
  "output.rule.column.severity": "Seviye",
  "output.rule.column.guideline": "Guideline",
  "output.rule.column.lastVerified": "Son Dogrulama",
  "output.init.created": "Opsiyonel override sablonu `{path}` olusturuldu.",
  "output.init.exists":
    "`{path}` zaten var. Uzerine yazmak icin `--force` ile tekrar calistirin.",
  "output.init.gitignoreHint":
    "Gercek reviewer bilgileri kullanacaksaniz `preflight.config.json` dosyasini `.gitignore`'a ekleyin.",
  "template.init.appName": "Ornek Uygulama",
  "template.init.contactName": "Yayin Ekibi",
  "template.init.reviewNotes":
    "Test hesabi: reviewer@example.com / password123. Ana akisa girdikten sonra Settings -> Upgrade yoluyla paywall ekranina gidip temel akis ve satin alma yolunu dogrulayin.",
  "template.init.loginInstructions":
    "1. Uygulamayi acin\n2. Sign In dugmesine basin\n3. Yukaridaki test hesabini kullanin\n4. Settings -> Upgrade yoluyla paywall ekranina gidin",
  "template.init.subtitle": "Yayin guvenligi",
  "template.init.description":
    "Gonderim oncesinde onlenebilir App Store review sorunlarini yakalayin.",

  "category.configuration": "Yapilandirma",
  "category.reviewer-access": "Reviewer Erisimi",
  "category.app-completeness": "Uygulama Butunlugu",
  "category.metadata": "Metadata",
  "category.privacy": "Gizlilik",
  "category.business-iap": "Ticari / IAP",
  "category.content": "Icerik / Yas Siniri",

  "projectType.native-ios": "Native iOS",
  "projectType.flutter-ios": "Flutter iOS",
  "projectType.react-native-ios": "React Native iOS",
  "projectType.unknown": "Bilinmiyor",

  "severity.high": "YUKSEK",
  "severity.medium": "ORTA",
  "severity.low": "DUSUK",

  "config.warning.legacyFlatAliases":
    "Duz alias alanlari bulundu ve canonical config yapisina normalize edildi.",
  "config.warning.legacyNestedShape":
    "Eski nested config yapisi hala destekleniyor. Oldugu gibi kullanabilir veya asamali gecis yapabilirsiniz.",

  "reviewerPack.item.demoAccount": "Demo hesabi",
  "reviewerPack.item.reviewNotes": "Review notes",
  "reviewerPack.item.loginInstructions": "Giris talimatlari",
  "reviewerPack.item.contact": "Reviewer iletisim bilgisi",
  "reviewerPack.note.demoAccount":
    "Kullanici/e-posta ve sifre iceren sabit bir review hesabi saglayin.",
  "reviewerPack.note.reviewNotes":
    "Kurulum, kimlik bilgileri ve kapili akislar icin review notes ekleyin.",
  "reviewerPack.note.loginInstructions":
    "Reviewer'in nasil giris yapacagini ve ana ozelliklere nasil ulasacagini aciklayin.",
  "reviewerPack.note.contact":
    "Takip icin reviewer iletisim ismi ve e-postasi ekleyin.",
  "reviewerPack.template.testAccount": "Test Hesabi",
  "reviewerPack.template.email": "E-posta",
  "reviewerPack.template.password": "Sifre",
  "reviewerPack.template.loginSteps": "Giris Adimlari",
  "reviewerPack.template.notes": "Notlar",
  "reviewerPack.template.step1": "1. Uygulamayi acin",
  "reviewerPack.template.step2": "2. Giris noktasina dokunun",
  "reviewerPack.template.step3": "3. Yukaridaki bilgileri kullanin",
  "reviewerPack.template.step4":
    "4. Giris yapilan ana ekrandan tum ozellikleri dogrulayin",
  "reviewerPack.template.internetRequired": "Internet baglantisi gerekiyor",
  "reviewerPack.template.regionRestriction":
    "Bolge veya VPN kisiti: {value}",
  "reviewerPack.template.paywallPath": "Premium erisim yolu: {value}",
  "reviewerPack.template.noIap":
    "Ana ozellikleri incelemek icin uygulama ici satin alim gerekmez",

  "missing.demoAccount.label": "Demo hesabi",
  "missing.demoAccount.message":
    "Reviewer'in kapili akislara girebilmesi icin test kimlik bilgilerini ekleyin.",
  "missing.reviewNotes.label": "Review notes",
  "missing.reviewNotes.message":
    "Kurulum, kimlik bilgileri ve kapili akislar icin review notes ekleyin.",
  "missing.loginInstructions.label": "Giris talimatlari",
  "missing.loginInstructions.message":
    "Reviewer'in nasil giris yapacagini ve ana deneyime nasil ulasacagini yazin.",
  "missing.contact.label": "Reviewer iletisim bilgisi",
  "missing.contact.message":
    "Review sirasinda takip icin yayin iletisim ismi ve e-postasi ekleyin.",
  "missing.screenshots.label": "Screenshot assetleri",
  "missing.screenshots.message":
    "Screenshot yollarini config'te verin veya App Store screenshot assetlerini repository icinde tutun.",
  "missing.privacyPolicy.label": "Gizlilik politikasi URL'si",
  "missing.privacyPolicy.message":
    "Yerelde kesfedilemiyorsa override config icinde gizlilik politikasi URL'si ekleyin.",
  "missing.nutritionLabel.label": "Privacy nutrition label durumu",
  "missing.nutritionLabel.message":
    "App Store privacy nutrition label'in tamamlandigini dogrulayin.",
  "missing.subscriptionTerms.label": "Subscription kosullari bildirimi",
  "missing.subscriptionTerms.message":
    "Subscription kosullarinin satin alma akisi icinde gorundugunu dogrulayin.",
  "missing.restorePurchases.label": "Restore purchases aksiyonu",
  "missing.restorePurchases.message":
    "Kullanicilarin satin alimlari uygulama icinden restore edebildigini dogrulayin.",
  "missing.freeTrialTerms.label": "Free trial bildirimi",
  "missing.freeTrialTerms.message":
    "Free trial suresi, yenileme kosullari ve ucret bilgisinin gorundugunu dogrulayin.",
  "missing.ugcModeration.label": "UGC moderasyon bildirimi",
  "missing.ugcModeration.message":
    "Kullanici uretimli icerik icin moderasyon ve raporlama kontrollerini aciklayin.",

  "issue.CONFIG_001.title": "Preflight config dosyasi eksik",
  "issue.CONFIG_001.message":
    "Preflight `preflight.config.json` bulunamadigi icin gonderim hazirligini degerlendiremiyor.",
  "issue.CONFIG_001.fix":
    "Proje kokunde `preflight.config.json` olusturun veya `--config <path>` gecin.",
  "issue.CONFIG_002.title": "Preflight config dosyasi okunamadi",
  "issue.CONFIG_002.message":
    "Bir config dosyasi var ancak Preflight diskte okuyamadi.",
  "issue.CONFIG_002.fix":
    "Dosya izinlerini ve config yolunun erisilebilir oldugunu dogrulayin.",
  "issue.CONFIG_003.title": "Preflight config JSON'i gecersiz",
  "issue.CONFIG_003.message":
    "Config dosyasi gecerli JSON olarak parse edilemedi.",
  "issue.CONFIG_003.fix":
    "JSON yazimini duzeltin ve taramayi tekrar calistirin.",
  "issue.CONFIG_004.title": "Preflight config semasi gecersiz",
  "issue.CONFIG_004.message":
    "Override config var ancak bir veya daha fazla deger hatali ya da desteklenmiyor.",
  "issue.CONFIG_004.fix":
    "Override dosyasini dokumante edilen semaya gore guncelleyip yeniden calistirin.",
  "issue.DISCOVERY_001.title": "Desteklenen bir iOS projesi kesfedilemedi",
  "issue.DISCOVERY_001.message":
    "Preflight `{path}` icinde native iOS, Flutter iOS veya React Native iOS projesi bulamadi.",
  "issue.DISCOVERY_001.fix":
    "Preflight'i mobil uygulama kokunden calistirin veya desteklenen bir iOS proje dizinine yonlendirin.",
  "discovery.warning.configFallback":
    "Desteklenen yerel bir iOS projesi kesfedilemedi. Tarama sadece config girdileriyle surduruluyor.",
  "discovery.warning.pbxprojUnreadable":
    "Xcode proje dosyasi var ancak `project.pbxproj` okunamadi.",

  "issue.REVIEWER_001.title": "Demo hesabi eksik",
  "issue.REVIEWER_001.message":
    "Uygulama reviewer erisimi gerektiriyor ancak demo hesabi verilmedi.",
  "issue.REVIEWER_001.fix":
    "`review.demoAccount.username` ve `review.demoAccount.password` alanlarini veya duz `demoEmail` ve `demoPassword` aliaslarini ekleyin.",
  "issue.REVIEWER_002.title": "Demo kimlik bilgisi formati gecersiz",
  "issue.REVIEWER_002.message":
    "Demo kimlik bilgileri eksik veya App Review icin hatali formatta.",
  "issue.REVIEWER_002.fix":
    "Demo hesabi icin bos olmayan bir kullanici/e-posta ve sifre verin.",
  "issue.REVIEWER_003.title": "Giris akisi dokumante edilmemis",
  "issue.REVIEWER_003.message":
    "Giris gerektiren uygulamalar reviewer'in nasil oturum acacagini aciklamalidir.",
  "issue.REVIEWER_003.fix":
    "Giris adimlarini `review.loginInstructions` alanina ekleyin veya `review.notes` icinde acikca anlatin.",
  "issue.REVIEWER_004.title": "Reviewer iletisim bilgileri eksik",
  "issue.REVIEWER_004.message":
    "Takip icin App Review tarafinda tam isim ve e-posta yok.",
  "issue.REVIEWER_004.fix":
    "`review.contact.name` ve `review.contact.email` alanlarini doldurun.",
  "issue.REVIEWER_005.title": "Bolge veya VPN kisitlari dokumante edilmemis",
  "issue.REVIEWER_005.message":
    "Config bolge veya VPN kisiti isaretliyor ancak review notes bunu aciklamiyor.",
  "issue.REVIEWER_005.fix":
    "Bolge kisitini veya VPN bagimliligini review notes icinde aciklayin.",

  "issue.COMPLETE_001.title": "Placeholder icerik acik",
  "issue.COMPLETE_001.message":
    "Uygulama placeholder veya demo icerigi kullaniyor olarak isaretlenmis.",
  "issue.COMPLETE_001.fix":
    "Prod hazir icerik gonderin veya reviewer-safe tam islevli bir demo veri seti belirtin.",
  "issue.COMPLETE_002.title": "Bazi ilan edilen ozelliklere erisilemiyor",
  "issue.COMPLETE_002.message":
    "Bir veya daha fazla ilan edilen ozellik erisilemez olarak isaretli.",
  "issue.COMPLETE_002.fix":
    "Erisilemeyen ozellikleri surumden cikarın veya review icin erisilebilir hale getirin.",
  "issue.COMPLETE_003.title": "Paywall'a ulasilamiyor",
  "issue.COMPLETE_003.message":
    "Uygulamada paywall var ancak reviewer buna guvenilir sekilde ulasamiyor.",
  "issue.COMPLETE_003.fix":
    "Demo hesap ile paywall'a erisim saglayin ve yolu dokumante edin.",
  "issue.COMPLETE_004.title": "Kirık navigasyon akisları beyan edilmis",
  "issue.COMPLETE_004.message":
    "Config ozellik dogrulamasini engelleyecek kirik akislar raporluyor.",
  "issue.COMPLETE_004.fix":
    "Gonderim oncesi kirik akisları duzeltin veya kaldirin.",
  "issue.COMPLETE_005.title": "Onboarding harici bir bagimliliga bagli",
  "issue.COMPLETE_005.message":
    "Onboarding harici bir bagimlilik olmadan tamamlanamiyor.",
  "issue.COMPLETE_005.fix":
    "Harici manuel kurulum gerektirmeyen reviewer-safe bir onboarding yolu saglayin.",

  "issue.META_001.title": "Zorunlu screenshot cihaz kapsami eksik",
  "issue.META_001.message":
    "Yapilandirilan screenshot seti zorunlu her cihaz tipini kapsamiyor.",
  "issue.META_001.fix":
    "Her zorunlu cihaz tipi icin screenshot ekleyin.",
  "issue.META_002.title": "Minimum screenshot sayisi saglanmiyor",
  "issue.META_002.message":
    "Mevcut metadata politikasi icin en az uc iOS screenshot gereklidir.",
  "issue.META_002.fix": "En az uc screenshot saglayin.",
  "issue.META_003.title": "Aciklama rakip referansi iceriyor",
  "issue.META_003.message":
    "Aciklama rakip marka isimleri iceriyor.",
  "issue.META_003.fix":
    "App Store aciklamalarindan rakip referanslarini kaldirin.",
  "issue.META_004.title": "Baslik 30 karakteri asiyor",
  "issue.META_004.message":
    "En az bir uygulama basligi App Store baslik limitini asiyor.",
  "issue.META_004.fix": "Tum basliklari 30 karakter icinde tutun.",
  "issue.META_005.title": "Alt baslik 30 karakteri asiyor",
  "issue.META_005.message":
    "En az bir alt baslik App Store alt baslik limitini asiyor.",
  "issue.META_005.fix": "Tum alt basliklari 30 karakter icinde tutun.",
  "issue.META_006.title": "Anahtar kelimeler 100 karakteri asiyor",
  "issue.META_006.message":
    "En az bir anahtar kelime alani App Store limitini asiyor.",
  "issue.META_006.fix":
    "Her anahtar kelime dizisini en fazla 100 karakterde tutun.",
  "issue.META_007.title": "Aciklamada fiyat iddialari var",
  "issue.META_007.message":
    "Aciklama red riskini artiran fiyat veya promosyon iddialari iceriyor.",
  "issue.META_007.fix":
    "App Store aciklamalarindan fiyat iddialarini kaldirin.",
  "issue.META_008.title": "Lokalizasyon kapsami eksik",
  "issue.META_008.message":
    "Birincil pazarlar icin eslesen metadata lokalizasyonlari eksik.",
  "issue.META_008.fix":
    "Her birincil pazar icin lokalize metadata ekleyin.",

  "issue.PRIVACY_001.title": "Gizlilik politikasi URL'si eksik veya erisilemez",
  "issue.PRIVACY_001.message":
    "Gizlilik politikasi URL'si eksik, gecersiz veya erisilemez olarak isaretlenmis.",
  "issue.PRIVACY_001.fix":
    "Gecerli bir gizlilik politikasi URL'si verin ve erisilebilir oldugunu dogrulayin.",
  "issue.PRIVACY_002.title": "Privacy nutrition label eksik",
  "issue.PRIVACY_002.message":
    "Config privacy nutrition label'in tamamlanmadigini belirtiyor.",
  "issue.PRIVACY_002.fix":
    "Gonderim oncesi App Store privacy nutrition label'i tamamlayin.",
  "issue.PRIVACY_003.title": "Tracking kullanim aciklamasi eksik",
  "issue.PRIVACY_003.message":
    "Tracking acik ancak gerekli kullanim aciklamasi eksik.",
  "issue.PRIVACY_003.fix":
    "`NSUserTrackingUsageDescription` ekleyin ve mevcut oldugunu dogrulayin.",
  "issue.PRIVACY_004.title": "Required reason API'ler beyan edilmemis",
  "issue.PRIVACY_004.message":
    "Privacy manifest gerekli reason API'leri beyan etmiyor.",
  "issue.PRIVACY_004.fix":
    "Privacy manifest icinde required reason API'leri beyan edin.",
  "issue.PRIVACY_005.title":
    "Veri toplama nutrition label ile uyusmuyor",
  "issue.PRIVACY_005.message":
    "Config veri toplamanin beyan edilen nutrition label ile eslesmedigini gosteriyor.",
  "issue.PRIVACY_005.fix":
    "Toplanan veriyi nutrition label beyanlariyla hizalayin.",

  "issue.IAP_001.title": "IAP urunleri reviewer tarafindan erisilemez",
  "issue.IAP_001.message":
    "En az bir uygulama ici satin alim reviewer tarafindan ulasilamaz durumda.",
  "issue.IAP_001.fix":
    "Her ilan edilen IAP'i review build icinde erisilebilir hale getirin ve yolu dokumante edin.",
  "issue.IAP_002.title": "Subscription kosullari gosterilmiyor",
  "issue.IAP_002.message":
    "Subscription urunleri var ancak gerekli kosullar gosterilmiyor.",
  "issue.IAP_002.fix":
    "Subscription kosullarini paywall veya satin alma akisinda acikca gosterin.",
  "issue.IAP_003.title": "Harici odeme linkleri mevcut",
  "issue.IAP_003.message":
    "Config uygulamada harici odeme linkleri oldugunu gosteriyor.",
  "issue.IAP_003.fix":
    "iOS uygulamasindan harici odeme linklerini kaldirin.",
  "issue.IAP_004.title": "Restore purchases eksik",
  "issue.IAP_004.message":
    "Uygulama ici satin alim acik ancak restore purchases mevcut degil.",
  "issue.IAP_004.fix": "Kullanicilar icin restore purchases aksiyonu ekleyin.",
  "issue.IAP_005.title": "Free trial kosullari eksik",
  "issue.IAP_005.message":
    "Free trial sunuluyor ancak aciklama kosullari eksik.",
  "issue.IAP_005.fix":
    "Free trial suresi, yenileme kosullari ve ucreti acikca gosterin.",

  "issue.CONTENT_001.title": "Yas siniri icerikle uyusmuyor",
  "issue.CONTENT_001.message":
    "Beyan edilen yas siniri onerilen icerik derecesinden daha dusuk.",
  "issue.CONTENT_001.fix":
    "App Store yas sinirini yukselin veya hassas icerigi azaltin.",
  "issue.CONTENT_002.title": "UGC moderasyonu beyan edilmemis",
  "issue.CONTENT_002.message":
    "Kullanici uretimli icerik var ancak moderasyon beyan edilmemis.",
  "issue.CONTENT_002.fix":
    "Kullanici uretimli icerik icin moderasyon ve raporlama kontrollerini aciklayin."
};

const germanMessages: MessageCatalog = {
  "cli.description": "CI-taugliche Risikoanalyse fuer App-Store-Einreichungen.",
  "cli.option.lang": "Ausgabesprache",
  "command.scan.description": "Vollstaendigen lokalen Risiko-Scan ausfuehren.",
  "command.reviewer-pack.description": "Nur das Reviewer-Pack pruefen und erzeugen.",
  "command.rules.description": "Gebundelte aktive Regeln auflisten.",
  "command.init.description": "Eine Startkonfiguration erstellen.",
  "output.scan.title": "PREFLIGHT SCAN-ERGEBNISSE",
  "output.reviewerPack.title": "REVIEWER-PAKET",
  "output.rules.title": "AKTIVE REGELN",
  "output.riskLevel": "Risikostufe",
  "output.riskScore": "Risiko-Score",
  "output.likelyReject": "Wahrscheinliche Ablehnung",
  "output.blockingIssues": "Blockierende Probleme",
  "output.warnings": "Warnungen",
  "output.passed": "Bestanden",
  "output.complete": "VOLLSTAENDIG",
  "output.incomplete": "UNVOLLSTAENDIG",
  "output.yes": "JA",
  "output.no": "NEIN"
};

const frenchMessages: MessageCatalog = {
  "cli.description": "Moteur de risque pour soumission App Store integre au CI.",
  "cli.option.lang": "Langue de sortie",
  "command.scan.description": "Executer une analyse locale complete du risque.",
  "command.reviewer-pack.description":
    "Valider et generer uniquement le pack reviewer.",
  "command.rules.description": "Lister les regles actives embarquees.",
  "command.init.description": "Creer une configuration de depart.",
  "output.scan.title": "RESULTATS PREFLIGHT",
  "output.reviewerPack.title": "PACK REVIEWER",
  "output.rules.title": "REGLES ACTIVES",
  "output.riskLevel": "Niveau de risque",
  "output.riskScore": "Score de risque",
  "output.likelyReject": "Rejet probable",
  "output.blockingIssues": "Problemes bloquants",
  "output.warnings": "Avertissements",
  "output.passed": "Valide",
  "output.complete": "COMPLET",
  "output.incomplete": "INCOMPLET",
  "output.yes": "OUI",
  "output.no": "NON"
};

const spanishMessages: MessageCatalog = {
  "cli.description": "Motor de riesgo para envios al App Store integrado en CI.",
  "cli.option.lang": "Idioma de salida",
  "command.scan.description": "Ejecutar un analisis local completo de riesgo.",
  "command.reviewer-pack.description":
    "Validar y generar solo el reviewer pack.",
  "command.rules.description": "Listar las reglas activas incluidas.",
  "command.init.description": "Crear una configuracion inicial.",
  "output.scan.title": "RESULTADOS DE PREFLIGHT",
  "output.reviewerPack.title": "REVIEWER PACK",
  "output.rules.title": "REGLAS ACTIVAS",
  "output.riskLevel": "Nivel de riesgo",
  "output.riskScore": "Puntuacion de riesgo",
  "output.likelyReject": "Rechazo probable",
  "output.blockingIssues": "Problemas bloqueantes",
  "output.warnings": "Advertencias",
  "output.passed": "Aprobadas",
  "output.complete": "COMPLETO",
  "output.incomplete": "INCOMPLETO",
  "output.yes": "SI",
  "output.no": "NO"
};

const italianMessages: MessageCatalog = {
  "cli.description": "Motore di rischio per submission App Store integrato nel CI.",
  "cli.option.lang": "Lingua di output",
  "command.scan.description": "Esegui una scansione locale completa del rischio.",
  "command.reviewer-pack.description":
    "Valida e genera solo il reviewer pack.",
  "command.rules.description": "Elenca le regole attive incluse.",
  "command.init.description": "Crea una configurazione iniziale.",
  "output.scan.title": "RISULTATI PREFLIGHT",
  "output.reviewerPack.title": "REVIEWER PACK",
  "output.rules.title": "REGOLE ATTIVE",
  "output.riskLevel": "Livello di rischio",
  "output.riskScore": "Punteggio di rischio",
  "output.likelyReject": "Rifiuto probabile",
  "output.blockingIssues": "Problemi bloccanti",
  "output.warnings": "Avvisi",
  "output.passed": "Superati",
  "output.complete": "COMPLETO",
  "output.incomplete": "INCOMPLETO",
  "output.yes": "SI",
  "output.no": "NO"
};

const portugueseMessages: MessageCatalog = {
  "cli.description": "Motor de risco para envio ao App Store integrado ao CI.",
  "cli.option.lang": "Idioma de saida",
  "command.scan.description": "Executar uma analise local completa de risco.",
  "command.reviewer-pack.description":
    "Validar e gerar apenas o reviewer pack.",
  "command.rules.description": "Listar as regras ativas embarcadas.",
  "command.init.description": "Criar uma configuracao inicial.",
  "output.scan.title": "RESULTADOS DO PREFLIGHT",
  "output.reviewerPack.title": "REVIEWER PACK",
  "output.rules.title": "REGRAS ATIVAS",
  "output.riskLevel": "Nivel de risco",
  "output.riskScore": "Pontuacao de risco",
  "output.likelyReject": "Rejeicao provavel",
  "output.blockingIssues": "Problemas bloqueadores",
  "output.warnings": "Avisos",
  "output.passed": "Aprovados",
  "output.complete": "COMPLETO",
  "output.incomplete": "INCOMPLETO",
  "output.yes": "SIM",
  "output.no": "NAO"
};

const japaneseMessages: MessageCatalog = {
  "cli.description": "CI tonogo App Store shutsugan risk engine.",
  "cli.option.lang": "Shutsuryoku gengo",
  "command.scan.description": "Furu local risk scan o jikkou",
  "command.reviewer-pack.description":
    "Reviewer pack no kenshou to seisei nomi",
  "command.rules.description": "Bundled active rules o ichiran",
  "command.init.description": "Shoki config o sakusei",
  "output.scan.title": "PREFLIGHT SCAN RESULTS",
  "output.reviewerPack.title": "REVIEWER PACK",
  "output.rules.title": "ACTIVE RULES",
  "output.riskLevel": "Risk Level",
  "output.riskScore": "Risk Score",
  "output.likelyReject": "Likely Reject",
  "output.blockingIssues": "Blocking Issues",
  "output.warnings": "Warnings",
  "output.passed": "Passed",
  "output.complete": "COMPLETE",
  "output.incomplete": "INCOMPLETE",
  "output.yes": "YES",
  "output.no": "NO"
};

const koreanMessages: MessageCatalog = {
  "cli.description": "CI tonghap App Store submit risk engine.",
  "cli.option.lang": "Chulryeok eoneo",
  "command.scan.description": "Jeonche local risk scan silhaeng",
  "command.reviewer-pack.description":
    "Reviewer pack geomsa mit saengseongman silhaeng",
  "command.rules.description": "Bundled active rules moglog pyo si",
  "command.init.description": "Chogi config saengseong",
  "output.scan.title": "PREFLIGHT SCAN RESULTS",
  "output.reviewerPack.title": "REVIEWER PACK",
  "output.rules.title": "ACTIVE RULES",
  "output.riskLevel": "Risk Level",
  "output.riskScore": "Risk Score",
  "output.likelyReject": "Likely Reject",
  "output.blockingIssues": "Blocking Issues",
  "output.warnings": "Warnings",
  "output.passed": "Passed",
  "output.complete": "COMPLETE",
  "output.incomplete": "INCOMPLETE",
  "output.yes": "YES",
  "output.no": "NO"
};

const chineseMessages: MessageCatalog = {
  "cli.description": "Ji cheng CI de App Store tijiao fengxian yinqing.",
  "cli.option.lang": "Shuchu yuyan",
  "command.scan.description": "Yunxing wanquan de ben di fengxian saomiao",
  "command.reviewer-pack.description":
    "Jin yanzheng bing shengcheng reviewer pack",
  "command.rules.description": "Liechu neizhi de huoyue guize",
  "command.init.description": "Chuangjian chushi peizhi",
  "output.scan.title": "PREFLIGHT SCAN RESULTS",
  "output.reviewerPack.title": "REVIEWER PACK",
  "output.rules.title": "ACTIVE RULES",
  "output.riskLevel": "Risk Level",
  "output.riskScore": "Risk Score",
  "output.likelyReject": "Likely Reject",
  "output.blockingIssues": "Blocking Issues",
  "output.warnings": "Warnings",
  "output.passed": "Passed",
  "output.complete": "COMPLETE",
  "output.incomplete": "INCOMPLETE",
  "output.yes": "YES",
  "output.no": "NO"
};

const messageCatalogs: Record<SupportedLocale, MessageCatalog> = {
  en: englishMessages,
  tr: turkishMessages,
  de: germanMessages,
  fr: frenchMessages,
  es: spanishMessages,
  it: italianMessages,
  "pt-BR": portugueseMessages,
  ja: japaneseMessages,
  ko: koreanMessages,
  "zh-CN": chineseMessages
};

const localeAliases: Record<string, SupportedLocale> = {
  en: "en",
  "en-us": "en",
  "en-gb": "en",
  tr: "tr",
  "tr-tr": "tr",
  de: "de",
  "de-de": "de",
  fr: "fr",
  "fr-fr": "fr",
  es: "es",
  "es-es": "es",
  it: "it",
  "it-it": "it",
  pt: "pt-BR",
  "pt-br": "pt-BR",
  ja: "ja",
  "ja-jp": "ja",
  ko: "ko",
  "ko-kr": "ko",
  zh: "zh-CN",
  "zh-cn": "zh-CN"
};

function interpolate(template: string, vars: TranslationVars = {}): string {
  return template.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const value = vars[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function resolveLocale(input?: string): SupportedLocale {
  if (!input) {
    return "en";
  }

  const normalized = input.trim().toLowerCase();

  return localeAliases[normalized] ?? "en";
}

export function resolveLocaleFromArgv(
  argv: string[],
  envLocale?: string
): SupportedLocale {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--lang" && argv[index + 1]) {
      return resolveLocale(argv[index + 1]);
    }

    if (token.startsWith("--lang=")) {
      return resolveLocale(token.slice("--lang=".length));
    }
  }

  return resolveLocale(envLocale);
}

export function isSupportedLocale(input?: string): input is SupportedLocale {
  return SUPPORTED_LOCALES.includes(input as SupportedLocale);
}

export function getLocaleCatalog(locale: SupportedLocale): MessageCatalog {
  return {
    ...englishMessages,
    ...messageCatalogs[locale]
  };
}

export function createTranslator(locale: SupportedLocale): Translator {
  const catalog = getLocaleCatalog(locale);

  return {
    locale,
    t(key, vars) {
      return interpolate(catalog[key] ?? englishMessages[key] ?? key, vars);
    }
  };
}
