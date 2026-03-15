import React, { useState } from "react";
import { SystemSettings, User } from "../types";
import { cn } from "../utils/cn";

export const Settings = ({ settings, onSave, user }: { settings: SystemSettings; onSave: (s: SystemSettings) => void; user: User }) => {
  const [form, setForm] = useState(settings);
  const [userKeys, setUserKeys] = useState(settings.userApiKeys?.[user.id] || { deepseek: "", gemini: "", doubao: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedSettings = {
        ...form,
        userApiKeys: {
          ...(form.userApiKeys || {}),
          [user.id]: userKeys
        }
      };
      
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });
      if (res.ok) {
        const data = await res.json();
        onSave(data.settings);
        alert("设置及个人 API Key 已保存");
      }
    } catch (err) {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">系统设置</h1>
        <p className="text-zinc-500">配置全局系统参数及个人 API Key。</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8 bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white border-b border-zinc-800 pb-2">全局配置</h2>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">系统名称</label>
            <input 
              type="text" 
              value={form.systemName}
              onChange={(e) => setForm({ ...form, systemName: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">默认 AI 提供商</label>
            <select 
              value={form.aiProvider}
              onChange={(e) => setForm({ ...form, aiProvider: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="deepseek">DeepSeek</option>
              <option value="gemini">Gemini</option>
              <option value="doubao">Doubao</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">默认导出格式</label>
            <div className="flex gap-4">
              {["md", "pdf"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setForm({ ...form, exportFormat: f as any })}
                  className={cn(
                    "flex-1 py-2 rounded-xl border font-bold text-sm transition-all",
                    form.exportFormat === f ? "bg-emerald-500 border-emerald-500 text-black" : "bg-zinc-800 border-zinc-700 text-zinc-400"
                  )}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white border-b border-zinc-800 pb-2">个人 API Key</h2>
          <p className="text-xs text-zinc-500 italic">设置个人 Key 后，系统将优先使用您的 Key 进行分析。</p>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">DeepSeek API Key</label>
            <input 
              type="password" 
              value={userKeys.deepseek}
              onChange={(e) => setUserKeys({ ...userKeys, deepseek: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="sk-..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Gemini API Key</label>
            <input 
              type="password" 
              value={userKeys.gemini}
              onChange={(e) => setUserKeys({ ...userKeys, gemini: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="AIza..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Doubao API Key</label>
            <input 
              type="password" 
              value={userKeys.doubao}
              onChange={(e) => setUserKeys({ ...userKeys, doubao: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="Enter Doubao API Key"
            />
          </div>
        </section>

        <button 
          type="submit"
          disabled={saving}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
        >
          {saving ? "保存中..." : "保存配置"}
        </button>
      </form>
    </div>
  );
};
