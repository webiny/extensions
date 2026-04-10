import React from "react";
import { ElementInputs } from "webiny/admin/website-builder/page/editor";
import { StepsList } from "../stepper/StepsList.js";

export const ContainerElementInputsDecorator = ElementInputs.createDecorator(Original => {
    return function ContainerElementSettings(props) {
        const { element } = props;

        if (element.component.name !== "Fub/Container") {
            return <Original {...props} />;
        }

        return (
            <div className={"flex flex-col gap-xl"}>
                <div className={"flex flex-col gap-sm"}>
                    <div className={"font-bold text-sm text-neutral-primary"}>Steps</div>
                    <StepsList />
                </div>
            </div>
        );
    };
});
