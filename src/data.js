// [[word]] = 신호어(빨간 박스), __phrase__ = 핵심 표현(물결 밑줄)

export const CATS = {
  problem: { ko: '문제 발생', en: 'Problem', color: '#ff6b9a' },
  harm: { ko: '구체적 피해', en: 'Harm', color: '#ff9f43' },
  solution: { ko: '해결 방법', en: 'Solution', color: '#40d986' },
  proposal: { ko: '제안 · 기대', en: 'Proposal', color: '#ffd43b' },
};
export const CAT_ORDER = ['problem', 'harm', 'solution', 'proposal'];

export const CRISIS = [
  {
    cat: 'problem',
    text: 'Plastic has become an essential part of modern life. It is cheap, light, and useful in many ways. [[However,]] our heavy dependence on plastic has created __a serious environmental problem__.',
    ko: '플라스틱은 현대 생활의 필수적인 부분이 되었다. 그것은 값싸고, 가볍고, 여러 면에서 유용하다. 하지만, 플라스틱에 대한 우리의 과도한 의존은 심각한 환경 문제를 만들어 냈다.',
    sum: '플라스틱에 대한 과도한 의존 → 심각한 환경 문제',
    note: '[[However]] (하지만): 플라스틱의 장점 → <b>문제 제기</b>로 흐름이 바뀌어요.',
    hint: '[[However]] 뒤에 무엇이 나오나요? "a serious environmental problem"에 주목!',
  },
  {
    cat: 'problem',
    text: '[[In particular,]] the enormous amount of __single-use plastic__ produced every year is __difficult to manage__.',
    ko: '특히, 매년 생산되는 엄청난 양의 일회용 플라스틱은 관리하기 어렵다.',
    sum: '매년 생산되는 엄청난 양의 일회용 플라스틱 → 관리 어려움',
    note: '[[In particular]] (특히): 앞에서 말한 문제를 <b>더 구체적으로 좁혀</b> 설명해요.',
    hint: '[[In particular]](특히)는 앞 내용을 이어서 더 자세히 말할 때 써요. 바로 앞 병은 어느 섬으로 갔나요?',
  },
  {
    cat: 'problem',
    text: 'Much of it __is thrown away__ after only a short period of use, and a large amount __ends up in__ landfills or the natural environment.',
    ko: '그중 상당수는 짧은 기간 사용된 후 버려지고, 많은 양이 결국 매립지나 자연환경에 이르게 된다.',
    sum: '짧게 쓰고 버려짐 → 결국 매립지·자연환경으로',
    note: '<b>is thrown away / ends up in</b>: 문제가 <b>어떻게 생겨나는지</b> 보여 줘요. 아직 피해 대상은 나오지 않았어요.',
    hint: '아직 누가 피해를 입는지는 나오지 않았어요. 플라스틱이 "어디로 가는지", 즉 문제가 생기는 과정이에요.',
  },
  {
    cat: 'harm',
    text: 'Plastic waste can travel from streets and rivers to the ocean, [[where]] it threatens __marine animals__. Some animals __swallow plastic__, while others __become trapped__ in it.',
    ko: '플라스틱 쓰레기는 거리와 강에서 바다로 흘러갈 수 있는데, 그곳에서 해양 동물을 위협한다. 어떤 동물들은 플라스틱을 삼키고, 다른 동물들은 그 안에 갇히게 된다.',
    sum: '① 해양 동물: 플라스틱을 삼키거나 그 안에 갇힘',
    note: '[[where]] (그리고 그곳에서): 바다에서 일어나는 <b>구체적인 피해</b>로 연결돼요.',
    hint: '"threatens marine animals": 해양 동물이 위협받고 있어요. 문제 때문에 생긴 결과는 무엇일까요?',
  },
  {
    cat: 'harm',
    text: 'Over time, larger pieces of plastic can [[also]] break into __tiny particles__ called __microplastics__. These particles are now found in oceans, soil, and even the food chain.',
    ko: '시간이 지나면서, 더 큰 플라스틱 조각들은 미세플라스틱이라 불리는 아주 작은 입자로 부서지기도 한다. 이 입자들은 이제 바다, 토양, 그리고 심지어 먹이 사슬에서도 발견된다.',
    sum: '② 미세플라스틱: 바다·토양·먹이 사슬에서까지 발견',
    note: '[[also]] (또한): 앞의 피해에 <b>또 다른 피해</b>를 하나 더 덧붙여요.',
    hint: '[[also]](또한)는 앞 내용과 같은 종류를 하나 더 추가하는 신호예요. 바로 앞 병은 어느 섬이었죠?',
  },
  {
    cat: 'solution',
    text: 'Solving the plastic crisis will not be easy. Removing plastic that has already entered the environment is extremely difficult. [[Therefore,]] we need to __prevent__ plastic waste __from__ being produced and discarded __in the first place__.',
    ko: '플라스틱 위기를 해결하는 것은 쉽지 않을 것이다. 이미 환경에 들어간 플라스틱을 제거하는 것은 매우 어렵다. 그러므로, 우리는 애초에 플라스틱 쓰레기가 생산되고 버려지는 것을 막아야 한다.',
    sum: '해결의 방향: 사전 예방 (애초에 생산·폐기되지 않도록 막기)',
    note: '[[Therefore]] (그러므로): 문제·피해에서 <b>해결</b>로 흐름이 바뀌는 핵심 신호예요.',
    hint: '[[Therefore]](그러므로) 뒤에는 "그래서 우리가 무엇을 해야 하는지"가 나와요.',
  },
  {
    cat: 'solution',
    text: '① __Using reusable products__, ② __improving waste collection and recycling systems__, [[and]] ③ __developing safer alternatives__ to single-use plastics can all help.',
    ko: '① 재사용 가능한 제품을 사용하는 것, ② 쓰레기 수거 및 재활용 시스템을 개선하는 것, 그리고 ③ 일회용 플라스틱에 대한 더 안전한 대안을 개발하는 것이 모두 도움이 될 수 있다.',
    sum: '① 재사용 제품 사용 ② 수거·재활용 시스템 개선 ③ 더 안전한 대안 개발',
    note: '<b>A, B, [[and]] C ... can all help</b>: 구체적인 <b>해결책 3가지</b>를 나열해요.',
    hint: '"can all help": 세 가지 행동이 모두 도움이 된대요. 무엇을 위한 행동일까요?',
  },
  {
    cat: 'proposal',
    text: 'Governments, businesses, and individuals [[must]] __work together__ to reduce plastic pollution.',
    ko: '정부, 기업, 그리고 개인은 플라스틱 오염을 줄이기 위해 함께 노력해야 한다.',
    sum: '최종 제안: 정부·기업·개인이 함께 노력해야 한다',
    note: '[[must]] (~해야 한다): 모두에게 하는 글쓴이의 <b>최종 제안(주장)</b>이에요.',
    hint: '[[must]](~해야 한다)는 글쓴이의 강한 주장을 나타내요. 구체적인 방법이 아니라 모두에게 하는 마지막 당부예요.',
  },
  {
    cat: 'proposal',
    text: '[[If]] we change the way we produce, use, and dispose of plastic, we can __give nature a better chance to recover__.',
    ko: '만약 우리가 플라스틱을 생산하고, 사용하고, 처리하는 방식을 바꾼다면, 우리는 자연에게 회복할 더 나은 기회를 줄 수 있다.',
    sum: '기대 효과: 자연이 회복할 더 나은 기회',
    note: '[[If]] ~, we can ...: 실천했을 때 얻는 <b>기대 효과</b>로 글을 마무리해요.',
    hint: '[[If]] ~, we can ...(~한다면, ~할 수 있다)은 실천했을 때의 좋은 결과, 즉 기대 효과예요.',
  },
];

