import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Upload, 
  Brain, 
  ArrowRight, 
  Save, 
  Download, 
  Eye, 
  FileCode, 
  FileDown,
  Send
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// @ts-ignore
import html2pdf from "html2pdf.js";
import { marked } from "marked";
import { GoogleGenAI } from "@google/genai";
import { SystemSettings, Project, User } from "../types";
import { METHODOLOGY_PROMPTS } from "../constants/methodologies";
import { cn } from "../utils/cn";

import { saveAs } from 'file-saver';

export const Workflow = ({ settings, user }: { settings: SystemSettings; user: User }) => {
  const { projectId: paramProjectId } = useParams();
  const navigate = useNavigate();
  const projectId = paramProjectId || "default-project";

  const [project, setProject] = useState<Project | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [provider, setProvider] = useState(settings.aiProvider);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [cumulativeReport, setCumulativeReport] = useState("");
  const [showCumulative, setShowCumulative] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<{filename: string, originalname: string}[]>([]);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [sending, setSending] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const steps = [
    { title: "行业分析", desc: "全面了解行业，判断容量、规划、周期。" },
    { title: "现场访谈", desc: "收集高层看法，识别问题与愿景。" },
    { title: "阶段判断", desc: "判断企业所处阶段，识别结构性矛盾。" },
    { title: "辅导规划", desc: "设计咨询方案，形成路演报告。" }
  ];

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data);
          setActiveStep(data.lastStep || 0);
        }
      } catch (err) {
        console.error("Failed to fetch project", err);
      }
    };
    if (projectId !== "default-project") {
      fetchProject();
    }
  }, [projectId]);

  useEffect(() => {
    loadResult();
    if (activeStep > 0) {
      loadCumulativeReport();
    } else {
      setCumulativeReport("");
    }
  }, [activeStep, projectId]);

  const loadResult = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/steps/${activeStep}/load`);
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.content || "");
        setManualInput(data.manualInput || "");
        setUploadedFiles(data.files || []);
      } else {
        setAnalysis("");
        setManualInput("");
        setUploadedFiles([]);
      }
    } catch (err) {
      console.error("加载失败", err);
    }
  };

  const loadCumulativeReport = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/report?upToStep=${activeStep - 1}`);
      if (res.ok) {
        const data = await res.json();
        setCumulativeReport(data.content || "");
      }
    } catch (err) {
      console.error("加载累计报告失败", err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/steps/${activeStep}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content: analysis,
          manualInput,
          files: uploadedFiles
        }),
      });
      
      if (res.ok) {
        // Update lastStep on server if it's the furthest step reached
        if (project && activeStep >= project.lastStep) {
          await fetch(`/api/projects/${projectId}/update-step`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lastStep: activeStep }),
          });
          setProject(prev => prev ? { ...prev, lastStep: activeStep } : null);
        }
        alert("结果已保存到本地及预留数据库");
      }
    } catch (err) {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i++) {
      formData.append("files", e.target.files[i]);
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setUploadedFiles(prev => [...prev, ...data.files]);
      }
    } catch (err) {
      alert("文件上传失败");
    } finally {
      setUploading(false);
    }
  };

  const handleAIAnalysis = async () => {
    setLoading(true);
    const methodInfo = METHODOLOGY_PROMPTS[activeStep as keyof typeof METHODOLOGY_PROMPTS];
    
    // Fetch file contents for text files
    let fileContents = "";
    for (const file of uploadedFiles) {
      const ext = file.filename.split(".").pop()?.toLowerCase();
      if (["txt", "md", "json", "csv","PDF","docx","xlsx","xls"].includes(ext || "")) {
        try {
          const res = await fetch(`/api/files/${file.filename}`);
          if (res.ok) {
            const data = await res.json();
            fileContents += `\n--- 文件: ${file.originalname} ---\n${data.content}\n`;
          }
        } catch (err) {
          console.error(`读取文件 ${file.originalname} 失败`, err);
        }
      }
    }

    const context = `
${cumulativeReport ? `前序阶段分析总结：\n${cumulativeReport}\n\n` : ""}
当前阶段手动输入的信息:
${manualInput || "无"}

已上传的资料列表:
${uploadedFiles.map(f => f.originalname).join(", ") || "无"}

${fileContents ? `上传资料的文本内容：\n${fileContents}` : ""}
`;

    try {
      let content = "";

      if (provider === "gemini") {
        // Fetch Gemini API Key from server
        const configRes = await fetch("/api/config/gemini");
        const { apiKey } = await configRes.json();
        
        if (!apiKey) {
          throw new Error("未配置 Gemini API Key");
        }

        const genAI = new GoogleGenAI({ apiKey });
        const response = await genAI.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            { role: "user", parts: [{ text: `${methodInfo.prompt}\n\n请结合以下背景信息开始分析：\n${context}` }] }
          ],
          config: {
            // Increase output tokens to prevent truncation
            maxOutputTokens: 8192,
            temperature: 0.7,
          }
        });
        content = response.text || "";
      } else {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            userId: user.id,
            messages: [
              { role: "system", content: methodInfo.prompt },
              { role: "user", content: `请结合以下背景信息开始分析：\n${context}` }
            ],
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message || "AI 分析失败");
        content = data.choices[0].message.content;
      }

      // Clean up content if needed
      const cleanedContent = content.replace(/“/g, '"').replace(/”/g, '"').replace(/：/g, ':');
      setAnalysis(cleanedContent);
      setViewMode("preview");

      // Automatically save after AI analysis to prevent data loss
      await fetch(`/api/projects/${projectId}/steps/${activeStep}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content: cleanedContent,
          manualInput,
          files: uploadedFiles
        }),
      });
      
      // Update lastStep on server if it's a real project
      if (project) {
        await fetch(`/api/projects/${projectId}/update-step`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lastStep: activeStep }),
        });
      }
    } catch (err) {
      console.error("AI Analysis Error:", err);
      alert("AI 分析失败，请检查网络连接或 API Key 设置");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "md" | "html" | "pdf") => {
    if (!analysis) return;

    if (format === "md") {
      const blob = new Blob([analysis], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `调研报告_${steps[activeStep].title}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === "html") {
      const htmlContent = marked.parse(analysis);
      const fullHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>调研报告 - ${steps[activeStep].title}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css/github-markdown.css">
    <style>
        body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
            background-color: #f6f8fa;
        }
        .markdown-body {
            background-color: #fff;
            padding: 45px;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.05);
            border: 1px solid #e1e4e8;
        }
        @media (max-width: 767px) {
            .markdown-body {
                padding: 15px;
            }
            body {
                padding: 15px;
            }
        }
        .report-header {
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #10b981;
        }
        .report-header h1 {
            margin: 0;
            color: #1a1a1a;
            font-size: 2.5em;
        }
        .meta {
            color: #666;
            font-size: 0.9em;
            margin-top: 10px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #888;
            font-size: 0.8em;
        }
    </style>
