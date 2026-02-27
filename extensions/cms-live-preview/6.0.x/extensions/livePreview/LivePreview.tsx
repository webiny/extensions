import React from "react";
import { Admin } from "webiny/extensions";

export const LivePreview = () => {
  return <Admin.Extension src={"/extensions/LivePreview/AddLivePreview.tsx"} />;
};
