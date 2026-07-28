import React from 'react';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Search, Eye, XCircle } from 'lucide-react';

type Priority = 'baixa' | 'media' | 'alta' | 'urgente';

const priorityList: { key: Priority; label: string; dot: string }[] = [
  { key: 'baixa',    label: 'Baixa',    dot: 'bg-emerald-500' },
  { key: 'media',    label: 'Média',    dot: 'bg-amber-500'   },
  { key: 'alta',     label: 'Alta',     dot: 'bg-orange-500'  },
  { key: 'urgente',  label: 'Urgente',  dot: 'bg-red-500'     },
];

export interface TaskFiltersState {
  priorities: Priority[];
  projectId: number | 'all';
  userId: number | 'all';
  showCompleted: boolean;
  showCancelled: boolean;
  showMyReviews: boolean;
  searchTerm: string;
}

interface TaskFiltersSidebarProps {
  filters: TaskFiltersState;
  onChange: (next: TaskFiltersState) => void;
  projects: Array<{ id: number; title: string }>;
  users: Array<{ id: number; name?: string | null }>;
  canFilterByUser?: boolean;
  canShowMyReviews?: boolean;
  isLoading?: boolean;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
}

const SectionTitle: React.FC<{ children: React.ReactNode; icon?: React.ReactNode }> = ({ children, icon }) => (
  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 mb-2">
    {icon}
    {children}
  </h4>
);

const PillCheckbox: React.FC<{
  active: boolean;
  onToggle: () => void;
  dotClass: string;
  label: string;
}> = ({ active, onToggle, dotClass, label }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`
      w-full flex items-center gap-2 px-2 py-1 rounded-md text-left text-[13px] transition-colors
      ${active
        ? 'bg-accent text-accent-foreground font-medium'
        : 'text-foreground/80 hover:bg-accent/40'
      }
    `}
  >
    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${dotClass}`} />
    <span className="truncate">{label}</span>
  </button>
);

const SelectCompact: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
}> = ({ value, onChange, placeholder, options }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="w-full h-8 text-[13px] border-border/40 bg-transparent shadow-none">
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {options.map((o) => (
        <SelectItem key={o.value} value={o.value}>
          {o.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const TaskFiltersSidebar: React.FC<TaskFiltersSidebarProps> = ({
  filters,
  onChange,
  projects,
  users,
  canFilterByUser = false,
  canShowMyReviews = false,
  isLoading = false,
  title,
  subtitle,
}) => {
  const togglePriority = (p: Priority) => {
    const next = filters.priorities.includes(p)
      ? filters.priorities.filter((x) => x !== p)
      : [...filters.priorities, p];
    onChange({ ...filters, priorities: next });
  };

  return (
    <aside className="w-60 flex-shrink-0 border-r border-border/40 bg-white h-full overflow-y-auto px-4 py-5">
      {(title || subtitle) && (
        <div className="mb-5">
          {title && <div className="text-2xl font-bold tracking-tight">{title}</div>}
          {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
        </div>
      )}

      <div className="relative mb-5">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Buscar tarefas..."
          value={filters.searchTerm}
          onChange={(e) => onChange({ ...filters, searchTerm: e.target.value })}
          className="pl-8 h-9 bg-transparent border-border/40"
        />
      </div>

      {/* Projeto */}
      <section className="mb-5">
        <SectionTitle>Projeto</SectionTitle>
        <SelectCompact
          value={String(filters.projectId)}
          onChange={(v) => onChange({ ...filters, projectId: v === 'all' ? 'all' : Number(v) })}
          placeholder="Todos os projetos"
          options={[
            { value: 'all', label: 'Todos os projetos' },
            ...projects
              .slice()
              .sort((a, b) => a.title.localeCompare(b.title))
              .map((p) => ({ value: String(p.id), label: p.title })),
          ]}
        />
      </section>

      {/* Responsavel (admin) */}
      {canFilterByUser && (
        <section className="mb-5">
          <SectionTitle>Responsável</SectionTitle>
          <SelectCompact
            value={String(filters.userId)}
            onChange={(v) => onChange({ ...filters, userId: v === 'all' ? 'all' : Number(v) })}
            placeholder="Todos os usuários"
            options={[
              { value: 'all', label: 'Todos os usuários' },
              ...users
                .slice()
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .map((u) => ({ value: String(u.id), label: u.name || `Usuário ${u.id}` })),
            ]}
          />
        </section>
      )}

      {/* Prioridade */}
      <section className="mb-5">
        <SectionTitle>Prioridade</SectionTitle>
        <div className="space-y-0.5">
          {priorityList.map((p) => (
            <PillCheckbox
              key={p.key}
              active={filters.priorities.includes(p.key)}
              onToggle={() => togglePriority(p.key)}
              dotClass={p.dot}
              label={p.label}
            />
          ))}
        </div>
      </section>

      {/* Toggles */}
      <div className="h-px bg-border/40 my-3" />
      <section className="space-y-3">
        {canShowMyReviews && (
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-foreground/80 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              Revisões
            </span>
            <Switch
              checked={filters.showMyReviews}
              onCheckedChange={(checked) => onChange({ ...filters, showMyReviews: checked })}
            />
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-foreground/80 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
            Concluídas
          </span>
          <Switch
            checked={filters.showCompleted}
            onCheckedChange={(checked) => onChange({ ...filters, showCompleted: checked })}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-foreground/80 flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
            Canceladas
          </span>
          <Switch
            checked={filters.showCancelled}
            onCheckedChange={(checked) => onChange({ ...filters, showCancelled: checked })}
          />
        </div>
      </section>

      {isLoading && (
        <div className="mt-4 text-[11px] text-muted-foreground text-center">
          Carregando...
        </div>
      )}
    </aside>
  );
};
