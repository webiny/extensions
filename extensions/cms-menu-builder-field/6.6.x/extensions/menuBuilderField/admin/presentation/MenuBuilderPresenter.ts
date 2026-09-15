import { makeAutoObservable } from "mobx";
import type { IFieldVM, IObjectFieldItemVM } from "webiny/admin/form";
import {
    getDescendantCount,
    getVisibleRows,
    normalizeDepths,
    planMoves,
    project,
    type MenuRow,
    type Projection
} from "./menuTree.js";
import {
    MenuBuilderPresenter as Abstraction,
    type IMenuBuilderVM,
    type IMenuRowVM,
    type MenuField
} from "./abstractions.js";

/** Width of one nesting level, in pixels. Also the sideways distance one level of drag covers. */
const INDENT = 28;

/**
 * Field IDs the presenter recognises on its own, so a field whose children follow the usual shape
 * works before anyone opens the appearance settings. Settings always win over these.
 */
const TITLE_NAMES = ["label", "title", "name", "text"];
const SUBTITLE_NAMES = ["url", "link", "href", "subtitle"];
const DEPTH_NAMES = ["depth", "level", "nesting", "indent"];

interface DragState {
    /** Item being dragged. */
    index: number;
    startX: number;
    startY: number;
    /** Row slot the item has been pulled to. */
    overPosition: number;
    depthOffset: number;
    /** How far the row has been lifted from where it sits. */
    offsetY: number;
    /** Vertical midpoints of the rows, measured when the drag started. */
    centers: number[];
    /** The dragged row's position among the visible rows when the drag started. */
    activePosition: number;
    moved: boolean;
}

interface PendingInsert {
    /** Index of the item that was just added. */
    index: number;
    /** Title to write once the item exists. */
    label?: string;
    /** Whether to open the item's form. */
    edit: boolean;
    /** Item count that proves the field view model has caught up. See `flush`. */
    count: number;
}

/** Private members of the presenter that must not be turned into observables or computeds. */
type DerivedKeys =
    | "field"
    | "swallowClick"
    | "settings"
    | "items"
    | "sample"
    | "labelField"
    | "subtitleField"
    | "depthField"
    | "maxDepth"
    | "depths"
    | "rows"
    | "projection"
    | "hint";

const asText = (field: IFieldVM | undefined): string => {
    const value = field?.value;
    if (value === null || value === undefined || typeof value === "object") {
        return "";
    }
    return String(value);
};

class MenuBuilderPresenterImpl implements Abstraction.Interface {
    /**
     * Kept off the observable state on purpose. The form rebuilds this view model on every render
     * and hands the new one to `init`, so it is always current; making it observable would mean
     * writing to observable state during render.
     */
    private field!: MenuField;

    private collapsed: string[] = [];
    private editing: string[] = [];
    private draft = "";
    private drag: DragState | null = null;
    private pending: PendingInsert | null = null;
    private swallowClick = false;

    constructor() {
        /**
         * Only the state the user changes is observable. The derived getters are left as plain
         * getters rather than becoming computed: a computed caches until one of its observable
         * dependencies changes, and these also read the field view model, which is deliberately
         * not observable. Cached, they would go stale the moment the form handed over a new one.
         */
        makeAutoObservable<MenuBuilderPresenterImpl, DerivedKeys>(this, {
            field: false,
            swallowClick: false,
            vm: false,
            settings: false,
            items: false,
            sample: false,
            labelField: false,
            subtitleField: false,
            depthField: false,
            maxDepth: false,
            depths: false,
            rows: false,
            projection: false,
            hint: false
        });
    }

    init(field: MenuField): void {
        this.field = field;
    }

