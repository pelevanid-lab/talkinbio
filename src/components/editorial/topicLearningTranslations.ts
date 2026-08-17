import type { TopicLearningPlan } from './topicLearningData';

export const segmentationPlanTranslations: Record<'en' | 'ru', TopicLearningPlan> = {
  en: {
    elements: [
      { title: 'Build the need cluster', caption: 'Functional, emotional, and social progress', definition: 'People looking for the same product are not necessarily trying to solve the same problem. Needs-based segmentation groups customers by the functional outcome they seek, the feeling they want, and the social meaning they hope to carry, rather than by age or income.', question: 'What functional, emotional, and social progress are people entering the same market seeking?' },
      { title: 'Identify the segment', caption: 'A compass for locating the need group', definition: 'Once a need group is defined, behavior, usage context, lifestyle, and demographics help you find those people in the market. These signals do not create the segment; they make an existing segment visible and reachable.', question: 'Which behaviors, contexts, and secondary signals help us find people with this need?' },
      { title: 'Stress-test the segment', caption: 'A usable and viable distinction', definition: 'Not every need cluster is a segment. It must be measurable, substantial, reachable, responsive in a distinct way, and actionable enough for the brand to serve.', question: 'Does this need cluster pass all five viability filters and require a genuinely different marketing decision?' },
    ],
    examples: [
      { id: 'A', values: ['Flexibility cluster: maintain a routine, avoid losing control, and feel capable of managing life well.', 'Look for people who frequently change delivery days, examine pause terms, and avoid being locked into a fixed plan.', 'Do they respond more strongly to flexibility than other groups, and can they be reached and served? If so, test “A plan that fits your life.”'] },
      { id: 'B', values: ['Control cluster: know what is inside, reduce uncertainty, and see oneself as an informed decision-maker.', 'Look for people who inspect ingredient and portion details, compare menus, and ask suitability questions.', 'Do they respond differently to ingredient transparency and menu choice? Is the group measurable and substantial? If so, test “See what is inside. Make the choice yours.”'] },
      { id: 'C', values: ['Ease cluster: escape planning, gain mental space, and feel that life is organized without friction.', 'Look for people who favor ready-made plans, keep decision steps short, and choose automatic continuation.', 'Do they respond differently to a fully managed plan, and can the brand sustain it? If so, test “Stop replanning your week.”'] },
    ],
    exampleGroups: [
      {
        title: 'Weekly healthy-meal subscription',
        description: 'Separate customers considering the same meal service by the three different jobs they are trying to accomplish.',
        examples: [
          { id: 'A', values: ['Flexibility cluster: maintain a routine, avoid losing control, and feel capable of managing life well.', 'Look for people who frequently change delivery days, examine pause terms, and avoid being locked into a fixed plan.', 'Do they respond more strongly to flexibility than other groups, and can they be reached and served? If so, test “A plan that fits your life.”'] },
          { id: 'B', values: ['Control cluster: know what is inside, reduce uncertainty, and see oneself as an informed decision-maker.', 'Look for people who inspect ingredient and portion details, compare menus, and ask suitability questions.', 'Do they respond differently to ingredient transparency and menu choice? Is the group measurable and substantial? If so, test “See what is inside. Make the choice yours.”'] },
          { id: 'C', values: ['Ease cluster: escape planning, gain mental space, and feel that life is organized without friction.', 'Look for people who favor ready-made plans, keep decision steps short, and choose automatic continuation.', 'Do they respond differently to a fully managed plan, and can the brand sustain it? If so, test “Stop replanning your week.”'] },
        ],
      },
      {
        title: 'Online creative workshop for children',
        description: 'Reveal the different kinds of progress expected by families considering the same workshop.',
        examples: [
          { id: 'A', values: ['Safe-expression cluster: find one’s voice, reduce fear of judgment, and become someone who can share ideas.', 'Look for families who inspect trial sessions and group size, ask about the instructor’s approach, and seek proof of a safe environment.', 'Do they respond differently to small groups and trial sessions? If the cluster passes the five filters, test “Feel free to express yourself first.”'] },
          { id: 'B', values: ['Growth cluster: improve writing ability, see progress, and be recognized as someone who creates.', 'Look for families who compare instructor profiles, feedback methods, and stages of development.', 'Do they respond differently to structured feedback? If the cluster passes the five filters, test “See progress in everything you create.”'] },
          { id: 'C', values: ['Easy-participation cluster: access a worthwhile activity, reduce scheduling stress, and feel like a family that uses time well.', 'Look for families researching session options, flexible enrollment, and solutions that require no travel.', 'Do they respond differently to a modular schedule? If the cluster passes the five filters, test “Make room for creative time in your life.”'] },
        ],
      },
      {
        title: 'Content service for small businesses',
        description: 'Separate businesses seeking the same content service by the value they are actually buying.',
        examples: [
          { id: 'A', values: ['Consistency cluster: sustain visibility, reduce anxiety about falling behind, and appear to be an active brand.', 'Look for businesses that ask about calendars and delivery frequency, examine recurring packages, and complain about gaps in publishing.', 'Do they respond differently to a ready-made calendar? If the cluster passes the five filters, test “Keep your brand from going quiet.”'] },
          { id: 'B', values: ['Brand-integrity cluster: preserve their own voice, reduce the fear of sounding unfamiliar, and be recognized as an original brand.', 'Look for businesses that closely examine sample copy, request revisions, and ask how brand voice is developed.', 'Do they respond differently to a tone guide? If the cluster passes the five filters, test “Outside support, an inside voice.”'] },
          { id: 'C', values: ['Decision-ease cluster: delegate the process, reduce mental load, and remain in command of the business.', 'Look for businesses that question approval flows, meeting requirements, and the number of decisions expected from them.', 'Do they respond differently to a managed process? If the cluster passes the five filters, test “Stop rethinking every post.”'] },
        ],
      },
    ],
    pattern: {
      title: 'Move from need to the marketing mix.',
      body: 'Needs-based segmentation begins with need, uses demographics only to identify and reach people, tests the segment commercially and behaviorally, and carries the result into the marketing mix.',
      flow: 'Need → Identity → Attractiveness → Profitability → Positioning → Test → 4Ps',
      steps: [
        { title: 'Need groups', description: 'Form clusters around functional, emotional, and social benefits.' },
        { title: 'Segment identity', description: 'Define the behavioral, lifestyle, and demographic clues that help locate the group.' },
        { title: 'Attractiveness', description: 'Assess growth, competition, reach, and scalability.' },
        { title: 'Profitability', description: 'Test the logic of acquisition, service cost, and lifetime value.' },
        { title: 'Positioning', description: 'Build a segment-specific value proposition and price-benefit balance.' },
        { title: 'Viability test', description: 'Test whether the offer produces a “this is exactly for me” response.' },
        { title: 'Marketing mix', description: 'Align product, price, place, and communication with the segment.' },
      ],
    },
    assignment: {
      title: 'Build three need segments in one market.',
      intro: 'Keep the product category fixed. Build three need clusters, locate them in the market, and pass each through the usable-segment filters.',
      questions: ['Which market are you examining, and what are the three need clusters?', 'What are the functional, emotional, and social needs in each cluster?', 'Which behaviors, contexts, and secondary signals would help you find each cluster?', 'Is each cluster measurable, substantial, reachable, differentiable, and actionable?', 'How should the value proposition and marketing mix change for the segment that passes the filters?'],
    },
    simulation: {
      intro: 'Describe one product or market. Claude will build multidimensional need clusters, identify each segment, and test whether it is usable.',
      placeholder: 'For example: I offer a weekly healthy-meal subscription…',
      starters: ['Weekly healthy-meal subscription', 'Online creative workshop for children', 'Content service for small businesses'],
      modeling: 'In the first stage, combine functional, emotional, and social needs. In the second, prioritize behavioral and usage clues; use demographics as secondary identifiers that help locate the group, not as the reason the segment exists. In the third, test the segment against all five usability criteria. The pattern and decision should follow the seven-step path from need group to marketing mix.',
      criteria: ['Measurable', 'Substantial', 'Reachable', 'Differentiable', 'Actionable'],
    },
  },
  ru: {
    elements: [
      { title: 'Соберите кластер потребностей', caption: 'Функциональный, эмоциональный и социальный прогресс', definition: 'Люди, которые ищут один и тот же продукт, не обязательно решают одну и ту же задачу. Сегментация по потребностям объединяет клиентов не по возрасту или доходу, а по желаемому функциональному результату, эмоции и социальному смыслу.', question: 'Какого функционального, эмоционального и социального прогресса ищут люди на одном рынке?' },
      { title: 'Определите профиль сегмента', caption: 'Ориентиры для поиска группы', definition: 'Когда группа потребностей определена, поведение, контекст использования, образ жизни и демография помогают найти этих людей на рынке. Эти признаки не создают сегмент, а делают уже существующий сегмент заметным и доступным.', question: 'По каким действиям, контекстам и вторичным признакам можно найти людей с этой потребностью?' },
      { title: 'Проверьте жизнеспособность сегмента', caption: 'Практичное и устойчивое различие', definition: 'Не каждый кластер потребностей является сегментом. Группа должна быть измеримой, достаточно значимой, доступной, отличаться реакцией от других и быть пригодной для действий бренда.', question: 'Проходит ли этот кластер все пять фильтров и требует ли он действительно иного маркетингового решения?' },
    ],
    examples: [
      { id: 'A', values: ['Кластер гибкости: сохранять режим, не терять контроль и чувствовать, что хорошо управляешь своей жизнью.', 'Его выдают частая смена дня доставки, изучение условий паузы и нежелание привязываться к жёсткому плану.', 'Сильнее ли группа реагирует на гибкость, доступна ли она и можем ли мы её обслужить? Если да, проверьте обещание «План подстраивается под вашу жизнь».'] },
      { id: 'B', values: ['Кластер контроля: знать состав, снижать неопределённость и считать себя осознанным покупателем.', 'Его выдают подробное изучение состава и порций, сравнение меню и вопросы о соответствии личным требованиям.', 'Отличается ли реакция на прозрачность состава и выбор меню? Измерима и значима ли группа? Если да, проверьте обещание «Знайте состав и выбирайте сами».'] },
      { id: 'C', values: ['Кластер простоты: избавиться от планирования, освободить внимание и без усилий поддерживать порядок в жизни.', 'Его выдают выбор готового плана, стремление сократить число решений и интерес к автоматическому продлению.', 'Отличается ли реакция на полностью управляемый план и способен ли бренд его поддерживать? Если да, проверьте обещание «Не планируйте неделю заново».'] },
    ],
    exampleGroups: [
      {
        title: 'Еженедельная подписка на здоровое питание',
        description: 'Разделите клиентов одного сервиса по трём разным задачам, которые они пытаются решить.',
        examples: [
          { id: 'A', values: ['Кластер гибкости: сохранять режим, не терять контроль и чувствовать, что хорошо управляешь своей жизнью.', 'Его выдают частая смена дня доставки, изучение условий паузы и нежелание привязываться к жёсткому плану.', 'Сильнее ли группа реагирует на гибкость, доступна ли она и можем ли мы её обслужить? Если да, проверьте обещание «План подстраивается под вашу жизнь».'] },
          { id: 'B', values: ['Кластер контроля: знать состав, снижать неопределённость и считать себя осознанным покупателем.', 'Его выдают подробное изучение состава и порций, сравнение меню и вопросы о соответствии личным требованиям.', 'Отличается ли реакция на прозрачность состава и выбор меню? Измерима и значима ли группа? Если да, проверьте обещание «Знайте состав и выбирайте сами».'] },
          { id: 'C', values: ['Кластер простоты: избавиться от планирования, освободить внимание и без усилий поддерживать порядок в жизни.', 'Его выдают выбор готового плана, стремление сократить число решений и интерес к автоматическому продлению.', 'Отличается ли реакция на полностью управляемый план и способен ли бренд его поддерживать? Если да, проверьте обещание «Не планируйте неделю заново».'] },
        ],
      },
      {
        title: 'Онлайн-мастерская для детей',
        description: 'Покажите разные ожидания семей, которые рассматривают одну и ту же творческую мастерскую.',
        examples: [
          { id: 'A', values: ['Кластер безопасного самовыражения: найти свой голос, снизить страх оценки и научиться делиться идеями.', 'Его выдают интерес к пробному занятию и размеру группы, вопросы о подходе преподавателя и поиск подтверждений безопасной атмосферы.', 'Отличается ли реакция на малую группу и пробное занятие? Если кластер проходит пять фильтров, проверьте обещание «Сначала почувствуй свободу выражать себя».'] },
          { id: 'B', values: ['Кластер развития: улучшать навыки письма, видеть прогресс и получать признание как автор.', 'Его выдают сравнение преподавателей, методов обратной связи и этапов развития.', 'Отличается ли реакция на структурированную обратную связь? Если кластер проходит пять фильтров, проверьте обещание «Видеть рост в каждой работе».'] },
          { id: 'C', values: ['Кластер лёгкого участия: получить доступ к качественному занятию, снизить стресс расписания и разумно использовать время семьи.', 'Его выдают интерес к вариантам расписания, гибкой записи и занятиям без поездок.', 'Отличается ли реакция на модульное расписание? Если кластер проходит пять фильтров, проверьте обещание «Найдите место для творчества в своей жизни».'] },
        ],
      },
      {
        title: 'Контент-сервис для малого бизнеса',
        description: 'Разделите компании, ищущие одну услугу, по ценности, которую они на самом деле покупают.',
        examples: [
          { id: 'A', values: ['Кластер регулярности: сохранять заметность, уменьшить страх отстать и выглядеть активным брендом.', 'Его выдают вопросы о календаре и частоте публикаций, интерес к регулярным пакетам и жалобы на паузы в контенте.', 'Отличается ли реакция на готовый календарь? Если кластер проходит пять фильтров, проверьте обещание «Ваш бренд не замолкает».'] },
          { id: 'B', values: ['Кластер целостности бренда: сохранить собственный голос, не звучать чуждо и оставаться узнаваемым оригинальным брендом.', 'Его выдают внимательное изучение примеров, запросы на правки и вопросы о процессе формирования голоса бренда.', 'Отличается ли реакция на гайд по тону? Если кластер проходит пять фильтров, проверьте обещание «Поддержка снаружи, голос изнутри».'] },
          { id: 'C', values: ['Кластер лёгкости решений: делегировать процесс, снизить умственную нагрузку и сохранять контроль над бизнесом.', 'Его выдают вопросы о согласовании, необходимости встреч и количестве решений со стороны клиента.', 'Отличается ли реакция на управляемый процесс? Если кластер проходит пять фильтров, проверьте обещание «Не обдумывайте каждый пост заново».'] },
        ],
      },
    ],
    pattern: {
      title: 'Пройдите от потребности к комплексу маркетинга.',
      body: 'Сегментация по потребностям начинается с потребности, использует демографию только для поиска и доступа, проверяет сегмент коммерчески и поведенчески, а затем переносит результат в комплекс маркетинга.',
      flow: 'Потребность → Профиль → Привлекательность → Прибыльность → Позиционирование → Тест → 4P',
      steps: [
        { title: 'Группы потребностей', description: 'Соберите кластеры по функциональной, эмоциональной и социальной выгоде.' },
        { title: 'Профиль сегмента', description: 'Определите поведение, образ жизни и демографические признаки, помогающие найти группу.' },
        { title: 'Привлекательность', description: 'Оцените рост, конкуренцию, доступность и масштабируемость.' },
        { title: 'Прибыльность', description: 'Проверьте логику привлечения, обслуживания и пожизненной ценности.' },
        { title: 'Позиционирование', description: 'Сформируйте ценностное предложение и баланс цены и выгоды для сегмента.' },
        { title: 'Проверка жизнеспособности', description: 'Узнайте, вызывает ли предложение реакцию «это именно для меня».' },
        { title: 'Комплекс маркетинга', description: 'Настройте продукт, цену, каналы и коммуникацию под сегмент.' },
      ],
    },
    assignment: {
      title: 'Создайте три сегмента потребностей на одном рынке.',
      intro: 'Не меняйте категорию продукта. Создайте три кластера потребностей, найдите их на рынке и проверьте каждый фильтрами пригодного сегмента.',
      questions: ['Какой рынок вы рассматриваете и какие три кластера потребностей видите?', 'Каковы функциональная, эмоциональная и социальная потребности каждого кластера?', 'По каким действиям, контекстам и вторичным признакам можно найти каждый кластер?', 'Является ли каждый кластер измеримым, значимым, доступным, отличимым и пригодным для действий?', 'Как должны измениться ценностное предложение и комплекс маркетинга для сегмента, прошедшего фильтры?'],
    },
    simulation: {
      intro: 'Опишите один продукт или рынок. Claude сформирует многомерные кластеры потребностей, определит профиль каждого сегмента и проверит его практическую пригодность.',
      placeholder: 'Например: я предлагаю еженедельную подписку на здоровое питание…',
      starters: ['Еженедельная подписка на здоровое питание', 'Онлайн-мастерская для детей', 'Контент-сервис для малого бизнеса'],
      modeling: 'На первом этапе соедините функциональную, эмоциональную и социальную потребности. На втором опирайтесь на поведение и контекст использования; применяйте демографию как вторичный ориентир для поиска группы, а не как причину существования сегмента. На третьем проверьте сегмент по пяти критериям пригодности. Связь и решение должны следовать семи шагам от группы потребностей до комплекса маркетинга.',
      criteria: ['Измеримый', 'Значимый', 'Доступный', 'Отличимый', 'Пригодный для действий'],
    },
  },
};
