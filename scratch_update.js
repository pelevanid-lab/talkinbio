const fs = require('fs');

const trLegal = {
  eyebrow: "Hukuki Bilgilendirme",
  title: "KVKK Aydınlatma Metni ve Gizlilik Politikası",
  copy: "PEH olarak kişisel verilerinizin güvenliğini ve gizliliğini ciddiye alıyoruz. Bu sayfa, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında sizi bilgilendirmek amacıyla hazırlanmıştır.",
  lastUpdated: "Son güncelleme: Haziran 2026",
  sections: [
    { title: "1. Veri Sorumlusu", body: "Veri sorumlusu sıfatıyla PEH Solutions (bundan böyle 'Şirket' veya 'PEH' olarak anılacaktır), talkinbio platformu aracılığıyla toplanan kişisel verileri 6698 sayılı Kişisel Verilerin Korunması Kanunu'na (KVKK) uygun olarak işlemektedir. Şirket iletişim bilgileri: info@talkinbio.com" },
    { title: "2. İşlenen Kişisel Veriler", body: "talkinbio platformunu kullanımınız kapsamında aşağıdaki kişisel veriler işlenmektedir:\n\n• Kimlik verileri: Ad, soyad\n• İletişim verileri: E-posta adresi\n• Hesap verileri: Çalışma alanı adı, kullanıcı rolü, iş unvanı\n• Kullanım verileri: Giriş zamanları, platform içi eylemler, özellik kullanım kayıtları\n• İçerik verileri: Platforma girilen müşteri etkileşim notları, talepler ve ilgili iş verileri\n\ntalkinbio platformuna girdiğiniz müşteri verileri de sizin sorumluluğunuzda olmak üzere sistemde işlenmektedir. Bu kapsamda şirketiniz de KVKK açısından veri sorumlusu konumundadır." },
    { title: "3. Kişisel Verilerin İşlenme Amaçları ve Hukuki Dayanakları", body: "Kişisel verileriniz aşağıdaki amaçlarla ve hukuki dayanaklarla işlenmektedir:\n\n• Hesap oluşturma ve kimlik doğrulama → Sözleşmenin ifası (KVKK m.5/2-c)\n• Platform hizmetlerinin sunulması → Sözleşmenin ifası (KVKK m.5/2-c)\n• Güvenlik ve denetim kayıtları → Meşru menfaat (KVKK m.5/2-f)\n• Ürün geliştirme ve hata analizi → Meşru menfaat (KVKK m.5/2-f)\n• Yasal yükümlülüklerin yerine getirilmesi → Kanuni yükümlülük (KVKK m.5/2-ç)\n• Ticari elektronik ileti gönderimi → Açık rıza (KVKK m.5/1) — Yalnızca rızanız bulunması halinde" },
    { title: "4. Kişisel Verilerin Aktarımı", body: "Kişisel verileriniz; hizmet altyapısını sağlamak amacıyla Google Firebase ve Supabase (veri işleyen sıfatıyla) gibi teknik altyapı sağlayıcılarına, yasal zorunluluk halinde yetkili kamu kurum ve kuruluşlarına aktarılmaktadır. Yurt dışına veri aktarımı söz konusu olduğunda KVKK'nın 9. maddesi kapsamındaki güvenceler gözetilmektedir." },
    { title: "5. Kişisel Verilerin Saklanma Süresi", body: "Kişisel verileriniz; hesabınızın aktif olduğu süre boyunca ve hesap silinmesinden itibaren yasal saklama yükümlülükleri dikkate alınarak belirlenen süreler içinde saklanmaktadır. Saklama süresi sona eren veriler güvenli yöntemlerle imha edilmektedir." },
    { title: "6. KVKK Kapsamındaki Haklarınız", body: "KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:\n\n• Kişisel verilerinizin işlenip işlenmediğini öğrenme\n• İşlenmişse buna ilişkin bilgi talep etme\n• İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme\n• Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme\n• Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme\n• KVKK'nın 7. maddesi çerçevesinde silinmesini veya yok edilmesini isteme\n• Yapılan işlemlerin aktarılan üçüncü kişilere bildirilmesini isteme\n• İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme\n• Kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme\n\nBu haklarınızı kullanmak için info@talkinbio.com adresine yazılı olarak başvurabilirsiniz." },
    { title: "7. Çerez Politikası", body: "talkinbio platformu, oturum yönetimi ve güvenlik amacıyla zorunlu çerezler kullanmaktadır. Analitik ve pazarlama çerezleri yalnızca açık rızanız alınması durumunda kullanılmaktadır. Çerez tercihlerinizi tarayıcı ayarlarınızdan yönetebilirsiniz." },
    { title: "8. Gizlilik Politikası Değişiklikleri", body: "PEH, bu metni gerektiğinde güncelleme hakkını saklı tutar. Önemli değişiklikler kayıtlı e-posta adresinize bildirilecektir. Güncel metne her zaman bu sayfadan ulaşabilirsiniz." },
    { title: "9. İletişim", body: "KVKK kapsamındaki başvurularınız ve gizlilik ile ilgili tüm sorularınız için: info@talkinbio.com adresine e-posta gönderebilirsiniz." }
  ],
  contactTitle: "Veri Sorumlusu İletişim",
  contactBody: "PEH Solutions\ninfo@talkinbio.com\ntalkinbio Platformu — talkinbio.com"
};

