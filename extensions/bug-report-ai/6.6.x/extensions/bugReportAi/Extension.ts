import { createFeature } from "webiny/api";
import { BugReportDraftCapability } from "./capability.js";
import { BugReportDrafterDecorator } from "./BugReportDrafterDecorator.js";

/**
 * AI drafting for the bug reporter.
 *
 * An extension rather than part of the bug reporter itself: the built-in reporter files the
 * reporter's own words and knows nothing about AI, so it carries no `ai`, `zod` or AI Power-Ups
 * dependency. This decorates it, and deleting the extension puts the reporter back as it was.
 *
 * Registering the capability also puts a row in the AI Power-Ups settings screen, so the model and
 * any extra instructions are configurable per project like any built-in AI feature.
 */
export default createFeature({
    name: "BugReporter/Ai",
    register(container) {
        container.register(BugReportDraftCapability);
        container.registerDecorator(BugReportDrafterDecorator);
    }
});
