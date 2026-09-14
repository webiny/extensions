import React, { useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { createObjectFieldRenderer, LayoutNodeRenderer } from "webiny/admin/form";
import type { IFieldVM, IObjectFieldItemVM, IObjectFieldVM } from "webiny/admin/form";
import { Button, DropdownMenu, Icon, IconButton, Input, Text, cn } from "webiny/admin/ui";
import { ReactComponent as DragIcon } from "webiny/admin/icons/drag_indicator.svg";
import { ReactComponent as ChevronDownIcon } from "webiny/admin/icons/expand_more.svg";
import { ReactComponent as ChevronRightIcon } from "webiny/admin/icons/chevron_right.svg";
import { ReactComponent as AddIcon } from "webiny/admin/icons/add.svg";
import { ReactComponent as MoreIcon } from "webiny/admin/icons/more_vert.svg";
import { ReactComponent as NestedIcon } from "webiny/admin/icons/subdirectory_arrow_right.svg";
import { ReactComponent as DuplicateIcon } from "webiny/admin/icons/content_copy.svg";
import { ReactComponent as DeleteIcon } from "webiny/admin/icons/delete_outline.svg";
import {
    getDescendantCount,
    getVisibleRows,
    normalizeDepths,
    planMoves,
    project,
    type MenuRow,
    type Projection
} from "./menuTree.js";

/**
 * A type alias, not an interface: renderer settings have to stay assignable to
 * `Record<string, unknown>`, and interfaces get no implicit index signature.
 */
export type MenuBuilderSettings = {
    /** Field ID shown as the item's title. Defaults to the item's first text field. */
    labelField?: string;
    /** Field ID shown next to the title, greyed out. Handy for the link target. */
    subtitleField?: string;
    /** Field ID holding the nesting level. Leave empty for a flat, reorder-only list. */
    depthField?: string;
    /** How deep items may be nested. Defaults to 2, so three levels in total. */
    maxDepth?: number;
    /** Label of the "add item" button. */
    addItemLabel?: string;
};

declare module "webiny/admin/form" {
    interface IFieldRendererRegistry {
        menuBuilder: {
            fieldType: "object";
            settings?: MenuBuilderSettings;
        };
    }
}

/** Width of one nesting level, in pixels. */
const INDENT = 28;

type MenuField = IObjectFieldVM & { rendererSettings: MenuBuilderSettings };

interface PendingInsert {
    /** Index of the item that was just added. */
    index: number;
    /** Title to write once the item exists. */
    label?: string;
    /** Whether to open the item's form. */
    edit: boolean;
}

interface DragState {
    /** Item being dragged. */
    index: number;
    startX: number;
    startY: number;
    /** Row slot the item has been pulled to. */
    overPosition: number;
    depthOffset: number;
    /** How far the row has been lifted from where it sits, so it can follow the pointer. */
    offsetY: number;
}

/**
 * Field IDs the renderer recognises on its own, so a field whose children follow the usual shape
 * works before anyone opens the appearance settings. Settings always win over these.
 */
const TITLE_NAMES = ["label", "title", "name", "text"];
const SUBTITLE_NAMES = ["url", "link", "href", "subtitle"];
const DEPTH_NAMES = ["depth", "level", "nesting", "indent"];

/**
 * Picks a child field by name from a sample item. `orAnyOfType` allows falling back to the first
 * child of that type, which is safe for the title but not for nesting: claiming an unrelated
 * number field as the nesting level would quietly rewrite the editor's data.
 */
const pickChild = (
    sample: IFieldVM[] | undefined,
    type: string,
    names: string[],
    orAnyOfType = false
): string | undefined => {
    if (!sample) {
        return undefined;
    }

    const named = names
        .map(name => sample.find(f => f.name === name && f.type === type))
        .find(Boolean);

    if (named) {
        return named.name;
    }

    return orAnyOfType ? sample.find(f => f.type === type)?.name : undefined;
};

const childField = (item: IObjectFieldItemVM, name?: string): IFieldVM | undefined => {
    if (!name) {
        return undefined;
    }
    return item.fields.find(field => field.name === name);
};

const asText = (field: IFieldVM | undefined): string => {
    const value = field?.value;
    if (value === null || value === undefined || typeof value === "object") {
        return "";
    }
    return String(value);
};

const toggle = (list: string[], key: string) => {
    return list.includes(key) ? list.filter(item => item !== key) : [...list, key];
};

export const MenuBuilderRenderer = createObjectFieldRenderer<"menuBuilder">(({ field }) => {
    if (!field.isList) {
        return null;
    }

    return <MenuBuilder field={field as MenuField} />;
});

const MenuBuilder = observer(({ field }: { field: MenuField }) => {
    const settings = field.rendererSettings ?? {};
    const items = field.items;

    const sample = items[0]?.fields;
    const labelField = settings.labelField || pickChild(sample, "text", TITLE_NAMES, true);
    const subtitleField = settings.subtitleField || pickChild(sample, "text", SUBTITLE_NAMES);
    const depthField = settings.depthField || pickChild(sample, "number", DEPTH_NAMES);
    const maxDepth = depthField ? Math.max(0, settings.maxDepth ?? 2) : 0;

    const [collapsed, setCollapsed] = useState<string[]>([]);
    const [editing, setEditing] = useState<string[]>([]);
    const [drag, setDrag] = useState<DragState | null>(null);
    const [draft, setDraft] = useState("");
    const [pending, setPending] = useState<PendingInsert | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const depthOf = (item: IObjectFieldItemVM) => Number(childField(item, depthField)?.value ?? 0);
    const depths = items.map(depthOf);

    const rows = getVisibleRows(depths, index => collapsed.includes(items[index].key), drag?.index);

    const projection = useMemo(() => {
        if (!drag) {
            return null;
        }
        return project({
            depths,
            rows,
            activeIndex: drag.index,
            overPosition: drag.overPosition,
            depthOffset: drag.depthOffset,
            maxDepth
        });
    }, [drag, depths.join(","), rows.length, maxDepth]);

    /**
     * The view model is rebuilt on every render, so a handler that mutates the list cannot read
     * the result back from the copy it closed over. These refs always hold the freshest one.
     */
    const fieldRef = useRef(field);
    const rowsRef = useRef(rows);
    const dropRef = useRef<{ drag: DragState; projection: Projection } | null>(null);
    const swallowClick = useRef(false);

    const ignoreClickAfterDrag = () => {
        const ignore = swallowClick.current;
        swallowClick.current = false;
        return ignore;
    };

    useEffect(() => {
        fieldRef.current = field;
        rowsRef.current = rows;
        dropRef.current = drag && projection ? { drag, projection } : null;
    });

    /**
     * A new item only exists on the next render, so anything that needs the item itself waits
     * until here. That includes naming it: when no title field is configured the fallback is the
     * item's first text field, which cannot be known from an empty list.
     */
    useEffect(() => {
        if (!pending) {
            return;
        }

        const item = field.items[pending.index];

        if (item) {
            if (pending.label) {
                const title =
                    childField(item, labelField) ?? item.fields.find(f => f.type === "text");
                title?.onChange(pending.label);
            }
            if (pending.edit) {
                setEditing(list => [...list, item.key]);
            }
        }

        setPending(null);
    }, [pending]);

    const applyDrop = (dropped: DragState, target: Projection) => {
        const vm = fieldRef.current;
        const itemVms = vm.items;
        const current = itemVms.map(depthOf);

        const from = dropped.index;
        const size = 1 + getDescendantCount(current, from);
        const shift = target.depth - current[from];

        const block = itemVms.slice(from, from + size);
        const blockDepths = current.slice(from, from + size).map(depth => depth + shift);
        const restItems = [...itemVms.slice(0, from), ...itemVms.slice(from + size)];
        const restDepths = [...current.slice(0, from), ...current.slice(from + size)];

        for (const [moveFrom, moveTo] of planMoves(from, size, target.insertAt)) {
            vm.moveItem(moveFrom, moveTo);
        }

        if (!depthField) {
            return;
        }

        const at = target.insertAt;
        const ordered = [...restItems.slice(0, at), ...block, ...restItems.slice(at)];
        const orderedDepths = normalizeDepths(
            [...restDepths.slice(0, at), ...blockDepths, ...restDepths.slice(at)],
            maxDepth
        );

        ordered.forEach((item, index) => {
            const depth = childField(item, depthField);
            if (depth && Number(depth.value ?? 0) !== orderedDepths[index]) {
                depth.onChange(orderedDepths[index]);
            }
        });
    };

    const startDrag = (event: React.PointerEvent, index: number) => {
        if (field.disabled || items.length < 2) {
            return;
        }

        event.preventDefault();

        // A row with its form open is a tall block to throw around, so it travels closed.
        setEditing(list => list.filter(key => key !== items[index].key));

        setDrag({
            index,
            startX: event.clientX,
            startY: event.clientY,
            overPosition: rows.findIndex(row => row.index === index),
            depthOffset: 0,
            offsetY: 0
        });
    };

    useEffect(() => {
        if (!drag) {
            return;
        }

        /**
         * Rows are measured here rather than on pointer down, because the render that starts the
         * drag is also the one that folds the dragged item's children away. Measuring the real
         * rectangles, instead of assuming every row is the same height, keeps the drop slot
         * correct when an item has its form open below it.
         */
        const centers = Array.from(listRef.current?.querySelectorAll("[data-menu-row]") ?? []).map(
            element => {
                const rect = element.getBoundingClientRect();
                return rect.top + rect.height / 2;
            }
        );

        const activePosition = rowsRef.current.findIndex(row => row.index === drag.index);
        const startCenter = centers[activePosition] ?? 0;

        let moved = false;

        const onMove = (event: PointerEvent) => {
            moved = true;

            const center = startCenter + (event.clientY - drag.startY);

            // Walk to the slot whose midpoint the row has passed, in whichever direction it went.
            let over = activePosition;
            if (center > startCenter) {
                while (over + 1 < centers.length && centers[over + 1] < center) {
                    over++;
                }
            } else {
                while (over - 1 >= 0 && centers[over - 1] > center) {
                    over--;
                }
            }

            setDrag(current => {
                if (!current) {
                    return current;
                }
                return {
                    ...current,
                    overPosition: over,
                    depthOffset: Math.round((event.clientX - current.startX) / INDENT),
                    offsetY: event.clientY - current.startY
                };
            });
        };

        const onUp = () => {
            // Letting go over another row fires a click on whatever button is under the pointer,
            // so the next one is spent on nothing.
            swallowClick.current = moved;

            const drop = dropRef.current;
            if (drop) {
                applyDrop(drop.drag, drop.projection);
            }
            setDrag(null);
        };

        const onCancel = () => {
            dropRef.current = null;
            setDrag(null);
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onCancel();
            }
        };

        // Without this the pointer keeps the text cursor and selects labels as it crosses them.
        const previousCursor = document.body.style.cursor;
        const previousSelect = document.body.style.userSelect;
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onCancel);
        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.cursor = previousCursor;
            document.body.style.userSelect = previousSelect;
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onCancel);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [drag !== null]);

    /** Adds an item at `at`, with `depth`, and returns the index it ended up on. */
    const insertItem = (at: number, depth: number, values?: Record<string, unknown>) => {
        const vm = fieldRef.current;
        const appendedAt = vm.items.length;
        const payload: Record<string, unknown> = { ...values };

        if (depthField) {
            payload[depthField] = depth;
        }

        vm.addItem(payload);

        if (at < appendedAt) {
            vm.moveItem(appendedAt, at);
            return at;
        }

        return appendedAt;
    };

    const addSibling = (index: number) => {
        const at = index + 1 + getDescendantCount(depths, index);
        setPending({ index: insertItem(at, depths[index]), edit: true });
    };

    const addChild = (index: number) => {
        setCollapsed(list => list.filter(key => key !== items[index].key));
        setPending({
            index: insertItem(index + 1, Math.min(depths[index] + 1, maxDepth)),
            edit: true
        });
    };

    const addFromDraft = () => {
        const label = draft.trim();
        if (!label) {
            return;
        }

        const at = insertItem(items.length, depths[depths.length - 1] ?? 0);
        setPending({ index: at, label, edit: false });
        setDraft("");
    };

    /** Duplicates an item together with everything nested under it. */
    const duplicateBranch = (index: number) => {
        const vm = fieldRef.current;
        const size = 1 + getDescendantCount(depths, index);
        const appendedAt = vm.items.length;

        for (const item of vm.items.slice(index, index + size)) {
            vm.addItem(item.getClonedData());
        }

        for (const [from, to] of planMoves(appendedAt, size, index + size)) {
            vm.moveItem(from, to);
        }
    };

    /** Moves a branch past the sibling above or below it, so the list can be reordered by keyboard. */
    const moveBranch = (index: number, direction: "up" | "down") => {
        const vm = fieldRef.current;
        const size = 1 + getDescendantCount(depths, index);

        if (direction === "up") {
            let previous = index - 1;
            while (previous >= 0 && depths[previous] > depths[index]) {
                previous--;
            }
            if (previous < 0 || depths[previous] !== depths[index]) {
                return;
            }
            for (const [from, to] of planMoves(index, size, previous)) {
                vm.moveItem(from, to);
            }
            return;
        }

        const next = index + size;
        if (next >= depths.length || depths[next] !== depths[index]) {
            return;
        }
        const nextSize = 1 + getDescendantCount(depths, next);
        for (const [from, to] of planMoves(index, size, index + nextSize)) {
            vm.moveItem(from, to);
        }
    };

    /** Nests a branch one level deeper, or pulls it one level out. */
    const shiftDepth = (index: number, direction: "in" | "out") => {
        if (!depthField) {
            return;
        }

        const target = depths[index] + (direction === "in" ? 1 : -1);
        const ceiling = index === 0 ? 0 : Math.min(depths[index - 1] + 1, maxDepth);

        if (target < 0 || target > ceiling) {
            return;
        }

        const size = 1 + getDescendantCount(depths, index);
        const shift = target - depths[index];

        for (const item of items.slice(index, index + size)) {
            childField(item, depthField)?.onChange(depthOf(item) + shift);
        }
    };

    /** Removes an item together with everything nested under it. */
    const removeBranch = (index: number) => {
        const vm = fieldRef.current;
        const size = 1 + getDescendantCount(depths, index);

        for (let removed = 0; removed < size; removed++) {
            vm.removeItem(index);
        }
    };

    /**
     * Nesting needs a field to store the level in. Whether the item has one can only be told from
     * an item that exists, so the missing-field notice is held back until there is one to look at
     * rather than claiming a problem the empty list cannot know about.
     */
    let hint = "Drag a row to reorder it, or sideways to nest it under the row above.";

    if (!depthField) {
        hint = sample
            ? "Nesting is off: items need a number field named depth to store the level."
            : "Drag a row to reorder it.";
    }

    return (
        <div className={"flex w-full flex-col gap-sm"}>
            <div className={"flex items-baseline justify-between gap-md"}>
                <Text as={"div"} size={"md"} className={"font-semibold text-neutral-primary"}>
                    {field.label}
                    {items.length > 0 ? ` (${items.length})` : null}
                </Text>
                <Text as={"div"} size={"sm"} className={"text-neutral-muted"}>
                    {hint}
                </Text>
            </div>

            {field.description ? (
                <Text as={"div"} size={"sm"} className={"text-neutral-muted"}>
                    {field.description}
                </Text>
            ) : null}

            {items.length === 0 ? (
                <div
                    className={
                        "rounded-md border border-dashed border-neutral-dimmed px-md py-lg text-center"
                    }
                >
                    <Text as={"div"} size={"sm"} className={"text-neutral-muted"}>
                        No menu items yet.
                    </Text>
                </div>
            ) : (
                <div ref={listRef} className={"flex flex-col gap-xs"}>
                    {rows.map((row, position) => {
                        const item = items[row.index];

                        return (
                            <MenuItemRow
                                key={item.key}
                                row={row}
                                item={item}
                                labelField={labelField}
                                subtitleField={subtitleField}
                                canNest={Boolean(depthField) && row.depth < maxDepth}
                                disabled={field.disabled}
                                lift={
                                    drag?.index === row.index && projection
                                        ? {
                                              x: (projection.depth - row.depth) * INDENT,
                                              y: drag.offsetY
                                          }
                                        : null
                                }
                                collapsed={collapsed.includes(item.key)}
                                editing={editing.includes(item.key)}
                                indicator={getIndicator(projection, rows, drag, position)}
                                ignoreClickAfterDrag={ignoreClickAfterDrag}
                                onDragStart={event => startDrag(event, row.index)}
                                onKeyboardMove={direction => {
                                    if (direction === "up" || direction === "down") {
                                        moveBranch(row.index, direction);
                                    } else {
                                        shiftDepth(row.index, direction);
                                    }
                                }}
                                onToggleCollapse={() =>
                                    setCollapsed(list => toggle(list, item.key))
                                }
                                onToggleEditing={() => setEditing(list => toggle(list, item.key))}
                                onAddSibling={() => addSibling(row.index)}
                                onAddChild={() => addChild(row.index)}
                                onDuplicate={() => duplicateBranch(row.index)}
                                onRemove={() => removeBranch(row.index)}
                            />
                        );
                    })}
                </div>
            )}

            <div className={"flex items-center gap-sm"}>
                <Input
                    value={draft}
                    onChange={(value: string) => setDraft(value)}
                    onEnter={addFromDraft}
                    placeholder={"Type a label and press Enter"}
                    disabled={field.disabled}
                    label={null}
                />
                <Button
                    icon={<AddIcon />}
                    text={settings.addItemLabel || "Add item"}
                    variant={"tertiary"}
                    disabled={field.disabled}
                    onClick={addFromDraft}
                />
            </div>
        </div>
    );
});

