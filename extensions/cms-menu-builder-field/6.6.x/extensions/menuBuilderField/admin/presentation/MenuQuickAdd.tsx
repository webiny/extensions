import React from "react";
import { createReactiveComponent } from "webiny/admin";
import { Button, Input } from "webiny/admin/ui";
import { ReactComponent as AddIcon } from "webiny/admin/icons/add.svg";
import type { IMenuBuilderPresenter, IMenuBuilderVM } from "./abstractions.js";

interface MenuQuickAddProps {
    vm: IMenuBuilderVM;
    presenter: IMenuBuilderPresenter;
}

/** Type a label, press Enter, item appended. Beats opening a form for every link. */
export const MenuQuickAdd = createReactiveComponent(({ vm, presenter }: MenuQuickAddProps) => {
    return (
        <div className={"flex items-center gap-sm"}>
            <Input
                value={vm.draft}
                onChange={(value: string) => presenter.setDraft(value)}
                onEnter={() => presenter.addFromDraft()}
                placeholder={"Type a label and press Enter"}
                disabled={vm.disabled}
                label={null}
            />
            <Button
                icon={<AddIcon />}
                text={vm.addItemLabel}
                variant={"tertiary"}
                disabled={vm.disabled}
                onClick={() => presenter.addFromDraft()}
            />
        </div>
    );
});
