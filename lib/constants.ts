// @ts-nocheck
/* ══════════════════════════════════════════
   디자인 토큰
   ══════════════════════════════════════════ */
export const T = {
  bg: "#FAFAF8", warm: "#F5F2ED", dark: "#1A1816", card: "#FFF",
  tx: "#1A1816", sub: "#6B6560", mute: "#78716C", light: "#D6D3D1",
  accent: "#8B5E34", accentBg: "#FBF7F2", accentBd: "#E8D5BF",
  bd: "#E7E5E0", bdL: "#F0EEEA",
  serif: "'Noto Serif KR',Georgia,serif",
  sans: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  sh: "0 1px 3px rgba(0,0,0,.04)", shL: "0 4px 20px rgba(0,0,0,.06)",
  r: 8,
};

/* ══════════════════════════════════════════
   주제 카드
   ══════════════════════════════════════════ */
export interface TopicCard { id: string; t: string; }
export interface TopicGroup { cat: string; en: string; cards: TopicCard[]; }

export const TOPICS: TopicGroup[] = [
  {cat:"탄생과 뿌리",en:"ORIGIN",cards:[{id:"birth-story",t:"나의 탄생 이야기"},{id:"my-name",t:"이름의 의미"},{id:"parents-story",t:"부모님의 이야기"},{id:"grandparents",t:"조부모님의 기억"},{id:"family-roots",t:"가문과 고향"},{id:"siblings",t:"형제자매"}]},
  {cat:"유년시절",en:"CHILDHOOD",cards:[{id:"first-memory",t:"가장 오래된 기억"},{id:"childhood-home",t:"자란 집과 동네"},{id:"childhood-play",t:"놀이와 장난"},{id:"childhood-food",t:"어린 시절의 맛"},{id:"childhood-fear",t:"무서웠던 것들"},{id:"childhood-dream",t:"어릴 적 꿈"},{id:"seasons",t:"계절의 기억"},{id:"family-culture",t:"우리 집만의 문화"}]},
  {cat:"학창시절",en:"SCHOOL DAYS",cards:[{id:"elementary",t:"초등학교"},{id:"middle-school",t:"중학교 시절"},{id:"high-school",t:"고등학교 시절"},{id:"best-friend",t:"가장 친한 친구"},{id:"teacher",t:"잊지 못할 선생님"},{id:"school-event",t:"운동회와 소풍"},{id:"school-trouble",t:"사고친 이야기"},{id:"first-love",t:"풋풋한 첫사랑"}]},
  {cat:"청년기",en:"YOUTH",cards:[{id:"college",t:"대학 시절"},{id:"military",t:"군대 이야기"},{id:"first-job",t:"첫 직장"},{id:"first-salary",t:"첫 월급"},{id:"independence",t:"독립과 자취"},{id:"youth-passion",t:"열정과 도전"},{id:"youth-failure",t:"실패와 좌절"},{id:"dating",t:"연애 이야기"},{id:"life-mentor",t:"인생의 멘토"}]},
  {cat:"사랑과 가정",en:"LOVE & FAMILY",cards:[{id:"spouse-meeting",t:"배우자와의 만남"},{id:"proposal",t:"프러포즈와 결혼식"},{id:"newlywed",t:"신혼 시절"},{id:"first-child",t:"첫 아이의 탄생"},{id:"parenting",t:"육아 에피소드"},{id:"family-crisis",t:"가정의 위기"},{id:"family-trip",t:"가족 여행"},{id:"family-tradition",t:"가족의 전통"},{id:"children-grown",t:"자녀의 성장"}]},
  {cat:"일과 커리어",en:"CAREER",cards:[{id:"career-path",t:"나의 직업 이야기"},{id:"career-turning",t:"커리어 전환점"},{id:"career-pride",t:"가장 뿌듯한 성과"},{id:"career-hardship",t:"가장 힘들었던 시기"},{id:"work-people",t:"함께한 사람들"},{id:"money-story",t:"돈에 대한 이야기"},{id:"retirement",t:"은퇴와 그 이후"}]},
  {cat:"시대와 역사 속의 나",en:"HISTORY & ME",cards:[{id:"era-childhood",t:"그 시절 대한민국"},{id:"historical-event",t:"역사적 사건과 나"},{id:"tech-change",t:"기술 변화의 목격자"},{id:"social-change",t:"사회 변화 속의 삶"},{id:"war-division",t:"전쟁과 분단의 기억"}]},
  {cat:"내면의 풍경",en:"INNER LANDSCAPE",cards:[{id:"faith",t:"신앙과 영성"},{id:"values",t:"삶의 가치관"},{id:"health-story",t:"건강 이야기"},{id:"loss-grief",t:"상실과 이별"},{id:"turning-point",t:"인생의 전환점"},{id:"regret",t:"후회와 용서"},{id:"gratitude",t:"감사한 사람들"}]},
  {cat:"취미와 즐거움",en:"JOY & LEISURE",cards:[{id:"hobby",t:"나의 취미"},{id:"travel",t:"여행 이야기"},{id:"books-movies",t:"책과 영화"},{id:"music",t:"내 인생의 음악"},{id:"food-story",t:"음식 이야기"},{id:"pets",t:"반려동물"}]},
  {cat:"오늘, 그리고 내일",en:"TODAY & TOMORROW",cards:[{id:"daily-life",t:"요즘의 하루"},{id:"grandchildren",t:"손주 이야기"},{id:"bucket-list",t:"아직 이루고 싶은 것"},{id:"life-wisdom",t:"인생에서 배운 것"},{id:"letter-children",t:"자녀에게 보내는 편지"},{id:"letter-future",t:"미래의 나에게"},{id:"epitaph",t:"나를 한 문장으로"}]},
];

