import React, { useState, useEffect, useRef } from "react";
import { Button, Icon, Separator, useDisclosure } from "webiny/admin/ui";
import { ReactComponent as DeleteIcon } from "webiny/admin/icons/close.svg";
import { ReactComponent as AddIcon } from "webiny/admin/icons/add.svg";
import { ReactComponent as CheckIcon } from "webiny/admin/icons/check.svg";
import { ReactComponent as ForkIcon } from "webiny/admin/icons/fork_right.svg";
import {
    useCreateElement,
    useDeleteElement,
    useDocumentEditor,
    $deselectElement,
    Commands
} from "webiny/admin/website-builder/page/editor";
import { useContainer } from "../useContainer.js";
import { ConditionRulesDialog } from "../components/ConditionRulesDialog";
import type { FunnelModelDto } from "../../models/FunnelModel";

const iconPosition = {
    top: -8,
    right: -8
};

export const Stepper = () => {
    const container = useContainer();
    const editor = useDocumentEditor();
    const { createElement } = useCreateElement();
    const { deleteElement } = useDeleteElement();
    const [activeStepId, setActiveStepId] = useState<string | null>(null);

    const {
        open: showConditionRulesDialog,
        close: hideConditionRulesDialog,
        isOpen: isConditionRulesDialogOpen,
        data: conditionRulesData
    } = useDisclosure<FunnelModelDto>();

    const steps = container?.inputs.containerData?.steps ?? [];
    const prevStepsRef = useRef(steps);

    /* Sync active step when steps are added, removed, or on initial mount. */
    useEffect(() => {
        const prevSteps = prevStepsRef.current;
        prevStepsRef.current = steps;

        if (steps.length > prevSteps.length) {
            if (!activeStepId) {
                // No active step yet (initial mount) — activate the first step.
                const firstStep = steps[0];
                setActiveStepId(firstStep.id);
                editor.executeCommand(Commands.SendPreviewMessage, {
                    type: "fub.activeStepChanged",
                    payload: { stepId: firstStep.id }
                });
            } else {
                // A step was added — activate the newly inserted step (second-to-last, just before success).
                const newStep = steps[steps.length - 2];
                if (newStep) {
                    setActiveStepId(newStep.id);
                    editor.executeCommand(Commands.SendPreviewMessage, {
                        type: "fub.activeStepChanged",
                        payload: { stepId: newStep.id }
                    });
                }
            }
        } else if (steps.length < prevSteps.length) {
            // A step was deleted — if it was the active one, fall back to the previous step.
            const activeStepExists = steps.some(s => s.id === activeStepId);
            if (!activeStepExists) {
                const prevActiveIndex = prevSteps.findIndex(s => s.id === activeStepId);
                const fallbackStep = steps[Math.max(0, prevActiveIndex - 1)] ?? steps[0];
                if (fallbackStep) {
                    setActiveStepId(fallbackStep.id);
                    editor.executeCommand(Commands.SendPreviewMessage, {
                        type: "fub.activeStepChanged",
                        payload: { stepId: fallbackStep.id }
                    });
                }
            }
        }
    }, [steps]);

    // Container might not be ready immediately.
    if (!container?.inputs.containerData) {
        return null;
    }

    // Slot steps carry the editor element IDs needed for deletion.
    const slotSteps = container.inputs.steps ?? [];

    const activateStep = (stepId: string) => {
        setActiveStepId(stepId);
        $deselectElement(editor);
        editor.executeCommand(Commands.SendPreviewMessage, {
            type: "fub.activeStepChanged",
            payload: { stepId }
        });
    };

    const deleteStep = (stepElementId: string) => {
        deleteElement(stepElementId);
    };

    const handleConditionalRulesClick = () => {
        showConditionRulesDialog(container.inputs.containerData);
    };

    const handleConditionalRulesSubmit = (data: FunnelModelDto) => {
        container.updateInputs(current => {
            current.containerData = data;
        });
        hideConditionRulesDialog();
    };

    const addStep = () => {
        createElement({
            componentName: "Fub/Step",
            parentId: container.id,
            slot: "steps",
            index: steps.length - 1
        });
    };

    return (
        <>
            <div
                className={"flex flex-row p-sm bg-neutral-light justify-between"}
                data-affects-preview={"height"}
            >
                <div className={"flex items-center gap-sm"}>
                    <span className={"uppercase font-semibold text-neutral-muted! text-sm "}>
                        Pages
                    </span>
                    {steps.map((step, index) => {
                        const isFirstStep = index === 0;
                        const isLastStep = index === steps.length - 1;
                        const isSuccessStep = isLastStep;
                        const canDelete = !isFirstStep && !isSuccessStep;
                        const activeVariant = activeStepId === step.id ? "primary" : "secondary";
                        const elementId = slotSteps[index]?.elementId;

                        return (
                            <div className={"flex items-center relative gap-sm"} key={step.id}>
                                <Button
                                    icon={isSuccessStep && <CheckIcon />}
                                    variant={activeVariant}
                                    text={step.title}
                                    onClick={() => activateStep(step.id)}
                                />
                                {canDelete && elementId ? (
                                    <Icon
                                        icon={<DeleteIcon />}
                                        label={"Delete step"}
                                        style={iconPosition}
                                        onClick={() => deleteStep(elementId)}
                                        className={
                                            "absolute z-10 rounded-full bg-neutral-dimmed border-solid border-sm border-neutral-muted cursor-pointer fill-neutral-strong h-md w-md"
                                        }
                                    />
                                ) : null}

                                {isSuccessStep && (
                                    <div className={"flex items-center gap-sm"}>
                                        <Separator
                                            variant={"strong"}
                                            orientation={"vertical"}
                                            className={"h-lg"}
                                        />
                                        <Button
                                            icon={<AddIcon />}
                                            text={"Add page"}
                                            variant={"tertiary"}
                                            onClick={addStep}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className={"flex gap-md"}>
                    <Button
                        variant={"primary"}
                        icon={<ForkIcon />}
                        text={"Conditional rules"}
                        onClick={handleConditionalRulesClick}
                    />
                </div>
            </div>
            <ConditionRulesDialog
                open={isConditionRulesDialogOpen}
                data={conditionRulesData!}
                onClose={hideConditionRulesDialog}
                onSubmit={handleConditionalRulesSubmit}
            />
        </>
    );
};