const enLegal = {
  eyebrow: "Legal",
  title: "Privacy Policy & GDPR Notice",
  copy: "PEH Solutions takes the privacy and security of your personal data seriously. This page explains how we collect, use and protect your data in accordance with the General Data Protection Regulation (GDPR) and applicable privacy laws.",
  lastUpdated: "Last updated: June 2026",
  sections: [
    { title: "1. Data Controller", body: "PEH Solutions (referred to as 'Company', 'PEH', 'we' or 'us') is the data controller for personal data collected through the talkinbio platform. Contact: info@talkinbio.com" },
    { title: "2. Personal Data We Collect", body: "When you use the talkinbio platform, we collect the following categories of personal data:\n\n• Identity data: Full name\n• Contact data: Email address\n• Account data: Workspace name, user role, job title\n• Usage data: Login timestamps, in-platform actions, feature usage logs\n• Content data: Customer interaction notes, tickets and related business data entered into the platform\n\nCustomer data you enter into talkinbio is processed on your behalf. In this context, your company also acts as a data controller for that data." },
    { title: "3. Legal Basis for Processing", body: "We process your personal data under the following legal bases under GDPR Article 6:\n\n• Account creation and authentication → Performance of a contract (Art. 6(1)(b))\n• Providing platform services → Performance of a contract (Art. 6(1)(b))\n• Security and audit logs → Legitimate interests (Art. 6(1)(f))\n• Product development and error analysis → Legitimate interests (Art. 6(1)(f))\n• Legal compliance → Legal obligation (Art. 6(1)(c))\n• Marketing communications → Consent (Art. 6(1)(a)) — only where you have given explicit consent" },
    { title: "4. Data Transfers", body: "Your personal data may be transferred to Google Firebase and Supabase (acting as a data processor) to provide our technical infrastructure. Where data is transferred outside the European Economic Area, we ensure appropriate safeguards are in place in accordance with GDPR Chapter V, including Standard Contractual Clauses where applicable." },
    { title: "5. Data Retention", body: "We retain your personal data for as long as your account is active and for a defined period thereafter to meet legal obligations. Data that is no longer required is securely deleted or anonymized." },
    { title: "6. Your Rights Under GDPR", body: "Under GDPR, you have the following rights:\n\n• Right of access — to obtain a copy of your personal data\n• Right to rectification — to correct inaccurate or incomplete data\n• Right to erasure ('right to be forgotten') — to request deletion of your data\n• Right to restriction of processing\n• Right to data portability\n• Right to object — including to processing based on legitimate interests\n• Rights related to automated decision-making and profiling\n\nTo exercise any of these rights, please contact us at info@talkinbio.com. We will respond within 30 days. If you are not satisfied with our response, you have the right to lodge a complaint with your local supervisory authority." },
    { title: "7. Cookies", body: "The talkinbio platform uses strictly necessary cookies for session management and security. Analytics and marketing cookies are only used where you have given explicit consent. You can manage your cookie preferences through your browser settings." },
    { title: "8. Changes to This Policy", body: "PEH reserves the right to update this Privacy Policy. Significant changes will be communicated to your registered email address. The current version is always available on this page." },
    { title: "9. Contact", body: "For all privacy-related requests and GDPR inquiries, please contact us at: info@talkinbio.com" }
  ],
  contactTitle: "Data Controller Contact",
  contactBody: "PEH Solutions\ninfo@talkinbio.com\ntalkinbio Platform — talkinbio.com"
};

