/**
 * This function returns the domain name where the live preview app runs.
 * If you are running Webiny locally it will return http://localhost:3000
 * If you're currently accessing Webiny from a live domain, it should return the url to your live frontend application.
 * NOTE: modify the todo line with your live domain info.
 */
const getDomain = () => {
  if (window.location.hostname === "localhost") {
    return "http://localhost:3000";
  }
  // todo: put your live domain here
  return "http://localhost:3000";
};

const previewPaths: Record<string, string> = {
  article: "/articles/preview"
};

const slugPaths: Record<string, string> = {
  article: "/articles"
};

export const getPreviewUrl = (modelId: string, editorOrigin: string) => {
  const path = previewPaths[modelId];
  if (!path) return null;
  return `${getDomain()}${path}?origin=${editorOrigin}`;
};

export const getDisplayUrl = (modelId: string, slug?: string) => {
  const basePath = slugPaths[modelId];
  if (!basePath) return null;
  return `${getDomain()}${basePath}/${slug || ""}`;
};
