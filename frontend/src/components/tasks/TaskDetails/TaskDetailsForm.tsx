import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { 
  CalendarIcon, 
  Clock, 
  Briefcase, 
  Users, 
  User 
} from 'lucide-react';
import { format, isPast, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Task, User as ApiUser } from '@/common/types';
import { cn } from '@/utils/utils';
import { TaskTimer } from '@/components/tasks/TaskTimer';

interface TaskDetailsFormProps {
  task: Task;
  isEditMode: boolean;
  editedTask: Partial<Task>;
  onFieldChange: (field: string, value: any) => void;
  users: ApiUser[];
  occupations: any[];
  timerRunningTaskId?: string;
  currentTimerValues?: Record<string, number>;
  onTimerUpdate?: (newValue: number) => void;
  onTimerStatusChange?: (status: string) => void;
}

export const TaskDetailsForm: React.FC<TaskDetailsFormProps> = ({
  task,
  isEditMode,
  editedTask,
  onFieldChange,
  users,
  occupations,
  timerRunningTaskId,
  currentTimerValues,
  onTimerUpdate,
  onTimerStatusChange
}) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      return isValid(date) ? date : null;
    } catch {
      return null;
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onFieldChange('due_date', date.toISOString());
    } else {
      onFieldChange('due_date', null);
    }
  };

  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'concluido';

  return (
    <div className="p-6 space-y-6">
      {/* Data de Vencimento */}
      <div className="flex items-center gap-3">
        <div className="w-6 flex justify-center">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="w-28">
          <div className="text-sm font-medium">Vencimento</div>
        </div>
        {isEditMode ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-auto text-left font-normal",
                  !task.due_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {task.due_date ? 
                  format(parseISO(task.due_date), "dd/MM/yyyy", { locale: ptBR }) : 
                  "Selecionar data"
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <ShadcnCalendar
                mode="single"
                selected={formatDate(editedTask.due_date as string) || formatDate(task.due_date)}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        ) : (
          <div className={cn(
            "text-sm",
            isOverdue ? "text-red-600 font-medium" : ""
          )}>
            {task.due_date ? (
              <>
                {format(parseISO(task.due_date), "dd/MM/yyyy", { locale: ptBR })}
                {isOverdue && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    Atrasado
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">Não definido</span>
            )}
          </div>
        )}
      </div>

      {/* Timer */}
      <div className="flex items-center gap-3">
        <div className="w-6 flex justify-center">
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="w-28">
          <div className="text-sm font-medium">Tempo</div>
        </div>
        <div>
          {task.id && onTimerUpdate && onTimerStatusChange && (
            <TaskTimer
              taskId={task.id.toString()}
              onStatusChange={onTimerStatusChange}
              onTimerUpdate={onTimerUpdate}
              initialTime={task.timer || 0}
              isRunning={timerRunningTaskId === task.id.toString()}
              compact={false}
            />
          )}
        </div>
      </div>

      {/* Projeto */}
      <div className="flex items-center gap-3">
        <div className="w-6 flex justify-center">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="w-28">
          <div className="text-sm font-medium">Projeto</div>
        </div>
        <div className="text-sm">
          {isEditMode ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {task.project ? task.project.title : 'Sem projeto'}
              </span>
              <Badge variant="outline" className="text-xs bg-muted/50">
                Não editável
              </Badge>
            </div>
          ) : (
            task.project ? task.project.title : 'Sem projeto'
          )}
        </div>
      </div>

      {/* Equipes */}
      <div className="flex items-center gap-3">
        <div className="w-6 flex justify-center">
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="w-28">
          <div className="text-sm font-medium">Equipes</div>
        </div>
        {isEditMode ? (
          <div className="flex-1">
            <div className="border rounded-md p-2 text-sm w-full max-h-36 overflow-y-auto bg-blue-50/30 border-blue-200 space-y-1">
              {(() => {
                const selectedTeamIds = editedTask.occupations ?
                  (Array.isArray(editedTask.occupations) ?
                    editedTask.occupations.map(o => typeof o === 'number' ? o : o.id) :
                    []) :
                  (Array.isArray(task.occupations) ?
                    task.occupations.map(o => typeof o === 'number' ? o : o.id) :
                    []);

                // Montar lista de equipes para exibir
                let occupationsToShow = [];
                let occupationsToShowIds = new Set();

                // Equipes do projeto
                if (task.project?.occupations?.length > 0) {
                  task.project.occupations.forEach(team => {
                    const teamId = typeof team === 'number' ? team : team.id;
                    if (!occupationsToShowIds.has(teamId)) {
                      occupationsToShow.push(team);
                      occupationsToShowIds.add(teamId);
                    }
                  });
                }

                // Equipes originais da tarefa
                if (Array.isArray(task.occupations) && task.occupations.length > 0) {
                  task.occupations.forEach(team => {
                    const teamId = typeof team === 'number' ? team : team.id;
                    if (!occupationsToShowIds.has(teamId)) {
                      const fullTeam = occupations.find(t => {
                        const tId = typeof t === 'number' ? t : t.id;
                        return tId === teamId;
                      });
                      
                      if (fullTeam) {
                        occupationsToShow.push(fullTeam);
                      } else {
                        occupationsToShow.push({ id: teamId, name: `Equipe ${teamId}` });
                      }
                      occupationsToShowIds.add(teamId);
                    }
                  });
                }

                return occupationsToShow.map((team: any) => {
                  const teamId = typeof team === 'number' ? team : team.id;
                  const teamName = typeof team === 'number' ?
                    (occupations.find(t => t.id === team)?.name || `Equipe ${team}`) :
                    team.name;
                  const isSelected = selectedTeamIds.includes(teamId);

                  return (
                    <div key={teamId} className="flex items-center space-x-2 hover:bg-blue-100/50 p-1 rounded">
                      <Checkbox
                        id={`team-${teamId}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          const newSelectedTeams = [...selectedTeamIds];
                          if (checked) {
                            if (!newSelectedTeams.includes(teamId)) {
                              newSelectedTeams.push(teamId);
                            }
                          } else {
                            const index = newSelectedTeams.indexOf(teamId);
                            if (index !== -1) {
                              newSelectedTeams.splice(index, 1);
                            }
                          }
                          onFieldChange('occupations', newSelectedTeams);
                        }}
                      />
                      <label
                        htmlFor={`team-${teamId}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {teamName}
                      </label>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {task.occupations && task.occupations.length > 0 ? (
              task.occupations.map((occupation: any) => (
                <Badge 
                  key={typeof occupation === 'number' ? occupation : occupation.id} 
                  variant="secondary" 
                  className="rounded-full bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-indigo-200"
                >
                  {typeof occupation === 'number' ?
                    (occupations.find(t => t.id === occupation)?.name || `Equipe ${occupation}`) :
                    occupation.name}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Nenhuma</span>
            )}
          </div>
        )}
      </div>

      {/* Usuários */}
      <div className="flex items-center gap-3">
        <div className="w-6 flex justify-center">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="w-28">
          <div className="text-sm font-medium">Usuários</div>
        </div>
        {isEditMode ? (
          <div className="flex-1">
            <div className="border rounded-md p-2 text-sm w-full max-h-36 overflow-y-auto bg-green-50/30 border-green-200 space-y-1">
              {(() => {
                const selectedUserIds = editedTask.users ?
                  (Array.isArray(editedTask.users) ?
                    editedTask.users.map(u => typeof u === 'number' ? u : u.id) :
                    []) :
                  (Array.isArray(task.users) ?
                    task.users.map(u => typeof u === 'number' ? u : u.id) :
                    []);

                return users && users.length > 0 ? (
                  users.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);

                    return (
                      <div key={user.id} className="flex items-center space-x-2 hover:bg-green-100/50 p-1 rounded">
                        <Checkbox
                          id={`user-${user.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            const newSelectedUsers = [...selectedUserIds];
                            if (checked) {
                              if (!newSelectedUsers.includes(user.id)) {
                                newSelectedUsers.push(user.id);
                              }
                            } else {
                              const index = newSelectedUsers.indexOf(user.id);
                              if (index !== -1) {
                                newSelectedUsers.splice(index, 1);
                              }
                            }
                            onFieldChange('users', newSelectedUsers);
                          }}
                        />
                        <label
                          htmlFor={`user-${user.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {user.name}
                        </label>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-muted-foreground p-2 text-center">
                    Carregando usuários...
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {task.users && task.users.length > 0 ? (
              task.users.map((user: any) => (
                <Badge 
                  key={typeof user === 'number' ? user : user.id} 
                  variant="outline" 
                  className="rounded-full"
                >
                  {typeof user === 'number' ?
                    (users.find(u => u.id === user)?.name || `Usuário ${user}`) :
                    user.name}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Nenhum</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};