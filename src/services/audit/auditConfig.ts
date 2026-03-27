export interface AuditRequirement {
  stepIndex: number;
  title: string;
  requirements: string[];
  minWordCount?: number;
  mustIncludeSections?: string[];
}

export const AUDIT_CONFIG: Record<number, AuditRequirement> = {
  0: {
    stepIndex: 0,
    title: "行业分析阶段审计",
    requirements: [
      "必须包含 PEST 分析（政治、经济、社会、技术）",
      "必须包含波特五力模型分析",
      "必须包含行业生命周期判断",
      "必须包含价值链分析",
      "报告中必须包含 Mermaid 流程图或图表代码",
      "结论必须包含针对董事长的战略建议",
      "语言风格必须专业、结构化、数据驱动"
    ],
    minWordCount: 800,
    mustIncludeSections: ["行业背景", "PEST分析", "波特五力模型", "价值链分析", "战略建议"]
  },
  1: {
    stepIndex: 1,
    title: "现场访谈阶段审计",
    requirements: [
      "必须包含针对不同职能高管的差异化访谈提纲",
      "必须包含“三问一刀”逻辑（最大问题、为何未解、谁负责、改哪一件事）",
      "必须识别核心矛盾与愿景",
      "访谈问题必须具有穿透力，能识别管理失真",
      "文档结构清晰，按角色分类"
    ],
    minWordCount: 500,
    mustIncludeSections: ["访谈目的", "高管访谈提纲", "矛盾识别逻辑"]
  },
  2: {
    stepIndex: 2,
    title: "阶段判断阶段审计",
    requirements: [
      "必须包含企业生命周期定位分析",
      "必须包含麦肯锡三层面业务组合诊断",
      "必须识别 1-3 个核心结构性矛盾",
      "必须包含价值链对标分析",
      "必须引用第一阶段的行业分析结论进行交叉验证",
      "必须包含 Mermaid 格式的图表"
    ],
    minWordCount: 800,
    mustIncludeSections: ["企业现状诊断", "生命周期定位", "三层面分析", "核心矛盾识别"]
  },
  3: {
    stepIndex: 3,
    title: "决策建模阶段审计",
    requirements: [
      "必须包含决策建模表（含战略价值、阶段匹配、紧迫度等维度）",
      "必须包含优先级排序表（先打、后打、暂不打）",
      "必须包含 SWOT 交叉分析定位",
      "必须包含成本绩效分析（投入产出比）",
      "必须为“先打”选项制定 90 天行动纲领（含里程碑）"
    ],
    minWordCount: 600,
    mustIncludeSections: ["决策建模表", "优先级排序", "SWOT分析", "行动方案"]
  },
  4: {
    stepIndex: 4,
    title: "辅导规划阶段审计",
    requirements: [
      "必须包含“董事长驾驶舱”核心指标设计",
      "必须包含蓝海战略 ERRC 四项行动框架",
      "必须包含年度硬仗规划与甘特图（Mermaid）",
      "必须包含组织系统设计（架构、薪酬、绩效等）",
      "必须包含 3 倍投资回报（ROI）测算",
      "报告篇幅必须详实，体现高价值交付"
    ],
    minWordCount: 1500,
    mustIncludeSections: ["董事长驾驶舱", "战略定位重塑", "年度规划", "组织系统方案", "投资回报承诺"]
  }
};