export const PRESET_IDS = ["birth-story","first-memory","spouse-meeting","career-pride","life-wisdom"];
export const PRESET_CARDS = PRESET_IDS.map(id => {
  for (const g of TOPICS) { const c = g.cards.find(x => x.id === id); if (c) return c; }
  return null;
}).filter(Boolean) as TopicCard[];

/* ══════════════════════════════════════════
   질문 풀
   ══════════════════════════════════════════ */
export const QUESTIONS: Record<string, string[]> = {
  "birth-story":["몇 년도에, 어디에서 태어나셨어요?","태어나실 때의 이야기를 들은 적 있나요?","부모님이 그때 어떤 마음이셨는지 들으신 적 있어요?"],
  "my-name":["이름은 누가 지어주셨나요?","이름에 담긴 뜻을 알고 계신가요?","이름 때문에 겪은 재미있는 에피소드가 있나요?"],
  "parents-story":["아버지는 어떤 분이셨어요?","어머니의 손길 중 가장 그리운 건 뭔가요?","부모님에게 하지 못한 말이 있다면요?"],
  "grandparents":["할머니, 할아버지는 어떤 분이셨어요?","조부모님과의 추억 중 가장 기억에 남는 건요?","조부모님에게 배운 것이 있다면요?"],
  "first-memory":["기억이 닿는 가장 먼 과거, 어떤 장면이 떠오르시나요?","그 기억 속 어떤 소리가 들리나요?","그때 옆에 누가 있었나요?"],
  "childhood-home":["자라신 집은 어떤 집이었어요?","동네를 눈 감고 떠올려보면 어떤 풍경이 보이나요?","그 집에서 가장 좋아하던 장소가 있었나요?"],
  "childhood-play":["어린 시절 가장 좋아한 놀이가 뭐였어요?","누구와 함께 놀았나요?","그때 놀이터나 골목은 어떤 모습이었나요?"],
  "childhood-food":["어린 시절 가장 좋아한 음식은 뭐였어요?","어머니가 해주신 음식 중 가장 그리운 건요?","그때 간식은 어떤 게 있었나요?"],
  "elementary":["초등학교 이름이 기억나시나요?","학교까지 어떻게 다니셨어요?","초등학교 때 가장 기억에 남는 일은요?"],
  "best-friend":["인생의 가장 친한 친구는 어떻게 만났나요?","그 친구와 가장 기억에 남는 순간은요?","지금도 연락하고 계신가요?"],
  "spouse-meeting":["배우자를 처음 만났을 때를 기억하시나요?","이 사람이다 느낀 순간이 있었나요?","첫 데이트는 어떠셨어요?"],
  "first-child":["첫 아이가 태어났을 때 어떤 기분이셨어요?","아이의 이름은 어떻게 짓게 되셨나요?","새벽에 아이를 돌보던 기억이 있나요?"],
  "career-path":["어떤 일을 하셨어요?","그 직업을 선택하게 된 계기가 있나요?","일하면서 가장 보람 있었던 순간은요?"],
  "career-pride":["직업 생활에서 가장 뿌듯했던 성과는요?","그 성과를 이루기까지 어떤 노력이 있었나요?","그때 함께한 동료들이 기억나시나요?"],
  "hobby":["어떤 취미를 즐기시나요?","그 취미를 시작하게 된 계기가 있어요?","취미를 통해 만난 사람이 있나요?"],
  "travel":["가장 기억에 남는 여행은 어디였나요?","그 여행에서 인상적이었던 순간은요?","다시 가보고 싶은 곳이 있나요?"],
  "life-wisdom":["인생에서 가장 중요하게 깨달은 것은요?","젊은 사람들에게 꼭 해주고 싶은 조언이 있다면요?","살면서 가장 큰 교훈을 준 경험은요?"],
  "epitaph":["나를 한 문장으로 표현한다면요?","사람들이 어떤 사람으로 기억해주면 좋겠나요?"],
  "_":["이 시절 가장 먼저 떠오르는 기억이 있나요?","그때 곁에 누가 있었나요?","기억에 남는 에피소드를 들려주세요.","그 경험이 지금의 나에게 어떤 의미인가요?"],
};

