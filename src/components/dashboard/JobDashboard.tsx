import React from "react";
import { FileText, Search, Filter } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { JobAnalysisResult } from "@/types/job";

interface JobDashboardProps {
  savedJobs: JobAnalysisResult[];
}

export const JobDashboard: React.FC<JobDashboardProps> = ({ savedJobs }) => {
  return (
    <div className="h-full p-6 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-400" />
            求人ドキュメント & パイプライン管理
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            保存されたMarkdownドキュメントのステータス追跡・比較・検索
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
            <Input placeholder="企業名・職種・タグで検索..." className="pl-9 h-9 text-xs" />
          </div>
          <Button variant="outline" size="sm" className="h-9 text-xs">
            <Filter className="h-3.5 w-3.5 mr-1" />
            フィルター
          </Button>
        </div>
      </div>

      {savedJobs.length === 0 ? (
        <Card className="border-dashed border-slate-800 bg-slate-950/40 p-12 text-center">
          <FileText className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">保存された求人ファイルがまだありません</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            「求人取り込み & AI解析」画面から求人票を解析し、ローカルへ保存するとここに一覧表示されます。
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedJobs.map((job) => (
            <Card key={job.metadata.id} className="hover:border-indigo-500/40 transition-all cursor-pointer">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant={job.metadata.judgment.startsWith("A") ? "rankA" : "rankB"}>
                      {job.metadata.judgment}
                    </Badge>
                    <h3 className="text-base font-bold text-white mt-1.5">{job.metadata.title}</h3>
                    <p className="text-xs text-slate-400">{job.metadata.company}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-indigo-400 font-mono">{job.metadata.matchScore}</span>
                    <span className="text-xs text-slate-500 block">点</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-xs text-slate-300 space-y-2">
                <div className="flex items-center justify-between text-slate-400 pt-2 border-t border-slate-800">
                  <span>ソース: {job.metadata.agentSource}</span>
                  <span>解析日: {job.metadata.dateAnalyzed}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
