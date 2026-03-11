// Interview question pool for AI chat mode
// Based on mystory-handoff/mystory-app.jsx Q data

export const QUESTIONS: Record<string, string[]> = {
  'birth-story': [
    '몇 년도에, 어디에서 태어나셨어요?',
    '태어나실 때의 이야기를 들은 적 있나요?',
    '부모님이 그때 어떤 마음이셨는지 들으신 적 있어요?',
  ],
  'my-name': [
    '이름은 누가 지어주셨나요?',
    '이름에 담긴 뜻을 알고 계신가요?',
    '이름 때문에 겪은 재미있는 에피소드가 있나요?',
  ],
  'parents-story': [
    '아버지는 어떤 분이셨어요?',
    '어머니의 손길 중 가장 그리운 건 뭔가요?',
    '부모님에게 하지 못한 말이 있다면요?',
  ],
  grandparents: [
    '할머니, 할아버지는 어떤 분이셨어요?',
    '조부모님과의 추억 중 가장 기억에 남는 건요?',
    '조부모님에게 배운 것이 있다면요?',
  ],
  'first-memory': [
    '기억이 닿는 가장 먼 과거, 어떤 장면이 떠오르시나요?',
    '그 기억 속 어떤 소리가 들리나요?',
    '그때 옆에 누가 있었나요?',
  ],
  'childhood-home': [
    '자라신 집은 어떤 집이었어요?',
    '동네를 눈 감고 떠올려보면 어떤 풍경이 보이나요?',
    '그 집에서 가장 좋아하던 장소가 있었나요?',
  ],
  'childhood-play': [
    '어린 시절 가장 좋아한 놀이가 뭐였어요?',
    '누구와 함께 놀았나요?',
    '그때 놀이터나 골목은 어떤 모습이었나요?',
  ],
  'childhood-food': [
    '어린 시절 가장 좋아한 음식은 뭐였어요?',
    '어머니가 해주신 음식 중 가장 그리운 건요?',
    '그때 간식은 어떤 게 있었나요?',
  ],
  elementary: [
    '초등학교 이름이 기억나시나요?',
    '학교까지 어떻게 다니셨어요?',
    '초등학교 때 가장 기억에 남는 일은요?',
  ],
  'best-friend': [
    '인생의 가장 친한 친구는 어떻게 만났나요?',
    '그 친구와 가장 기억에 남는 순간은요?',
    '지금도 연락하고 계신가요?',
  ],
  'spouse-meeting': [
    '배우자를 처음 만났을 때를 기억하시나요?',
    '이 사람이다 느낀 순간이 있었나요?',
    '첫 데이트는 어떠셨어요?',
  ],
  'first-child': [
    '첫 아이가 태어났을 때 어떤 기분이셨어요?',
    '아이의 이름은 어떻게 짓게 되셨나요?',
    '새벽에 아이를 돌보던 기억이 있나요?',
  ],
  'career-path': [
    '어떤 일을 하셨어요?',
    '그 직업을 선택하게 된 계기가 있나요?',
    '일하면서 가장 보람 있었던 순간은요?',
  ],
  'career-pride': [
    '직업 생활에서 가장 뿌듯했던 성과는요?',
    '그 성과를 이루기까지 어떤 노력이 있었나요?',
    '그때 함께한 동료들이 기억나시나요?',
  ],
  hobby: [
    '어떤 취미를 즐기시나요?',
    '그 취미를 시작하게 된 계기가 있어요?',
    '취미를 통해 만난 사람이 있나요?',
  ],
  travel: [
    '가장 기억에 남는 여행은 어디였나요?',
    '그 여행에서 인상적이었던 순간은요?',
    '다시 가보고 싶은 곳이 있나요?',
  ],
  'life-wisdom': [
    '인생에서 가장 중요하게 깨달은 것은요?',
    '젊은 사람들에게 꼭 해주고 싶은 조언이 있다면요?',
    '살면서 가장 큰 교훈을 준 경험은요?',
  ],
  epitaph: [
    '나를 한 문장으로 표현한다면요?',
    '사람들이 어떤 사람으로 기억해주면 좋겠나요?',
  ],
};

// Fallback questions for topics without specific questions
export const DEFAULT_QUESTIONS = [
  '이 시절 가장 먼저 떠오르는 기억이 있나요?',
  '그때 곁에 누가 있었나요?',
  '기억에 남는 에피소드를 들려주세요.',
  '그 경험이 지금의 나에게 어떤 의미인가요?',
];

export const REACTIONS = [
  '정말 좋은 이야기네요.',
  '그랬군요...',
  '듣기만 해도 눈에 보이는 것 같아요.',
  '참 귀한 기억이시네요.',
  '그 마음이 느껴지는 것 같아요.',
  '마음이 따뜻해지네요.',
];

export const DEEP_FOLLOW = [
  '좀 더 자세히 말씀해주시겠어요?',
  '그때 기분이 어떠셨어요?',
  '왜 그렇게 느끼셨어요?',
  '다른 분들은 어떻게 반응하셨어요?',
  '그 일이 이후에 어떤 영향을 주었나요?',
];

export const WRITING_HINTS: Record<string, string> = {
  'birth-story': '나는 ___년, ___에서 태어났다.',
  'first-memory': '내가 기억하는 가장 오래된 장면은...',
  'spouse-meeting': '그 사람을 처음 만난 건...',
  'career-pride': '내 직업 생활에서 가장 뿌듯했던 순간은...',
};

export const DEFAULT_HINT = '그때의 기억을 떠올려보면...';

export function getQuestions(topicId: string): string[] {
  return QUESTIONS[topicId] || DEFAULT_QUESTIONS;
}

export function getHint(topicId: string): string {
  return WRITING_HINTS[topicId] || DEFAULT_HINT;
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