const ruLegal = {
  eyebrow: "Юридическая информация",
  title: "Политика конфиденциальности и GDPR",
  copy: "PEH Solutions серьезно относится к конфиденциальности и безопасности ваших личных данных. На этой странице объясняется, как мы собираем, используем и защищаем ваши данные в соответствии с GDPR и применимыми законами о конфиденциальности.",
  lastUpdated: "Последнее обновление: Июнь 2026",
  sections: [
    { title: "1. Контроллер данных", body: "PEH Solutions (именуемая «Компания», «PEH» или «мы») является контроллером личных данных, собранных через платформу talkinbio. Контакт: info@talkinbio.com" },
    { title: "2. Собираемые личные данные", body: "Когда вы используете платформу talkinbio, мы собираем следующие категории личных данных:\n\n• Идентификационные данные: Имя и фамилия\n• Контактные данные: Адрес электронной почты\n• Данные аккаунта: Название рабочей области, роль пользователя, должность\n• Данные об использовании: Время входа, действия внутри платформы, журналы использования функций\n• Контентные данные: Заметки о взаимодействии с клиентами, заявки и связанные с ними бизнес-данные, введенные в платформу\n\nКлиентские данные, которые вы вводите в talkinbio, обрабатываются от вашего имени. В этом контексте ваша компания также выступает в качестве контроллера этих данных." },
    { title: "3. Правовая основа для обработки", body: "Мы обрабатываем ваши личные данные на следующих правовых основаниях согласно статье 6 GDPR:\n\n• Создание аккаунта и аутентификация → Исполнение контракта (ст. 6(1)(b))\n• Предоставление услуг платформы → Исполнение контракта (ст. 6(1)(b))\n• Журналы безопасности и аудита → Законные интересы (ст. 6(1)(f))\n• Разработка продукта и анализ ошибок → Законные интересы (ст. 6(1)(f))\n• Соблюдение правовых норм → Юридическое обязательство (ст. 6(1)(c))\n• Маркетинговые сообщения → Согласие (ст. 6(1)(a)) — только если вы дали явное согласие" },
    { title: "4. Передача данных", body: "Ваши личные данные могут быть переданы Google Firebase и Supabase (действующим в качестве обработчика данных) для обеспечения нашей технической инфраструктуры. Если данные передаются за пределы Европейской экономической зоны, мы обеспечиваем наличие соответствующих гарантий в соответствии с главой V GDPR, включая Стандартные договорные положения." },
    { title: "5. Хранение данных", body: "Мы храним ваши личные данные до тех пор, пока ваш аккаунт активен, и в течение определенного периода после этого для выполнения юридических обязательств. Данные, которые больше не требуются, безопасно удаляются или анонимизируются." },
    { title: "6. Ваши права в рамках GDPR", body: "В рамках GDPR у вас есть следующие права:\n\n• Право на доступ — получить копию ваших личных данных\n• Право на исправление — исправить неточные или неполные данные\n• Право на удаление («право быть забытым») — запросить удаление ваших данных\n• Право на ограничение обработки\n• Право на переносимость данных\n• Право на возражение — в том числе против обработки на основе законных интересов\n• Права, связанные с автоматизированным принятием решений и профилированием\n\nЧтобы воспользоваться любым из этих прав, свяжитесь с нами по адресу info@talkinbio.com. Мы ответим в течение 30 дней." },
    { title: "7. Файлы cookie", body: "Платформа talkinbio использует строго необходимые файлы cookie для управления сеансами и безопасности. Аналитические и маркетинговые файлы cookie используются только с вашего явного согласия. Вы можете управлять настройками файлов cookie в своем браузере." },
    { title: "8. Изменения в этой Политике", body: "PEH оставляет за собой право обновлять эту Политику конфиденциальности. О существенных изменениях будет сообщено на ваш зарегистрированный адрес электронной почты. Текущая версия всегда доступна на этой странице." },
    { title: "9. Контакты", body: "По всем запросам, связанным с конфиденциальностью и GDPR, обращайтесь к нам по адресу: info@talkinbio.com" }
  ],
  contactTitle: "Контакты контроллера данных",
  contactBody: "PEH Solutions\ninfo@talkinbio.com\nПлатформа talkinbio — talkinbio.com"
};

const updateFile = (lang, legalObj) => {
  const p = 'c:/Users/enesp/talkinbio/messages/' + lang + '.json';
  let content = fs.readFileSync(p, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) { content = content.slice(1); }
  const json = JSON.parse(content);
  json.Legal = legalObj;
  fs.writeFileSync(p, JSON.stringify(json, null, 2), 'utf8');
  console.log('Updated ' + lang + '.json');
};

updateFile('tr', trLegal);
updateFile('en', enLegal);
updateFile('ru', ruLegal);
