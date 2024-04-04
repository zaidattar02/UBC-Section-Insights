"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useEffect, useState } from "react";
import { DatasetInterface } from "~/types/Dataset";
import { apiURL } from "./const";
import { toast } from "sonner";

function generateQuery1(selectedDataset: DatasetInterface): object {
	return {
		WHERE: {},
		OPTIONS: {
			COLUMNS: ["sections_dept", "avgGrade"],
			ORDER: {
				dir: "DOWN",
				keys: ["avgGrade"]
			}
		},
		TRANSFORMATIONS: {
			GROUP: ["sections_dept"],
			APPLY: [{ avgGrade: { AVG: "sections_avg" } }]
		}
	};
}
function generateQuery2(selectedDataset: DatasetInterface): object {
	return {
		WHERE: {},
		OPTIONS: {
			COLUMNS: ["sections_dept", "courseCount"],
			ORDER: {
				dir: "DOWN",
				keys: ["courseCount"]
			}
		},
		TRANSFORMATIONS: {
			GROUP: ["sections_dept"],
			APPLY: [{ courseCount: { COUNT: "sections_uuid" } }]
		}
	};
}

function generateQuery3(selectedDataset: DatasetInterface): object {
	return {
		WHERE: {},
		OPTIONS: {
			COLUMNS: ["sections_dept", "avgGrade"],
			ORDER: {
				dir: "DOWN",
				keys: ["avgGrade"]
			},
			LIMIT: 5
		},
		TRANSFORMATIONS: {
			GROUP: ["sections_dept"],
			APPLY: [{ avgGrade: { AVG: "sections_avg" } }]
		}
	};
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
            (async () => {
                const res = await fetch(`${apiURL}/query`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", },
                    body: JSON.stringify(q(selectedDataset)),
                })
                if(!res.ok) {
                    const data = (await res.text()).trim()
                    toast.error(data, {
                        description: `failed: \"${data}\"`
                    })
                    return
                }
                const data: {result: Array<any>} = await res.json()
                s(data.result)
            })();
        }
    }, [selectedDataset, datasets])

	const formattedData = queryResult1?.map(item => ({
		name: item.sections_dept, // X-axis label
		value: item.avgGrade// Y-axis value
	}));
	console.log(formattedData);

    return (
        <div>
			{formattedData && (
				<BarChart width={600} height={300} data={formattedData}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis dataKey="name" />
					<YAxis />
					<Tooltip />
					<Legend />
					<Bar dataKey="value" fill="#8884d8" />
				</BarChart>
			)}
		</div>
    );
}

// export default function Graphs() {
// 	// Dummy data for testing
// 	const data = [
// 		{ name: 'Page A', uv: 4000, pv: 2400, amt: 2400 },
// 		{ name: 'Page B', uv: 3000, pv: 1398, amt: 2210 },
// 		{ name: 'Page C', uv: 2000, pv: 9800, amt: 2290 },
// 		{ name: 'Page D', uv: 2780, pv: 3908, amt: 2000 },
// 		{ name: 'Page E', uv: 1890, pv: 4800, amt: 2181 },
// 		{ name: 'Page F', uv: 2390, pv: 3800, amt: 2500 },
// 		{ name: 'Page G', uv: 3490, pv: 4300, amt: 2100 },
// 	];
//
// 	return (
// 		<div>
// 			<BarChart width={600} height={300} data={data}>
// 				<CartesianGrid strokeDasharray="3 3" />
// 				<XAxis dataKey="name" />
// 				<YAxis />
// 				<Tooltip />
// 				<Legend />
// 				<Bar dataKey="pv" fill="#8884d8" />
// 				<Bar dataKey="uv" fill="#82ca9d" />
// 			</BarChart>
// 		</div>
// 	);
// }
