import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, CheckCircle2, Plus, FileText, ChevronRight } from "lucide-react";
import { StatCard } from "../components/StatCard";
import { User, Project } from "../types";

export const Dashboard = ({ user }: { user: User }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`/api/projects?userId=${user.id}&role=${user.role}`);
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        }
      } catch (err) {
        console.error("Failed to fetch projects", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [user.id, user.role]);

  const completedCount = projects.filter(p => p.lastStep === 3).length;
  const inProgressCount = projects.length - completedCount;

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">工作台</h1>
        <p className="text-zinc-500">
          {user.role === "admin" ? "欢迎回来，管理员。这是系统所有调研项目的概览。" : "欢迎回来，这是您的调研项目概览。"}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="进行中的项目" value={inProgressCount.toString()} icon={<Clock className="text-emerald-500" />} />
        <StatCard title="已完成调研" value={completedCount.toString()} icon={<CheckCircle2 className="text-blue-500" />} />
        <StatCard title="总项目数" value={projects.length.toString()} icon={<Plus className="text-orange-500" />} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="font-bold text-white">最近项目</h2>
          <Link to="/workflow" className="text-sm text-emerald-500 hover:underline">查看全部</Link>
        </div>
        <div className="divide-y divide-zinc-800">
          {loading ? (
            <div className="p-12 text-center text-zinc-500 italic">加载中...</div>
          ) : projects.length > 0 ? (
            projects.slice(0, 5).map((project) => (
              <div 
                key={project.id} 
                onClick={() => navigate(`/workflow/${project.id}`)}
                className="p-6 flex items-center justify-between hover:bg-zinc-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{project.name}</h3>
                    <p className="text-sm text-zinc-500">
                      更新于 {new Date(project.updatedAt).toLocaleString()} • 阶段：{
                        ["行业分析", "现场访谈", "阶段判断", "辅导规划"][project.lastStep]
                      }
                    </p>
                  </div>
                </div>
                <ChevronRight className="text-zinc-600" />
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-zinc-500 italic">暂无项目，点击侧边栏“新建调研项目”开始。</div>
          )}
        </div>
      </div>
    </div>
  );
};
