import React, { useState, useEffect } from "react";
import { SystemSettings, User } from "../types";
import { cn } from "../utils/cn";
import { Shield, Key, Settings as SettingsIcon, Bell } from "lucide-react";

export const Settings = ({ settings, onSave, user }: { settings: SystemSettings; onSave: (s: SystemSettings) => void; user: User }) => {
  const [form, setForm] = useState(settings);
  const [userKeys, setUserKeys] = useState({ deepseek: "", gemini: "", doubao: "" });
  const [userNotifications, setUserNotifications] = useState<any>({
    emails: [],
    dingtalkWebhook: "",
    feishuWebhook: "",
    smtp: { host: "", port: 465, user: "", pass: "", from: "" }
  });
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);

  useEffect(() => {
    // Fetch personal settings
    fetch(`/api/users/${user.id}/keys`)
      .then(res => res.json())
      .then(data => {
        setUserKeys(data.keys);
        if (data.notifications) {
          setUserNotifications(data.notifications);
        }
      })
      .catch(err => console.error("加载个人设置失败", err));
  }, [user.id]);

  const handleGlobalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user.role !== "admin") return;
    setSavingGlobal(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        onSave(data.settings);
        alert("全局设置已保存");
      }
    } catch (err) {
      alert("保存失败");
    } finally {
      setSavingGlobal(false);
    }
  };

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPersonal(true);
    try {
      const res = await fetch(`/api/users/${user.id}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keys: userKeys,
          notifications: userNotifications
        }),
      });
      if (res.ok) {
        alert("个人设置已保存");
      }
    } catch (err) {
      alert("保存失败");
    } finally {
      setSavingPersonal(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-12">
        <h1 className="text-3xl font-bold text-white mb-2">系统设置</h1>
        <p className="text-zinc-500">配置全局系统参数及个人 API Key。</p>
      </header>

      <div className={cn(
        "grid gap-8",
        user.role === "admin" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-2xl mx-auto"
      )}>
        {/* Global Settings - Admin Only */}
        {user.role === "admin" && (
          <section className="space-y-6 bg-zinc-900 border border-zinc-800 p-8 rounded-3xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <SettingsIcon size={20} />
              </div>
              <h2 className="text-xl font-bold text-white">全局配置</h2>
            </div>
            
            <form onSubmit={handleGlobalSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">系统名称</label>
                <input 
                  type="text" 
                  value={form.systemName}
                  onChange={(e) => setForm({ ...form, systemName: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">默认 AI 提供商</label>
                <select 
                  value={form.aiProvider}
                  onChange={(e) => setForm({ ...form, aiProvider: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 appearance-none"
                >
                  <option value="deepseek">DeepSeek</option>
                  <option value="gemini">Gemini</option>
                  <option value="doubao">Doubao</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">默认导出格式</label>
                <div className="flex gap-3">
                  {["md", "pdf"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setForm({ ...form, exportFormat: f as any })}
                      className={cn(
                        "flex-1 py-3 rounded-xl border font-bold text-xs transition-all",
                        form.exportFormat === f ? "bg-emerald-500 border-emerald-500 text-black" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <h3 className="text-sm font-bold text-white mb-4">全局 API Key (备用)</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">DeepSeek 全局 Key</label>
                    <input 
                      type="password" 
                      value={form.globalApiKeys?.deepseek || ""}
                      onChange={(e) => {
                        const current = form.globalApiKeys || { deepseek: "", gemini: "", doubao: "" };
                        setForm({ 
                          ...form, 
                          globalApiKeys: { ...current, deepseek: e.target.value } 
                        });
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                      placeholder="sk-..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Gemini 全局 Key</label>
                    <input 
                      type="password" 
                      value={form.globalApiKeys?.gemini || ""}
                      onChange={(e) => {
                        const current = form.globalApiKeys || { deepseek: "", gemini: "", doubao: "" };
                        setForm({ 
                          ...form, 
                          globalApiKeys: { ...current, gemini: e.target.value } 
                        });
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                      placeholder="AIza..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Doubao 全局 Key</label>
                    <input 
                      type="password" 
                      value={form.globalApiKeys?.doubao || ""}
                      onChange={(e) => {
                        const current = form.globalApiKeys || { deepseek: "", gemini: "", doubao: "" };
                        setForm({ 
                          ...form, 
                          globalApiKeys: { ...current, doubao: e.target.value } 
                        });
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                      placeholder="输入全局 Doubao API Key"
                    />
                  </div>
                </div>
              </div>
              <button 
                type="submit"
                disabled={savingGlobal}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 mt-4"
              >
                {savingGlobal ? "保存中..." : "保存全局设置"}
              </button>
            </form>
          </section>
        )}

        {/* Personal Settings */}
        <div className="space-y-8">
          {/* Personal API Keys */}
          <section className="space-y-6 bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <Key size={20} />
              </div>
              <h2 className="text-xl font-bold text-white">个人 API Key</h2>
            </div>
            
            <p className="text-xs text-zinc-500 italic mb-6">设置个人 Key 后，系统将优先使用您的 Key 进行分析。这些 Key 仅对您可见并保存在您的账号下。</p>

            <form onSubmit={handlePersonalSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">DeepSeek API Key</label>
                <input 
                  type="password" 
                  value={userKeys.deepseek}
                  onChange={(e) => setUserKeys({ ...userKeys, deepseek: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  placeholder="sk-..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Gemini API Key</label>
                <input 
                  type="password" 
                  value={userKeys.gemini}
                  onChange={(e) => setUserKeys({ ...userKeys, gemini: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  placeholder="AIza..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Doubao API Key</label>
                <input 
                  type="password" 
                  value={userKeys.doubao}
                  onChange={(e) => setUserKeys({ ...userKeys, doubao: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  placeholder="输入 Doubao API Key"
                />
              </div>
              <button 
                type="submit"
                disabled={savingPersonal}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 mt-4"
              >
                {savingPersonal ? "保存中..." : "保存个人 Key"}
              </button>
            </form>
          </section>

          {/* Personal Notification Settings */}
          <section className="space-y-6 bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <Bell size={20} />
              </div>
              <h2 className="text-xl font-bold text-white">个人通知配置</h2>
            </div>
            
            <p className="text-xs text-zinc-500 italic mb-6">配置您个人的报告接收渠道。这些设置仅对您生效，用于发送您生成的调研报告。</p>

            <form onSubmit={handlePersonalSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">接收邮箱 (多个请用逗号分隔)</label>
                <input 
                  type="text" 
                  value={userNotifications.emails?.join(",") || ""}
                  onChange={(e) => {
                    const emails = e.target.value.split(",").map(s => s.trim()).filter(s => s);
                    setUserNotifications({ ...userNotifications, emails });
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  placeholder="example1@mail.com, example2@mail.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">钉钉 Webhook 地址</label>
                <input 
                  type="text" 
                  value={userNotifications.dingtalkWebhook || ""}
                  onChange={(e) => setUserNotifications({ ...userNotifications, dingtalkWebhook: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">飞书 Webhook 地址</label>
                <input 
                  type="text" 
                  value={userNotifications.feishuWebhook || ""}
                  onChange={(e) => setUserNotifications({ ...userNotifications, feishuWebhook: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                />
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <h3 className="text-sm font-bold text-white mb-4">SMTP 邮件服务器配置</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">SMTP 主机</label>
                      <input 
                        type="text" 
                        value={userNotifications.smtp?.host || ""}
                        onChange={(e) => setUserNotifications({ 
                          ...userNotifications, 
                          smtp: { ...userNotifications.smtp || {}, host: e.target.value } 
                        })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                        placeholder="smtp.example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">端口</label>
                      <input 
                        type="number" 
                        value={userNotifications.smtp?.port || 465}
                        onChange={(e) => setUserNotifications({ 
                          ...userNotifications, 
                          smtp: { ...userNotifications.smtp || {}, port: parseInt(e.target.value) } 
                        })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">用户名</label>
                    <input 
                      type="text" 
                      value={userNotifications.smtp?.user || ""}
                      onChange={(e) => setUserNotifications({ 
                        ...userNotifications, 
                        smtp: { ...userNotifications.smtp || {}, user: e.target.value } 
                      })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">邮箱授权码 (非登录密码)</label>
                    <input 
                      type="password" 
                      value={userNotifications.smtp?.pass || ""}
                      onChange={(e) => setUserNotifications({ 
                        ...userNotifications, 
                        smtp: { ...userNotifications.smtp || {}, pass: e.target.value } 
                      })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                      placeholder="请输入邮箱授权码"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">发件人地址</label>
                    <input 
                      type="text" 
                      value={userNotifications.smtp?.from || ""}
                      onChange={(e) => setUserNotifications({ 
                        ...userNotifications, 
                        smtp: { ...userNotifications.smtp || {}, from: e.target.value } 
                      })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                      placeholder="noreply@example.com"
                    />
                  </div>
                </div>
              </div>
              <button 
                type="submit"
                disabled={savingPersonal}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 mt-4"
              >
                {savingPersonal ? "保存中..." : "保存个人通知配置"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};