export const REACTIONS = [
  "정말 좋은 이야기네요.",
  "그랬군요...",
  "듣기만 해도 눈에 보이는 것 같아요.",
  "참 귀한 기억이시네요.",
  "그 마음이 느껴지는 것 같아요.",
  "마음이 따뜻해지네요.",
];

export const DEEP_FOLLOW = [
  "좀 더 자세히 말씀해주시겠어요?",
  "그때 기분이 어떠셨어요?",
  "왜 그렇게 느끼셨어요?",
  "다른 분들은 어떻게 반응하셨어요?",
  "그 일이 이후에 어떤 영향을 주었나요?",
];

export const HINTS: Record<string, string> = {
  "birth-story": "나는 ___년, ___에서 태어났다.",
  "first-memory": "내가 기억하는 가장 오래된 장면은...",
  "spouse-meeting": "그 사람을 처음 만난 건...",
  "career-pride": "내 직업 생활에서 가장 뿌듯했던 순간은...",
  "_": "그때의 기억을 떠올려보면...",
};

export function getQuestions(topicId: string): string[] {
  return QUESTIONS[topicId] || QUESTIONS["_"];
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ══════════════════════════════════════════
   폰트 스케일
   ══════════════════════════════════════════ */
export const FONT_SCALES = {
  normal: { label: "일반", chat: 16, prose: 17, input: 16, book: 17, lh: 2.0 },
  large:  { label: "확대", chat: 19, prose: 20, input: 18, book: 20, lh: 2.2 },
} as const;

export type FontScaleKey = keyof typeof FONT_SCALES;

/* ══════════════════════════════════════════
   STT 모드
   ══════════════════════════════════════════ */
export const STT_MODES = {
  browser: { label: "브라우저 음성인식", desc: "무료, Chrome/Safari 내장" },
  whisper: { label: "Whisper AI", desc: "고정밀, API 연동 필요" },
  off:     { label: "사용 안 함", desc: "녹음 버튼 숨김" },
} as const;

export type SttModeKey = keyof typeof STT_MODES;
