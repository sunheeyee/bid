import type { Pool } from 'pg';

export const SEED_LEVEL1 = [
  { id: 'l1-contract', name: '계약 품의서', sortOrder: 1 },
  { id: 'l1-etc', name: '게시판', sortOrder: 2 },
] as const;

export const SEED_LEVEL2 = [
  {
    id: 'l2-contract',
    parentId: 'l1-contract',
    name: '계약 품의서',
    description: '입찰결과를 반영해 최종 계약 체결용 계약 품의서 초안을 작성합니다',
    sortOrder: 1,
    viewType: 'prompt',
  },
  {
    id: 'l2-est-consulting',
    parentId: 'l1-contract',
    name: '예정가격 조사(컨설팅 용역)',
    description: '용역 계약 문서를 분석해 예정가격 조사서 비교표를 정리하고 검토가를 산출합니다',
    sortOrder: 2,
    viewType: 'prompt',
  },
  {
    id: 'l2-est-tp',
    parentId: 'l1-contract',
    name: '예정가격(T/P) 산출 및 원가 검토',
    description: '공사·구매 내역과 업체 견적을 바탕으로 예정가격(T/P)과 원가 검토 보고서를 작성합니다',
    sortOrder: 3,
    viewType: 'prompt',
  },
  {
    id: 'l2-bid-proceed',
    parentId: 'l1-contract',
    name: '입찰 진행 품의',
    description: '구매요청 품의서·사양서 등 첨부자료를 분석해 입찰 진행 품의 초안을 작성합니다',
    sortOrder: 4,
    viewType: 'prompt',
  },
  {
    id: 'l2-help',
    parentId: 'l1-etc',
    name: '참고 문서 모음',
    description: '사용 안내 및 참고 자료용 게시판',
    sortOrder: 1,
    viewType: 'board',
  },
] as const;

