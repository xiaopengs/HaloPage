// 识别服务：Provider 抽象 + 降级链 + 结构化输出解析
// 主链路：Qwen-VL（DashScope，OpenAI 兼容端点）；备用：任意 OpenAI 兼容多模态端点；最终兜底：手动录入
const axios = require('axios');
const config = require('./config');
const { err } = require('./util');

const PROMPT_VERSION = 'v1.0';

const SYSTEM_PROMPT = `你是"小学作业识别助手"。用户会发来一张作业照片（老师布置的作业通知、黑板/群消息截图或孩子作业本页面）。
请识别图片中的作业内容，输出严格 JSON（不要输出任何其他文字、不要用 markdown 代码块）：
{
  "overall_confidence": 0.0到1.0的总体置信度,
  "items": [
    { "subject": "学科名（语文/数学/英语/科学/道德与法治/其他之一）", "content": "该科作业内容，一句话概括", "confidence": 0.0到1.0 }
  ],
  "reason": "当图片模糊、非作业图片或无法识别时，简述原因；成功识别时为空字符串"
}
规则：
1. 只识别与作业相关的内容；图片中没有作业内容时 items 返回空数组并在 reason 说明。
2. 同一学科的多个条目请合并为一条 content；不同学科分成多条 items。
3. 无法确定学科时 subject 填"其他"。
4. 手写潦草导致个别字不确定时，按最可能的含义识别并降低对应 confidence。`;

function buildMessages(base64, mime) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
        { type: 'text', text: '请识别这张图片中的作业内容，按约定的 JSON 格式输出。' },
      ],
    },
  ];
}

async function callOpenAiCompatible({ baseUrl, apiKey, model, base64, mime, timeoutMs }) {
  const resp = await axios.post(
    `${baseUrl.replace(/\/$/, '')}/chat/completions`,
    {
      model,
      messages: buildMessages(base64, mime),
      temperature: 0.1,
      max_tokens: 1024,
    },
    {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: timeoutMs,
    }
  );
  const text = resp.data?.choices?.[0]?.message?.content || '';
  return text;
}

function parseResult(text) {
  let raw = text.trim();
  // 去掉可能的 markdown 代码块包裹
  raw = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw err(3003, '识别结果解析失败');
  const obj = JSON.parse(raw.slice(start, end + 1));
  const items = Array.isArray(obj.items)
    ? obj.items
        .filter(it => it && typeof it.content === 'string' && it.content.trim())
        .map(it => ({
          subject: typeof it.subject === 'string' && it.subject.trim() ? it.subject.trim() : '其他',
          content: it.content.trim(),
          confidence: typeof it.confidence === 'number' ? Math.min(Math.max(it.confidence, 0), 1) : 0.6,
        }))
    : [];
  return {
    overall_confidence: typeof obj.overall_confidence === 'number' ? obj.overall_confidence : 0.5,
    items,
    reason: typeof obj.reason === 'string' ? obj.reason : '',
  };
}

// 单个 provider 调用（带超时）
async function callProvider(provider, image) {
  const t0 = Date.now();
  try {
    const text = await callOpenAiCompatible({
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      model: provider.model,
      base64: image.base64,
      mime: image.mime,
      timeoutMs: config.llm.timeoutMs,
    });
    const parsed = parseResult(text);
    return { ok: true, provider: provider.name, model: provider.model, duration_ms: Date.now() - t0, result: parsed };
  } catch (e) {
    const code = e.response?.status ? `http_${e.response.status}` : (e.code || 'unknown');
    return { ok: false, provider: provider.name, model: provider.model, duration_ms: Date.now() - t0, error_code: code, error_message: String(e.message).slice(0, 400) };
  }
}

// 降级链：Qwen-VL → 备用兼容端点 → 全败（返回失败，转手动录入）
async function recognize(image) {
  const chain = [];
  if (config.llm.primaryApiKey) {
    chain.push({ name: 'qwen', baseUrl: config.llm.primaryBaseUrl, apiKey: config.llm.primaryApiKey, model: config.llm.primaryModel });
  }
  if (config.llm.backupApiKey) {
    chain.push({ name: 'openai_compat', baseUrl: config.llm.backupBaseUrl, apiKey: config.llm.backupApiKey, model: config.llm.backupModel });
  }
  const attempts = [];
  for (const p of chain) {
    const r = await callProvider(p, image);
    attempts.push(r);
    if (r.ok && r.result.items.length > 0) {
      return { success: true, attempts, final: r };
    }
  }
  if (chain.length === 0) {
    return { success: false, attempts: [{ ok: false, provider: 'none', error_code: 'no_provider', error_message: '未配置识别服务' }], final: null };
  }
  // 链路可用但图片无有效内容
  const lastOk = attempts.find(a => a.ok);
  return {
    success: false,
    attempts,
    final: lastOk ? { ...lastOk, result: lastOk.result } : null,
    reason: lastOk?.result?.reason || '识别失败，请手动录入',
  };
}

module.exports = { recognize, PROMPT_VERSION };
