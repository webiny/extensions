import React from "react";
import { Admin, Api } from "webiny/extensions";

export const LivePreview = () => {
  return (
    <>
      <Admin.Extension src={"/extensions/livePreview/admin/LivePreview.tsx"} />
      <Api.Extension src={"/extensions/livePreview/api/ArticleModel.ts"} />
    </>
  );
};
