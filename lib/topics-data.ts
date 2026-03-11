export interface TopicCard {
  id: string;
  title: string;
}

export interface TopicCategory {
  category: string;
  enLabel: string;
  cards: TopicCard[];
}

export const TOPICS: TopicCategory[] = [
  {
    category: '탄생과 뿌리',
    enLabel: 'ORIGIN',
    cards: [
      { id: 'birth-story', title: '나의 탄생 이야기' },
      { id: 'my-name', title: '이름의 의미' },
      { id: 'parents-story', title: '부모님의 이야기' },
      { id: 'grandparents', title: '조부모님의 기억' },
      { id: 'family-roots', title: '가문과 고향' },
      { id: 'siblings', title: '형제자매' },
    ],
  },
  {
    category: '유년시절',
    enLabel: 'CHILDHOOD',
    cards: [
      { id: 'first-memory', title: '가장 오래된 기억' },
      { id: 'childhood-home', title: '자란 집과 동네' },
      { id: 'childhood-play', title: '놀이와 장난' },
      { id: 'childhood-food', title: '어린 시절의 맛' },
      { id: 'childhood-fear', title: '무서웠던 것들' },
      { id: 'childhood-dream', title: '어릴 적 꿈' },
      { id: 'seasons', title: '계절의 기억' },
      { id: 'family-culture', title: '우리 집만의 문화' },
    ],
  },
  {
    category: '학창시절',
    enLabel: 'SCHOOL DAYS',
    cards: [
      { id: 'elementary', title: '초등학교' },
      { id: 'middle-school', title: '중학교 시절' },
      { id: 'high-school', title: '고등학교 시절' },
      { id: 'best-friend', title: '가장 친한 친구' },
      { id: 'teacher', title: '잊지 못할 선생님' },
      { id: 'school-event', title: '운동회와 소풍' },
      { id: 'school-trouble', title: '사고친 이야기' },
      { id: 'first-love', title: '풋풋한 첫사랑' },
    ],
  },
  {
    category: '청년기',
    enLabel: 'YOUTH',
    cards: [
      { id: 'college', title: '대학 시절' },
      { id: 'military', title: '군대 이야기' },
      { id: 'first-job', title: '첫 직장' },
      { id: 'first-salary', title: '첫 월급' },
      { id: 'independence', title: '독립과 자취' },
      { id: 'youth-passion', title: '열정과 도전' },
      { id: 'youth-failure', title: '실패와 좌절' },
      { id: 'dating', title: '연애 이야기' },
      { id: 'life-mentor', title: '인생의 멘토' },
    ],
  },
  {
    category: '사랑과 가정',
    enLabel: 'LOVE & FAMILY',
    cards: [
      { id: 'spouse-meeting', title: '배우자와의 만남' },
      { id: 'proposal', title: '프러포즈와 결혼식' },
      { id: 'newlywed', title: '신혼 시절' },
      { id: 'first-child', title: '첫 아이의 탄생' },
      { id: 'parenting', title: '육아 에피소드' },
      { id: 'family-crisis', title: '가정의 위기' },
      { id: 'family-trip', title: '가족 여행' },
      { id: 'family-tradition', title: '가족의 전통' },
      { id: 'children-grown', title: '자녀의 성장' },
    ],
  },
  {
    category: '일과 커리어',
    enLabel: 'CAREER',
    cards: [
      { id: 'career-path', title: '나의 직업 이야기' },
      { id: 'career-turning', title: '커리어 전환점' },
      { id: 'career-pride', title: '가장 뿌듯한 성과' },
      { id: 'career-hardship', title: '가장 힘들었던 시기' },
      { id: 'work-people', title: '함께한 사람들' },
      { id: 'money-story', title: '돈에 대한 이야기' },
      { id: 'retirement', title: '은퇴와 그 이후' },
    ],
  },
  {
    category: '시대와 역사 속의 나',
    enLabel: 'HISTORY & ME',
    cards: [
      { id: 'era-childhood', title: '그 시절 대한민국' },
      { id: 'historical-event', title: '역사적 사건과 나' },
      { id: 'tech-change', title: '기술 변화의 목격자' },
      { id: 'social-change', title: '사회 변화 속의 삶' },
      { id: 'war-division', title: '전쟁과 분단의 기억' },
    ],
  },
  {
    category: '내면의 풍경',
    enLabel: 'INNER LANDSCAPE',
    cards: [
      { id: 'faith', title: '신앙과 영성' },
      { id: 'values', title: '삶의 가치관' },
      { id: 'health-story', title: '건강 이야기' },
      { id: 'loss-grief', title: '상실과 이별' },
      { id: 'turning-point', title: '인생의 전환점' },
      { id: 'regret', title: '후회와 용서' },
      { id: 'gratitude', title: '감사한 사람들' },
    ],
  },
  {
    category: '취미와 즐거움',
    enLabel: 'JOY & LEISURE',
    cards: [
      { id: 'hobby', title: '나의 취미' },
      { id: 'travel', title: '여행 이야기' },
      { id: 'books-movies', title: '책과 영화' },
      { id: 'music', title: '내 인생의 음악' },
      { id: 'food-story', title: '음식 이야기' },
      { id: 'pets', title: '반려동물' },
    ],
  },
  {
    category: '오늘, 그리고 내일',
    enLabel: 'TODAY & TOMORROW',
    cards: [
      { id: 'daily-life', title: '요즘의 하루' },
      { id: 'grandchildren', title: '손주 이야기' },
      { id: 'bucket-list', title: '아직 이루고 싶은 것' },
      { id: 'life-wisdom', title: '인생에서 배운 것' },
      { id: 'letter-children', title: '자녀에게 보내는 편지' },
      { id: 'letter-future', title: '미래의 나에게' },
      { id: 'epitaph', title: '나를 한 문장으로' },
    ],
  },
];

export const PRESET_TOPIC_IDS = [
  'birth-story',
  'first-memory',
  'spouse-meeting',
  'career-pride',
  'life-wisdom',
];

export function getPresetCards() {
  const presets = [];
  for (const id of PRESET_TOPIC_IDS) {
    for (const category of TOPICS) {
      const card = category.cards.find((c) => c.id === id);
      if (card) {
        presets.push(card);
        break;
      }
    }
  }
  return presets;
}
