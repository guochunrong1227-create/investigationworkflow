import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

// import * as pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import XLSX from 'xlsx';
import puppeteer from 'puppeteer';

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
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
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

  app.use(express.json());
  app.use(express.text({ type: 'text/plain' }));
  app.use("/uploads", express.static(uploadDir));
  app.use("/pdfs", express.static(pdfsDir));

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
      globalApiKeys: {
        deepseek: "",
        gemini: "",
        doubao: ""
      },
      userApiKeys: {},
      userNotifications: {}
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

  const usersFile = path.join(dbPath, "users.json");
  if (fs.existsSync(usersFile)) {
    db.users = JSON.parse(fs.readFileSync(usersFile, "utf-8"));
  }

  const saveProjects = () => {
    fs.writeFileSync(projectsFile, JSON.stringify(db.projects, null, 2));
  };

  const saveUsers = () => {
    fs.writeFileSync(usersFile, JSON.stringify(db.users, null, 2));
  };

  // Auth Routes
  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt - Email: ${email}, Body:`, req.body);
    
    if (!email || !password) {
      console.log("Missing email or password in request body");
      return res.status(400).json({ message: "请提供邮箱和密码" });
    }

    const user = db.users.find(u => u.email === email && u.password === password);
    
    if (user) {
      console.log(`Login successful for ${email}`);
      const company = db.companies.find(c => c.id === user.companyId);
      res.json({ user, company });
    } else {
      console.log(`Login failed for ${email} - User not found or password mismatch`);
      res.status(401).json({ message: "邮箱或密码错误" });
    }
  });

  // User Management Routes
  app.get("/api/users", (req, res) => {
    res.json(db.users);
  });

  app.get("/api/companies", (req, res) => {
    res.json(db.companies);
  });

  app.post("/api/users", (req, res) => {
    const { name, email, password, role, companyId } = req.body;
    
    if (!name || !email || !password || !role || !companyId) {
      return res.status(400).json({ message: "请填写完整信息" });
    }

    if (db.users.find(u => u.email === email)) {
      return res.status(409).json({ message: "该邮箱已被注册" });
    }

    const newUser = {
      id: "u-" + Date.now(),
      name,
      email,
      password,
      role,
      companyId
    };

    db.users.push(newUser);
    saveUsers();
    res.json(newUser);
  });

  // Project Routes
  app.get("/api/projects", (req, res) => {
    const { userId, role } = req.query;
    if (!userId) return res.status(400).json({ message: "Missing userId" });
    
    // If admin, return all projects, otherwise filter by userId
    if (role === "admin") {
      return res.json(db.projects);
    }
    
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
  app.get("/api/settings", (_req, res) => {
    // Don't leak all users' API keys or notifications
    const { userApiKeys, userNotifications, ...publicSettings } = db.settings as any;
    res.json(publicSettings);
  });

  app.get("/api/users/:userId/keys", (req, res) => {
    const { userId } = req.params;

    console.log(req.params);
    console.log(userId);

    const userApiKeys = db.settings.userApiKeys as any;
    const userNotifications = (db.settings as any).userNotifications || {};
    res.json({
      keys: userApiKeys?.[userId] || { deepseek: "", gemini: "", doubao: "" },
      notifications: userNotifications?.[userId] || { emails: [], dingtalkWebhook: "", feishuWebhook: "" }
    });
  });

  app.post("/api/users/:userId/keys", (req, res) => {
    const { userId } = req.params;
     console.log(req.body);
    const { keys, notifications } = req.body;
    console.log(keys);
    console.log(notifications);
    
    if (!db.settings.userApiKeys) db.settings.userApiKeys = {};
    if (!(db.settings as any).userNotifications) (db.settings as any).userNotifications = {};
    
    if (keys) (db.settings.userApiKeys as any)[userId] = keys;
    if (notifications) (db.settings as any).userNotifications[userId] = notifications;

    fs.writeFileSync(settingsFile, JSON.stringify(db.settings, null, 2));
    res.json({ message: "个人设置已保存" });
  });

  app.post("/api/settings", (req, res) => {
    // Only update global settings, preserve user data
    const { userApiKeys, userNotifications, ...newSettings } = req.body;
    db.settings = { ...db.settings, ...newSettings };
    fs.writeFileSync(settingsFile, JSON.stringify(db.settings, null, 2));
    res.json({ message: "全局设置已保存", settings: db.settings });
  });

  app.get("/api/config/gemini", (req, res) => {
    res.json({ apiKey: process.env.GEMINI_API_KEY });
  });

  // Notification Endpoint
  app.post("/api/notify", async (req, res) => {
    const { projectId, stepTitle, htmlContent, userId } = req.body;

    console.log(userId);

    const project = db.projects.find((p: any) => p.id === projectId);
    if (!project) return res.status(404).json({ message: "项目不存在" });

    // Use user-specific notifications
    const notifications = (db.settings as any).userNotifications?.[userId];

    console.log(notifications);

    if (!notifications) {
      return res.status(400).json({ message: "未配置通知设置" });
    }

    let browser = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20px", bottom: "20px", left: "15px", right: "15px" },
      });

      const fileName = `report_${Date.now()}.pdf`;
      const filePath = path.join(pdfsDir, fileName);
      fs.writeFileSync(filePath, pdfBuffer);

      // Send notifications using the determined settings
      await sendNotifications(notifications, project, stepTitle, filePath, pdfBuffer);

      res.json({ message: "通知已发送", pdfUrl: `/pdfs/${fileName}` });
    } catch (error: any) {
      console.error("Notification error:", error);
      res.status(500).json({ error: error.message });
    } finally {
      if (browser) await browser.close();
    }
  });

  async function sendNotifications(notifications: any, project: any, stepTitle: string, pdfPath: string, pdfBuffer: Buffer) {
    if (!notifications) return;

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const pdfUrl = `${appUrl}/pdfs/${path.basename(pdfPath)}`;
    const errors: string[] = [];

    // 1. Email
    if (notifications.emails && notifications.emails.length > 0 && notifications.smtp) {
      const { host, port, user, pass, from } = notifications.smtp;
      
      console.log(notifications.smtp);

      if (!host || !user || !pass || !from) {
        console.error("Email configuration incomplete");
        errors.push("邮件配置不完整");
      } else {
        const transporter = nodemailer.createTransport({
          host: host,
          port: 465,
          secure: true,
          // requireTLS: true,
          auth: {
            user: user,
            pass: pass,
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 20000,
          // logger:true,
          // debug:true
        });

        try {

          console.log(notifications.emails);

          await transporter.sendMail({
            from: from || user,
            to: notifications.emails.join(","),
            subject: `【调研报告】${project.name} - ${stepTitle}`,
            text: `您好，项目《${project.name}》的阶段报告《${stepTitle}》已生成。\n\n查看链接：${pdfUrl}`,
            attachments: [
              {
                filename: `${stepTitle}.pdf`,
                content: pdfBuffer,
              },
            ],
          });
          console.log(`Email sent successfully to ${notifications.emails.join(",")}`);
        } catch (err: any) {
          console.error("Email error details:", err);
          errors.push(`邮件发送失败: ${err.message}`);
        }
      }
    }

    // 2. DingTalk
    if (notifications.dingtalkWebhook) {
      try {
        await axios.post(notifications.dingtalkWebhook, {
          msgtype: "markdown",
          markdown: {
            title: `调研报告: ${project.name}`,
            text: `### 调研报告已生成\n\n**项目名称**: ${project.name}\n**阶段**: ${stepTitle}\n\n[点击查看 PDF 报告](${pdfUrl})`
          }
        });
      } catch (err: any) {
        console.error("DingTalk error:", err);
        errors.push(`钉钉发送失败: ${err.message}`);
      }
    }

    // 3. Feishu
    if (notifications.feishuWebhook) {
      try {
        await axios.post(notifications.feishuWebhook, {
          msg_type: "interactive",
          card: {
            header: {
              title: { tag: "plain_text", content: `调研报告: ${project.name}` },
              template: "blue"
            },
            elements: [
              {
                tag: "div",
                text: {
                  tag: "lark_md",
                  content: `**项目名称**: ${project.name}\n**阶段**: ${stepTitle}\n报告已生成，请点击下方按钮查看。`
                }
              },
              {
                tag: "action",
                actions: [
                  {
                    tag: "button",
                    text: { tag: "plain_text", content: "查看 PDF 报告" },
                    url: pdfUrl,
                    type: "primary"
                  }
                ]
              }
            ]
          }
        });
      } catch (err: any) {
        console.error("Feishu error:", err);
        errors.push(`飞书发送失败: ${err.message}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join("; "));
    }
  }

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
                const pdfModule: any = await import('pdf-parse');
                const pdf = pdfModule.default || pdfModule;
                const data = await pdf(dataBuffer);
                res.json({ content: data.text });
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
                rows.forEach((row: any) => {
                  const line = (row as any[]).filter(cell => cell !== "").join(" | ");
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

    // console.log(provider);
    
    // Get user specific API key if exists
    let apiKey = "";
    const userApiKeys = db.settings.userApiKeys as any;
    const globalApiKeys = (db.settings as any).globalApiKeys || {};

    if (userId && userApiKeys?.[userId]?.[provider]) {
      apiKey = userApiKeys[userId][provider];
    } else if (globalApiKeys[provider]) {
      apiKey = globalApiKeys[provider];
    } else {
      apiKey = provider === "deepseek" ? (process.env.DEEPSEEK_API_KEY || "") : (process.env.ARK_API_KEY || "");
    }
    
    // console.log(apiKey);

    try {
      if (provider === "deepseek") {
        const response = await axios.post("https://api.deepseek.com/v1/chat/completions", {
          model: model || "deepseek-chat",
          messages: messages,
          max_tokens: 8192,
        }, {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        });
        return res.json(response.data);
      } else if (provider === "doubao") {
        const response = await axios.post("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
          model: model || "ep-20260317140827-fwhqn", // 默认模型或用户提供的 Endpoint ID
          messages: messages,
          max_tokens: 8192,
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
      
      // // console.log(`PDF saved to: ${filePath}`);
      // // 设置响应头，触发浏览器下载
      // res.set({
      //   'Content-Type': 'application/pdf',
      //   'Content-Disposition': 'attachment; filename="report.pdf"',
      //   'Content-Length': pdfBuffer.length,
      // });

      // res.send(pdfBuffer);

      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="report.pdf"',
        'Content-Length': pdfBuffer.length
      });
      res.end(pdfBuffer);
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
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
