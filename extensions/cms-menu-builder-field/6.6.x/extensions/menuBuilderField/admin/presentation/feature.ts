import { createFeature } from "webiny/admin";
import { MenuBuilderPresenter as Abstraction } from "./abstractions.js";
import { MenuBuilderPresenter } from "./MenuBuilderPresenter.js";

export const MenuBuilderFeature = createFeature({
    name: "MenuBuilder",
    register(container) {
        container.register(MenuBuilderPresenter);
    },
    /**
     * A factory rather than an instance: every menu field on the form keeps its own collapsed
     * rows, open editors and drag, so each one resolves a presenter of its own.
     */
    resolve(container) {
        return {
            createPresenter: () => container.resolve(Abstraction)
        };
    }
});
