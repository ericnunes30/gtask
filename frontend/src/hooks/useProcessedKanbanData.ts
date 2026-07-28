import { useMemo, useState, useEffect } from 'react';
import {
  UseProcessedKanbanDataProps,
  UseProcessedKanbanDataReturn,
  KanbanTask,
  ProcessedKanbanColumns,
  TasksMap,
  ProcessedColumnOrder,
} from '@/components/kanban/kanbanTypes';
import { applyTaskFilters, generateKanbanColumns } from '@/components/kanban/kanbanUtils';

const useProcessedKanbanData = ({
  rawTasks,
  viewMode,
  boardMode,
  filters,
  projectId,
}: UseProcessedKanbanDataProps): UseProcessedKanbanDataReturn => {
  const processedData = useMemo(() => {
    try {
      const filteredTasks = applyTaskFilters(rawTasks, filters, boardMode);
      const { columns, tasksMap, columnOrder } = generateKanbanColumns(filteredTasks, viewMode);
      return { columns, tasksMap, columnOrder, error: null };
    } catch (e: any) {
      console.error("Erro ao processar dados do Kanban:", e);
      return {
        columns: {},
        tasksMap: {},
        columnOrder: [],
        error: "Falha ao processar os dados das tarefas.",
      };
    }
  }, [rawTasks, viewMode, boardMode, filters]);

  return {
    columns: processedData.columns,
    tasksMap: processedData.tasksMap,
    columnOrder: processedData.columnOrder,
    isLoading: false,
    error: processedData.error,
  };
};

export default useProcessedKanbanData;
