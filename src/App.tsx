import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { User, Company, SystemSettings } from "./types";
import { Sidebar } from "./components/Sidebar";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Workflow } from "./pages/Workflow";
import { AccountManagement } from "./pages/AccountManagement";
import { Settings } from "./pages/Settings";

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("consult_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [company, setCompany] = useState<Company | null>(() => {
    const saved = localStorage.getItem("consult_company");
    return saved ? JSON.parse(saved) : null;
  });
  const [settings, setSettings] = useState<SystemSettings>({
    defaultModel: "deepseek-chat",
    aiProvider: "deepseek",
    systemName: "咨询调研系统",
    exportFormat: "md"
  });

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.error("加载设置失败", err));
  }, []);

  const handleLogin = (u: User, c: Company) => {
    setUser(u);
    setCompany(c);
    localStorage.setItem("consult_user", JSON.stringify(u));
    localStorage.setItem("consult_company", JSON.stringify(c));
  };

  const handleLogout = () => {
    setUser(null);
    setCompany(null);
    localStorage.removeItem("consult_user");
    localStorage.removeItem("consult_company");
    window.location.href = "/"
  };

  if (!user || !company) {
    return <Login onLogin={handleLogin} systemName={settings.systemName} />;
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-emerald-500/30">
        <Sidebar user={user} company={company} onLogout={handleLogout} systemName={settings.systemName} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route path="/workflow" element={<Workflow settings={settings} user={user} />} />
            <Route path="/workflow/:projectId" element={<Workflow settings={settings} user={user} />} />
            <Route path="/accounts" element={user.role === "admin" ? <AccountManagement /> : <Navigate to="/dashboard" />} />
            <Route path="/settings" element={<Settings settings={settings} onSave={setSettings} user={user} />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
