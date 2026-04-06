import { TaskFormData } from './types';
import { getFormattedDate, addDays } from './utils';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeApp, getApps } from 'firebase/app';
import { auth } from './firebase';

// Firebase Functions 인스턴스 (서울 리전)
const functions = getFunctions(getApps()[0], 'asia-northeast3');
const callOpenAIFn = httpsCallable(functions, 'callOpenAI');

// Firebase Cloud Function을 통한 안전한 API 호출
// - API 키는 서버(Cloud Functions)에만 존재
// - Firebase Auth 인증 자동 처리
// - Rate Limiting 내장
async function callOpenAI(requestBody: any): Promise<any> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('로그인이 필요합니다. AI 분석을 위해 로그인해 주세요.');
  }

  console.log('[AI] Firebase Cloud Function을 통해 API 호출');

  try {
    const result = await callOpenAIFn(requestBody);
    return result.data;
  } catch (error: any) {
    console.error('[AI] Cloud Function 호출 오류:', error);

    // Firebase Functions 에러 코드 처리
    if (error.code === 'functions/unauthenticated') {
      throw new Error('로그인이 필요합니다. AI 분석을 위해 로그인해 주세요.');
    }
    if (error.code === 'functions/resource-exhausted') {
      throw new Error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
    }
    if (error.code === 'functions/invalid-argument') {
      throw new Error(error.message || '잘못된 요청입니다.');
    }

    throw new Error(error.message || 'AI 서버 연결에 실패했습니다.');
  }
}

// OpenAI Structured Output을 위한 JSON Schema 정의
const TASK_JSON_SCHEMA = {
  name: "task_list",
  strict: true,
  schema: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "할 일 제목 (명확하고 짧게)" },
            category: { type: "string", description: "카테고리 (1단어)" },
            dueDate: { type: "string", description: "마감일 YYYY-MM-DD" },
            impact: { type: "number", description: "영향력 1-10" },
            urgency: { type: "number", description: "긴급도 1-10" },
            effort: { type: "number", description: "노력 1-10" },
            isDomino: { type: "boolean", description: "핵심 도미노 작업 여부" },
            isBlocked: { type: "boolean", description: "선행작업 필요 여부" }
          },
          required: ["title", "category", "dueDate", "impact", "urgency", "effort", "isDomino", "isBlocked"],
          additionalProperties: false
        }
      }
    },
    required: ["tasks"],
    additionalProperties: false
  }
};

export const parseTasksWithAI = async (text: string, currentCategories: string[]): Promise<TaskFormData[]> => {
  const today = new Date();
  const todayStr = getFormattedDate(today);
  const tomorrowStr = getFormattedDate(addDays(today, 1));
  const defaultDueDate = todayStr;

  const systemPrompt = `당신은 사용자의 두서없는 메모(브레인덤프)를 분석하여 구조화된 할 일 목록으로 변환하는 전문 AI 비서입니다.

분석 규칙:
- [중요] 사용자의 메모에 포함된 **모든 개별적인 할 일(작업)을 절대 누락하지 말고** 빠짐없이 추출하세요.
- [중요] 하나의 문장에 여러 작업이 섞여있다면 (예: "A하고 B해야 해"), 반드시 A와 B를 독립된 각각의 할 일로 분리하세요.
- 현재 날짜: ${todayStr}
- '내일'은 ${tomorrowStr}, '모레'는 ${getFormattedDate(addDays(today, 2))}
- 날짜 미지정 시 기본 마감일: ${defaultDueDate}
- 자주 쓰는 카테고리: ${currentCategories.join(', ')}
- 카테고리는 가급적 위 목록에서 선택하고, 적합하지 않으면 1단어로 새로 생성
- impact: 이 일이 사용자 인생/목표에 미치는 긍정적 영향력 (1=미미, 10=판도를 바꿈)
- urgency: 시간적 긴급성 (1=여유, 10=당장 해야 함)
- effort: 완료에 필요한 노력 (1=5분이면 끝남, 10=매우 힘듦)
- isDomino: true = 이 일을 하면 다른 많은 일이 수월해지는 핵심 작업
- isBlocked: true = 다른 일이 먼저 완료되어야 시작할 수 있는 작업`;

  const userPrompt = `다음 메모를 분석해서 포함된 '모든' 할 일 목록을 분리 및 변환해주세요:

"${text}"`;

  console.log('[AI] 분석 시작:', text.substring(0, 50) + '...');

  try {
    const requestBody = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: TASK_JSON_SCHEMA
      }
    };

    console.log('[AI] API 요청 전송 중...');

    const data = await callOpenAI(requestBody);
    console.log('[AI] API 응답 수신:', JSON.stringify(data).substring(0, 200));
    
    // OpenAI API의 응답 구조에서 텍스트 추출
    const responseText = data.choices?.[0]?.message?.content;
    
    if (!responseText) {
      console.error('[AI] 빈 응답:', JSON.stringify(data));
      throw new Error('AI로부터 빈 응답을 받았습니다.');
    }

    console.log('[AI] 응답 텍스트:', responseText);

    // JSON 파싱 (Structured Output이므로 깨끗한 JSON이 옴)
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('[AI] JSON 파싱 실패, 정제 시도:', parseErr);
      // 혹시 마크다운으로 감싸져 있다면 발췌
      const startIdx = responseText.indexOf('[');
      const endIdx = responseText.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1) {
        parsed = { tasks: JSON.parse(responseText.substring(startIdx, endIdx + 1)) };
      } else {
        throw parseErr;
      }
    }

    // Structured Output은 { tasks: [...] } 형태
    const rawTasks = Array.isArray(parsed) ? parsed : (parsed.tasks || []);

    if (!rawTasks || rawTasks.length === 0) {
      console.error('[AI] 추출된 할 일이 없음:', parsed);
      throw new Error('메모에서 할 일을 추출하지 못했습니다. 좀 더 구체적으로 적어주세요.');
    }
    
    // 유효성 검증 및 기본값 보정
    const validatedTasks: TaskFormData[] = rawTasks.map((task: any) => ({
      title: String(task.title || "제목 없음").trim(),
      category: String(task.category || "기타").trim(),
      dueDate: task.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) ? task.dueDate : defaultDueDate,
      impact: Math.min(10, Math.max(1, Number(task.impact) || 5)),
      urgency: Math.min(10, Math.max(1, Number(task.urgency) || 5)),
      effort: Math.min(10, Math.max(1, Number(task.effort) || 5)),
      isDomino: Boolean(task.isDomino),
      isBlocked: Boolean(task.isBlocked)
    }));

    console.log('[AI] 분석 완료! 추출된 할 일:', validatedTasks.length, '개');
    console.table(validatedTasks);

    return validatedTasks;

  } catch (error: any) {
    console.error("[AI] 분석 실패:", error);
    // 사용자에게 보여줄 에러 메시지를 좀 더 구체적으로
    if (error.message?.includes('API 오류')) {
      throw new Error(`AI 서버 연결 실패: ${error.message}`);
    }
    if (error.message?.includes('추출하지 못했습니다')) {
      throw error;
    }
    throw new Error('AI 분석에 실패했습니다. 브라우저 콘솔(F12)에서 상세 로그를 확인해주세요.');
  }
};
