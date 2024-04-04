"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Label } from 'recharts';
import { useEffect, useState } from "react";
import { DatasetInterface } from "~/types/Dataset";
import { apiURL } from "./const";
import { toast } from "sonner";

function generateQuery1(selectedDataset: DatasetInterface): object {
	const idPrefix = selectedDataset.id;

	return {
		WHERE: {},
		OPTIONS: {
			COLUMNS: [`${idPrefix}_dept`, "avgGrade"],
			ORDER: {
				dir: "DOWN",
				keys: ["avgGrade"]
			}
		},
		TRANSFORMATIONS: {
			GROUP: [`${idPrefix}_dept`],
			APPLY: [{ avgGrade: { AVG: `${idPrefix}_avg` } }]
		}
	};
}
function generateQuery2(selectedDataset: DatasetInterface): object {
	const idPrefix = selectedDataset.id;
	return {
		WHERE: {},
		OPTIONS: {
			COLUMNS: [
				`${idPrefix}_dept`,
				"courseCount"
			],
			ORDER: {
				dir: "DOWN",
				keys: ["courseCount"]
			}
		},
		TRANSFORMATIONS: {
			GROUP: [`${idPrefix}_dept`],
			APPLY: [{ courseCount: { COUNT: `${idPrefix}_uuid` } }]
		}
	};
}

function generateQuery3(selectedDataset: DatasetInterface): object {
	const idPrefix = selectedDataset.id;
	return {
		WHERE: {},
		OPTIONS: {
			COLUMNS: [
				`${idPrefix}_dept`,
				"avgGrade"
			],
			ORDER: {
				dir: "DOWN",
				keys: ["avgGrade"]
			},
			// LIMIT: 5
		},
		TRANSFORMATIONS: {
			GROUP: [`${idPrefix}_dept`],
			APPLY: [{ avgGrade: { AVG: `${idPrefix}_avg` } }]
		}
	};
}

// function generateQuery3(selectedDataset: DatasetInterface): object {
// 	return {
// 		WHERE: {
// 			AND: [
// 				{
// 					GT: {[`${selectedDataset.id}_year`]: 2000},
// 				},
// 				{
// 					IS: {
// 						[`${selectedDataset.id}_dept`]: "math",
// 					},
// 				},
// 			],
// 		},
// 		OPTIONS: {
// 			COLUMNS: [
// 				`${selectedDataset.id}_id`,
// 				`${selectedDataset.id}_title`,
// 				`${selectedDataset.id}_year`,
// 				`${selectedDataset.id}_pass`,
// 				`${selectedDataset.id}_fail`,
// 				`${selectedDataset.id}_audit`,
// 			],
// 			// ORDER: "${selectedDataset.id}_year",
// 			ORDER: `${selectedDataset.id}_year`,
// 		},
// 	};
// }

export default function Graphs({selectedDataset, datasets}: {selectedDataset: DatasetInterface, datasets: DatasetInterface[]}) {
    const [queryResult1, setQueryResult1] = useState<Array<any> | null>(null);
    const [queryResult2, setQueryResult2] = useState<Array<any> | null>(null);
    const [queryResult3, setQueryResult3] = useState<Array<any> | null>(null);

    useEffect(() => {
        if (!selectedDataset) return;

        for (const {s, q, n} of [
                {s: setQueryResult1, q: generateQuery1, n: 1},
                {s: setQueryResult2, q: generateQuery2, n: 2},
                {s: setQueryResult3, q: generateQuery3, n: 3}
            ]) {
            (async () => {
                const res = await fetch(`${apiURL}/query`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", },
                    body: JSON.stringify(q(selectedDataset)),
                })

				// const query = q(selectedDataset);
				// console.log(query);
                if(!res.ok) {
                    const clone = res.clone()
                    const data: {error: string} | string = await res.json().catch(async e => (await clone.text()).trim())
                    toast.error(`Query ${n} Failed`, {
                        description: `failed: \"${typeof data === "object" ? data.error : data}\"`
                    })
                    return
                }
                const data: {result: Array<any>} = await res.json()
				console.log(`Query ${n} result:`, data.result);
                s(data.result)
            })();
        }
    }, [selectedDataset, datasets])

	const formattedData = queryResult1?.map(item => ({
		name: item.x_dept, // X-axis label
		value: item.avgGrade// Y-axis value
	}));
	console.log(formattedData);

	const formattedData2 = queryResult2?.map(item => ({
		name: item.x_dept, // X-axis label for second graph
		value: item.courseCount // Y-axis value for second graph
	}));

	const formattedData3 = queryResult3?.map(item => ({
		name: item.sections_dept, // X-axis label for third graph
		value: item.avgGrade // Y-axis value for third graph
	}));


    return (
		<div className="graphs-container" style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
			{formattedData && (
				<div style={{ marginBottom: '20px' }}>
				<BarChart width={600} height={300} data={formattedData}>
					<CartesianGrid strokeDasharray="3 3"/>
					<XAxis dataKey="name">
						<Label value="Department" offset={-5} position="insideBottom"/>
					</XAxis>
					<YAxis label={{value: 'Average Grade', angle: -90, position: 'insideLeft'}}/>
					<Tooltip/>
					<Legend verticalAlign="top" height={36}/>
					<Bar dataKey="value" name="Avg Grade" fill="#8884d8"/>
				</BarChart>
				</div>
			)}
			{formattedData2 && (
				<div style={{ marginBottom: '20px' }}>
				<BarChart width={600} height={300} data={formattedData2}>
					<CartesianGrid strokeDasharray="3 3"/>
					<XAxis dataKey="name">
						<Label value="Department" offset={-5} position="insideBottom"/>
					</XAxis>
					<YAxis label={{value: '# Courses', angle: -90, position: 'insideLeft'}}/>
					<Tooltip/>
					<Legend verticalAlign="top" height={36}/>
					<Bar dataKey="value" fill="#4285F4" name="# Courses"/>
				</BarChart>
				</div>
			)}
			{formattedData3 && (
				<div style={{ marginBottom: '20px' }}>
				<BarChart width={600} height={300} data={formattedData3}>
					<CartesianGrid strokeDasharray="3 3"/>
					<XAxis dataKey="name"/>
					<YAxis/>
					<Tooltip/>
					<Legend/>
					<Bar dataKey="value" fill="#FFEB3B"/>
				</BarChart>
				</div>
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