</head>
<body>
    <div class="markdown-body">
        <header class="report-header">
            <h1>${steps[activeStep].title}</h1>
            <div class="meta">
                <div>项目名称: ${project?.name || "未命名项目"}</div>
                <div>生成时间: ${new Date().toLocaleString()}</div>
            </div>
        </header>
        <article>
            ${htmlContent}
        </article>
        <footer class="footer">
            © ${new Date().getFullYear()} ${settings.systemName} - 智能咨询调研报告
        </footer>
    </div>
</body>
</html>`;
      const blob = new Blob([fullHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `调研报告_${steps[activeStep].title}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === "pdf") {
      setExportingPdf(true);
      
      try {
        // Create a temporary hidden element to render the markdown for PDF export
        // This ensures export works even if the user is in "edit" mode
        const tempDiv = document.createElement("div");
        tempDiv.style.position = "absolute";
        tempDiv.style.left = "-9999px";
        tempDiv.style.top = "0";
        tempDiv.style.width = "800px";
        // tempDiv.style.backgroundColor = "#ffffff"; // 临时背景
        tempDiv.className = "markdown-body pdf-export-container"; // Use github-markdown-css style for consistency
        
        // Add a header for the PDF
        const headerHtml = `
          <div style="margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #10b981;">
            <h1 style="margin: 0; color: #1a1a1a; font-size: 24pt;">${steps[activeStep].title}</h1>
            <div style="color: #666; font-size: 10pt; margin-top: 8px;">
              <div>项目名称: ${project?.name || "未命名项目"}</div>
              <div>生成时间: ${new Date().toLocaleString()}</div>
            </div>
          </div>
        `;

        const htmlContent = await marked.parse(analysis);

        // 内联 github-markdown-css（也可以从 CDN 引入，但内联更稳定）
        // const markdownCss = `/* 这里粘贴 github-markdown-css 的内容，或者从 node_modules 中读取 */`;
        // 建议从 node_modules 中复制，或者直接使用 CDN 链接（如下），但需要保证后端能访问外网。
        // 我们这里使用 CDN 链接，同时添加 fallback
        const cdnLink = '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown.min.css">';


        const fullHtml = `<!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>调研报告</title>
            ${cdnLink}
            <style>
              /* 额外的自定义样式 */
              body {
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
              }
              .markdown-body {
                box-sizing: border-box;
                min-width: 200px;
                max-width: 980px;
                margin: 0 auto;
                padding: 45px;
              }
              @media print {
                body { background: white; }
              }
            </style>
          </head>
          <body>
            <div class="markdown-body">
              ${headerHtml}
              ${htmlContent}
            </div>
          </body>
          </html>
            `;

        console.log(fullHtml);
        const response = await fetch('/api/generate-pdf', 
        { // 替换为实际后端地址
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: fullHtml,
        });

        if (!response.ok) {
          throw new Error('PDF generation failed');
        }

        // 4. 获取 PDF blob 并触发下载
        const blob = await response.blob();
        saveAs(blob, `调研报告_${steps[activeStep].title}.pdf`); // 使用 file-saver
        // const url = window.URL.createObjectURL(blob);
        // const link = document.createElement('a');
        // link.href = url;
        // link.download = 'report.pdf';
        // document.body.appendChild(link);
        // link.click();
        // document.body.removeChild(link);
        // window.URL.revokeObjectURL(url);

        // tempDiv.innerHTML = headerHtml + htmlContent;
        // document.body.appendChild(tempDiv);

        // const opt = {
        //   margin: 15,
        //   filename: `调研报告_${steps[activeStep].title}.pdf`,
        //   image: { type: 'jpeg' as const, quality: 0.98 },
        //   html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff',logging:true },
        //   jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        // };

        // await html2pdf().set(opt).from(tempDiv).save();
        // document.body.removeChild(tempDiv);
      } catch (err) {
        console.error("PDF Export Error:", err);
        alert("PDF 导出失败，请重试");
      } finally {
        setExportingPdf(false);
      }
    }
  };

  const handleNotify = async () => {
    if (!analysis) return;
    setSending(true);
    try {
      const headerHtml = `
        <div style="margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #10b981;">
          <h1 style="margin: 0; color: #1a1a1a; font-size: 24pt;">${steps[activeStep].title}</h1>
          <div style="color: #666; font-size: 10pt; margin-top: 8px;">
            <div>项目名称: ${project?.name || "未命名项目"}</div>
            <div>生成时间: ${new Date().toLocaleString()}</div>
          </div>
        </div>
      `;

      const htmlContent = await marked.parse(analysis);
      const cdnLink = '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown.min.css">';
      
      const fullHtml = `<!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>调研报告</title>
          ${cdnLink}
          <style>
            body { padding: 20px; font-family: sans-serif; }
            .markdown-body { box-sizing: border-box; min-width: 200px; max-width: 980px; margin: 0 auto; padding: 45px; }
          </style>
        </head>
        <body>
          <div class="markdown-body">
            ${headerHtml}
            ${htmlContent}
          </div>
        </body>
        </html>`;

      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          stepTitle: steps[activeStep].title,
          htmlContent: fullHtml,
          userId: user.id
        })
      });

      if (res.ok) {
        alert("报告已成功发送至配置的邮箱、钉钉和飞书！");
      } else {
        const data = await res.json();
        alert(`发送失败: ${data.error || "请检查配置"}`);
      }
    } catch (err) {
      console.error("Notify error:", err);
      alert("发送过程中出现错误。");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-12">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {project ? project.name : "调研工作流"}
            </h1>
            <p className="text-zinc-500">
              {project ? `项目编号: ${project.id}` : "按照标准咨询流程进行项目推进。"}
            </p>
          </div>
          <div className="flex items-center gap-3 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {["deepseek", "gemini", "doubao"].map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  provider === p ? "bg-emerald-500 text-black" : "text-zinc-400 hover:text-white"
                )}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal Workflow with Arrows */}
        <div className="flex items-center justify-between bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800">
          {steps.map((step, idx) => (
            <React.Fragment key={idx}>
              <button
                onClick={() => setActiveStep(idx)}
                className={cn(
                  "flex flex-col items-center gap-3 transition-all group relative",
                  activeStep === idx ? "text-emerald-500" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold text-sm transition-all",
                  activeStep === idx ? "border-emerald-500 bg-emerald-500/10" : "border-zinc-700 bg-zinc-800"
                )}>
                  {idx + 1}
                </div>
                <span className="text-xs font-bold whitespace-nowrap">{step.title}</span>
                {activeStep === idx && (
                  <motion.div layoutId="step-indicator" className="absolute -bottom-2 w-1 h-1 bg-emerald-500 rounded-full" />
                )}
              </button>
              {idx < steps.length - 1 && (
                <ArrowRight className="text-zinc-700" size={20} />
              )}
            </React.Fragment>
          ))}
        </div>
      </header>

      <div className="space-y-6">
        <motion.div 
          key={activeStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden"
        >
          <div className="p-8 border-b border-zinc-800 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{steps[activeStep].title}</h2>
              <p className="text-zinc-500 text-sm">{steps[activeStep].desc}</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleExport(settings.exportFormat)}
                disabled={!analysis || (settings.exportFormat === "pdf" && exportingPdf)}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-bold px-4 py-2 rounded-xl border border-zinc-700 transition-all disabled:opacity-50"
              >
                <Download size={18} className={cn(settings.exportFormat === "pdf" && exportingPdf && "animate-bounce")} />
                <span>
                  {settings.exportFormat === "pdf" && exportingPdf 
                    ? "正在生成 PDF..." 
                    : `下载报告 (${settings.exportFormat.toUpperCase()})`}
                </span>
              </button>
              <button 
                onClick={handleSave}
                disabled={saving || !analysis}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-bold px-4 py-2 rounded-xl border border-zinc-700 transition-all disabled:opacity-50"
              >
                <Save size={18} />
                <span>{saving ? "保存中..." : "保存结果"}</span>
              </button>
              <button 
                onClick={handleAIAnalysis}
                disabled={loading}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
              >
                <Brain size={18} />
                <span>{loading ? "分析中..." : "智能分析"}</span>
              </button>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <section>
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">手动输入信息</h4>
                  <textarea 
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none"
                    placeholder="在此输入或粘贴调研相关的文字信息..."
                  />
                </section>

                <section>
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">资料上传</h4>
                  <div className="space-y-4">
                    <label className="border-2 border-dashed border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-emerald-500/50 transition-colors cursor-pointer group bg-zinc-950/50">
                      <input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      <Upload size={24} className={cn("text-zinc-600 group-hover:text-emerald-500", uploading && "animate-bounce")} />
                      <p className="text-xs text-zinc-500">{uploading ? "上传中..." : "点击或拖拽上传多个文件"}</p>
                    </label>

                    {uploadedFiles.length > 0 && (
                      <div className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-4 space-y-2">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">已上传列表</p>
                        {uploadedFiles.map((file, i) => (
                          <div key={i} className="flex items-center justify-between text-xs text-zinc-400 bg-zinc-900 p-2 rounded-lg group">
                            <span className="truncate max-w-[150px]">{file.originalname}</span>
                            <button 
                              onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              删除
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
                
                <section>
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">方法论工具箱</h4>
                  <div className="flex flex-wrap gap-2">
                    {METHODOLOGY_PROMPTS[activeStep as keyof typeof METHODOLOGY_PROMPTS].tools.map((tool, i) => (
                      <span key={i} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-[10px] font-medium text-zinc-400">
                        {tool}
                      </span>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">导出选项</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleExport("html")}
                      className="flex items-center justify-center gap-2 bg-zinc-800 p-3 rounded-xl border border-zinc-700 text-xs font-bold text-zinc-400 hover:text-white transition-all"
                    >
                      <FileCode size={16} />
                      导出 HTML
                    </button>
                    <button 
                      onClick={() => handleExport("pdf")}
                      disabled={exportingPdf || !analysis}
                      className="flex items-center justify-center gap-2 bg-zinc-800 p-3 rounded-xl border border-zinc-700 text-xs font-bold text-zinc-400 hover:text-white transition-all disabled:opacity-50"
                    >
                      <FileDown size={16} className={cn(exportingPdf && "animate-bounce")} />
                      {exportingPdf ? "正在生成 PDF..." : "导出 PDF"}
                    </button>

                    <button 
                      onClick={handleNotify}
                      disabled={sending || !analysis}
                      className="col-span-2 flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-xs font-bold text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all disabled:opacity-50"
                    >
                      <Send size={16} />
                      {sending ? "发送中..." : "发送报告 (邮件/钉钉/飞书)"}
                    </button>
                  </div>
                </section>
              </div>

              <div className="lg:col-span-2 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">分析结果查看器</h4>
                    {activeStep > 0 && (
                      <button 
                        onClick={() => setShowCumulative(!showCumulative)}
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded border transition-all",
                          showCumulative ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" : "border-zinc-800 text-zinc-600 hover:text-zinc-400"
                        )}
                      >
                        {showCumulative ? "隐藏前序阶段" : "查看前序阶段"}
                      </button>
                    )}
                  </div>
                  <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                    <button 
                      onClick={() => setViewMode("edit")}
                      className={cn("px-3 py-1 text-[10px] font-bold rounded transition-all", viewMode === "edit" ? "bg-zinc-800 text-white" : "text-zinc-600")}
                    >
                      编辑
                    </button>
                    <button 
                      onClick={() => setViewMode("preview")}
                      className={cn("px-3 py-1 text-[10px] font-bold rounded transition-all", viewMode === "preview" ? "bg-zinc-800 text-white" : "text-zinc-600")}
                    >
                      预览
                    </button>
                  </div>
                </div>
                
                <div className="bg-zinc-950 rounded-2xl border border-zinc-800 min-h-[400px] overflow-hidden flex flex-col">
                  {showCumulative && cumulativeReport && (
                    <div className="p-6 bg-zinc-900/30 border-b border-zinc-800 max-h-48 overflow-y-auto">
                      <p className="text-[10px] font-bold text-zinc-600 uppercase mb-2">前序阶段汇总</p>
                      <div className="prose prose-invert prose-sm max-w-none opacity-50">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{cumulativeReport}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {viewMode === "edit" ? (
                    <textarea 
                      value={analysis}
                      onChange={(e) => setAnalysis(e.target.value)}
                      className="flex-1 bg-transparent p-6 text-zinc-300 font-mono text-sm focus:outline-none resize-none"
                      placeholder="AI 分析结果将显示在这里，您可以手动编辑..."
                    />
                  ) : (
                    <div 
                      ref={previewRef}
                      className="flex-1 p-8 prose prose-invert prose-emerald max-w-none overflow-y-auto"
                    >
                      {analysis ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 italic text-sm">
                          <Eye size={32} className="mb-2 opacity-20" />
                          暂无分析内容
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