interface Indicator {
    edge: "top" | "bottom";
    depth: number;
}

/**
 * Where to draw the drop line for the row rendered at `position`, if anywhere. It marks the slot
 * the item would land in, indented to the depth it would land at, and it is shown for the whole
 * drag so there is never a moment where nothing answers "where is this going?".
 */
const getIndicator = (
    projection: Projection | null,
    rows: MenuRow[],
    drag: DragState | null,
    position: number
): Indicator | null => {
    if (!projection || !drag) {
        return null;
    }

    const from = rows.findIndex(row => row.index === drag.index);
    const to = Math.min(Math.max(drag.overPosition, 0), rows.length - 1);

    if (position !== to) {
        return null;
    }

    return { edge: to > from ? "bottom" : "top", depth: projection.depth };
};

interface MenuItemRowProps {
    row: MenuRow;
    item: IObjectFieldItemVM;
    labelField?: string;
    subtitleField?: string;
    canNest: boolean;
    disabled: boolean;
    /** Set while this row is being dragged: how far to move it so it follows the pointer. */
    lift: { x: number; y: number } | null;
    collapsed: boolean;
    editing: boolean;
    indicator: Indicator | null;
    /** True for the stray click a finished drag leaves behind. */
    ignoreClickAfterDrag: () => boolean;
    onDragStart: (event: React.PointerEvent) => void;
    onKeyboardMove: (direction: "up" | "down" | "in" | "out") => void;
    onToggleCollapse: () => void;
    onToggleEditing: () => void;
    onAddSibling: () => void;
    onAddChild: () => void;
    onDuplicate: () => void;
    onRemove: () => void;
}

