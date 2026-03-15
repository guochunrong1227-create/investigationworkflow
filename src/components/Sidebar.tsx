import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings as SettingsIcon, 
  LogOut, 
  Brain, 
  User as UserIcon,
  Plus,
  X
} from "lucide-react";
import { User, Company } from "../types";

const SidebarItem = ({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) => (
  <Link 
    to={to} 
    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-900 hover:text-white transition-all group"
  >
    <span className="text-zinc-500 group-hover:text-emerald-500 transition-colors">{icon}</span>
    <span className="text-sm font-medium">{label}</span>
  </Link>
);

export const Sidebar = ({ user, company, onLogout, systemName }: { user: User; company: Company; onLogout: () => void; systemName: string }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreateProject = async (overwrite = false) => {
    if (!projectName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName,
          description: projectDesc,
          userId: user.id,
          companyId: company.id,
          overwrite
        }),
      });

      if (res.status === 409) {
        if (confirm("项目名称已存在，是否覆盖？")) {
          handleCreateProject(true);
          return;
        }
      } else if (res.ok) {
        const project = await res.json();
        setIsModalOpen(false);
        setProjectName("");
        setProjectDesc("");
        navigate(`/workflow/${project.id}`);
      } else {
        alert("创建失败");
      }
    } catch (err) {
      alert("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-64 bg-zinc-950 text-zinc-400 flex flex-col h-screen border-r border-zinc-800 relative">
      <div className="p-6">
        <div className="flex items-center gap-3 text-white mb-8">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 text-black" />
          </div>
          <span className="font-bold text-lg tracking-tight">{systemName}</span>
        </div>
        
        <nav className="space-y-1">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="工作台" to="/dashboard" />
          <SidebarItem icon={<FileText size={20} />} label="调研流程" to="/workflow" />
          {user.role === "admin" && (
            <SidebarItem icon={<Users size={20} />} label="账号管理" to="/accounts" />
          )}
          <SidebarItem icon={<SettingsIcon size={20} />} label="系统设置" to="/settings" />
        </nav>

        <div className="mt-8">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/10"
          >
            <Plus size={18} />
            <span className="text-sm">新建调研项目</span>
          </button>
        </div>
      </div>

      <div className="mt-auto p-6 border-t border-zinc-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300">
            <UserIcon size={20} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-zinc-500 truncate">{company.name}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 text-sm hover:text-white transition-colors w-full"
        >
          <LogOut size={18} />
          <span>退出登录</span>
        </button>
      </div>

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">新建调研项目</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">项目名称</label>
                <input 
                  type="text" 
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  placeholder="例如：某新能源行业深度调研"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">项目描述 (可选)</label>
                <textarea 
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none"
                  placeholder="简要描述调研背景或目标..."
                />
              </div>
              <button 
                onClick={() => handleCreateProject()}
                disabled={loading || !projectName.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 mt-2"
              >
                {loading ? "创建中..." : "确认创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
