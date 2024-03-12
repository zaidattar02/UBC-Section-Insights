import JSZip from "jszip";
import {CourseSection} from "../model/CourseSection";
import {Dataset} from "../model/Dataset";
import fs from "fs-extra";
import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
// import {parse} from "parse5";
// import * as tree from "parse5";
import {Attribute} from "parse5/dist/common/token";
import {parse, defaultTreeAdapter} from "parse5";
import{Document, Element, ChildNode, ParentNode, TextNode} from "parse5/dist/tree-adapters/default";
import doc = Mocha.reporters.doc;


//	TA feedback:
//	Dataset has an array of CourseSections
//	Also has a function addSection --> is this how I save the dataset locally? as in after parsing?
//	After implementing this file, do I create an instance of this class in InsightFacade?
//	Need to check for duplicate ids and kind
//	Abstract class and make methods static in TS
//	export abstract class Dataprocessor
//	public static methods

interface BuildingInfo {
	code: string| null;
	full: string| null;
	address: string| null;
	filePath: string| null;
	// TODO: add the lon and lan for geolocation
	// long: number| null;
	// lat: number| null;
}

const CLASS_FNAME = "views-field-title";
const CLASS_CODE = "views-field-field-building-code";
const CLASS_ROOM_NUMBER = "views-field-field-room-number";
const CLASS_ADD = "views-field-field-building-address";
const CLASS_ROOM_CAP = "views-field-field-room-capacity";
const CLASS_ROOM_FURNITURE = "views-field-field-room-furniture";
const CLASS_ROOM_TYPE = "views-field-field-room-type";

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
			//	Use this array of promises to keep track of all the asyn ops and await for them
			let buildiongInfo: BuildingInfo[] = [];
			const dataset = new Dataset(id,kind);
			const filePromises: any[] = [];
			const indexContent = await indexFile.async("string");
			try {
				const document = parse(indexContent as string);
				const c = defaultTreeAdapter.getChildNodes(document);
				this.handleIndexHtm(c,buildiongInfo);
			} catch (error) {
				throw new InsightError("Invalid Data: index.htm is not valid HTML");
			}

			return dataset;
			// TODO: Rest of implementation.
		} catch (error) {
			throw new InsightError(`Error loading dataset: ${error}`);
		}
	}

	private static handleIndexHtm(children: ChildNode[], buildings: BuildingInfo[]){
		if(children){
			for(let child of children){
				if(child.parentNode?.nodeName === "tbody" && child.nodeName === "tr"){
					const buildingInf = this.getTableRow(defaultTreeAdapter.getChildNodes(child as ParentNode));
					if(buildingInf){
						buildings.push(buildingInf);
						console.log(buildingInf);
					}
				}
				// recursive call to check the rest of the tree by taking the current child as the parent
				this.handleIndexHtm(defaultTreeAdapter.getChildNodes(child as ParentNode), buildings);
			}
		}
	}

	private static getTableRow(children: ChildNode[]): BuildingInfo | null {
		let building: Partial<BuildingInfo> = {};

		for (let child of children) {
			if (child.nodeName === "td") {
				let attrs: Attribute[] = defaultTreeAdapter.getAttrList(child as Element);

				if (this.hasClassName(attrs, CLASS_FNAME)) {
					building.full = this.getTableData(child as Element, CLASS_FNAME);
					building.filePath = this.getTableData(child as Element, CLASS_FNAME)?.substring(2);
				} else if (this.hasClassName(attrs, CLASS_ADD)) {
					building.address = this.getTableData(child as Element, CLASS_ADD);
				} else if (this.hasClassName(attrs, CLASS_CODE)){
					building.code = this.getTableData(child as Element,CLASS_CODE);
				}
			}
		}

		if (building.code && building.filePath && building.address && building.full) {
			return building as BuildingInfo;
		} else {
			return null;
		}
	}

	private static getTableData(tdElement: Element, classID: string): string | null {
		if (!defaultTreeAdapter.isElementNode(tdElement)) {
			return null; // The node is not a <td> element
		}

		let attrs: Attribute[] = defaultTreeAdapter.getAttrList(tdElement);
		if (!this.hasClassName(attrs, classID)) {
			return null; // The <td> does not have the class we are interested in
		}

		// We're looking for text content, return the text content directly
		if (classID === "views-field-title") {
			// Find the <a> element for text content, not just the href
			const anchorElement = defaultTreeAdapter.getChildNodes(tdElement).find(
				(node) => defaultTreeAdapter.isElementNode(node) && node.tagName === "a"
			) as Element | undefined;

			if (anchorElement) {
				// Get all the text nodes within the anchor element and concatenate their content
				let textContent = "";
				const textNodes = defaultTreeAdapter.getChildNodes(anchorElement).filter((node) =>
					defaultTreeAdapter.isTextNode(node)
				);

				for (const textNode of textNodes) {
					textContent += defaultTreeAdapter.getTextNodeContent(textNode as TextNode);
				}
				return textContent.trim();
			}
			return null; // If no anchor element is found, return null
		} else {
			// For non-title fields, return the text content of the <td>
			let textContent = "";
			let childNodes = defaultTreeAdapter.getChildNodes(tdElement);
			for (let textNode of childNodes) {
				if (defaultTreeAdapter.isTextNode(textNode)) {
					textContent += defaultTreeAdapter.getTextNodeContent(textNode as TextNode);
				}
			}
			return textContent.trim();
		}
	}

	// private static getTableData(tdElement: Element, classID: string): string | null {
	// 	if (!defaultTreeAdapter.isElementNode(tdElement)) {
	// 		return null; // The node is not a <td> element
	// 	}
	//
	// 	let attrs: Attribute[] = defaultTreeAdapter.getAttrList(tdElement);
	// 	if (!this.hasClassName(attrs, classID)) {
	// 		return null; // The <td> does not have the class we are interested in
	// 	}
	//
	// 	// If we're looking for a link, need to find an <a> element with the href attribute
	// 	if (classID === "views-field-title") {
	// 		const anchorElement = defaultTreeAdapter.getChildNodes(tdElement).find(
	// 			(node) => defaultTreeAdapter.isElementNode(node) && node.tagName === "a"
	// 		) as Element | undefined;
	//
	// 		if (anchorElement) {
	// 			const hrefAttr = defaultTreeAdapter.getAttrList(anchorElement).find((attr) => attr.name === "href");
	// 			return hrefAttr ? hrefAttr.value.trim() : null;
	// 		}
	// 	} else {
	// 		// For other cases, just return the text content
	// 		let textContent = "";
	// 		let childNodes = defaultTreeAdapter.getChildNodes(tdElement);
	// 		for (let textNode of childNodes) {
	// 			if (defaultTreeAdapter.isTextNode(textNode)) {
	// 				textContent += defaultTreeAdapter.getTextNodeContent(textNode as TextNode);
	// 			}
	// 		}
	// 		return textContent.trim();
	// 	}
	//
	// 	return null;
	// }

	private static findAttribute(attrs: Attribute[], name: string): Attribute | undefined {
		return attrs.find((attr) => attr.name === name);
	}

	private static hasClassName(attrs: Attribute[], className: string): boolean {
		for (let attr of attrs) {
			if (attr.name === "class" && attr.value.includes(className)) {
				return true;
			}
		}
		return false;
	}

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
