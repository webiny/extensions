import React from "react";
import { createReactiveComponent } from "webiny/admin";
import { DropdownMenu, IconButton } from "webiny/admin/ui";
import { ReactComponent as AddIcon } from "webiny/admin/icons/add.svg";
import { ReactComponent as MoreIcon } from "webiny/admin/icons/more_vert.svg";
import { ReactComponent as NestedIcon } from "webiny/admin/icons/subdirectory_arrow_right.svg";
import { ReactComponent as DuplicateIcon } from "webiny/admin/icons/content_copy.svg";
import { ReactComponent as DeleteIcon } from "webiny/admin/icons/delete_outline.svg";
import type { IMenuBuilderPresenter, IMenuRowVM } from "./abstractions.js";

interface MenuItemActionsProps {
    row: IMenuRowVM;
    presenter: IMenuBuilderPresenter;
    disabled: boolean;
}

export const MenuItemActions = createReactiveComponent((props: MenuItemActionsProps) => {
    const { row, presenter } = props;

    if (props.disabled) {
        return null;
    }

    const onClick = (action: () => void) => () => {
        if (!presenter.consumeClickAfterDrag()) {
            action();
        }
    };

    return (
        <>
            <IconButton
                icon={<AddIcon />}
                onClick={onClick(() => presenter.addSibling(row.index))}
                variant={"ghost"}
                size={"sm"}
            />
            <DropdownMenu
                trigger={<IconButton icon={<MoreIcon />} variant={"ghost"} size={"sm"} />}
            >
                <DropdownMenu.Item
                    onClick={onClick(() => presenter.addChild(row.index))}
                    disabled={!row.canNest}
                    text={"Add nested item"}
                    icon={
                        <DropdownMenu.Item.Icon
                            element={<NestedIcon />}
                            label={"Add nested item"}
                        />
                    }
                />
                <DropdownMenu.Item
                    onClick={onClick(() => presenter.duplicate(row.index))}
                    text={"Duplicate"}
                    icon={
                        <DropdownMenu.Item.Icon element={<DuplicateIcon />} label={"Duplicate"} />
                    }
                />
                <DropdownMenu.Item
                    onClick={onClick(() => presenter.remove(row.index))}
                    text={"Remove"}
                    variant={"destructive"}
                    icon={<DropdownMenu.Item.Icon element={<DeleteIcon />} label={"Remove"} />}
                />
            </DropdownMenu>
        </>
    );
});
