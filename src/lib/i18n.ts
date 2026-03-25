export const languages = [
  { code: 'en', flag: '🇬🇧', label: 'English', nativeLabel: 'English', direction: 'ltr' },
  { code: 'fr', flag: '🇫🇷', label: 'French', nativeLabel: 'Francais', direction: 'ltr' },
  { code: 'de', flag: '🇩🇪', label: 'German', nativeLabel: 'Deutsch', direction: 'ltr' },
  { code: 'it', flag: '🇮🇹', label: 'Italian', nativeLabel: 'Italiano', direction: 'ltr' },
  { code: 'la', flag: '🇻🇦', label: 'Latin', nativeLabel: 'Latina', direction: 'ltr' },
  { code: 'es', flag: '🇪🇸', label: 'Spanish', nativeLabel: 'Espanol', direction: 'ltr' },
  { code: 'pt', flag: '🇵🇹', label: 'Portuguese', nativeLabel: 'Portugues', direction: 'ltr' },
  { code: 'mg', flag: '🇲🇬', label: 'Malagasy', nativeLabel: 'Malagasy', direction: 'ltr' },
  { code: 'zh', flag: '🇹🇼', label: 'Chinese', nativeLabel: '繁體中文', direction: 'ltr' },
  { code: 'ar', flag: '🇸🇦', label: 'Arabic', nativeLabel: 'العربية', direction: 'rtl' },
] as const;

export type AppLanguage = (typeof languages)[number]['code'];

type PartLabels = {
  Prologue: string;
  'Profession of Faith': string;
  'Celebration of the Christian Mystery': string;
  'Life in Christ': string;
  'Christian Prayer': string;
};

type UiStrings = {
  wordmarkKicker: string;
  wordmarkTitle: string;
  navOverview: string;
  navExplorer: string;
  navTopNode: string;
  homeEyebrow: string;
  homeTitle: string;
  homeLede: string;
  homeOpenGraph: string;
  homeViewSource: string;
  statParagraphs: string;
  statInternalLinks: string;
  statExternalRefs: string;
  featureGraphTitle: string;
  featureGraphBody: string;
  featureReferenceTitle: string;
  featureReferenceBody: string;
  featureRankTitle: string;
  featureRankBody: string;
  rankingEyebrow: string;
  rankingTitle: string;
  explorerEyebrow: string;
  explorerTitle: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchOpen: string;
  focusedNode: string;
  readParagraph: string;
  paragraphNotFound: string;
  backToExplorer: string;
  loadingTitle: string;
  errorTitle: string;
  sourceMaterial: string;
  openSource: string;
  externalReferences: string;
  footnotes: string;
  linksOut: string;
  linksIn: string;
  returnToGraph: string;
  localGraph: string;
  localGraphBlurb: string;
  graphZoom: string;
  graphPan: string;
  graphClickDetail: string;
  graphClickFollow: string;
  outgoing: string;
  incoming: string;
  rank: string;
  scripture: string;
  document: string;
  footnote: string;
  paragraph: string;
  parts: PartLabels;
};

const partTranslations = {
  en: {
    Prologue: 'Prologue',
    'Profession of Faith': 'Profession of Faith',
    'Celebration of the Christian Mystery': 'Celebration of the Christian Mystery',
    'Life in Christ': 'Life in Christ',
    'Christian Prayer': 'Christian Prayer',
  },
  fr: {
    Prologue: 'Prologue',
    'Profession of Faith': 'Profession de la foi',
    'Celebration of the Christian Mystery': 'Celebration du mystere chretien',
    'Life in Christ': 'La vie dans le Christ',
    'Christian Prayer': 'La priere chretienne',
  },
  de: {
    Prologue: 'Prolog',
    'Profession of Faith': 'Glaubensbekenntnis',
    'Celebration of the Christian Mystery': 'Feier des christlichen Mysteriums',
    'Life in Christ': 'Das Leben in Christus',
    'Christian Prayer': 'Das christliche Gebet',
  },
  it: {
    Prologue: 'Prologo',
    'Profession of Faith': 'Professione della fede',
    'Celebration of the Christian Mystery': 'Celebrazione del mistero cristiano',
    'Life in Christ': 'La vita in Cristo',
    'Christian Prayer': 'La preghiera cristiana',
  },
  la: {
    Prologue: 'Prooemium',
    'Profession of Faith': 'Professio fidei',
    'Celebration of the Christian Mystery': 'Celebratio mysterii christiani',
    'Life in Christ': 'Vita in Christo',
    'Christian Prayer': 'Oratio christiana',
  },
  es: {
    Prologue: 'Prologo',
    'Profession of Faith': 'La profesion de la fe',
    'Celebration of the Christian Mystery': 'La celebracion del misterio cristiano',
    'Life in Christ': 'La vida en Cristo',
    'Christian Prayer': 'La oracion cristiana',
  },
  pt: {
    Prologue: 'Prologo',
    'Profession of Faith': 'A profissao da fe',
    'Celebration of the Christian Mystery': 'A celebracao do misterio cristao',
    'Life in Christ': 'A vida em Cristo',
    'Christian Prayer': 'A oracao crista',
  },
  mg: {
    Prologue: 'Sasin-teny',
    'Profession of Faith': 'Fiekem-pinoana',
    'Celebration of the Christian Mystery': 'Fankalazana ny mistery kristianina',
    'Life in Christ': 'Fiainana ao amin’i Kristy',
    'Christian Prayer': 'Vavaka kristianina',
  },
  zh: {
    Prologue: '序言',
    'Profession of Faith': '信仰的宣認',
    'Celebration of the Christian Mystery': '基督奧蹟的慶典',
    'Life in Christ': '在基督內的生活',
    'Christian Prayer': '基督徒的祈禱',
  },
  ar: {
    Prologue: 'المقدمة',
    'Profession of Faith': 'االعتراف باإليمان',
    'Celebration of the Christian Mystery': 'االحتفال بالسر المسيحي',
    'Life in Christ': 'الحياة في المسيح',
    'Christian Prayer': 'الصالة المسيحية',
  },
} satisfies Record<AppLanguage, PartLabels>;