export const SEED_PROMPTS = [
  {
    id: 'p-contract',
    categoryLevel2Id: 'l2-contract',
    title: '계약 품의서 초안 작성',
    subtitle: '낙찰 결과를 반영한 최종 계약 품의',
    agentName: '계약 품의서 작성 에이전트',
    agentDescription:
      '입찰 결과(낙찰사, 낙찰금액, 낙찰률)와 구매요청·사양·계약 조건을 반영해 포스코스틸리온 계약 품의서 초안을 작성합니다.',
    content: `당신은 포스코스틸리온 구매·계약 담당자를 돕는 계약 품의서 작성 에이전트입니다.

[역할]
- 첨부된 입찰 결과, 구매요청 품의, 사양서, 견적/제안서를 분석합니다.
- 사내 품의 문체에 맞는 계약 품의서 초안을 작성합니다.
- 확인되지 않은 숫자는 만들지 말고, 자료에 없는 항목은 [확인 필요]로 표시합니다.

[필수 입력]
1. 구매 건명 / 요청 부서
2. 입찰 방식(경쟁입찰, 제한경쟁, 수의 등)
3. 낙찰사, 낙찰금액, 낙찰률, 예정가격(또는 T/P)
4. 계약 기간, 납기, 인도 조건, 지급 조건
5. 특이사항(협상 결과, 감액, 조건 변경)

[출력 목차]
1. 품의 개요
2. 구매 배경 및 필요성
3. 입찰 진행 경과
4. 낙찰 결과 및 가격 검토
5. 계약 주요 조건
6. 리스크 및 대응
7. 결론 및 요청 사항

[작성 규칙]
- 존중하는 공문 문체를 사용합니다.
- 금액은 원 단위와 부가세 포함/별도를 명시합니다.
- 입찰 참가사 비교가 있으면 표로 정리합니다.
- 원가 상승 요인(환율, 원자재)이 언급되면 추정하지 말고 첨부 근거만 인용합니다.`,
    tags: ['계약', '품의', '낙찰'],
  },
  {
    id: 'p-est-consulting',
    categoryLevel2Id: 'l2-est-consulting',
    title: '예정가격 조사서(컨설팅 용역)',
    subtitle: '용역 문서 비교표와 검토가 산출',
    agentName: '예정가격 조사(컨설팅 용역) 에이전트',
    agentDescription:
      '컨설팅·용역 계약 관련 과업지시서, 제안서, 견적서를 비교표로 정리하고 예정가격 검토가를 산출합니다.',
    content: `당신은 포스코스틸리온 구매 담당자를 돕는 예정가격 조사(컨설팅 용역) 에이전트입니다.

[역할]
- 용역 과업지시서, RFP, 제안서, 견적서, 유사 계약 실적을 분석합니다.
- 예정가격 조사서에 넣을 비교표와 검토가를 산출합니다.
- 공수를 임의로 부풀리거나 시장단가를 지어내지 않습니다.

[분석 절차]
1. 과업 범위·산출물·수행 기간을 항목화합니다.
2. 인력 등급(책임/선임/원급 등), 투입 M/M, 직접경비, 제경비를 표로 분해합니다.
3. 업체 간 또는 유사 실적 대비 단가·공수 차이를 설명합니다.
4. 과업 중복, 과다 공수, 누락 산출물을 지적합니다.
5. 검토가(권고 예정가격)와 산정 근거를 제시합니다.

[출력]
- 과업 요약
- 원가 구성 비교표 (인건비 / 직접경비 / 제경비 / 기술료)
- 공수·단가 적정성 의견
- 검토가 및 산정 메모
- 확인이 필요한 질문 목록

[규칙]
- 자료에 없는 노임단가·표준 요율을 사실인 것처럼 쓰지 않습니다.
- 계산 과정을 식과 함께 남깁니다.
- 불확실하면 범위를 제시하고 가정을 명시합니다.`,
    tags: ['예정가격', '용역', '컨설팅'],
  },
  {
    id: 'p-est-tp',
    categoryLevel2Id: 'l2-est-tp',
    title: '예정가격(T/P) 산출 및 원가 검토',
    subtitle: '공사·구매 내역 기반 T/P와 원가 보고서',
    agentName: '예정가격(T/P)·원가 검토 에이전트',
    agentDescription:
      '공사·구매 내역서와 업체 견적을 바탕으로 예정가격(T/P)을 산출하고 원가 검토 보고서를 작성합니다.',
    content: `당신은 포스코스틸리온 구매·원가 담당자를 돕는 예정가격(T/P) 산출 및 원가 검토 에이전트입니다.

[역할]
- 내역서, 수량 산출서, 사양서, 업체 견적, 유사 계약 단가를 대조합니다.
- 항목별 예정가격(Target Price)과 원가 검토 의견을 작성합니다.
- 없는 시세를 LLM이 만들어 넣지 않습니다.

[검토 관점]
1. 수량·규격·단위의 일치 여부
2. 재료비, 노무비, 경비, 외주비 구성
3. 견적 간 단가 편차와 이상치
4. 환율·원자재 연동 조항 여부 (숫자는 첨부 또는 대시보드 근거만 인용)
5. 예비비·리스크 버퍼의 적정성

[출력 목차]
1. 검토 대상 개요
2. 원가 구성 요약
3. 항목별 T/P 비교표
4. 주요 편차 원인
5. 권고 예정가격 및 협상 포인트
6. 자료 미비 항목

[규칙]
- 표는 항목 / 수량 / 견적단가 / 검토단가 / 차이 / 비고 형식을 우선합니다.
- 철강 현물 국제가가 자료에 없으면 3개 공식 공급자(ECOS/EIA/IMF) 제약으로 제공할 수 없다고 명시합니다.
- 계산 오류가 의심되면 재계산하고 근거를 남깁니다.`,
    tags: ['T/P', '원가', '예정가격'],
  },
  {
    id: 'p-bid-proceed',
    categoryLevel2Id: 'l2-bid-proceed',
    title: '입찰 진행 품의 초안',
    subtitle: '구매요청·사양서 기반 입찰 품의',
    agentName: '입찰 진행 품의 에이전트',
    agentDescription:
      '구매요청 품의서와 사양서 등 첨부자료를 분석해 입찰 방식, 일정, 예산을 정리한 입찰 진행 품의 초안을 작성합니다.',
    content: `당신은 포스코스틸리온 구매 담당자를 돕는 입찰 진행 품의 작성 에이전트입니다.

[역할]
- 구매요청 품의, 사양서, 예산, 일정, 관련 규정 자료를 읽습니다.
- 입찰 진행 품의 초안을 작성합니다.
- 규정에 없는 입찰 방식을 단정하지 않습니다.

[반드시 정리할 항목]
1. 구매 건명, 요청 부서, 예산 과목/금액
2. 구매 사유 및 기대 효과
3. 주요 사양·수량·납기
4. 제안 입찰 방식과 선정 사유 (공개/제한/지명/수의 등)
5. 일정 (공고-입찰-평가-계약)
6. 평가 기준 초안 (가격/기술 비중)
7. 예상 리스크 (단독 응찰, 납기, 원가 변동)

[출력]
- 품의 제목
- 본문 (배경, 구매 내용, 추진 방안, 일정, 요청사항)
- 첨부 목록 체크리스트
- 의사결정자에게 확인할 질문

[규칙]
- 사양서의 필수/선택 요구사항을 구분합니다.
- 금액·일정이 자료와 다르면 차이를 표시합니다.
- 추정 일정은 추정임을 밝힙니다.`,
    tags: ['입찰', '품의', '구매요청'],
  },
] as const;

