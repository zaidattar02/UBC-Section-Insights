"use client"

import { useEffect, useState } from "react";
import { DatasetInterface } from "~/types/Dataset";
import { apiURL } from "./const";

function generateQuery1(selectedDataset: DatasetInterface): object {
    return {}
}
function generateQuery2(selectedDataset: DatasetInterface): object {
    return {}
}
function generateQuery3(selectedDataset: DatasetInterface): object {
    return {}
}

export default function Graphs({selectedDataset, datasets}: {selectedDataset: DatasetInterface, datasets: DatasetInterface[]}) {
    const [queryResult1, setQueryResult1] = useState<Array<any> | null>(null);
    const [queryResult2, setQueryResult2] = useState<Array<any> | null>(null);
    const [queryResult3, setQueryResult3] = useState<Array<any> | null>(null);

    useEffect(() => {
        if (!selectedDataset) return;
        for (const {s, q} of [
                {s: setQueryResult1, q: generateQuery1},
                {s: setQueryResult2, q: generateQuery2},
                {s: setQueryResult3, q: generateQuery3}
            ]) {
            fetch(`${apiURL}/query`, {
                method: "POST",
                headers: { "Content-Type": "application/json", },
                body: JSON.stringify(q(selectedDataset)),
            }).then(res => res.json()).then(data => s(data.result))
        }
    }, [selectedDataset, datasets])
    
    return (
        <div></div>
    )
}