export const uiStrings: Record<AppLanguage, UiStrings> = {
  en: {
    wordmarkKicker: 'Catholic Core',
    wordmarkTitle: 'Connections in the Catechism',
    navOverview: 'Overview',
    navExplorer: 'Explorer',
    navTopNode: 'Top Node',
    homeEyebrow: 'A way to explore the connections in the Catechism',
    homeTitle: 'The Catechism as a navigable network, not just a shelf of pages.',
    homeLede:
      'This site turns every numbered paragraph into a node, maps its outgoing and incoming links, ranks the graph with PageRank, and lets you move from overview to close reading in one click.',
    homeOpenGraph: 'Open the graph',
    homeViewSource: 'View source corpus',
    statParagraphs: 'Paragraphs',
    statInternalLinks: 'Internal links',
    statExternalRefs: 'External refs',
    featureGraphTitle: 'Graph-first reading',
    featureGraphBody:
      'Zoom through the whole corpus, hover to preview a paragraph, and open any node as a full reading view.',
    featureReferenceTitle: 'Reference mapping',
    featureReferenceBody:
      'Outgoing references show where a paragraph points. Incoming references reveal where it is invoked.',
    featureRankTitle: 'PageRank',
    featureRankBody:
      'The ranking layer estimates which paragraphs are most central in a random walk through the internal graph.',
    rankingEyebrow: 'Most central paragraphs',
    rankingTitle: 'Current top PageRank nodes',
    explorerEyebrow: 'Explorer',
    explorerTitle: 'Trace the web of references',
    searchLabel: 'Find a paragraph',
    searchPlaceholder: 'Try 2558, Eucharist, prayer...',
    searchOpen: 'Open',
    focusedNode: 'Focused node',
    readParagraph: 'Read paragraph',
    paragraphNotFound: 'Paragraph not found',
    backToExplorer: 'Back to explorer',
    loadingTitle: 'Loading the Catechism graph...',
    errorTitle: 'Graph data failed to load',
    sourceMaterial: 'Source material',
    openSource: 'Open the Vatican source page',
    externalReferences: 'External references',
    footnotes: 'Footnotes',
    linksOut: 'Links out',
    linksIn: 'Links in',
    returnToGraph: 'Return to graph',
    localGraph: 'Local graph',
    localGraphBlurb: 'Two hops in every direction. One-way links carry arrows.',
    graphZoom: 'Scroll to zoom',
    graphPan: 'Drag to pan',
    graphClickDetail: 'Click a node for full paragraph detail',
    graphClickFollow: 'Click to follow a paragraph',
    outgoing: 'outgoing',
    incoming: 'incoming',
    rank: 'Rank',
    scripture: 'Scripture',
    document: 'Document',
    footnote: 'Footnote',
    paragraph: 'Paragraph',
    parts: partTranslations.en,
  },
  fr: {
    wordmarkKicker: 'Coeur catholique',
    wordmarkTitle: 'Connexions dans le Catechisme',
    navOverview: 'Vue generale',
    navExplorer: 'Explorateur',
    navTopNode: 'Noeud principal',
    homeEyebrow: 'Une facon d’explorer les connexions du Catechisme',
    homeTitle: 'Le Catechisme comme reseau navigable, pas seulement comme suite de pages.',
    homeLede:
      'Le site transforme chaque paragraphe numerote en noeud, trace les liens entrants et sortants, applique PageRank et permet de passer de la vue d’ensemble a la lecture de pres.',
    homeOpenGraph: 'Ouvrir le graphe',
    homeViewSource: 'Voir la source',
    statParagraphs: 'Paragraphes',
    statInternalLinks: 'Liens internes',
    statExternalRefs: 'Refs externes',
    featureGraphTitle: 'Lecture par graphe',
    featureGraphBody:
      'Zoomez dans tout le corpus, survolez pour un apercu et ouvrez n’importe quel noeud en lecture complete.',
    featureReferenceTitle: 'Cartographie des references',
    featureReferenceBody:
      'Les liens sortants montrent ou un paragraphe pointe. Les liens entrants montrent ou il est invoque.',
    featureRankTitle: 'PageRank',
    featureRankBody:
      'Le classement estime quels paragraphes sont les plus centraux dans une marche aleatoire sur le graphe interne.',
    rankingEyebrow: 'Paragraphes les plus centraux',
    rankingTitle: 'Noeuds PageRank dominants',
    explorerEyebrow: 'Explorateur',
    explorerTitle: 'Suivre le reseau des references',
    searchLabel: 'Trouver un paragraphe',
    searchPlaceholder: 'Essayez 2558, Eucharistie, priere...',
    searchOpen: 'Ouvrir',
    focusedNode: 'Noeud cible',
    readParagraph: 'Lire le paragraphe',
    paragraphNotFound: 'Paragraphe introuvable',
    backToExplorer: 'Retour a l’explorateur',
    loadingTitle: 'Chargement du graphe du Catechisme...',
    errorTitle: 'Echec du chargement des donnees',
    sourceMaterial: 'Source',
    openSource: 'Ouvrir la page source du Vatican',
    externalReferences: 'References externes',
    footnotes: 'Notes',
    linksOut: 'Liens sortants',
    linksIn: 'Liens entrants',
    returnToGraph: 'Retour au graphe',
    localGraph: 'Graphe local',
    localGraphBlurb: 'Deux degres dans chaque direction. Les liens a sens unique portent des fleches.',
    graphZoom: 'Molette pour zoomer',
    graphPan: 'Faire glisser pour deplacer',
    graphClickDetail: 'Cliquez pour ouvrir le detail complet',
    graphClickFollow: 'Cliquez pour suivre le paragraphe',
    outgoing: 'sortants',
    incoming: 'entrants',
    rank: 'Rang',
    scripture: 'Ecriture',
    document: 'Document',
    footnote: 'Note',
    paragraph: 'Paragraphe',
    parts: partTranslations.fr,
  },
  de: {
    wordmarkKicker: 'Katholischer Kern',
    wordmarkTitle: 'Verbindungen im Katechismus',
    navOverview: 'Ubersicht',
    navExplorer: 'Explorer',
    navTopNode: 'Top-Knoten',
    homeEyebrow: 'Ein Weg, die Verbindungen im Katechismus zu erkunden',
    homeTitle: 'Der Katechismus als navigierbares Netzwerk statt nur als Reihe von Seiten.',
    homeLede:
      'Die Seite macht jeden nummerierten Absatz zu einem Knoten, kartiert eingehende und ausgehende Links, berechnet PageRank und verbindet Ubersicht mit Nahlekture.',
    homeOpenGraph: 'Graph offnen',
    homeViewSource: 'Quelle ansehen',
    statParagraphs: 'Absatze',
    statInternalLinks: 'Interne Links',
    statExternalRefs: 'Externe Verweise',
    featureGraphTitle: 'Graphisches Lesen',
    featureGraphBody:
      'Zoomen Sie durch den ganzen Korpus, fahren Sie fur eine Vorschau daruber und offnen Sie jeden Knoten.',
    featureReferenceTitle: 'Referenzkarte',
    featureReferenceBody:
      'Ausgehende Verweise zeigen, wohin ein Absatz weist. Eingehende zeigen, wo er aufgerufen wird.',
    featureRankTitle: 'PageRank',
    featureRankBody:
      'Die Rangschicht schatzt, welche Absatze in einem Zufallsgang durch den internen Graphen am zentralsten sind.',
    rankingEyebrow: 'Zentralste Absatze',
    rankingTitle: 'Aktuelle Top-PageRank-Knoten',
    explorerEyebrow: 'Explorer',
    explorerTitle: 'Das Netz der Verweise verfolgen',
    searchLabel: 'Absatz finden',
    searchPlaceholder: 'Versuchen Sie 2558, Eucharistie, Gebet...',
    searchOpen: 'Offnen',
    focusedNode: 'Fokussierter Knoten',
    readParagraph: 'Absatz lesen',
    paragraphNotFound: 'Absatz nicht gefunden',
    backToExplorer: 'Zuruck zum Explorer',
    loadingTitle: 'Der Katechismus-Graph wird geladen...',
    errorTitle: 'Graphdaten konnten nicht geladen werden',
    sourceMaterial: 'Quelle',
    openSource: 'Vatikan-Quellseite offnen',
    externalReferences: 'Externe Verweise',
    footnotes: 'Fussnoten',
    linksOut: 'Ausgehende Links',
    linksIn: 'Eingehende Links',
    returnToGraph: 'Zuruck zum Graphen',
    localGraph: 'Lokaler Graph',
    localGraphBlurb: 'Zwei Schritte in jede Richtung. Einseitige Links tragen Pfeile.',
    graphZoom: 'Scrollen zum Zoomen',
    graphPan: 'Ziehen zum Verschieben',
    graphClickDetail: 'Klicken fur die volle Absatzansicht',
    graphClickFollow: 'Klicken, um dem Absatz zu folgen',
    outgoing: 'ausgehend',
    incoming: 'eingehend',
    rank: 'Rang',
    scripture: 'Schrift',
    document: 'Dokument',
    footnote: 'Fussnote',
    paragraph: 'Absatz',
    parts: partTranslations.de,
  },
  it: {
    wordmarkKicker: 'Nucleo cattolico',
    wordmarkTitle: 'Connessioni nel Catechismo',
    navOverview: 'Panoramica',
    navExplorer: 'Esploratore',
    navTopNode: 'Nodo principale',
    homeEyebrow: 'Un modo per esplorare le connessioni del Catechismo',
    homeTitle: 'Il Catechismo come rete navigabile, non solo come serie di pagine.',
    homeLede:
      'Il sito trasforma ogni paragrafo numerato in un nodo, mappa i collegamenti in entrata e in uscita, applica PageRank e unisce visione d’insieme e lettura ravvicinata.',
    homeOpenGraph: 'Apri il grafo',
    homeViewSource: 'Vedi la fonte',
    statParagraphs: 'Paragrafi',
    statInternalLinks: 'Link interni',
    statExternalRefs: 'Riferimenti esterni',
    featureGraphTitle: 'Lettura a grafo',
    featureGraphBody:
      'Esplora l’intero corpus con lo zoom, passa sopra per un’anteprima e apri ogni nodo in lettura completa.',
    featureReferenceTitle: 'Mappa dei riferimenti',
    featureReferenceBody:
      'I riferimenti in uscita mostrano dove punta un paragrafo. Quelli in entrata mostrano dove viene richiamato.',
    featureRankTitle: 'PageRank',
    featureRankBody:
      'Il livello di ranking stima quali paragrafi sono piu centrali in una camminata casuale nel grafo interno.',
    rankingEyebrow: 'Paragrafi piu centrali',
    rankingTitle: 'Nodi PageRank principali',
    explorerEyebrow: 'Esploratore',
    explorerTitle: 'Seguire la rete dei riferimenti',
    searchLabel: 'Trova un paragrafo',
    searchPlaceholder: 'Prova 2558, Eucaristia, preghiera...',
    searchOpen: 'Apri',
    focusedNode: 'Nodo attivo',
    readParagraph: 'Leggi il paragrafo',
    paragraphNotFound: 'Paragrafo non trovato',
    backToExplorer: 'Torna all’esploratore',
    loadingTitle: 'Caricamento del grafo del Catechismo...',
    errorTitle: 'Caricamento dei dati non riuscito',
    sourceMaterial: 'Fonte',
    openSource: 'Apri la pagina fonte del Vaticano',
    externalReferences: 'Riferimenti esterni',
    footnotes: 'Note',
    linksOut: 'Link in uscita',
    linksIn: 'Link in entrata',
    returnToGraph: 'Torna al grafo',
    localGraph: 'Grafo locale',
    localGraphBlurb: 'Due gradi in ogni direzione. I collegamenti a senso unico mostrano frecce.',
    graphZoom: 'Scorri per zoomare',
    graphPan: 'Trascina per spostare',
    graphClickDetail: 'Clicca un nodo per il dettaglio completo',
    graphClickFollow: 'Clicca per seguire il paragrafo',
    outgoing: 'in uscita',
    incoming: 'in entrata',
    rank: 'Rango',
    scripture: 'Scrittura',
    document: 'Documento',
    footnote: 'Nota',
    paragraph: 'Paragrafo',
    parts: partTranslations.it,
  },
  la: {
    wordmarkKicker: 'Nucleus catholicus',
    wordmarkTitle: 'Nexus in Catechismo',
    navOverview: 'Conspectus',
    navExplorer: 'Exploratio',
    navTopNode: 'Nodus princeps',
    homeEyebrow: 'Via ad nexus Catechismi explorandos',
    homeTitle: 'Catechismus ut rete navigabile, non tantum series paginarum.',
    homeLede:
      'Haec pagina unumquemque paragraphum numeratum in nodum convertit, nexus intrantes atque exeuntes describit, PageRank computat, et transitum a conspectu ad lectionem propiorem facit.',
    homeOpenGraph: 'Aperi rete',
    homeViewSource: 'Vide fontem',
    statParagraphs: 'Paragraphi',
    statInternalLinks: 'Nexus interni',
    statExternalRefs: 'Rerum externarum nexus',
    featureGraphTitle: 'Lectio per rete',
    featureGraphBody:
      'Per totum corpus zooma, cursorio brevem conspectum ostende, et quemlibet nodum aperi.',
    featureReferenceTitle: 'Descriptio relationum',
    featureReferenceBody:
      'Nexus exeuntes ostendunt quo paragraphus tendat. Intrantes ostendunt ubi adhibeatur.',
    featureRankTitle: 'PageRank',
    featureRankBody:
      'Ordo aestimat qui paragraphi in cursu fortuito per rete internum maxime centrales sint.',
    rankingEyebrow: 'Paragraphi maxime centrales',
    rankingTitle: 'Nodi summi PageRank',
    explorerEyebrow: 'Exploratio',
    explorerTitle: 'Rete relationum persequi',
    searchLabel: 'Quaere paragraphum',
    searchPlaceholder: 'Exempli gratia 2558, Eucharistia, oratio...',
    searchOpen: 'Aperi',
    focusedNode: 'Nodus intentus',
    readParagraph: 'Lege paragraphum',
    paragraphNotFound: 'Paragraphus non inventus',
    backToExplorer: 'Redi ad explorationem',
    loadingTitle: 'Graphum Catechismi oneratur...',
    errorTitle: 'Data graphi onerari non potuerunt',
    sourceMaterial: 'Fons',
    openSource: 'Aperi fontem Vaticanum',
    externalReferences: 'Relationes externae',
    footnotes: 'Notae',
    linksOut: 'Nexus exeuntes',
    linksIn: 'Nexus intrantes',
    returnToGraph: 'Redi ad rete',
    localGraph: 'Rete locale',
    localGraphBlurb: 'Duo gradus in utramque partem. Nexus unius partis sagittas habent.',
    graphZoom: 'Volve ad augendum',
    graphPan: 'Trahe ad movendum',
    graphClickDetail: 'Claude in nodum ad plenam paginam',
    graphClickFollow: 'Claude ut paragraphum sequaris',
    outgoing: 'exeuntes',
    incoming: 'intrantes',
    rank: 'Ordo',
    scripture: 'Scriptura',
    document: 'Documentum',
    footnote: 'Nota',
    paragraph: 'Paragraphus',
    parts: partTranslations.la,
  },
  es: {
    wordmarkKicker: 'Nucleo catolico',
    wordmarkTitle: 'Conexiones en el Catecismo',
    navOverview: 'Resumen',
    navExplorer: 'Explorador',
    navTopNode: 'Nodo principal',
    homeEyebrow: 'Una forma de explorar las conexiones del Catecismo',
    homeTitle: 'El Catecismo como una red navegable, no solo como un conjunto de paginas.',
    homeLede:
      'El sitio convierte cada parrafo numerado en un nodo, mapea enlaces entrantes y salientes, aplica PageRank y permite pasar de la vista general a la lectura cercana.',
    homeOpenGraph: 'Abrir el grafo',
    homeViewSource: 'Ver la fuente',
    statParagraphs: 'Parrafos',
    statInternalLinks: 'Enlaces internos',
    statExternalRefs: 'Referencias externas',
    featureGraphTitle: 'Lectura en forma de grafo',
    featureGraphBody:
      'Recorre todo el corpus con zoom, pasa el cursor para una vista previa y abre cualquier nodo.',
    featureReferenceTitle: 'Mapa de referencias',
    featureReferenceBody:
      'Las referencias salientes muestran hacia donde apunta un parrafo. Las entrantes muestran donde se invoca.',
    featureRankTitle: 'PageRank',
    featureRankBody:
      'La capa de ranking estima que parrafos son mas centrales en una caminata aleatoria por el grafo interno.',
    rankingEyebrow: 'Parrafos mas centrales',
    rankingTitle: 'Nodos PageRank principales',
    explorerEyebrow: 'Explorador',
    explorerTitle: 'Seguir la red de referencias',
    searchLabel: 'Buscar un parrafo',
    searchPlaceholder: 'Prueba 2558, Eucaristia, oracion...',
    searchOpen: 'Abrir',
    focusedNode: 'Nodo enfocado',
    readParagraph: 'Leer el parrafo',
    paragraphNotFound: 'Parrafo no encontrado',
    backToExplorer: 'Volver al explorador',
    loadingTitle: 'Cargando el grafo del Catecismo...',
    errorTitle: 'No se pudieron cargar los datos',
    sourceMaterial: 'Fuente',
    openSource: 'Abrir la pagina fuente del Vaticano',
    externalReferences: 'Referencias externas',
    footnotes: 'Notas',
    linksOut: 'Enlaces salientes',
    linksIn: 'Enlaces entrantes',
    returnToGraph: 'Volver al grafo',
    localGraph: 'Grafo local',
    localGraphBlurb: 'Dos grados en cada direccion. Los enlaces de un solo sentido llevan flechas.',
    graphZoom: 'Desplaza para acercar',
    graphPan: 'Arrastra para mover',
    graphClickDetail: 'Haz clic para abrir el detalle',
    graphClickFollow: 'Haz clic para seguir el parrafo',
    outgoing: 'salientes',
    incoming: 'entrantes',
    rank: 'Rango',
    scripture: 'Escritura',
    document: 'Documento',
    footnote: 'Nota',
    paragraph: 'Parrafo',
    parts: partTranslations.es,
  },
  pt: {
    wordmarkKicker: 'Nucleo catolico',
    wordmarkTitle: 'Conexoes no Catecismo',
    navOverview: 'Visao geral',
    navExplorer: 'Explorador',
    navTopNode: 'No principal',
    homeEyebrow: 'Uma forma de explorar as conexoes no Catecismo',
    homeTitle: 'O Catecismo como uma rede navegavel, nao apenas uma sequencia de paginas.',
    homeLede:
      'O site transforma cada paragrafo numerado num no, mapeia ligacoes de entrada e saida, calcula PageRank e liga a visao geral a leitura de perto.',
    homeOpenGraph: 'Abrir o grafo',
    homeViewSource: 'Ver a fonte',
    statParagraphs: 'Paragrafos',
    statInternalLinks: 'Ligacoes internas',
    statExternalRefs: 'Referencias externas',
    featureGraphTitle: 'Leitura em grafo',
    featureGraphBody:
      'Percorra todo o corpus com zoom, passe o cursor para uma previa e abra qualquer no.',
    featureReferenceTitle: 'Mapa de referencias',
    featureReferenceBody:
      'As referencias de saida mostram para onde um paragrafo aponta. As de entrada mostram onde ele e citado.',
    featureRankTitle: 'PageRank',
    featureRankBody:
      'A camada de ranking estima quais paragrafos sao mais centrais numa caminhada aleatoria pelo grafo interno.',
    rankingEyebrow: 'Paragrafos mais centrais',
    rankingTitle: 'Nos principais de PageRank',
    explorerEyebrow: 'Explorador',
    explorerTitle: 'Seguir a rede de referencias',
    searchLabel: 'Encontrar um paragrafo',
    searchPlaceholder: 'Tente 2558, Eucaristia, oracao...',
    searchOpen: 'Abrir',
    focusedNode: 'No em foco',
    readParagraph: 'Ler o paragrafo',
    paragraphNotFound: 'Paragrafo nao encontrado',
    backToExplorer: 'Voltar ao explorador',
    loadingTitle: 'A carregar o grafo do Catecismo...',
    errorTitle: 'Falha ao carregar os dados',
    sourceMaterial: 'Fonte',
    openSource: 'Abrir a pagina fonte do Vaticano',
    externalReferences: 'Referencias externas',
    footnotes: 'Notas',
    linksOut: 'Ligacoes de saida',
    linksIn: 'Ligacoes de entrada',
    returnToGraph: 'Voltar ao grafo',
    localGraph: 'Grafo local',
    localGraphBlurb: 'Dois graus em cada direcao. Ligacoes de sentido unico mostram setas.',
    graphZoom: 'Deslize para ampliar',
    graphPan: 'Arraste para mover',
    graphClickDetail: 'Clique para abrir o detalhe',
    graphClickFollow: 'Clique para seguir o paragrafo',
    outgoing: 'saida',
    incoming: 'entrada',
    rank: 'Rank',
    scripture: 'Escritura',
    document: 'Documento',
    footnote: 'Nota',
    paragraph: 'Paragrafo',
    parts: partTranslations.pt,
  },
  mg: {
    wordmarkKicker: 'Fototra katolika',
    wordmarkTitle: 'Rohy ao amin’ny Katesizy',
    navOverview: 'Topimaso',
    navExplorer: 'Mpikaroka',
    navTopNode: 'Node ambony',
    homeEyebrow: 'Fomba iray hijerena ny fifandraisana ao amin’ny Katesizy',
    homeTitle: 'Ny Katesizy ho tambajotra azo tsidihina fa tsy andian-pejy fotsiny.',
    homeLede:
      'Ity tranonkala ity dia mamadika ny andininy voaisa tsirairay ho node, mandrefy ny rohy miditra sy mivoaka, mampihatra PageRank, ary mampitohy ny topimaso amin’ny famakiana akaiky.',
    homeOpenGraph: 'Sokafy ny tambajotra',
    homeViewSource: 'Jereo ny loharano',
    statParagraphs: 'Andininy',
    statInternalLinks: 'Rohy anatiny',
    statExternalRefs: 'Rohy ivelany',
    featureGraphTitle: 'Famakiana amin’ny tambajotra',
    featureGraphBody:
      'Ataovy zoom ny corpus manontolo, asehoy amin’ny hover ny topy maso, ary sokafy ny node rehetra.',
    featureReferenceTitle: 'Sarintanin’ny references',
    featureReferenceBody:
      'Ny rohy mivoaka dia mampiseho izay andehanan’ny andininy. Ny rohy miditra dia mampiseho izay iantsoana azy.',
    featureRankTitle: 'PageRank',
    featureRankBody:
      'Ny filaharana dia manombana izay andininy ivon’ny fivezivezena kisendrasendra ao amin’ny tambajotra anatiny.',
    rankingEyebrow: 'Andininy ivony indrindra',
    rankingTitle: 'Node PageRank ambony',
    explorerEyebrow: 'Mpikaroka',
    explorerTitle: 'Araho ny tambajotran’ny references',
    searchLabel: 'Mitadiava andininy',
    searchPlaceholder: 'Andramo 2558, Eokaristia, vavaka...',
    searchOpen: 'Sokafy',
    focusedNode: 'Node ifantohana',
    readParagraph: 'Vakio ny andininy',
    paragraphNotFound: 'Tsy hita ny andininy',
    backToExplorer: 'Hiverina amin’ny mpikaroka',
    loadingTitle: 'Mampiditra ny tambajotran’ny Katesizy...',
    errorTitle: 'Tsy afaka namaky ny angona',
    sourceMaterial: 'Loharano',
    openSource: 'Sokafy ny pejy loharano Vatican',
    externalReferences: 'References ivelany',
    footnotes: 'Fanamarihana',
    linksOut: 'Rohy mivoaka',
    linksIn: 'Rohy miditra',
    returnToGraph: 'Hiverina amin’ny tambajotra',
    localGraph: 'Tambajotra eo an-toerana',
    localGraphBlurb: 'Dingana roa amin’ny lafiny roa. Ny rohy tokana lalana dia misy zana-tsipika.',
    graphZoom: 'Ahetsika hanakaiky',
    graphPan: 'Sintomy hanetsika',
    graphClickDetail: 'Tsindrio hanokatra ny antsipiriany',
    graphClickFollow: 'Tsindrio hanaraka ny andininy',
    outgoing: 'mivoaka',
    incoming: 'miditra',
    rank: 'Laharana',
    scripture: 'Soratra Masina',
    document: 'Taratasy',
    footnote: 'Fanamarihana',
    paragraph: 'Andininy',
    parts: partTranslations.mg,
  },
  zh: {
    wordmarkKicker: '天主教核心',
    wordmarkTitle: '教理中的連結',
    navOverview: '總覽',
    navExplorer: '探索器',
    navTopNode: '最高節點',
    homeEyebrow: '一種探索教理內部連結的方法',
    homeTitle: '把《天主教教理》看成可導航的網路，而不只是頁面的堆疊。',
    homeLede:
      '這個網站把每個編號段落變成一個節點，整理其出入連結，以 PageRank 排名，並讓你在全局與細讀之間快速切換。',
    homeOpenGraph: '打開圖譜',
    homeViewSource: '查看來源',
    statParagraphs: '段落',
    statInternalLinks: '內部連結',
    statExternalRefs: '外部參照',
    featureGraphTitle: '以圖譜閱讀',
    featureGraphBody: '縮放整個語料，懸停查看預覽，點開任何節點進入完整閱讀。',
    featureReferenceTitle: '參照映射',
    featureReferenceBody: '外向連結顯示段落指向何處，內向連結顯示它在哪裡被引用。',
    featureRankTitle: 'PageRank',
    featureRankBody: '排名層估計在內部連結圖中的隨機遊走裡，哪些段落最居中。',
    rankingEyebrow: '最核心的段落',
    rankingTitle: '目前 PageRank 最高的節點',
    explorerEyebrow: '探索器',
    explorerTitle: '追蹤參照網路',
    searchLabel: '尋找段落',
    searchPlaceholder: '試試 2558、聖體、祈禱……',
    searchOpen: '打開',
    focusedNode: '目前節點',
    readParagraph: '閱讀段落',
    paragraphNotFound: '找不到段落',
    backToExplorer: '回到探索器',
    loadingTitle: '正在載入教理圖譜……',
    errorTitle: '圖譜資料載入失敗',
    sourceMaterial: '來源材料',
    openSource: '打開梵蒂岡原始頁面',
    externalReferences: '外部參照',
    footnotes: '註腳',
    linksOut: '連出',
    linksIn: '連入',
    returnToGraph: '回到圖譜',
    localGraph: '局部圖譜',
    localGraphBlurb: '向內與向外各兩層。單向連結會顯示箭頭。',
    graphZoom: '滾動縮放',
    graphPan: '拖曳平移',
    graphClickDetail: '點擊節點查看完整段落',
    graphClickFollow: '點擊以追蹤段落',
    outgoing: '連出',
    incoming: '連入',
    rank: '排名',
    scripture: '聖經',
    document: '文獻',
    footnote: '註腳',
    paragraph: '段落',
    parts: partTranslations.zh,
  },
  ar: {
    wordmarkKicker: 'الجوهر الكاثوليكي',
    wordmarkTitle: 'الروابط في التعليم المسيحي',
    navOverview: 'نظرة عامة',
    navExplorer: 'المستكشف',
    navTopNode: 'العقدة االعلى',
    homeEyebrow: 'طريقة الستكشاف الروابط داخل التعليم المسيحي',
    homeTitle: 'التعليم المسيحي كشبكة قابلة للتجول، ال كسلسلة صفحات فقط.',
    homeLede:
      'يحّول هذا الموقع كل فقرة مرقمة الى عقدة، ويرسم الروابط الداخلة والخارجة، ويحسب PageRank، ويجمع بين النظرة العامة والقراءة القريبة.',
    homeOpenGraph: 'افتح الرسم',
    homeViewSource: 'اعرض المصدر',
    statParagraphs: 'الفقرات',
    statInternalLinks: 'الروابط الداخلية',
    statExternalRefs: 'المراجع الخارجية',
    featureGraphTitle: 'قراءة عبر الرسم',
    featureGraphBody: 'كبّر كامل المتن، واعرض معاينة عند المرور، وافتح اي عقدة لقراءة كاملة.',
    featureReferenceTitle: 'خريطة المراجع',
    featureReferenceBody: 'الروابط الخارجة تبيّن الى اين تشير الفقرة، والداخلة تبيّن اين يجري استحضارها.',
    featureRankTitle: 'PageRank',
    featureRankBody: 'تقدّر طبقة الترتيب اي الفقرات هي االكثر مركزية في مسار عشوائي داخل الرسم الداخلي.',
    rankingEyebrow: 'الفقرات االكثر مركزية',
    rankingTitle: 'العقد االعلى في PageRank',
    explorerEyebrow: 'المستكشف',
    explorerTitle: 'تتبّع شبكة المراجع',
    searchLabel: 'ابحث عن فقرة',
    searchPlaceholder: 'جرّب 2558، االفخارستيا، الصالة...',
    searchOpen: 'افتح',
    focusedNode: 'العقدة المركّزة',
    readParagraph: 'اقرأ الفقرة',
    paragraphNotFound: 'لم يتم العثور على الفقرة',
    backToExplorer: 'العودة الى المستكشف',
    loadingTitle: 'جار تحميل رسم التعليم المسيحي...',
    errorTitle: 'فشل تحميل بيانات الرسم',
    sourceMaterial: 'المصدر',
    openSource: 'افتح صفحة الفاتيكان االصلية',
    externalReferences: 'المراجع الخارجية',
    footnotes: 'الحواشي',
    linksOut: 'روابط خارجة',
    linksIn: 'روابط داخلة',
    returnToGraph: 'العودة الى الرسم',
    localGraph: 'الرسم المحلي',
    localGraphBlurb: 'درجتان في كل اتجاه. الروابط االحادية االتجاه تظهر باسهم.',
    graphZoom: 'استخدم العجلة للتكبير',
    graphPan: 'اسحب للتحريك',
    graphClickDetail: 'اضغط على عقدة لفتح الصفحة الكاملة',
    graphClickFollow: 'اضغط لتتبع الفقرة',
    outgoing: 'خارجة',
    incoming: 'داخلة',
    rank: 'الرتبة',
    scripture: 'الكتاب المقدس',
    document: 'وثيقة',
    footnote: 'حاشية',
    paragraph: 'فقرة',
    parts: partTranslations.ar,
  },
};

export function isLanguage(value: string | null | undefined): value is AppLanguage {
  return languages.some((language) => language.code === value);
}

export function getLanguage(value: string | null | undefined): AppLanguage {
  return isLanguage(value) ? value : 'en';
}

export function getLanguageMeta(language: AppLanguage) {
  return languages.find((entry) => entry.code === language) ?? languages[0];
}

export function withLanguage(path: string, language: AppLanguage) {
  return language === 'en' ? path : `${path}?lang=${language}`;
}

export function getInitialLanguage() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('lang');
  if (isLanguage(fromQuery)) {
    return fromQuery;
  }

  const fromStorage = window.localStorage.getItem('catholic-core-language');
  return getLanguage(fromStorage);
}
