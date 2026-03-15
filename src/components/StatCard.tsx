import React from "react";

export const StatCard = ({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) => (
  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-zinc-800 rounded-lg">{icon}</div>
    </div>
    <p className="text-zinc-500 text-sm mb-1">{title}</p>
    <p className="text-3xl font-bold text-white">{value}</p>
  </div>
);
