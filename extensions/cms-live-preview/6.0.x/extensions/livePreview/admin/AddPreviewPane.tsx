import React from "react";
import { PreviewPane } from "./PreviewPane";
import { getPreviewUrl, getDisplayUrl } from "./getPreviewUrl";
import { ContentEntryForm } from "webiny/admin/cms/entry/editor";
import { useModel } from "webiny/admin/cms";

const LIVE_PREVIEW_MODEL_IDS = ["article"];

export const AddPreviewPane = ContentEntryForm.createDecorator(Original => {
  return function ContentEntryForm(props) {
    const { model } = useModel();

    if (!LIVE_PREVIEW_MODEL_IDS.includes(model.modelId)) {
      return <Original {...props} />;
    }

    const previewUrl = getPreviewUrl(model.modelId, window.location.origin);

    if (!previewUrl) {
      return <Original {...props} />;
    }

    return (
      <div
        data-role={"live-preview-pane"}
        className="grid grid-cols-12 h-[calc(100vh-var(--spacing-header)-120px)]"
      >
        <div className="col-span-6 xl:col-span-8 h-full">
          <PreviewPane previewUrl={previewUrl} modelId={model.modelId} />
        </div>
        <div className="flex-1 ml-lg col-span-6 xl:col-span-4 h-full overflow-y-scroll">
          <Original {...props} />
        </div>
      </div>
    );
  };
});