export const HELP_INTRO_ID = 'hp-intro';

export const HELP_INTRO_TITLE = '참고 문서 모음 이용 안내';

export const HELP_INTRO_BODY = `참고 문서 모음은 구매·입찰 업무에 필요한 사용 안내와 참고 자료를 공유하는 게시판입니다.

■ 조회
- 목록에서 제목을 누르면 본문과 첨부파일을 볼 수 있습니다.
- 첨부파일은 원본 파일명으로 다운로드할 수 있습니다.

■ 관리자
- 관리자로 로그인하면 새 글을 작성할 수 있습니다.
- 제목은 필수이며, 내용과 첨부파일은 선택입니다.
- 글 수정 기능은 없습니다. 내용을 바꾸려면 삭제 후 다시 작성하세요.
- 게시물을 삭제하면 첨부파일도 함께 삭제됩니다.

■ 화면 안내
- 경제지표: 입찰 원가에 영향을 주는 물가·환율·금리·원자재 지표를 확인합니다.
- 프롬프트 관리: 계약 품의서 등 업무 에이전트 프롬프트를 조회·복사합니다.

■ 첨부 안내
- 파일당 최대 20MB, 글당 최대 10개입니다.
- pdf, office 문서, 이미지, txt, csv, zip을 올릴 수 있습니다. 실행 파일은 허용되지 않습니다.`;

