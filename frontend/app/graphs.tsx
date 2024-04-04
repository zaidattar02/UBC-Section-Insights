"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Label } from 'recharts';
import { useEffect, useState } from "react";
import { DatasetInterface } from "~/types/Dataset";
import { apiURL } from "./const";
import { toast } from "sonner";

//Query To See Enrollment Trends after 2000 In Math
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
			COLUMNS: [`${idPrefix}_year`, "toalStudentFail"],
			ORDER: {
				dir: "DOWN",
				keys: ["toalStudentFail"],
			},
		},
		TRANSFORMATIONS: {
			GROUP: [`${idPrefix}_year`],
			APPLY: [
				{
					toalStudentFail: {
						SUM: `${idPrefix}_fail`,
					},
				},
			],
		},
	};
}

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

	const formattedData3 = queryResult3?.map(item => ({
		name: item[Object.keys(item)[0]], // X-axis label
		value: item[Object.keys(item)[1]]// Y-axis value
	}));

	const formattedData = queryResult1?.map(item => ({
		name: item.x_dept, // X-axis label
		value: item.avgGrade// Y-axis value
	}));
	console.log(formattedData);

	const formattedData2 = queryResult2?.map(item => ({
		name: item.x_dept, // X-axis label for second graph
		value: item.courseCount // Y-axis value for second graph
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
						<XAxis dataKey="name">
							<Label value="Year" offset={-5} position="insideBottom"/>
						</XAxis>
						<YAxis label={{value: 'Total Fails', angle: -90, position: 'insideLeft'} }/>
						<Tooltip/>
						<Legend verticalAlign="top" height={36}/>
						<Bar dataKey="value" fill="#FFEB3B" name ="# Fails"/>
					</BarChart>
				</div>
			)}
		</div>
	);
}
