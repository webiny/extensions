import React from "react";
import { AddPreviewPane } from "./admin/AddPreviewPane";
import { LivePreviewEditor } from "./admin/LivePreviewEditor";
import { ContentEntryEditorConfig } from "webiny/admin/cms/entry/editor";

export default function LivePreview() {
    return (
        <>
            <AddPreviewPane />
            <LivePreviewEditor />
            <ContentEntryEditorConfig>
                <ContentEntryEditorConfig.Width value={"90%"} modelIds={["article"]} />
            </ContentEntryEditorConfig>
        </>
    );
}