export async function seedCategoriesAndPrompts(pool: Pool, { reset = false } = {}) {
  if (reset) {
    await pool.query('DELETE FROM prompts');
    await pool.query('DELETE FROM category_level2 WHERE view_type = $1', ['prompt']);
    await pool.query(
      `DELETE FROM category_level1
       WHERE id NOT IN (SELECT DISTINCT parent_id FROM category_level2)`
    );
  }

  const now = new Date().toISOString();
  const l1Ids = new Map<string, string>();
  for (const row of SEED_LEVEL1) {
    const byId = await pool.query('SELECT id FROM category_level1 WHERE id = $1', [row.id]);
    if (byId.rowCount) {
      await pool.query(
        `UPDATE category_level1 SET name = $1, sort_order = $2, updated_at = $3 WHERE id = $4`,
        [row.name, row.sortOrder, now, row.id]
      );
      l1Ids.set(row.id, row.id);
      continue;
    }
    const byName = await pool.query('SELECT id FROM category_level1 WHERE name = $1', [row.name]);
    if (byName.rowCount) {
      await pool.query(
        `UPDATE category_level1 SET sort_order = $1, updated_at = $2 WHERE id = $3`,
        [row.sortOrder, now, byName.rows[0].id]
      );
      l1Ids.set(row.id, byName.rows[0].id);
      continue;
    }
    await pool.query(
      `INSERT INTO category_level1 (id, name, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $4)`,
      [row.id, row.name, row.sortOrder, now]
    );
    l1Ids.set(row.id, row.id);
  }

  const l2Ids = new Map<string, string>();
  for (const row of SEED_LEVEL2) {
    const parentId = l1Ids.get(row.parentId) ?? row.parentId;
    const byId = await pool.query('SELECT id FROM category_level2 WHERE id = $1', [row.id]);
    if (byId.rowCount) {
      await pool.query(
        `UPDATE category_level2
         SET parent_id = $1, name = $2, description = $3, sort_order = $4, view_type = $5, updated_at = $6
         WHERE id = $7`,
        [parentId, row.name, row.description, row.sortOrder, row.viewType, now, row.id]
      );
      l2Ids.set(row.id, row.id);
      continue;
    }
    const byName = await pool.query(
      'SELECT id FROM category_level2 WHERE parent_id = $1 AND name = $2',
      [parentId, row.name]
    );
    if (byName.rowCount) {
      await pool.query(
        `UPDATE category_level2
         SET description = $1, sort_order = $2, view_type = $3, updated_at = $4
         WHERE id = $5`,
        [row.description, row.sortOrder, row.viewType, now, byName.rows[0].id]
      );
      l2Ids.set(row.id, byName.rows[0].id);
      continue;
    }
    await pool.query(
      `INSERT INTO category_level2 (id, parent_id, name, description, sort_order, view_type, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
      [row.id, parentId, row.name, row.description, row.sortOrder, row.viewType, now]
    );
    l2Ids.set(row.id, row.id);
  }

  for (const row of SEED_PROMPTS) {
    const categoryLevel2Id = l2Ids.get(row.categoryLevel2Id) ?? row.categoryLevel2Id;
    await pool.query(
      `INSERT INTO prompts (
         id, category_level2_id, title, subtitle, agent_name, agent_description, content, tags, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
       ON CONFLICT (id) DO UPDATE SET
         category_level2_id = EXCLUDED.category_level2_id,
         title = EXCLUDED.title,
         subtitle = EXCLUDED.subtitle,
         agent_name = EXCLUDED.agent_name,
         agent_description = EXCLUDED.agent_description,
         content = EXCLUDED.content,
         tags = EXCLUDED.tags,
         updated_at = EXCLUDED.updated_at`,
      [
        row.id,
        categoryLevel2Id,
        row.title,
        row.subtitle,
        row.agentName,
        row.agentDescription,
        row.content,
        JSON.stringify(row.tags),
        now,
      ]
    );
  }
}

export async function seedHelpIntroIfEmpty(pool: Pool) {
  const count = await pool.query('SELECT COUNT(*)::int AS n FROM help_posts');
  if ((count.rows[0]?.n ?? 0) > 0) return;
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO help_posts (id, title, body, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $4)
     ON CONFLICT (id) DO NOTHING`,
    [HELP_INTRO_ID, HELP_INTRO_TITLE, HELP_INTRO_BODY, now]
  );
}

export async function applyLegacyCategoryNames(pool: Pool) {
  await pool.query(`UPDATE category_level1 SET name = '게시판', updated_at = $1 WHERE id = 'l1-etc' AND name IN ('기타', '게시판')`, [
    new Date().toISOString(),
  ]);
  await pool.query(
    `UPDATE category_level1 SET name = '게시판', updated_at = $1
     WHERE name = '기타' AND id IN (SELECT parent_id FROM category_level2 WHERE id = 'l2-help' OR name IN ('도움말', '참고 문서 모음'))`,
    [new Date().toISOString()]
  );
  await pool.query(
    `UPDATE category_level2 SET view_type = 'board', updated_at = $1
     WHERE id = 'l2-help' OR (name IN ('도움말', '참고 문서 모음') AND parent_id IN (SELECT id FROM category_level1 WHERE name IN ('기타', '게시판')))`,
    [new Date().toISOString()]
  );
  await pool.query(
    `UPDATE category_level2 SET name = '참고 문서 모음', updated_at = $1
     WHERE name = '도움말'
       AND parent_id IN (SELECT id FROM category_level1 WHERE name IN ('기타', '게시판'))
       AND NOT EXISTS (
         SELECT 1 FROM category_level2 other
         WHERE other.parent_id = category_level2.parent_id
           AND other.name = '참고 문서 모음'
           AND other.id <> category_level2.id
       )`,
    [new Date().toISOString()]
  );
}
