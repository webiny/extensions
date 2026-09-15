import { createAbstraction } from "webiny/admin";
import type { IObjectFieldVM, LayoutNodeVM } from "webiny/admin/form";

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

export type MenuField = IObjectFieldVM & { rendererSettings: MenuBuilderSettings };

/** Where the drop line sits on a row, and at which nesting level. */
export interface IDropIndicator {
    edge: "top" | "bottom";
    depth: number;
}

/** How far to move a row so it follows the pointer while it is being dragged. */
export interface IRowLift {
    x: number;
    y: number;
}

export interface IMenuRowVM {
    key: string;
    /** Position of the item in the field's item list. */
    index: number;
    title: string;
    subtitle: string;
    depth: number;
    hasChildren: boolean;
    collapsed: boolean;
    editing: boolean;
    /** False when the item is already as deep as the field allows. */
    canNest: boolean;
    /** The item's own form, rendered inline when the row is open. */
    layout: LayoutNodeVM[];
    indicator: IDropIndicator | null;
    lift: IRowLift | null;
}

export interface IMenuBuilderVM {
    label: string;
    description: string;
    count: number;
    hint: string;
    disabled: boolean;
    addItemLabel: string;
    draft: string;
    rows: IMenuRowVM[];
    /** Width of one nesting level, in pixels. The view indents rows by it. */
    indent: number;
    /** True while a row is being dragged, so the view knows to listen for the pointer. */
    dragging: boolean;
}

export interface IMenuBuilderPresenter {
    vm: IMenuBuilderVM;
    /** Hands the presenter the field view model for this render. */
    init(field: MenuField): void;
    /** Applies work that needed the item added by the previous render to exist. */
    flush(): void;

    setDraft(value: string): void;
    addFromDraft(): void;
    toggleCollapsed(index: number): void;
    toggleEditing(index: number): void;
    addSibling(index: number): void;
    addChild(index: number): void;
    duplicate(index: number): void;
    remove(index: number): void;
    move(index: number, direction: "up" | "down"): void;
    nest(index: number, direction: "in" | "out"): void;

    /** `centers` are the vertical midpoints of the rendered rows, in viewport pixels. */
    startDrag(index: number, pointer: { x: number; y: number }, centers: number[]): void;
    dragTo(pointer: { x: number; y: number }): void;
    drop(): void;
    cancelDrag(): void;
    /** True for the stray click a finished drag leaves behind, once. */
    consumeClickAfterDrag(): boolean;
}

export const MenuBuilderPresenter =
    createAbstraction<IMenuBuilderPresenter>("MenuBuilderPresenter");

export namespace MenuBuilderPresenter {
    export type Interface = IMenuBuilderPresenter;
    export type ViewModel = IMenuBuilderVM;
    export type RowViewModel = IMenuRowVM;
}
