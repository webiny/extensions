import { useEffect } from "react";
import type React from "react";
import type { IMenuBuilderPresenter } from "./abstractions.js";

interface UseMenuDrag {
    startDrag: (event: React.PointerEvent, index: number) => void;
}

/**
 * The DOM half of dragging: it measures the rows, follows the pointer, and hands plain numbers to
 * the presenter, which owns the drag itself.
 */
export const useMenuDrag = (
    presenter: IMenuBuilderPresenter,
    list: React.RefObject<HTMLDivElement | null>,
    dragging: boolean
): UseMenuDrag => {
    const startDrag = (event: React.PointerEvent, index: number) => {
        event.preventDefault();

        /**
         * Rows are measured on the way in rather than while dragging, and by their real
         * rectangles rather than by assuming every row is the same height, so the drop slot stays
         * correct when an item has its form open below it.
         */
        const centers = Array.from(list.current?.querySelectorAll("[data-menu-row]") ?? []).map(
            element => {
                const rect = element.getBoundingClientRect();
                return rect.top + rect.height / 2;
            }
        );

        presenter.startDrag(index, { x: event.clientX, y: event.clientY }, centers);
    };

    useEffect(() => {
        if (!dragging) {
            return;
        }

        const onMove = (event: PointerEvent) => {
            presenter.dragTo({ x: event.clientX, y: event.clientY });
        };

        const onUp = () => presenter.drop();
        const onCancel = () => presenter.cancelDrag();

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                presenter.cancelDrag();
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
    }, [dragging, presenter]);

    return { startDrag };
};
