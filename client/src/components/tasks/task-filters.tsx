import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { User } from "@shared/schema";

interface TaskFiltersProps {
  filters: {
    status: string;
    assigneeId: string;
    search: string;
  };
  onFiltersChange: (filters: any) => void;
  assignees: (User | undefined)[];
}

export default function TaskFilters({ filters, onFiltersChange, assignees }: TaskFiltersProps) {
  const uniqueAssignees = assignees.filter(Boolean).reduce((acc, assignee) => {
    if (assignee && !acc.find(a => a.id === assignee.id)) {
      acc.push(assignee);
    }
    return acc;
  }, [] as User[]);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-10 w-64"
          data-testid="input-search-tasks"
        />
      </div>
      
      <Select
        value={filters.status}
        onValueChange={(value) => onFiltersChange({ ...filters, status: value === 'all-status' ? '' : value })}
      >
        <SelectTrigger className="w-48" data-testid="select-status-filter">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all-status">All Status</SelectItem>
          <SelectItem value="todo">Todo</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="done">Done</SelectItem>
        </SelectContent>
      </Select>
      
      <Select
        value={filters.assigneeId}
        onValueChange={(value) => onFiltersChange({ ...filters, assigneeId: value === 'all-assignees' ? '' : value })}
      >
        <SelectTrigger className="w-48" data-testid="select-assignee-filter">
          <SelectValue placeholder="All Assignees" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all-assignees">All Assignees</SelectItem>
          {uniqueAssignees.map((assignee) => (
            <SelectItem key={assignee.id} value={assignee.id}>
              {`${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() || assignee.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