export const RECYCLE_INTRO = {
  text: 'Plastics are among the most frequently used materials in our daily lives, [[yet]] improper disposal poses __a serious threat__ to the environment. To ensure effective recycling, following __the correct disposal procedure__ is essential.',
  ko: '플라스틱은 우리 일상생활에서 가장 자주 사용되는 재료 중 하나이지만, 부적절한 처리는 환경에 심각한 위협이 된다. 효과적인 재활용을 위해서는 올바른 처리 절차를 따르는 것이 필수적이다.',
};

export const RECYCLE_OUTRO = {
  text: 'By taking these simple steps, we can significantly __reduce__ environmental pollution and __build__ a more sustainable future for everyone.',
  ko: '이러한 간단한 단계들을 실천함으로써, 우리는 환경 오염을 크게 줄이고 모두를 위한 더 지속 가능한 미래를 만들 수 있다.',
};

export const TOOLS = {
  rinse: { icon: '🚿', ko: '비우고 헹구기' },
  peel: { icon: '🏷️', ko: '라벨·스티커·금속 뚜껑 떼기' },
  press: { icon: '🗜️', ko: '납작하게 누르고 뚜껑 닫기' },
  sort: { icon: '🔀', ko: '투명 / 유색 나누기' },
};

export const STEPS = [
  {
    sig: 'First,', tool: 'rinse', reason: 'r1', color: '#4dabf7',
    text: 'all plastic containers must be __thoroughly emptied__ and __rinsed__ to remove any leftover food or liquid.',
    ko: '모든 플라스틱 용기는 남은 음식물이나 액체를 제거하기 위해 완전히 비우고 헹궈야 한다.',
    step: '플라스틱 용기를 완전히 비우고 헹군다',
    toolHint: '문장 속 동사를 찾아보세요: <b>emptied</b>(비워진), <b>rinsed</b>(헹궈진)',
  },
  {
    sig: 'Second,', tool: 'peel', reason: 'r2', color: '#f783ac',
    text: '__remove__ all __non-plastic attachments__, such as paper labels, adhesive stickers, and metal caps.',
    ko: '종이 라벨, 접착 스티커, 금속 뚜껑과 같은 플라스틱이 아닌 모든 부착물을 제거한다.',
    step: '플라스틱이 아닌 부착물(종이 라벨, 스티커, 금속 뚜껑)을 제거한다',
    toolHint: '<b>remove</b>(제거하다) + <b>non-plastic attachments</b>(플라스틱이 아닌 부착물)',
  },
  {
    sig: 'Third,', tool: 'press', reason: 'r3', color: '#ffa94d',
    text: '__compress__ plastic bottles as much as possible and __secure__ them with their plastic caps.',
    ko: '플라스틱 병을 가능한 한 많이 압축하고 플라스틱 뚜껑으로 고정한다.',
    step: '병을 최대한 압축하고 플라스틱 뚜껑으로 고정한다',
    toolHint: '<b>compress</b>(압축하다), <b>secure</b>(고정하다)',
  },
  {
    sig: 'Finally,', tool: 'sort', reason: 'r4', color: '#69db7c',
    text: 'clear PET bottles should be __separated from__ colored plastics.',
    ko: '투명한 페트병은 유색 플라스틱과 분리되어야 한다.',
    step: '투명 페트병을 유색 플라스틱과 분리한다',
    toolHint: '<b>clear</b>(투명한) ↔ <b>colored</b>(색깔 있는), <b>separated from</b>(~와 분리된)',
  },
];

