import React from 'react';
import { Task, User, Team as Occupation } from '@/utils/commonTypes';
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, User as UserIcon } from 'lucide-react';

interface TaskAssignmentsProps {
  task: Task;
  isEditMode: boolean;
  editedTask?: Partial<Task> | null;
  onFieldChange: (field: keyof Task, value: any) => void;
  users: User[];
  occupations: Occupation[];
}

const TaskAssignments: React.FC<TaskAssignmentsProps> = ({
  task,
  isEditMode,
  editedTask,
  onFieldChange,
  users = [],
  occupations = [],
}) => {

  const getFilteredProjectUsers = () => {
    // Basic filtering: for now, just return all users.
    // The complex logic from the old component can be added here if needed.
    return users;
  };

  return (
    <div className="space-y-5">
      {/* Equipes */}
      <div className="flex items-start gap-3">
        <div className="w-6 flex justify-center pt-1">
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="w-28">
          <div className="text-sm font-medium">Equipes</div>
        </div>
        <div className="flex-1">
          {isEditMode ? (
            <div className="border rounded-md p-2 text-sm w-full max-h-36 overflow-y-auto bg-blue-50/30 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 space-y-1">
              {(() => {
                const selectedTeamIds = editedTask?.occupations?.map(o => typeof o === 'number' ? o : o.id) || task.occupations?.map(o => typeof o === 'number' ? o : o.id) || [];
                const projectOccupations = task.project?.occupations || [];
                const allRelevantOccupations = [...occupations, ...projectOccupations];
                const uniqueOccupationIds = new Set(allRelevantOccupations.map(o => o.id));
                const occupationsToShow = Array.from(uniqueOccupationIds).map(id => allRelevantOccupations.find(o => o.id === id)!);

                return occupationsToShow.map((team) => {
                  if (!team) return null;
                  const isSelected = selectedTeamIds.includes(team.id);
                  return (
                    <div key={team.id} className="flex items-center space-x-2 hover:bg-blue-100/50 dark:hover:bg-blue-900/40 p-1 rounded">
                      <Checkbox
                        id={`team-${team.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          const newSelectedTeams = [...selectedTeamIds];
                          if (checked) {
                            if (!newSelectedTeams.includes(team.id)) newSelectedTeams.push(team.id);
                          } else {
                            const index = newSelectedTeams.indexOf(team.id);
                            if (index !== -1) newSelectedTeams.splice(index, 1);
                          }
                          onFieldChange('occupations', newSelectedTeams);
                        }}
                      />
                      <label
                        htmlFor={`team-${team.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {team.name}
                      </label>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {task.occupations && task.occupations.length > 0 ? (
                task.occupations.map((occupation) => (
                  <Badge key={occupation.id} variant="secondary" className="rounded-full bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-700">
                    {occupation.name}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Nenhuma</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Responsáveis */}
      <div className="flex items-start gap-3">
        <div className="w-6 flex justify-center pt-1">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="w-28">
          <div className="text-sm font-medium">Responsáveis</div>
        </div>
        <div className="flex-1">
          {isEditMode ? (
            <div className="border rounded-md p-2 text-sm w-full max-h-36 overflow-y-auto bg-blue-50/30 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 space-y-1">
              {(() => {
                const selectedUserIds = editedTask?.users?.map(u => typeof u === 'number' ? u : u.id) || task.users?.map(u => typeof u === 'number' ? u : u.id) || [];
                const filteredUsers = getFilteredProjectUsers();

                return filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2 hover:bg-blue-100/50 dark:hover:bg-blue-900/40 p-1 rounded">
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={(checked) => {
                          const newSelectedUsers = [...selectedUserIds];
                          if (checked) {
                            if (!newSelectedUsers.includes(user.id)) newSelectedUsers.push(user.id);
                          } else {
                            const index = newSelectedUsers.indexOf(user.id);
                            if (index !== -1) newSelectedUsers.splice(index, 1);
                          }
                          onFieldChange('users', newSelectedUsers);
                        }}
                      />
                      <label
                        htmlFor={`user-${user.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {user.name}
                        {user.occupations && user.occupations.length > 0 &&
                          <span className="text-xs text-muted-foreground ml-2">({user.occupations.map(o => o.name).join(', ')})</span>
                        }
                      </label>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground p-2 text-center">Carregando usuários...</div>
                );
              })()}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {task.users && task.users.length > 0 ? (
                task.users.map((user) => (
                  <Badge key={user.id} variant="outline" className="rounded-full flex items-center gap-2">
                     <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-xs">
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    {user.name}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Nenhum</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Revisor da Tarefa */}
      {task.reviewer && (
        <div className="flex items-center gap-3">
          <div className="w-6 flex justify-center">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="w-28">
            <div className="text-sm font-medium">Revisor</div>
          </div>
          <div className="flex-1">
            <Badge variant="outline" className="rounded-full bg-green-50 border-green-200 text-green-700 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700">
              <div className="flex items-center gap-2">
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-xs">
                    {task.reviewer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{task.reviewer.name}</span>
              </div>
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskAssignments;