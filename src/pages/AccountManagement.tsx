import React from "react";
import { Plus, Building2 } from "lucide-react";

export const AccountManagement = () => {
  return (
    <div className="p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">账号管理</h1>
          <p className="text-zinc-500">管理公司及个人使用者账号。</p>
        </div>
        <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2 rounded-xl transition-all">
          <Plus size={20} />
          <span>添加账号</span>
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 bg-zinc-800/30">
            <div className="flex items-center gap-3">
              <Building2 className="text-emerald-500" />
              <h2 className="font-bold text-white text-lg">咨询总公司</h2>
            </div>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                <th className="px-6 py-4">姓名</th>
                <th className="px-6 py-4">邮箱</th>
                <th className="px-6 py-4">角色</th>
                <th className="px-6 py-4">状态</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              <tr className="hover:bg-zinc-800/50 transition-colors">
                <td className="px-6 py-4 text-white font-medium">管理员</td>
                <td className="px-6 py-4 text-zinc-400">admin@example.com</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded uppercase">Admin</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-emerald-500 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    在线
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-500 hover:text-white cursor-pointer">编辑</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
