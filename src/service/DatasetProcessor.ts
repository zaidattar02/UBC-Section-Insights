import JSZip from "jszip";
import {CourseSection} from "../model/CourseSection";
import {Dataset} from "../model/Dataset";
import fs from "fs-extra";
import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
// import {parse} from "parse5";
import * as tree from "parse5";
import{Document, Element} from "parse5/dist/tree-adapters/default";


//	TA feedback:
//	Dataset has an array of CourseSections
//	Also has a function addSection --> is this how I save the dataset locally? as in after parsing?
//	After implementing this file, do I create an instance of this class in InsightFacade?
//	Need to check for duplicate ids and kind
//	Abstract class and make methods static in TS
//	export abstract class Dataprocessor
//	public static methods

interface BuildingInfo {
	name: string;
	address: string;
	filePath: string;
}

export abstract class DatasetProcessor {
	public static async ProcessDatasetSection(id: string, content: string, kind: InsightDatasetKind): Promise<Dataset> {
		try {
			const zip = new JSZip();
			const data = await zip.loadAsync(content, {base64: true});
			const coursesFolder = data.folder("courses");
			if (!coursesFolder) {
				throw new InsightError("Invalid Data");
			}
			const dataset = new Dataset(id, kind);
			const filePromises: any[] = [];
			coursesFolder.forEach((relativePath, file) => {
				const filePromise = this.processFile(file, dataset);
				filePromises.push(filePromise);
			});
			await Promise.all(filePromises);
			if (dataset.getEntries().length === 0) {
				throw new InsightError("No valid sections found in the dataset");
			}
			//	convert JS object into JSON object, and save that representation to disk
			//  save this dataset as a JSON file to save it back without checks and validations
			//	save one file per dataset
			await fs.ensureDir("./data");
			const datasetJsonStr = JSON.stringify(dataset, null, 4);
			const datasetPath = `./data/${id}.json`;
			await fs.writeFile(datasetPath, datasetJsonStr);
			return dataset;
		} catch (error) {
			throw new InsightError(`Error loading dataset: ${error}`);
		}
	}

	public static async ProcessDatasetRoom(id: string, content: string, kind: InsightDatasetKind): Promise<Dataset> {
		try {
			const zip = new JSZip();
			const data = await zip.loadAsync(content, {base64: true});
			const indexFile = data.file("index.htm");
			if (!indexFile) {
				throw new InsightError("Invalid Data: No index file");
			}

			// Ensure that index.htm is a valid HTML file
			const indexContent = await indexFile.async("string");
			try {
				const document = tree.parse(indexContent);
			} catch (error) {
				throw new InsightError("Invalid Data: index.htm is not valid HTML");
			}
			const dataset = new Dataset(id,kind);
			// TODO: Rest of implementation.

			return dataset;
		} catch (error) {
			throw new InsightError(`Error loading dataset: ${error}`);
		}
	}

	private static findBuildingTable(node: any): any | null {
		if (node.tagName === "table") {
			// Check if this table has <td> with correct classes
			const titleCell = this.findChildWithClass(node, "views-field-title");
			const addressCell = this.findChildWithClass(node, "views-field-field-building-address");

			if (titleCell && addressCell) {
				return node;
			}
		}

		for (const child of node.childNodes || []) {
			const result = this.findBuildingTable(child);
			if (result) {
				return result;
			}
		}

		return null;
	}

	private static findChildWithClass(node: any, className: string): any | null {
		if (node.attrs && node.attrs.some((attr: {name: string; value: string}) => attr.name === "class"
			&& attr.value.includes(className))) {
			return node;
		}

		for (const child of node.childNodes || []) {
			const result = this.findChildWithClass(child, className);
			if (result) {
				return result;
			}
		}

		return null;
	}

	private static extractBuildingInfo(document: Document): BuildingInfo[] {
		const buildingTable = this.findBuildingTable(document);

		if (!buildingTable) {
			throw new Error("Building table not found");
		}

		return Array.from(buildingTable.childNodes)
			.filter((node) => node.tagName === "tr")
			.map((rowNode) => this.extractBuildingInfoFromRow(rowNode));
	}