    /**
     * An item added during an event handler only exists on the next render, so work that needs the
     * item itself is queued and applied here. Naming it is one such job: when no title field is
     * configured the fallback is the item's first text field, which an empty list cannot reveal.
     */
    flush(): void {
        if (!this.pending) {
            return;
        }

        const { index, label, edit, count } = this.pending;

        /**
         * Adding an item also re-renders this presenter's own view, and that render runs before
         * the form has rebuilt the field view model. Waiting for the item count to catch up,
         * rather than counting attempts, keeps the work queued until the render that can do it,
         * however many renders that takes.
         */
        if (this.field.items.length < count) {
            return;
        }

        const item = this.field.items[index];
        this.pending = null;

        if (!item) {
            return;
        }

        if (label) {
            const title = this.childOf(item, this.labelField) ?? this.firstTextChild(item);
            title?.onChange(label);
        }

        if (edit) {
            this.editing = [...this.editing, item.key];
        }
    }

    get vm(): IMenuBuilderVM {
        const rows = this.rows;
        const projection = this.projection;

        return {
            label: this.field.label ?? "",
            description: this.field.description ?? "",
            count: this.items.length,
            hint: this.hint,
            disabled: this.field.disabled,
            addItemLabel: this.settings.addItemLabel || "Add item",
            draft: this.draft,
            indent: INDENT,
            dragging: this.drag !== null,
            rows: rows.map((row, position) => this.rowVm(row, position, rows, projection))
        };
    }

    setDraft(value: string): void {
        this.draft = value;
    }

    addFromDraft(): void {
        const label = this.draft.trim();
        if (!label) {
            return;
        }

        const depths = this.depths;
        const index = this.insert(this.items.length, depths[depths.length - 1] ?? 0);

        this.pending = { index, label, edit: false, count: this.items.length + 1 };
        this.draft = "";
    }

    toggleCollapsed(index: number): void {
        this.collapsed = toggle(this.collapsed, this.keyAt(index));
    }

    toggleEditing(index: number): void {
        this.editing = toggle(this.editing, this.keyAt(index));
    }

    addSibling(index: number): void {
        const depths = this.depths;
        const at = index + 1 + getDescendantCount(depths, index);

        this.pending = {
            index: this.insert(at, depths[index]),
            edit: true,
            count: this.items.length + 1
        };
    }

    addChild(index: number): void {
        const depths = this.depths;
        const key = this.keyAt(index);

        this.collapsed = this.collapsed.filter(item => item !== key);
        this.pending = {
            index: this.insert(index + 1, Math.min(depths[index] + 1, this.maxDepth)),
            edit: true,
            count: this.items.length + 1
        };
    }

    /** Duplicates an item together with everything nested under it. */
    duplicate(index: number): void {
        const size = 1 + getDescendantCount(this.depths, index);
        const appendedAt = this.items.length;

        for (const item of this.items.slice(index, index + size)) {
            this.field.addItem(item.getClonedData());
        }

        for (const [from, to] of planMoves(appendedAt, size, index + size)) {
            this.field.moveItem(from, to);
        }
    }

    /** Removes an item together with everything nested under it. */
    remove(index: number): void {
        const size = 1 + getDescendantCount(this.depths, index);

        for (let removed = 0; removed < size; removed++) {
            this.field.removeItem(index);
        }
    }

    /** Moves a branch past the sibling above or below it. */
    move(index: number, direction: "up" | "down"): void {
        const depths = this.depths;
        const size = 1 + getDescendantCount(depths, index);

        if (direction === "up") {
            let previous = index - 1;
            while (previous >= 0 && depths[previous] > depths[index]) {
                previous--;
            }
            if (previous < 0 || depths[previous] !== depths[index]) {
                return;
            }
            this.applyMoves(planMoves(index, size, previous));
            return;
        }

        const next = index + size;
        if (next >= depths.length || depths[next] !== depths[index]) {
            return;
        }

        this.applyMoves(planMoves(index, size, index + 1 + getDescendantCount(depths, next)));
    }

