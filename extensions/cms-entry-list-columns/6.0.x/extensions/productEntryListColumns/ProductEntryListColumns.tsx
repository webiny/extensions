import React from "react";
import { ContentEntryListConfig } from "webiny/admin/cms/entry/list";

const { Browser } = ContentEntryListConfig;

interface ProductTableRow {
    values: {
        price: number;
    };
}

const PriceCell = () => {
    const { useTableRow, isFolderRow } = ContentEntryListConfig.Browser.Table.Column;
    const { row } = useTableRow<ProductTableRow>();

    if (isFolderRow(row)) {
        return <>{"-"}</>;
    }

    const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(row.data.values.price);

    return <>{formatted}</>;
};

const ProductEntryListColumns = () => {
    return (
        <ContentEntryListConfig>
            <Browser.Table.Column
                name={"price"}
                after={"sku"}
                header={"Price"}
                modelIds={["product"]}
                cell={<PriceCell />}
                sortable={true}
                visible={false}
            />
        </ContentEntryListConfig>
    );
};

export default ProductEntryListColumns;
