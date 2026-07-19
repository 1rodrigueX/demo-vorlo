import { listAllBugReports } from "@/lib/actions/bug-reports";
import { Card } from "@/components/ui/Card";
import { BugReportsManager } from "@/components/dev/BugReportsManager";

export default async function DevBugsPage() {
  const bugs = await listAllBugReports();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Bugs</h1>
        <p className="mt-1 text-sm text-gray-500">Reportados pelos times de todos os CRMs.</p>
      </div>

      <Card className="divide-y divide-gray-100 overflow-hidden">
        <BugReportsManager bugs={bugs} />
      </Card>
    </div>
  );
}
