"use client";

import React, { useState, useEffect } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragEndEvent,
    useDroppable,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Define the feature type
export type Feature = {
    id: string; // 'payroll', 'crm', etc.
    label: string;
    description: string;
};

// Available features metadata
const AVAILABLE_FEATURES: Feature[] = [
    { id: "payroll", label: "Payroll & HR", description: "Team, Timesheets, Payroll runs." },
    { id: "crm", label: "CRM & Sales", description: "Clients, Visits, Quotes." },
    { id: "operations", label: "Operations", description: "Sites, Inventory, Audits." },
    { id: "automations", label: "Automations", description: "Form workflows." },
    { id: "security", label: "Security & Patrols", description: "Guard patrols, checkpoints, incidents." },
];

interface FeatureSelectorProps {
    enabledFeatures: { [key: string]: boolean };
    onChange: (features: { [key: string]: boolean }) => void;
}

export function FeatureSelector({ enabledFeatures, onChange }: FeatureSelectorProps) {
    // Split into enabled and disabled lists for local DND state
    const [enabled, setEnabled] = useState<Feature[]>([]);
    const [disabled, setDisabled] = useState<Feature[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Sync from props on mount or external change
    useEffect(() => {
        const enabledList: Feature[] = [];
        const disabledList: Feature[] = [];

        AVAILABLE_FEATURES.forEach(f => {
            if (enabledFeatures[f.id]) {
                enabledList.push(f);
            } else {
                disabledList.push(f);
            }
        });

        setEnabled(enabledList);
        setDisabled(disabledList);
    }, [enabledFeatures]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function findContainer(id: string): "enabled" | "disabled" | undefined {
        if (id === "enabled-container") return "enabled";
        if (id === "disabled-container") return "disabled";
        if (enabled.find((i) => i.id === id)) return "enabled";
        if (disabled.find((i) => i.id === id)) return "disabled";
        return undefined;
    }

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string);
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        const activeId = active.id as string;
        const overId = over?.id as string;

        if (!overId) {
            setActiveId(null);
            return;
        }

        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            setActiveId(null);
            return;
        }

        // Move across containers
        let newEnabled = [...enabled];
        let newDisabled = [...disabled];

        const item = activeContainer === "enabled"
            ? newEnabled.find(i => i.id === activeId)!
            : newDisabled.find(i => i.id === activeId)!;

        // Remove from source
        if (activeContainer === "enabled") {
            newEnabled = newEnabled.filter(i => i.id !== activeId);
        } else {
            newDisabled = newDisabled.filter(i => i.id !== activeId);
        }

        // Add to dest
        if (overContainer === "enabled") {
            newEnabled.push(item);
        } else {
            newDisabled.push(item);
        }

        // Update functionality
        const newFeatureState: { [key: string]: boolean } = {};
        newEnabled.forEach(f => newFeatureState[f.id] = true);
        newDisabled.forEach(f => newFeatureState[f.id] = false);

        // Optimistic update
        setEnabled(newEnabled);
        setDisabled(newDisabled);

        // Notify Parent
        onChange(newFeatureState);
        setActiveId(null);
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FeatureList
                    id="enabled-container"
                    title="Active Features"
                    items={enabled}
                    type="enabled"
                />
                <FeatureList
                    id="disabled-container"
                    title="Available Features"
                    items={disabled}
                    type="disabled"
                />
            </div>
            <DragOverlay dropAnimation={defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } })}>
                {activeId ? <FeatureItem feature={AVAILABLE_FEATURES.find(f => f.id === activeId)!} overlay /> : null}
            </DragOverlay>
        </DndContext>
    );
}

function FeatureList({ id, title, items, type }: { id: string, title: string, items: Feature[], type: "enabled" | "disabled" }) {
    const { setNodeRef } = useDroppable({
        id: id,
    });

    return (
        <div ref={setNodeRef} className="flex flex-col h-full rounded-lg border bg-muted/30">
            <div className={cn("p-4 border-b font-medium flex items-center justify-between", type === "enabled" ? "bg-primary/5 text-primary" : "text-muted-foreground")}>
                {title}
                <Badge variant={type === "enabled" ? "default" : "secondary"}>{items.length}</Badge>
            </div>
            <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
                <div className="p-4 space-y-3 min-h-[200px]" >
                    {items.map((feature) => (
                        <SortableItem key={feature.id} feature={feature} type={type} />
                    ))}
                    {items.length === 0 && (
                        <div className="h-full flex items-center justify-center text-sm text-muted-foreground border-2 border-dashed rounded-md p-8">
                            {type === "enabled" ? "Drag features here to enable" : "All features enabled"}
                        </div>
                    )}
                </div>
            </SortableContext>
        </div>
    );
}

function SortableItem({ feature, type }: { feature: Feature, type: "enabled" | "disabled" }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: feature.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
            <FeatureItem feature={feature} type={type} />
        </div>
    );
}

function FeatureItem({ feature, type, overlay }: { feature: Feature, type?: "enabled" | "disabled", overlay?: boolean }) {
    return (
        <Card className={cn("cursor-grab active:cursor-grabbing", overlay ? "shadow-xl ring-2 ring-primary rotate-2" : "hover:border-primary/50 transition-colors")}>
            <CardContent className="p-3 flex items-start gap-3">
                <GripVertical className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1 flex-1">
                    <div className="font-medium text-sm flex items-center justify-between">
                        {feature.label}
                        {type === "enabled" && <Check className="h-3 w-3 text-green-500" />}
                        {type === "disabled" && <X className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
            </CardContent>
        </Card>
    );
}
