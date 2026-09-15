import React, { useRef } from "react";
import { createReactiveComponent } from "webiny/admin";
import { Text } from "webiny/admin/ui";
import { MenuItemRow } from "./MenuItemRow.js";
import { MenuQuickAdd } from "./MenuQuickAdd.js";
import { useMenuDrag } from "./useMenuDrag.js";
import type { IMenuBuilderPresenter, IMenuBuilderVM } from "./abstractions.js";

interface MenuBuilderProps {
    vm: IMenuBuilderVM;
    presenter: IMenuBuilderPresenter;
}

export const MenuBuilder = createReactiveComponent(({ vm, presenter }: MenuBuilderProps) => {
    const list = useRef<HTMLDivElement>(null);
    const { startDrag } = useMenuDrag(presenter, list, vm.dragging);

    return (
        <div className={"flex w-full flex-col gap-sm"}>
            <div className={"flex items-baseline justify-between gap-md"}>
                <Text as={"div"} size={"md"} className={"font-semibold text-neutral-primary"}>
                    {vm.label}
                    {vm.count > 0 ? ` (${vm.count})` : null}
                </Text>
                <Text as={"div"} size={"sm"} className={"text-neutral-muted"}>
                    {vm.hint}
                </Text>
            </div>

            {vm.description ? (
                <Text as={"div"} size={"sm"} className={"text-neutral-muted"}>
                    {vm.description}
                </Text>
            ) : null}

            {vm.rows.length === 0 ? (
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
                <div ref={list} className={"flex flex-col gap-xs"}>
                    {vm.rows.map(row => (
                        <MenuItemRow
                            key={row.key}
                            row={row}
                            presenter={presenter}
                            indent={vm.indent}
                            disabled={vm.disabled}
                            onDragStart={event => startDrag(event, row.index)}
                        />
                    ))}
                </div>
            )}

            <MenuQuickAdd vm={vm} presenter={presenter} />
        </div>
    );
});