    /** Nests a branch one level deeper, or pulls it one level out. */
    nest(index: number, direction: "in" | "out"): void {
        if (!this.depthField) {
            return;
        }

        const depths = this.depths;
        const target = depths[index] + (direction === "in" ? 1 : -1);
        const ceiling = index === 0 ? 0 : Math.min(depths[index - 1] + 1, this.maxDepth);

        if (target < 0 || target > ceiling) {
            return;
        }

        const size = 1 + getDescendantCount(depths, index);
        const shift = target - depths[index];

        this.items.slice(index, index + size).forEach((item, offset) => {
            this.childOf(item, this.depthField)?.onChange(depths[index + offset] + shift);
        });
    }

    startDrag(index: number, pointer: { x: number; y: number }, centers: number[]): void {
        if (this.field.disabled || this.items.length < 2) {
            return;
        }

        // A row with its form open is a tall block to throw around, so it travels closed.
        this.editing = this.editing.filter(key => key !== this.keyAt(index));

        const activePosition = this.rows.findIndex(row => row.index === index);

        this.drag = {
            index,
            startX: pointer.x,
            startY: pointer.y,
            overPosition: activePosition,
            depthOffset: 0,
            offsetY: 0,
            centers,
            activePosition,
            moved: false
        };
    }

    dragTo(pointer: { x: number; y: number }): void {
        const drag = this.drag;
        if (!drag) {
            return;
        }

        const { centers, activePosition } = drag;
        const startCenter = centers[activePosition] ?? 0;
        const center = startCenter + (pointer.y - drag.startY);

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

        this.drag = {
            ...drag,
            moved: true,
            overPosition: over,
            depthOffset: Math.round((pointer.x - drag.startX) / INDENT),
            offsetY: pointer.y - drag.startY
        };
    }

    drop(): void {
        const drag = this.drag;
        const target = this.projection;

        this.drag = null;

        if (!drag || !target) {
            return;
        }

        // Letting go over another row fires a click on whatever button is under the pointer, so
        // the next one is spent on nothing.
        this.swallowClick = drag.moved;

        const itemVms = this.items;
        const depths = itemVms.map(item => this.depthOf(item));

        const from = drag.index;
        const size = 1 + getDescendantCount(depths, from);
        const shift = target.depth - depths[from];

        const block = itemVms.slice(from, from + size);
        const blockDepths = depths.slice(from, from + size).map(depth => depth + shift);
        const restItems = [...itemVms.slice(0, from), ...itemVms.slice(from + size)];
        const restDepths = [...depths.slice(0, from), ...depths.slice(from + size)];

        this.applyMoves(planMoves(from, size, target.insertAt));

        if (!this.depthField) {
            return;
        }

        const at = target.insertAt;
        const ordered = [...restItems.slice(0, at), ...block, ...restItems.slice(at)];
        const orderedDepths = normalizeDepths(
            [...restDepths.slice(0, at), ...blockDepths, ...restDepths.slice(at)],
            this.maxDepth
        );

        ordered.forEach((item, index) => {
            const depth = this.childOf(item, this.depthField);
            if (depth && Number(depth.value ?? 0) !== orderedDepths[index]) {
                depth.onChange(orderedDepths[index]);
            }
        });
    }

    cancelDrag(): void {
        this.drag = null;
    }

    consumeClickAfterDrag(): boolean {
        const ignore = this.swallowClick;
        this.swallowClick = false;
        return ignore;
    }

    private get settings(): MenuField["rendererSettings"] {
        return this.field.rendererSettings ?? {};
    }

    private get items(): IObjectFieldItemVM[] {
        return this.field.items;
    }

    /** The first item's children, the only place the item's shape can be read from. */
    private get sample(): IFieldVM[] | undefined {
        return this.items[0]?.fields;
    }

    private get labelField(): string | undefined {
        return this.settings.labelField || pickChild(this.sample, "text", TITLE_NAMES, true);
    }

    private get subtitleField(): string | undefined {
        return this.settings.subtitleField || pickChild(this.sample, "text", SUBTITLE_NAMES);
    }

    private get depthField(): string | undefined {
        return this.settings.depthField || pickChild(this.sample, "number", DEPTH_NAMES);
    }

    private get maxDepth(): number {
        return this.depthField ? Math.max(0, this.settings.maxDepth ?? 2) : 0;
    }

