const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

// Firebase Secret Manager에서 API 키 로드 (배포 시 자동으로 안전하게 관리됨)
const openaiApiKey = defineSecret("OPENAI_API_KEY");

/**
 * OpenAI Chat Completions 프록시
 * - Firebase Auth 인증 필수 (onCall이 자동 처리)
 * - Rate limiting: 사용자당 분당 20회
 * - max_tokens 상한: 2000
 */
exports.callOpenAI = onCall(
  {
    secrets: [openaiApiKey],
    enforceAppCheck: false, // 필요 시 true로 변경
    maxInstances: 10, // 동시 인스턴스 제한 (비용 관리)
    timeoutSeconds: 60,
    memory: "256MiB",
    region: "asia-northeast3", // 서울 리전 (한국 사용자 대상)
  },
  async (request) => {
    // 1) 인증 확인 (onCall은 자동으로 Firebase Auth 토큰을 검증)
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "로그인이 필요합니다."
      );
    }

    const uid = request.auth.uid;
    const { model, messages, temperature, response_format } = request.data;

    // 2) 요청 검증
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "messages 배열이 필요합니다."
      );
    }

    // 3) 허용 모델 제한 (비용 관리)
    const allowedModels = ["gpt-4o-mini", "gpt-4o"];
    const requestedModel = model || "gpt-4o-mini";
    if (!allowedModels.includes(requestedModel)) {
      throw new HttpsError(
        "invalid-argument",
        `허용되지 않는 모델입니다. 사용 가능: ${allowedModels.join(", ")}`
      );
    }

    // 4) Rate Limiting (Firestore 기반, 사용자당 분당 20회)
    const rateLimitRef = admin
      .firestore()
      .collection("rateLimits")
      .doc(uid);

    const now = Date.now();
    const windowMs = 60 * 1000; // 1분
    const maxRequests = 20;

    try {
      const rateLimitResult = await admin
        .firestore()
        .runTransaction(async (transaction) => {
          const doc = await transaction.get(rateLimitRef);
          const data = doc.data() || { requests: [], windowStart: now };

          // 현재 윈도우 내의 요청만 필터링
          const recentRequests = (data.requests || []).filter(
            (ts) => ts > now - windowMs
          );

          if (recentRequests.length >= maxRequests) {
            return { limited: true };
          }

          recentRequests.push(now);
          transaction.set(rateLimitRef, {
            requests: recentRequests,
            windowStart: data.windowStart,
          });

          return { limited: false };
        });

      if (rateLimitResult.limited) {
        throw new HttpsError(
          "resource-exhausted",
          "요청이 너무 많습니다. 1분 후 다시 시도해주세요."
        );
      }
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      console.error("[RateLimit] Transaction error:", err);
      // Rate limit 실패 시에도 요청은 허용 (가용성 우선)
    }

    // 5) OpenAI API 호출
    try {
      console.log(`[OpenAI] User: ${uid}, Model: ${requestedModel}`);

      const requestBody = {
        model: requestedModel,
        messages,
        temperature: temperature ?? 0.2,
        max_tokens: 2000, // 비용 상한 강제
      };

      // response_format이 있으면 포함 (Structured Output)
      if (response_format) {
        requestBody.response_format = response_format;
      }

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${openaiApiKey.value()}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      console.log(
        `[OpenAI] Success. Tokens used: ${response.data.usage?.total_tokens || "N/A"}`
      );

      return response.data;
    } catch (error) {
      console.error(
        "[OpenAI] Error:",
        error.response?.data || error.message
      );

      if (error.response?.status === 429) {
        throw new HttpsError(
          "resource-exhausted",
          "OpenAI API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요."
        );
      }

      throw new HttpsError(
        "internal",
        "AI 분석 중 오류가 발생했습니다."
      );
    }
  }
);