const MenuItemRow = observer((props: MenuItemRowProps) => {
    const { row, item, indicator, lift } = props;

    const label = asText(childField(item, props.labelField));
    const subtitle = asText(childField(item, props.subtitleField));

    const onClick = (action: () => void) => () => {
        if (!props.ignoreClickAfterDrag()) {
            action();
        }
    };

    return (
        <div data-menu-row={""} className={cn("relative", lift && "z-20")}>
            {indicator ? (
                <div
                    className={"absolute left-0 right-0 z-10 h-[2px] rounded-full bg-primary"}
                    style={{ [indicator.edge]: "-3px", marginLeft: indicator.depth * INDENT }}
                />
            ) : null}

            <div style={{ paddingLeft: row.depth * INDENT }}>
                <div
                    className={cn(
                        "flex items-center gap-xs rounded-md border border-neutral-dimmed bg-neutral-base py-xs pl-xs pr-sm",
                        // Sideways movement snaps to whole nesting levels, so the row itself shows
                        // the level it will land on while the pointer is still between two.
                        lift && "border-primary shadow-lg"
                    )}
                    style={
                        lift ? { transform: `translate3d(${lift.x}px, ${lift.y}px, 0)` } : undefined
                    }
                >
                    {/* The arrow keys do everything dragging does, so the handle is not the only
                        way to rearrange a menu. */}
                    <span
                        role={"button"}
                        tabIndex={props.disabled ? -1 : 0}
                        aria-label={"Reorder menu item"}
                        className={cn(
                            "flex items-center p-xs",
                            props.disabled
                                ? "cursor-not-allowed"
                                : "cursor-grab active:cursor-grabbing"
                        )}
                        onPointerDown={props.onDragStart}
                        onKeyDown={event => {
                            const directions = {
                                ArrowUp: "up",
                                ArrowDown: "down",
                                ArrowRight: "in",
                                ArrowLeft: "out"
                            } as const;

                            const direction = directions[event.key as keyof typeof directions];
                            if (direction && !props.disabled) {
                                event.preventDefault();
                                props.onKeyboardMove(direction);
                            }
                        }}
                    >
                        <Icon
                            icon={<DragIcon />}
                            label={"Drag to reorder"}
                            size={"sm"}
                            color={"neutral-light"}
                        />
                    </span>

                    {/* Rendered even when there is nothing to collapse, so every row lines up. */}
                    <IconButton
                        icon={props.collapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
                        onClick={onClick(props.onToggleCollapse)}
                        variant={"ghost"}
                        size={"sm"}
                        className={cn(!row.hasChildren && "invisible")}
                        disabled={!row.hasChildren}
                    />

                    <button
                        type={"button"}
                        className={"flex min-w-0 flex-1 items-baseline gap-sm text-left"}
                        onClick={onClick(props.onToggleEditing)}
                    >
                        <Text size={"sm"} className={"truncate font-semibold text-neutral-primary"}>
                            {label || "Untitled item"}
                        </Text>
                        {subtitle ? (
                            <Text size={"sm"} className={"truncate text-neutral-muted"}>
                                {subtitle}
                            </Text>
                        ) : null}
                    </button>

                    {props.disabled ? null : (
                        <>
                            <IconButton
                                icon={<AddIcon />}
                                onClick={onClick(props.onAddSibling)}
                                variant={"ghost"}
                                size={"sm"}
                            />
                            <DropdownMenu
                                trigger={
                                    <IconButton icon={<MoreIcon />} variant={"ghost"} size={"sm"} />
                                }
                            >
                                <DropdownMenu.Item
                                    onClick={onClick(props.onAddChild)}
                                    disabled={!props.canNest}
                                    text={"Add nested item"}
                                    icon={
                                        <DropdownMenu.Item.Icon
                                            element={<NestedIcon />}
                                            label={"Add nested item"}
                                        />
                                    }
                                />
                                <DropdownMenu.Item
                                    onClick={onClick(props.onDuplicate)}
                                    text={"Duplicate"}
                                    icon={
                                        <DropdownMenu.Item.Icon
                                            element={<DuplicateIcon />}
                                            label={"Duplicate"}
                                        />
                                    }
                                />
                                <DropdownMenu.Item
                                    onClick={onClick(props.onRemove)}
                                    text={"Remove"}
                                    variant={"destructive"}
                                    icon={
                                        <DropdownMenu.Item.Icon
                                            element={<DeleteIcon />}
                                            label={"Remove"}
                                        />
                                    }
                                />
                            </DropdownMenu>
                        </>
                    )}
                </div>

                {props.editing ? (
                    <div
                        className={
                            "mb-xs mt-xs flex flex-col gap-md rounded-md border border-neutral-dimmed bg-neutral-light p-md"
                        }
                    >
                        {item.layout.map((node, index) => (
                            <LayoutNodeRenderer key={index} node={node} />
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
});
