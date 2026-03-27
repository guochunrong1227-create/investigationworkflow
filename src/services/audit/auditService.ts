import { AUDIT_CONFIG } from "./auditConfig";

export interface AuditResult {
  passed: boolean;
  score: number;
  feedback: string;
  missingRequirements: string[];
  suggestions: string;
}

export const auditAnalysis = async (
  stepIndex: number,
  content: string,
  provider: "gemini" | "deepseek" | "doubao",
  userId: string
): Promise<AuditResult> => {
  const config = AUDIT_CONFIG[stepIndex];
  if (!config) {
    return { passed: true, score: 100, feedback: "未找到审计配置，自动通过", missingRequirements: [], suggestions: "" };
  }

  const auditPrompt = `
作为一名资深咨询审计专家，请对以下咨询分析报告的内容进行严格审计。
审计目标：确保报告内容符合“${config.title}”的专业要求和结构化标准。

### 审计标准：
${config.requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")}
${config.minWordCount ? `* 建议字数不少于 ${config.minWordCount} 字。` : ""}
${config.mustIncludeSections ? `* 必须包含以下章节：${config.mustIncludeSections.join("、")}。` : ""}

### 待审计内容：
---
${content}
---

### 审计任务：
1. 检查是否满足所有审计标准。
2. 评估内容的深度、逻辑性和专业度。
3. 检查是否包含必要的图表（Mermaid 代码）。
4. 给出 0-100 的评分。
5. 如果不合格（低于 80 分），请明确指出缺失的内容或需要改进的地方。

### 输出格式（必须为 JSON）：
{
  "passed": boolean, // 是否通过（评分 >= 80 且满足核心要求）
  "score": number, // 0-100 评分
  "feedback": "简短的总体评价",
  "missingRequirements": ["缺失项1", "缺失项2"], // 明确列出不符合的标准
  "suggestions": "具体的改进建议，用于指导 AI 重新生成或补充内容"
}
`;

  try {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        userId,
        messages: [
          { role: "system", content: "你是一个严谨的咨询报告审计专家，只输出 JSON 格式的审计结果。" },
          { role: "user", content: auditPrompt }
        ],
      }),
    });

    const data = await res.json();
    console.log(data);
    if (data.error) throw new Error(data.error.message || "审计失败");

    const resultText = data.choices[0].message.content;
    console.log("Raw audit response:", resultText);
    
    // Extract JSON if AI wrapped it in markdown code blocks
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI 审计结果格式不正确，未找到 JSON");
    }
    
    const auditResult: AuditResult = JSON.parse(jsonMatch[0]);
    console.log("Parsed audit result:", auditResult);

    return auditResult;
  } catch (err) {
    console.error("Audit Service Error:", err);
    return {
      passed: true, // 审计出错时默认通过，避免阻塞流程
      score: 0,
      feedback: "审计服务暂时不可用",
      missingRequirements: [],
      suggestions: "请手动检查内容质量"
    };
  }
};
