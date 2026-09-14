/**
 * Pure helpers behind the menu builder renderer.
 *
 * A menu is stored as a flat list of items, each carrying a `depth` number (0 = top level). The
 * parent of an item is the closest item above it with a smaller depth, which makes the whole tree
 * derivable from the list order alone — no ids, no parent references, and the data stays a plain
 * object list in the GraphQL API.
 */

export interface MenuRow {
    /** Position of the item in the field's item list. */
    index: number;
    depth: number;
    hasChildren: boolean;
}

export interface Projection {
    /** Where the dragged block starts once it has been lifted out of the list. */
    insertAt: number;
    /** Depth the dragged item lands on. */
    depth: number;
}

const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
};

/** Number of items that follow `index` and sit deeper than it — the item's subtree. */
export const getDescendantCount = (depths: number[], index: number): number => {
    const depth = depths[index];
    let count = 0;
    for (let i = index + 1; i < depths.length && depths[i] > depth; i++) {
        count++;
    }
    return count;
};

/**
 * Rows to render, with the subtrees of collapsed items left out. Pass `hiddenSubtreeOf` while
 * dragging to also fold away the dragged item's own children, so every visible row has the same
 * height and drop positions can be derived from the pointer offset.
 */
export const getVisibleRows = (
    depths: number[],
    isCollapsed: (index: number) => boolean,
    hiddenSubtreeOf?: number
): MenuRow[] => {
    const rows: MenuRow[] = [];

    for (let i = 0; i < depths.length; i++) {
        const descendants = getDescendantCount(depths, i);
        rows.push({ index: i, depth: depths[i], hasChildren: descendants > 0 });

        if (descendants > 0 && (isCollapsed(i) || i === hiddenSubtreeOf)) {
            i += descendants;
        }
    }

    return rows;
};

/** Clamps every depth so the list always describes a valid tree. */
export const normalizeDepths = (depths: number[], maxDepth: number): number[] => {
    const result: number[] = [];

    for (let i = 0; i < depths.length; i++) {
        const ceiling = i === 0 ? 0 : Math.min(result[i - 1] + 1, maxDepth);
        result.push(clamp(Math.round(depths[i] || 0), 0, ceiling));
    }

    return result;
};

const arrayMove = <T>(items: T[], from: number, to: number): T[] => {
    const next = items.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
};

/**
 * Turns a drag gesture into a drop target. `overPosition` is the row slot the dragged item has been
 * pulled to, and how far the pointer travelled sideways decides the depth. The depth is bounded by
 * the item above (you can only ever be one level deeper than your new predecessor) and the item
 * below (you cannot become shallower than the item that would follow you, or it would end up
 * orphaned).
 */
export const project = (params: {
    depths: number[];
    rows: MenuRow[];
    activeIndex: number;
    overPosition: number;
    depthOffset: number;
    maxDepth: number;
}): Projection => {
    const { depths, rows, activeIndex, depthOffset, maxDepth } = params;

    const activePosition = rows.findIndex(row => row.index === activeIndex);
    const overPosition = clamp(params.overPosition, 0, rows.length - 1);
    const reordered = arrayMove(rows, activePosition, overPosition);

    const previous = reordered[overPosition - 1];
    const next = reordered[overPosition + 1];

    const ceiling = Math.min(previous ? previous.depth + 1 : 0, maxDepth);
    const floor = Math.min(next ? next.depth : 0, ceiling);
    const depth = clamp(depths[activeIndex] + depthOffset, floor, ceiling);

    if (!previous) {
        return { insertAt: 0, depth };
    }

    // Indexes shift once the dragged block is lifted out of the list.
    const blockSize = 1 + getDescendantCount(depths, activeIndex);
    const withoutBlock = depths.filter(
        (_, index) => index < activeIndex || index >= activeIndex + blockSize
    );
    const toRestIndex = (index: number) => (index < activeIndex ? index : index - blockSize);

    // Land after the predecessor, stepping over any of its hidden children that belong deeper
    // than where the dragged item is going.
    let insertAt = toRestIndex(previous.index) + 1;
    while (insertAt < withoutBlock.length && withoutBlock[insertAt] > depth) {
        insertAt++;
    }

    return { insertAt, depth };
};

/**
 * Expresses a block move as a series of single-item moves, since that is all the object field
 * exposes. `to` is where the block starts once it has been lifted out of the list.
 */
export const planMoves = (from: number, count: number, to: number): [number, number][] => {
    if (from === to) {
        return [];
    }

    const moves: [number, number][] = [];

    for (let offset = 0; offset < count; offset++) {
        if (to < from) {
            moves.push([from + offset, to + offset]);
        } else {
            moves.push([from, to + count - 1]);
        }
    }

    return moves;
};