export const REASONS = {
  r1: {
    en: 'Contaminated items cannot be processed and often ruin entire batches of recyclable materials.',
    hl: '__Contaminated items__ cannot be processed and often __ruin entire batches__ of recyclable materials.',
    ko: '오염된 물품은 처리될 수 없고, 종종 재활용 가능한 물질 묶음 전체를 망친다.',
    tip: '<b>원인</b> 음식물·액체로 오염 → <b>결과</b> 처리 불가 + 묶음 전체를 망침',
    short: '오염된 물품은 처리될 수 없고 재활용품 묶음 전체를 망친다',
  },
  r2: {
    en: 'These different materials interfere with the recycling machinery and lower the quality of recycled products.',
    hl: 'These different materials __interfere with__ the recycling machinery [[and]] __lower__ the quality of recycled products.',
    ko: '이러한 다른 재료들은 재활용 기계를 방해하고 재활용 제품의 질을 떨어뜨린다.',
    tip: '<b>원인</b> 플라스틱이 아닌 재료 → <b>결과</b> 기계 방해 + 제품 품질 저하',
    short: '다른 재료가 재활용 기계를 방해하고 품질을 떨어뜨린다',
  },
  r3: {
    en: '... to save space during transportation.',
    hl: '... [[to]] __save space__ during transportation.',
    ko: '운반하는 동안 공간을 절약하기 위해서',
    tip: '<b>to + 동사원형</b> = ~하기 위해(목적) → 납작하게 하면 <b>운반 공간 절약</b>',
    short: '운반하는 동안 공간을 절약하기 위해',
  },
  r4: {
    en: '... as transparent materials have a much higher recycling value.',
    hl: '... [[as]] transparent materials have __a much higher recycling value__.',
    ko: '투명한 재료가 훨씬 더 높은 재활용 가치를 지니기 때문에',
    tip: '<b>as</b> = ~ 때문에(이유) → 투명한 재료는 <b>재활용 가치 ↑</b>',
    short: '투명한 재료가 재활용 가치가 훨씬 높기 때문에',
  },
};

