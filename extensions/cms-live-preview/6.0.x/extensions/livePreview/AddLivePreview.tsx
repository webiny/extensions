import React from "react";
import { AddPreviewPane } from "./AddPreviewPane";
import { LivePreviewEditor } from "./LivePreviewEditor";
import { ContentEntryEditorConfig } from "webiny/admin/cms/entry/editor";

export const AddLivePreview = () => {
  return (
    <>
      <AddPreviewPane />
      <LivePreviewEditor />
      <ContentEntryEditorConfig>
        <ContentEntryEditorConfig.Width value={"90%"} modelIds={["article"]} />
      </ContentEntryEditorConfig>
    </>
  );
};