	private static extractBuildingInfoFromRow(rowNode: any): BuildingInfo {
		const titleCell = this.findChildWithClass(rowNode, "views-field-title");
		const addressCell = this.findChildWithClass(rowNode, "views-field-field-building-address");

		const name = titleCell && titleCell.childNodes.length > 0 ? titleCell.childNodes[0].value.trim() : "";
		const address = addressCell ? addressCell.childNodes[0].value.trim() : "";
		const filePath = titleCell && titleCell.childNodes.some((node: {nodeName: string;}) => node.nodeName === "a")
			? titleCell.childNodes.find((node: {nodeName: string;}) =>
				node.nodeName === "a").attrs.find((attr: {name: string; value: string}) =>
				attr.name === "href").value.trim()
			: "";
		return {name, address, filePath};
	}

	// private static extractBuildingInfo(document: Document): BuildingInfo[] {
	// 	// This is an array to hold our building info objects
	// 	let buildings: BuildingInfo[] = [];
	//
	// 	// Here we would find the table with the building information
	// 	let buildingTableBody = this.findBuildingTable(document);
	//
	// 	// If we didn't find a valid building table, we should throw an error
	// 	if (!buildingTableBody) {
	// 		throw new InsightError("No valid building table found");
	// 	}
	//
	// 	// We iterate over each row in the table body
	// 	buildingTableBody.childNodes.forEach((row) => {
	// 		// Make sure this is a row element
	// 		if (row.nodeName === "tr") {
	// 			// Extract the building info from the row
	// 			let buildingInfo = this.extractBuildingInfoFromRow(row);
	// 			buildings.push(buildingInfo);
	// 		}
	// 	});
	//
	// 	return buildings;
	// }

	// private static findBuildingTable(document: Document): Element | null {
	// 	// Convert the NodeList to an array using Array.from
	// 	const tables = Array.from(document.querySelectorAll("table"));
	//
	// 	// iterate over the array with a for-of loop
	// 	for (const table of tables) {
	// 		const titleCell = table.querySelector("td.views-field.views-field-title");
	// 		const addressCell = table.querySelector("td.views-field.views-field-field-building-address");
	//
	// 		if (titleCell && addressCell) {
	// 			return table;
	// 		}
	// 	}
	//
	// 	return null;
	// }

	// private static extractBuildingInfoFromRow(row: ChildNode): BuildingInfo {
	// 	let buildingInfo: BuildingInfo = {
	// 		name: "",
	// 		address: "",
	// 		filePath: ""
	// 	};
	//
	// 	// Make sure the row is an element before proceeding
	// 	if (!(row instanceof Element)) {
	// 		return buildingInfo;
	// 	}
	//
	// 	const titleCell = row.querySelector(".views-field-title");
	// 	const addressCell = row.querySelector(".views-field-field-building-address");
	//
	// 	if (!titleCell || !addressCell) {
	// 		return buildingInfo;
	// 	}
	//
	// 	// Extract the building name and address text
	// 	buildingInfo.name = titleCell.textContent || "";
	// 	buildingInfo.address = addressCell.textContent || "";
	//
	// 	// Find the <a> element within the title cell to extract the filePath
	// 	const linkElement = titleCell.querySelector("a");
	// 	if (linkElement instanceof HTMLAnchorElement) {
	// 		buildingInfo.filePath = linkElement.getAttribute("href") || "";
	// 	}
	//
	// 	return buildingInfo;
	// }


	public static async processFile(file: JSZip.JSZipObject, dataset: Dataset): Promise<void> {
		const fileContent = await file.async("string");
		try {
			const jsonData = JSON.parse(fileContent);
			//	check if there is at least one valid section in file
			if (!this.hasValidSection(jsonData.result)) {
				return; // Skip this file as it doesn't contain any valid section
			}
			jsonData.result.forEach((sectionData: any) => {
				if (sectionData.section === "overall") {
					sectionData.year = 1900;
				}
				try {
					const section = new CourseSection(
						sectionData.id,
						sectionData.Course,
						sectionData.Title,
						sectionData.Professor,
						sectionData.Subject,
						sectionData.Avg,
						sectionData.Pass,
						sectionData.Fail,
						sectionData.Audit,
						sectionData.Year
					);
					dataset.addEntry(section);
				} catch (e) {
					console.error(`Invalid section data in file: ${e}`);
				}
			});
		} catch (e) {
			console.error(`Error parsing file content to JSON: ${e}`);
			return;
		}
	}

	private static hasValidSection(sections: any[]): boolean {
		const validKeys = ["id", "Course", "Title", "Professor", "Subject", "Avg", "Pass", "Fail", "Audit", "Year"];
		// Check if at least one section has all valid keys
		return sections.some((section) => validKeys.every((key) => Object.hasOwn(section, key)));
	}
}
