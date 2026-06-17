import React from 'react';
import { Task } from '@/utils/commonTypes';
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface TaskDetailedFieldsProps {
  task: Task;
  editedTask?: Partial<Task> | null;
  isEditMode: boolean;
  handleFieldChange: (field: keyof Task, value: any) => void;
  setShowDetailsPopup: (open: boolean) => void;
}

const TaskDetailedFields: React.FC<TaskDetailedFieldsProps> = ({
  task,
  editedTask,
  isEditMode,
  handleFieldChange,
  setShowDetailsPopup,
}) => {
  const permissions = usePermissions();
  const showFields = isEditMode || task.has_detailed_fields;

  if (!showFields) {
    return null; // Don't render anything if not in edit mode and no detailed fields
  }

  const hasDetailedFields = editedTask?.has_detailed_fields !== undefined ? editedTask.has_detailed_fields : task.has_detailed_fields;

  return (
    <div className="flex items-start gap-3">
      <div className="w-6 flex justify-center pt-1">
        <FileText className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="w-28">
        <div className="text-sm font-medium">Detalhes Adicionais</div>
      </div>
      {isEditMode && !permissions.isMember ? (
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!hasDetailedFields}
              onChange={(e) => handleFieldChange('has_detailed_fields', e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Ativar campos detalhados</span>
          </div>

          {hasDetailedFields && (
            <div className="space-y-3 p-3 border rounded-md bg-muted/20">
              <div>
                <label className="text-xs font-medium text-muted-foreground">URL do Vídeo</label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={editedTask?.video_url !== undefined ? editedTask.video_url : (task.video_url || '')}
                  onChange={(e) => handleFieldChange('video_url', e.target.value)}
                  className="w-full mt-1 border rounded-md px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Observações</label>
                <textarea
                  placeholder="Observações, requisitos técnicos, considerações especiais..."
                  value={editedTask?.observations !== undefined ? editedTask.observations : (task.observations || '')}
                  onChange={(e) => handleFieldChange('observations', e.target.value)}
                  className="w-full mt-1 border rounded-md px-2 py-1 text-sm min-h-[60px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <ExternalLink className="h-3 w-3" />
                  Links Úteis
                </label>
                <div className="mt-2 space-y-3">
                  {(editedTask?.useful_links ?? task.useful_links ?? []).map((link, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Título do link"
                          value={link.title || ''}
                          onChange={(e) => {
                            const currentLinks = editedTask?.useful_links !== undefined ? editedTask.useful_links : (task.useful_links || []);
                            const newLinks = [...currentLinks];
                            newLinks[index] = { ...newLinks[index], title: e.target.value };
                            handleFieldChange('useful_links', newLinks);
                          }}
                          className="w-full border rounded-md px-2 py-1 text-sm mb-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
                        />
                        <input
                          type="url"
                          placeholder="https://..."
                          value={link.url || ''}
                          onChange={(e) => {
                            const currentLinks = editedTask?.useful_links !== undefined ? editedTask.useful_links : (task.useful_links || []);
                            const newLinks = [...currentLinks];
                            newLinks[index] = { ...newLinks[index], url: e.target.value };
                            handleFieldChange('useful_links', newLinks);
                          }}
                          className="w-full border rounded-md px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const currentLinks = editedTask?.useful_links !== undefined ? editedTask.useful_links : (task.useful_links || []);
                          const newLinks = currentLinks.filter((_, i) => i !== index);
                          handleFieldChange('useful_links', newLinks);
                        }}
                        className="border rounded-md px-2 py-1 text-sm hover:bg-muted/50 flex items-center"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const currentLinks = editedTask?.useful_links ?? task.useful_links ?? [];
                      const newLinks = [...currentLinks, { title: '', url: '' }];
                      handleFieldChange('useful_links', newLinks);
                    }}
                    className="w-full border rounded-md px-2 py-1 text-sm hover:bg-muted/50 flex items-center justify-center gap-2"
                  >
                    <Plus className="h-3 w-3" />
                    Adicionar Link
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1">
          {task.has_detailed_fields ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetailsPopup(true)}
              className="flex items-center gap-1 h-7 px-2 text-xs"
            >
              <FileText className="h-3 w-3" />
              Ver detalhes
            </Button>
          ) : (
            <div className="text-sm text-muted-foreground">
              Tarefa sem detalhes adicionais
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskDetailedFields;