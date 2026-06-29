"use client";

import { useAdminSections, useUpdateSections } from "@/hooks/use-blackbox";
import type { HomeSection } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Flame, LayoutGrid, Sparkles, GitCompare, GripVertical, Loader2, Save, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  hero: Star,
  offers: Flame,
  categories: LayoutGrid,
  ai_recommendations: Sparkles,
  comparator: GitCompare,
};

export function AdminHomeEditor() {
  const { data, isLoading } = useAdminSections();
  const update = useUpdateSections();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  // Stable key: remount the inner editor only when the SET of sections changes
  // (not on every refetch), so local drag state is preserved after saving.
  const sectionsKey = data.sections.map((s) => s.id).join("|");

  return (
    <HomeEditorInner
      key={sectionsKey}
      sections={data.sections}
      sensors={sensors}
      save={async (items) => {
        const t = toast.loading("Guardando orden…");
        try {
          await update.mutateAsync(
            items.map((s, i) => ({ id: s.id, order: i, isActive: s.isActive }))
          );
          toast.success("Secciones actualizadas", { id: t });
        } catch {
          toast.error("Error al guardar", { id: t });
        }
      }}
      saving={update.isPending}
    />
  );
}

function HomeEditorInner({
  sections,
  sensors,
  save,
  saving,
}: {
  sections: HomeSection[];
  sensors: ReturnType<typeof useSensors>;
  save: (items: HomeSection[]) => Promise<void>;
  saving: boolean;
}) {
  const [items, setItems] = useState<HomeSection[]>(() =>
    [...sections].sort((a, b) => a.order - b.order)
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const toggleActive = (id: string) => {
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Arrastra para reordenar · activa/desactiva bloques
        </p>
        <Button onClick={() => save(items)} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar cambios
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((s) => {
              const Icon = SECTION_ICONS[s.type] ?? LayoutGrid;
              return (
                <SortableRow
                  key={s.id}
                  section={s}
                  icon={Icon}
                  onToggle={() => toggleActive(s.id)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableRow({
  section,
  icon: Icon,
  onToggle,
}: {
  section: HomeSection;
  icon: React.ComponentType<{ className?: string }>;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-card/40 p-3 transition-shadow",
        isDragging && "z-10 shadow-lg shadow-black/30 ring-1 ring-primary/40",
        !section.isActive && "opacity-50"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Arrastrar"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{section.title}</p>
        {section.subtitle && (
          <p className="truncate text-xs text-muted-foreground">{section.subtitle}</p>
        )}
      </div>
      <span className="hidden rounded-md bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:inline">
        {section.type}
      </span>
      <Switch checked={section.isActive} onCheckedChange={onToggle} />
    </div>
  );
}
