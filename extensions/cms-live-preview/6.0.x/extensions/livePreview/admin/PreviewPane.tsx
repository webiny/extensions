import React, { useRef, useState, useCallback, useEffect } from "react";
import { IconButton } from "webiny/admin/ui";
import { Input } from "webiny/admin/ui";
import { OverlayLoader } from "webiny/admin/ui";
import { SegmentedControl } from "webiny/admin/ui";
import { ReactComponent as RefreshIcon } from "webiny/admin/icons/refresh.svg";
import { ReactComponent as ContentCopyIcon } from "webiny/admin/icons/content_copy.svg";
import { ReactComponent as LaptopIcon } from "webiny/admin/icons/laptop.svg";
import { ReactComponent as SmartphoneIcon } from "webiny/admin/icons/smartphone.svg";
import { ReactComponent as OpenInNewIcon } from "webiny/admin/icons/open_in_new.svg";
import { getDisplayUrl } from "./getPreviewUrl";

export interface PreviewProps {
  previewUrl: string;
  modelId: string;
}

type ViewportMode = "desktop" | "mobile";

export const PreviewPane = (props: PreviewProps) => {
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState(getDisplayUrl(props.modelId) || props.previewUrl);
  const [previewUrl, setPreviewUrl] = useState(props.previewUrl);
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [entryId, setEntryId] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Listen for slug and entryId changes dispatched by LivePreviewEditor.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const slug = detail?.slug as string | undefined;
      const id = detail?.entryId as string | undefined;
      const displayUrl = getDisplayUrl(props.modelId, slug);
      if (displayUrl) {
        setAddress(displayUrl);
      }
      if (id) {
        setEntryId(id);
      }
    };

    window.addEventListener("wby:slugChange", handler);
    return () => window.removeEventListener("wby:slugChange", handler);
  }, [props.modelId]);

  const reload = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    setLoading(true);
    const newSrc = new URL(iframe.src ?? previewUrl);
    newSrc.searchParams.set("ts", Date.now().toString());
    iframe.src = newSrc.toString();
  }, [previewUrl]);

  const copyUrl = useCallback(() => {
    navigator.clipboard.writeText(address);
  }, [address]);

  const openInNewTab = useCallback(() => {
    // Open with preview=true and id so the page fetches the draft version.
    const url = new URL(address);
    url.searchParams.set("preview", "true");
    if (entryId) {
      url.searchParams.set("id", entryId);
    }
    window.open(url.toString(), "_blank");
  }, [address, entryId]);

  const onLoadFinish = () => {
    setLoading(false);
  };

  const onEnter = () => {
    setPreviewUrl(address);
    setLoading(true);
  };

  return (
    <div className="relative border border-neutral-dimmed rounded-t-lg  flex flex-col max-[960px]:hidden flex-1 h-full overflow-y-scroll">
      {/* Toolbar */}
      <div className="flex p-md items-center p-md bg-white border-b border-neutral-dimmed">

        {/* URL input */}
        <div className="w-full border-neutral-dimmed p-xs rounded-lg">
          <Input
            value={address}
            onChange={setAddress}
            onEnter={onEnter}
            size="md"
            className={"bg-gray-100"}
          />
        </div>

        {/* Copy & Reload */}
        <div className="flex border-neutral-dimmed bg-white p-xs rounded-lg ml-2">
          <div className="flex items-center gap-xxs">
            {/* Open in new tab */}
            <IconButton
              onClick={openInNewTab}
              icon={<OpenInNewIcon />}
              variant="ghost"
              size="md"
            />

            <IconButton
              onClick={copyUrl}
              icon={<ContentCopyIcon />}
              variant="ghost"
              size="sm"
            />

            <IconButton
              onClick={reload}
              icon={<RefreshIcon />}
              variant="ghost"
              size="sm"
            />
          </div>

          {/* Desktop / Mobile toggle */}
          <SegmentedControl
            value={viewport}
            onChange={(value: string) => setViewport(value as ViewportMode)}
            items={[
              { value: "desktop", label: "", icon: <LaptopIcon /> },
              { value: "mobile", label: "", icon: <SmartphoneIcon /> },
            ]}
          />

        </div>
      </div>

      {/* Preview iframe */}
      <div className="block box-border h-full w-full overflow-auto">
        {loading ? <OverlayLoader text="Connecting to Live Preview..." /> : null}
        <div
          className="mx-auto h-full transition-all duration-300 p-md bg-white"
          style={{
            width: viewport === "mobile" ? "375px" : "100%",
          }}
        >
          <iframe
            onLoad={onLoadFinish}
            ref={(ref) => {
              iframeRef.current = ref;
            }}
            id="live-preview-iframe"
            sandbox="allow-same-origin allow-scripts allow-forms"
            src={previewUrl}
            width="100%"
            height="100%"
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
};
