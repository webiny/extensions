import React from "react";
import { createReactiveComponent } from "webiny/admin";
import { LayoutNodeRenderer } from "webiny/admin/form";
import { DropdownMenu, Icon, IconButton, Text, cn } from "webiny/admin/ui";
import { ReactComponent as DragIcon } from "webiny/admin/icons/drag_indicator.svg";
import { ReactComponent as ChevronDownIcon } from "webiny/admin/icons/expand_more.svg";
import { ReactComponent as ChevronRightIcon } from "webiny/admin/icons/chevron_right.svg";
import { MenuItemActions } from "./MenuItemActions.js";
import type { IMenuBuilderPresenter, IMenuRowVM } from "./abstractions.js";

interface MenuItemRowProps {
    row: IMenuRowVM;
    presenter: IMenuBuilderPresenter;
    indent: number;
    disabled: boolean;
    onDragStart: (event: React.PointerEvent) => void;
}

const KEY_ACTIONS = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowRight: "in",
    ArrowLeft: "out"
} as const;

export const MenuItemRow = createReactiveComponent((props: MenuItemRowProps) => {
    const { row, presenter, indent, disabled } = props;

    const onClick = (action: () => void) => () => {
        if (!presenter.consumeClickAfterDrag()) {
            action();
        }
    };

    return (
        <div data-menu-row={""} className={cn("relative", row.lift && "z-20")}>
            {row.indicator ? (
                <div
                    className={"absolute left-0 right-0 z-10 h-[2px] rounded-full bg-primary"}
                    style={{
                        [row.indicator.edge]: "-3px",
                        marginLeft: row.indicator.depth * indent
                    }}
                />
            ) : null}

            <div style={{ paddingLeft: row.depth * indent }}>
                <div
                    className={cn(
                        "flex items-center gap-xs rounded-md border border-neutral-dimmed bg-neutral-base py-xs pl-xs pr-sm",
                        // Sideways movement snaps to whole nesting levels, so the row itself shows
                        // the level it will land on while the pointer is still between two.
                        row.lift && "border-primary shadow-lg"
                    )}
                    style={
                        row.lift
                            ? { transform: `translate3d(${row.lift.x}px, ${row.lift.y}px, 0)` }
                            : undefined
                    }
                >
                    {/* The arrow keys do everything dragging does, so the handle is not the only
                        way to rearrange a menu. */}
                    <span
                        role={"button"}
                        tabIndex={disabled ? -1 : 0}
                        aria-label={"Reorder menu item"}
                        className={cn(
                            "flex items-center p-xs",
                            disabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"
                        )}
                        onPointerDown={disabled ? undefined : props.onDragStart}
                        onKeyDown={event => {
                            const action = KEY_ACTIONS[event.key as keyof typeof KEY_ACTIONS];
                            if (!action || disabled) {
                                return;
                            }
                            event.preventDefault();
                            if (action === "up" || action === "down") {
                                presenter.move(row.index, action);
                            } else {
                                presenter.nest(row.index, action);
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
                        icon={row.collapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
                        onClick={onClick(() => presenter.toggleCollapsed(row.index))}
                        variant={"ghost"}
                        size={"sm"}
                        className={cn(!row.hasChildren && "invisible")}
                        disabled={!row.hasChildren}
                    />

                    <button
                        type={"button"}
                        className={"flex min-w-0 flex-1 items-baseline gap-sm text-left"}
                        onClick={onClick(() => presenter.toggleEditing(row.index))}
                    >
                        <Text size={"sm"} className={"truncate font-semibold text-neutral-primary"}>
                            {row.title || "Untitled item"}
                        </Text>
                        {row.subtitle ? (
                            <Text size={"sm"} className={"truncate text-neutral-muted"}>
                                {row.subtitle}
                            </Text>
                        ) : null}
                    </button>

                    <MenuItemActions row={row} presenter={presenter} disabled={disabled} />
                </div>

                {row.editing ? (
                    <div
                        className={
                            "mb-xs mt-xs flex flex-col gap-md rounded-md border border-neutral-dimmed bg-neutral-light p-md"
                        }
                    >
                        {row.layout.map((node, index) => (
                            <LayoutNodeRenderer key={index} node={node} />
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
});
