import { useEffect } from "react";
import { useContentEntryForm } from "webiny/admin/cms/entry/editor";
import { useLivePreview } from "./useLivePreview";

const getWindowObject = () => {
  const iframe = document.getElementById("live-preview-iframe") as HTMLIFrameElement | null;

  if (!iframe || !iframe.contentWindow) {
    return null;
  }

  return iframe.contentWindow;
};

/**
 * Decorate `useContentEntryForm` hook, and notify the Live Preview when changes happen.
 * Also dispatches a custom event with the current slug so the PreviewPane can show it.
 */
export const LivePreviewEditor = useContentEntryForm.createDecorator(baseHook => {
  return () => {
    const { updateLivePreview, onPreviewReady } = useLivePreview(getWindowObject);

    const hook = baseHook();

    useEffect(() => {
      onPreviewReady(() => updateLivePreview(hook.entry));
    }, [hook.entry]);

    useEffect(() => {
      updateLivePreview(hook.entry);

      // Notify the PreviewPane of the current slug and entry ID.
      const entry = hook.entry as Record<string, any>;
      window.dispatchEvent(
        new CustomEvent("wby:slugChange", {
          detail: {
            slug: entry?.values?.slug || "",
            entryId: entry?.id || "",
          },
        })
      );
    }, [hook.entry]);

    return hook;
  };
});