    private get depths(): number[] {
        return this.items.map(item => this.depthOf(item));
    }

    private get rows(): MenuRow[] {
        return getVisibleRows(
            this.depths,
            index => this.collapsed.includes(this.keyAt(index)),
            this.drag?.index
        );
    }

    private get projection(): Projection | null {
        if (!this.drag) {
            return null;
        }

        return project({
            depths: this.depths,
            rows: this.rows,
            activeIndex: this.drag.index,
            overPosition: this.drag.overPosition,
            depthOffset: this.drag.depthOffset,
            maxDepth: this.maxDepth
        });
    }

    /**
     * Nesting needs a field to store the level in. Whether the item has one can only be told from
     * an item that exists, so the missing-field notice is held back until there is one to look at
     * rather than claiming a problem the empty list cannot know about.
     */
    private get hint(): string {
        if (this.depthField) {
            return "Drag a row to reorder it, or sideways to nest it under the row above.";
        }

        return this.sample
            ? "Nesting is off: items need a number field named depth to store the level."
            : "Drag a row to reorder it.";
    }

    private rowVm(
        row: MenuRow,
        position: number,
        rows: MenuRow[],
        projection: Projection | null
    ): IMenuRowVM {
        const item = this.items[row.index];

        return {
            key: item.key,
            index: row.index,
            title: asText(this.childOf(item, this.labelField)),
            subtitle: asText(this.childOf(item, this.subtitleField)),
            depth: row.depth,
            hasChildren: row.hasChildren,
            collapsed: this.collapsed.includes(item.key),
            editing: this.editing.includes(item.key),
            canNest: Boolean(this.depthField) && row.depth < this.maxDepth,
            layout: item.layout,
            indicator: this.indicatorFor(position, rows, projection),
            lift:
                this.drag?.index === row.index && projection
                    ? { x: (projection.depth - row.depth) * INDENT, y: this.drag.offsetY }
                    : null
        };
    }

    /**
     * The drop line marks the slot the item would land in, indented to the depth it would land at.
     * It is shown for the whole drag so there is never a moment where nothing answers "where is
     * this going?".
     */
    private indicatorFor(position: number, rows: MenuRow[], projection: Projection | null) {
        if (!projection || !this.drag) {
            return null;
        }

        const from = rows.findIndex(row => row.index === this.drag!.index);
        const to = Math.min(Math.max(this.drag.overPosition, 0), rows.length - 1);

        if (position !== to) {
            return null;
        }

        return {
            edge: to > from ? ("bottom" as const) : ("top" as const),
            depth: projection.depth
        };
    }

    /** Adds an item at `at`, with `depth`, and returns the index it ended up on. */
    private insert(at: number, depth: number): number {
        const appendedAt = this.items.length;
        const payload: Record<string, unknown> = {};

        if (this.depthField) {
            payload[this.depthField] = depth;
        }

        this.field.addItem(payload);

        if (at < appendedAt) {
            this.field.moveItem(appendedAt, at);
            return at;
        }

        return appendedAt;
    }

    private applyMoves(moves: [number, number][]): void {
        for (const [from, to] of moves) {
            this.field.moveItem(from, to);
        }
    }

    private depthOf(item: IObjectFieldItemVM): number {
        return Number(this.childOf(item, this.depthField)?.value ?? 0);
    }

    private childOf(item: IObjectFieldItemVM, name?: string): IFieldVM | undefined {
        if (!name) {
            return undefined;
        }
        return item.fields.find(field => field.name === name);
    }

    private firstTextChild(item: IObjectFieldItemVM): IFieldVM | undefined {
        return item.fields.find(field => field.type === "text");
    }

    private keyAt(index: number): string {
        return this.items[index]?.key ?? "";
    }
}

const toggle = (list: string[], key: string) => {
    return list.includes(key) ? list.filter(item => item !== key) : [...list, key];
};

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

export const MenuBuilderPresenter = Abstraction.createImplementation({
    implementation: MenuBuilderPresenterImpl,
    dependencies: []
});
