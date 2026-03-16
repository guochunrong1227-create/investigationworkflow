import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";

// import * as pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import XLSX from 'xlsx';
import {exec} from 'child_process';
import puppeteer from 'puppeteer';
import bodyParser from "body-parser";
// const cors = require('cors');
// const bodyParser = require('body-parser');

dotenv.config();

const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const pdfsDir = "./pdfs";
if (!fs.existsSync(pdfsDir)) {
  fs.mkdirSync(pdfsDir);
}

// Setup storage for uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 修复可能的文件名编码问题
    let originalName = file.originalname;
    // 检查是否所有字符都在 Latin1 范围内（码点 ≤ 255）
    const needsFix = [...originalName].every(ch => ch.charCodeAt(0) <= 255);
    if (needsFix) {
      try {
        // 将 Latin1 解码的字符串转回 UTF-8
        const fixed = Buffer.from(originalName, 'latin1').toString('utf8');
        // 对于纯 ASCII 字符串，fixed 与原值相同，无害
        file.originalname = fixed;
      } catch (e) {
        console.error("文件名编码修复失败", e);
      }
    }
    // 生成最终存储的文件名（时间戳 + 修正后的原始文件名）
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.text({ type: '*/*' }));
  app.use(express.json());

  // Mock Database
  const dbPath = "./data";
  if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath);
  
  const db = {
    companies: [
      { id: "c1", name: "咨询总公司" }
    ],
    users: [
      { id: "u1", companyId: "c1", name: "管理员", role: "admin", email: "admin@example.com", password: "password" }
    ],
    projects: [] as any[],
    settings: {
      defaultModel: "deepseek-chat",
      aiProvider: "deepseek",
      systemName: "咨询调研系统",
      exportFormat: "md",
      userApiKeys: {}
    }
  };

  // Load data if exist
  const settingsFile = path.join(dbPath, "settings.json");
  if (fs.existsSync(settingsFile)) {
    db.settings = JSON.parse(fs.readFileSync(settingsFile, "utf-8"));
  }

  const projectsFile = path.join(dbPath, "projects.json");
  if (fs.existsSync(projectsFile)) {
    db.projects = JSON.parse(fs.readFileSync(projectsFile, "utf-8"));
  }

  const saveProjects = () => {
    fs.writeFileSync(projectsFile, JSON.stringify(db.projects, null, 2));
  };

  // Auth Routes
  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.users.find(u => u.email === email && u.password === password);
    if (user) {
      const company = db.companies.find(c => c.id === user.companyId);
      res.json({ user, company });
    } else {
      res.status(401).json({ message: "邮箱或密码错误" });
    }
  });

  // Project Routes
  app.get("/api/projects", (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "Missing userId" });
    const userProjects = db.projects.filter(p => p.userId === userId);
    res.json(userProjects);
  });

  app.get("/api/projects/:projectId", (req, res) => {
    const { projectId } = req.params;
    const project = db.projects.find(p => p.id === projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  // Get cumulative report (all steps up to current)
  app.get("/api/projects/:projectId/report", (req, res) => {
    const { projectId } = req.params;
    const { upToStep } = req.query;
    const limit = upToStep !== undefined ? parseInt(upToStep as string) : 3;
    
    const resultsDir = path.join(dbPath, "results", projectId);
    let fullReport = "";
    
    const stepTitles = ["行业分析", "现场访谈", "阶段判断", "辅导规划"];
    
    for (let i = 0; i <= limit; i++) {
      const filePath = path.join(resultsDir, `step_${i}.json`);
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        if (data.content) {
          fullReport += `\n\n### 阶段 ${i + 1}: ${stepTitles[i]}\n\n${data.content}`;
        }
      }
    }
    
    res.json({ content: fullReport.trim() });
  });

  app.post("/api/projects", (req, res) => {
    const { name, userId, companyId, description, overwrite } = req.body;
    
    const existingIndex = db.projects.findIndex(p => p.name === name && p.userId === userId);
    
    if (existingIndex !== -1 && !overwrite) {
      return res.status(409).json({ message: "项目名称已存在，是否覆盖？" });
    }

    const project = {
      id: existingIndex !== -1 ? db.projects[existingIndex].id : "p-" + Date.now(),
      name,
      userId,
      companyId,
      description: description || "",
      createdAt: existingIndex !== -1 ? db.projects[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastStep: existingIndex !== -1 ? db.projects[existingIndex].lastStep : 0,
      steps: [] // Steps are stored separately in results folder
    };

    if (existingIndex !== -1) {
      db.projects[existingIndex] = project;
    } else {
      db.projects.push(project);
    }

    saveProjects();
    res.json(project);
  });

  app.post("/api/projects/:projectId/update-step", (req, res) => {
    const { projectId } = req.params;
    const { lastStep } = req.body;
    const project = db.projects.find(p => p.id === projectId);
    if (project) {
      project.lastStep = lastStep;
      project.updatedAt = new Date().toISOString();
      saveProjects();
      res.json(project);
    } else {
      res.status(404).json({ message: "Project not found" });
    }
  });

  // Settings Routes
  app.get("/api/settings", (req, res) => {
    res.json(db.settings);
  });

  app.post("/api/settings", (req, res) => {
    db.settings = { ...db.settings, ...req.body };
    fs.writeFileSync(settingsFile, JSON.stringify(db.settings, null, 2));
    res.json({ message: "设置已保存", settings: db.settings });
  });

  // Results Routes
  app.post("/api/projects/:projectId/steps/:stepIdx/save", (req, res) => {
    const { projectId, stepIdx } = req.params;
    const { content, manualInput, files } = req.body;
    
    const resultsDir = path.join(dbPath, "results", projectId);
    if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
    
    const fileName = `step_${stepIdx}.json`;
    fs.writeFileSync(path.join(resultsDir, fileName), JSON.stringify({ 
      content, 
      manualInput, 
      files,
      timestamp: new Date().toISOString() 
    }, null, 2));
    
    // Placeholder for DB save
    console.log(`[DB Sync] Saving result for project ${projectId} step ${stepIdx} to central database...`);
    
    res.json({ message: "结果已保存到本地" });
  });

  app.get("/api/projects/:projectId/steps/:stepIdx/load", (req, res) => {
    const { projectId, stepIdx } = req.params;
    const filePath = path.join(dbPath, "results", projectId, `step_${stepIdx}.json`);
    
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      res.json(data);
    } else {
      res.status(404).json({ message: "未找到保存的结果" });
    }
  });

  // File Content Route
  app.get("/api/files/:filename", async (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);
    
    if (fs.existsSync(filePath)) {
      // For now, only support text-based files
      const ext = path.extname(filename).toLowerCase();
      const textExtensions = [".txt", ".md", ".json", ".csv", ".xml"];
      try{
            if (textExtensions.includes(ext)) {
                const content = fs.readFileSync(filePath, "utf-8");
                res.json({ content });
            }
            else if (ext === ".pdf")
            {
                // PDF 提取文本
                const dataBuffer = fs.readFileSync(filePath);
                // 使用动态导入确保正确获取类
                const { PDFParse } = await import('pdf-parse');
                const parser = new PDFParse({ data: dataBuffer });
                const result = await parser.getText();
                console.log(result);
                res.json({result});
            }else if (ext === ".docx"){
                // Word 提取文本
                const result = await mammoth.extractRawText({ path: filePath });
                const text = result.value;
                res.json({text});
            } else if (ext === ".xlsx" || ext === ".xls") {
              // Excel 提取所有单元格文本
              const workbook = XLSX.readFile(filePath);
              let sheetTexts = [];
              for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
                sheetTexts.push(`【工作表：${sheetName}】`);
                rows.forEach((row: any[]) => {
                  const line = row.filter(cell => cell !== "").join(" | ");
                  if (line) sheetTexts.push(line);
                });
              }
              const text = sheetTexts.join("\n");
              res.json({text});
          }else if (ext === ".pptx") {
              // PPTX 可借助库，但实现稍复杂，可先返回提示或留空
              const text = "PPTX 文本提取暂未实现，请转换为其他格式。";
              res.json({text});
          }else {
                res.status(400).json({ message: "不支持读取非文本文件内容" });
              }
      }catch(err: any)
      {
        console.error("文件提取出错：",err);
        res.status(500).json({error: "文本提取失败",detail: err.message});
      }
      
    } else {
      res.status(404).json({ message: "文件不存在" });
    }
  });

  // LLM Proxy Route
  app.post("/api/ai/chat", async (req, res) => {
    const { provider, messages, model, userId } = req.body;
    
    // Get user specific API key if exists
    let apiKey = process.env.DEEPSEEK_API_KEY;
    if (userId && db.settings.userApiKeys?.[userId]?.[provider]) {
      apiKey = db.settings.userApiKeys[userId][provider];
    }
    
    try {
      if (provider === "deepseek") {
        const response = await axios.post("https://api.deepseek.com/v1/chat/completions", {
          model: model || "deepseek-chat",
          messages: messages,
        }, {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        });
        return res.json(response.data);
      } else if (provider === "gemini") {
        // Gemini implementation would go here using @google/genai on frontend is preferred per instructions
        // but since we want a unified backend proxy for multiple providers:
        return res.status(400).json({ message: "Gemini should be called from frontend per guidelines, but this is a proxy demo." });
      }
      
      res.status(400).json({ message: "不支持的提供商" });
    } catch (error: any) {
      console.error("AI Error:", error.response?.data || error.message);
      res.status(500).json({ error: error.response?.data || error.message });
    }
  });

  // File Upload Route
  app.post("/api/upload", upload.array("files"), (req: any, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "没有文件上传" });
    }
    const uploadedFiles = req.files.map((f: any) => ({
      filename: f.filename,
      originalname: f.originalname,
      path: f.path
    }));
    res.json({ files: uploadedFiles });
  });

  app.post('/api/generate-pdf', async (req, res) => {

    const htmlContent = req.body; // 接收完整的 HTML 字符串

    // console.log(htmlContent);

    if (!htmlContent) {
      return res.status(400).send('No HTML content provided');
    }

    let browser = null;
    try {
      // 启动 Puppeteer（生产环境可能需要配置参数）
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // 在 Linux 服务器上常用
      });

      const page = await browser.newPage();

      // 设置页面内容，waitUntil: 'networkidle0' 确保所有资源加载完毕
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      // 生成 PDF 配置（可调整）
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,        // 打印背景颜色/图片
        margin: {
          top: '20px',
          bottom: '20px',
          left: '15px',
          right: '15px',
        },
      });

      // ---------- 新增：保存 PDF 到服务器本地 ----------
      // 生成唯一文件名：时间戳 + 随机字符串，避免重名
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const fileName = `report_${timestamp}_${randomStr}.pdf`;
      const filePath = path.join(pdfsDir, fileName);

      // 将 Buffer 写入文件
      await fs.writeFile(filePath, pdfBuffer, (err) => {
        if (err) {
          console.error('写入失败:', err);
        } else {
          console.log('文件保存成功');
        }
      });

      await browser.close();
      
      // console.log(`PDF saved to: ${filePath}`);
      // 设置响应头，触发浏览器下载
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="report.pdf"',
        'Content-Length': pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (error) {
      console.error('PDF generation error:', error);
      res.status(500).send('PDF generation failed');
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