export const STRUCTURES = [
  { id: 'ps', en: 'Problem & Solving', ko: '문제 – 해결' },
  { id: 'ce', en: 'Cause & Effect', ko: '원인 – 결과' },
  { id: 'cc', en: 'Compare & Contrast', ko: '비교 – 대조' },
  { id: 'seq', en: 'Sequence', ko: '순서 · 절차' },
  { id: 'cls', en: 'Classification', ko: '분류' },
];

const fchip = (c, b, em) => `<span class="fchip" style="--c:${c}"><b>${b}</b><em>${em}</em></span>`;

export const FLOW1 = `<div class="chip-flow">${[
  fchip(CATS.problem.color, '문제 발생', 'However · In particular'),
  fchip(CATS.harm.color, '구체적 피해', 'where · also'),
  fchip(CATS.solution.color, '해결 방법', 'Therefore'),
  fchip(CATS.proposal.color, '제안 · 기대', 'must · If'),
].join('<i>→</i>')}</div>`;

export const FLOW2 = `<div class="chip-flow">${[
  fchip(STEPS[0].color, 'First,', '비우고 헹구기'),
  fchip(STEPS[1].color, 'Second,', '부착물 제거'),
  fchip(STEPS[2].color, 'Third,', '압축 + 뚜껑'),
  fchip(STEPS[3].color, 'Finally,', '투명 / 유색 분리'),
].join('<i>→</i>')}</div>`;

export const QUIZ1 = {
  reading: 'Reading #2',
  title: 'The Plastic Crisis',
  flow: FLOW1,
  correct: 'ps',
  genre: '논설문',
  explain: '문제(플라스틱 오염)를 제기하고 → 피해를 보여 준 뒤 → 해결책을 제시하고 → "함께 노력해야 한다(<b>must</b>)"고 주장하는 <b>논설문</b>이에요.',
  partial: {
    ce: '플라스틱 → 피해는 원인-결과 관계가 맞아요! 하지만 글은 피해에서 끝나지 않고 <b>해결책</b>까지 제시해요.',
  },
  hint: '네 개의 섬 이름을 떠올려 보세요: <b>문제 발생</b> → … → <b>해결 방법</b>',
};

export const QUIZ2 = {
  reading: 'Reading #3',
  title: '재활용 4단계 글',
  flow: FLOW2,
  correct: 'seq',
  genre: '설명문',
  explain: '<span class="sig">First,</span> → <span class="sig">Second,</span> → <span class="sig">Third,</span> → <span class="sig">Finally,</span> 순서대로 절차를 알려 주는 <b>설명문</b>이에요. 각 단계의 "이유"에는 <b>원인-결과(Cause & Effect)</b>도 숨어 있어요.',
  partial: {
    ce: '좋은 관찰이에요! 각 단계의 "이유"는 원인-결과예요. 하지만 글 전체를 이끄는 뼈대는 First → Finally 신호어예요.',
    ps: '도입부에 문제(improper disposal)가 나오긴 해요. 하지만 글 대부분은 "어떤 <b>순서</b>로 하는지"를 설명해요.',
  },
  hint: '공장 정류장 표지판의 신호어를 떠올려 보세요: <b>First, Second, Third, Finally</b>',
};

export const TITLE_QUIZ = [
  { t: 'Four Simple Steps for Effective Plastic Recycling', ok: true, fb: '정답! 효과적인 재활용을 위한 <b>4단계 절차</b>를 담은 글이에요.' },
  { t: 'Microplastics: A Hidden Danger in the Food Chain', ok: false, fb: '미세플라스틱은 Reading #2의 피해 내용이에요. Reading #3의 중심은 "재활용 절차"예요.' },
  { t: 'Why Plastic Is Cheap, Light, and Useful', ok: false, fb: '플라스틱의 장점은 이 글의 중심 내용이 아니에요. 글 전체가 무엇을 순서대로 알려 주었나요?' },
];
