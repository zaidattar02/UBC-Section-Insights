import {Dataset} from "../model/Dataset";
import {SectionsDatasetProcessor} from "./SectionsDatasetProcessor";
import {RoomsDatasetProcessor} from "./RoomsDatasetProcessor";
import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
// import {parse} from "parse5";
// import * as tree from "parse5";
import {Attribute} from "parse5/dist/common/token";
import {parse, defaultTreeAdapter} from "parse5";
import{Document, Element, ChildNode, ParentNode, TextNode} from "parse5/dist/tree-adapters/default";
import doc = Mocha.reporters.doc;
import {Room} from "../model/Room";
import {
	CLASS_ADD,
	CLASS_CODE,
	CLASS_HREF, CLASS_FNAME, CLASS_CAP, CLASS_ROOM_FURNITURE, CLASS_ROOM_NUMBER, CLASS_ROOM_TYPE} from "./const";

//	TA feedback:
//	Dataset has an array of CourseSections
//	Also has a function addSection --> is this how I save the dataset locally? as in after parsing?
//	After implementing this file, do I create an instance of this class in InsightFacade?
//	Need to check for duplicate ids and kind
//	Abstract class and make methods static in TS
//	export abstract class Dataprocessor
//	public static methods

interface BuildingInfo {
	code: string;
	full: string;
	address: string;
	filePath: string;
	// TODO: add the lon and lan for geolocation
	// long: number| null;
	// lat: number| null;
}

// const CLASS_FNAME = "views-field-title";
// const CLASS_CODE = "views-field-field-building-code";
// const CLASS_ROOM_NUMBER = "views-field-field-room-number";
// const CLASS_ADD = "views-field-field-building-address";
// const CLASS_CAP = "views-field-field-room-capacity";
// const CLASS_ROOM_FURNITURE = "views-field-field-room-furniture";
// const CLASS_ROOM_TYPE = "views-field-field-room-type";
// const CLASS_HREF = "views-field-nothing";
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

			const indexContent = await indexFile.async("string");
			let document: Document;
			try {
				document = parse(indexContent);
			} catch (error) {
				throw new InsightError("Invalid Data: index.htm is not valid HTML");
			}

			// Extract building information from index.htm
			let buildingInfo: BuildingInfo[] = [];
			this.handleIndexHtm(defaultTreeAdapter.getChildNodes(document), buildingInfo);
			// console.log(buildingInfo);

			// Create a new dataset instance
			const dataset = new Dataset(id, kind);

			// Process each building's rooms and add them to the dataset
			const roomPromises = buildingInfo.map((building) => this.ProcessBuildingRooms(building, zip, dataset));
			await Promise.all(roomPromises);
			await fs.ensureDir("./data");
			const datasetJsonStr = JSON.stringify(dataset, null, 4);
			const datasetPath = `./data/${id}.json`;
			await fs.writeFile(datasetPath, datasetJsonStr);

			return dataset;
		} catch (error) {
			throw new InsightError(`Error loading dataset: ${error}`);
		}
	}


	private static async ProcessBuildingRooms(building: BuildingInfo, zip: JSZip, dataset: Dataset): Promise<void> {
		try {
			let htmlContent = await zip.file(building.filePath)?.async("string");
			let document: Document = parse(htmlContent as string);
			// console.log("parsed the doc");
			this.ParseRoom(building, defaultTreeAdapter.getChildNodes(document), dataset);
		} catch(e) {
			console.log(`Error: ${e}`);
			return;
		}
	}

	private static ParseRoom(validRoomsData: BuildingInfo, children: ChildNode[], dataset: Dataset): void {
		if (children) {
			for (let child of children) {
				if (child.nodeName === "tr" && child.parentNode?.nodeName === "tbody") {
					const childNodes: ChildNode[] = defaultTreeAdapter.getChildNodes(child as ParentNode);
					// console.log("entered table");

					const roomNumber = this.getRoomTD(childNodes, CLASS_ROOM_NUMBER);
					console.log(roomNumber);
					const roomSeatsStr = this.getRoomTD(childNodes, CLASS_CAP);
					// console.log(roomSeatsStr);
					const roomSeats = roomSeatsStr ? parseInt(roomSeatsStr, 10) : 0;
					// console.log(roomSeats);
					const roomType = this.getRoomTD(childNodes, CLASS_ROOM_TYPE);
					// console.log(roomType);
					const roomFurniture = this.getRoomTD(childNodes, CLASS_ROOM_FURNITURE);
					// console.log(roomFurniture);
					const roomHref = this.getRoomTD(childNodes, CLASS_HREF);

					const isRoomDataValid =
						roomNumber !== null &&
						roomSeatsStr !== null &&
						roomType !== null &&
						roomFurniture !== null &&
						roomHref !== null;
					// Only create and add the room if all data is valid
					if (isRoomDataValid) {
						// console.log("room is valid");
						const room = new Room(
							validRoomsData.full,
							validRoomsData.code,
							roomNumber,
							`${validRoomsData.code}_${roomNumber}`,
							validRoomsData.address,
							0, // Placeholder for latitude, you will need to set this
							0, // Placeholder for longitude, you will need to set this
							roomSeats,
							roomType,
							roomFurniture,
							roomHref,
						);
						dataset.addEntry(room);
						console.log(room);
					}
				}
				this.ParseRoom(validRoomsData, defaultTreeAdapter.getChildNodes(child as ParentNode), dataset);
			}
		}
	}

	// private static getRoomTD(childNodes: ChildNode[], classID: string): string | null {
	// 	for (let child of childNodes) {
	// 		if (child.nodeName === "td") {
	// 			let attrs: Attribute[] = defaultTreeAdapter.getAttrList(child as Element);
	// 			if (this.hasClassName(attrs, classID)) {
	// 				return this.getDataFromCell(child as Element, classID);
	// 			}
	// 		}
	// 	}
	// 	return null;
	// }

	private static getRoomTD(childNodes: ChildNode[], classID: string): string | null {
		for (let child of childNodes) {
			if (child.nodeName === "td") {
				let attrs: Attribute[] = defaultTreeAdapter.getAttrList(child as Element);
				if (this.hasClassName(attrs, classID)) {
					// getDataFromCell now returns an object with textContent and href
					const cellData = this.getDataFromCell(child as Element, classID);
					if (cellData) {
						// If classID matches the one for href, return href, otherwise return textContent
						return classID === CLASS_HREF ? cellData.href : cellData.textContent;
					}
				}
			}
		}
		return null;
	}

	private static getDataFromCell(tdElement: Element, classID: string):
		{textContent: string, href: string} | null {

		if (!defaultTreeAdapter.isElementNode(tdElement) ||
			!this.hasClassName(defaultTreeAdapter.getAttrList(tdElement), classID)) {
			return null;
		}

		// Use helper functions to simplify the main function body
		const anchorElement = this.findAnchorElement(tdElement);
		const href = this.extractHref(anchorElement);
		const textContent = this.extractTextContent(tdElement, anchorElement);

		return (textContent || href) ? {textContent, href} : null;
	}

	private static findAnchorElement(tdElement: Element): Element | undefined {
		return defaultTreeAdapter.getChildNodes(tdElement)
			.find((node) => defaultTreeAdapter.isElementNode(node) && node.tagName === "a") as Element | undefined;
	}

	private static extractHref(anchorElement: Element | undefined): string {
		if (!anchorElement) {
			return "";
		}
		const hrefAttr = defaultTreeAdapter.getAttrList(anchorElement)
			.find((attr) => attr.name === "href");
		return hrefAttr ? hrefAttr.value.trim() : "";
	}

	private static extractTextContent(tdElement: Element, anchorElement: Element | undefined): string {
		// If we have an anchor element, get the text from it; otherwise, get the text from the td element
		const sourceElement = anchorElement || tdElement;
		return sourceElement.childNodes
			.filter(defaultTreeAdapter.isTextNode)
			.map((node) => defaultTreeAdapter.getTextNodeContent(node))
			.join("").trim();
	}

	private static handleIndexHtm(children: ChildNode[], buildings: BuildingInfo[]){
		if(children){
			for(let child of children){
				if(child.parentNode?.nodeName === "tbody" && child.nodeName === "tr"){
					const buildingInf = this.getTableRow(defaultTreeAdapter.getChildNodes(child as ParentNode));
					if(buildingInf){
						buildings.push(buildingInf);
						// console.log(buildingInf);
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
					const titleData = this.getTableData(child as Element, CLASS_FNAME);
					if (titleData) {
						building.full = titleData.textContent;
						building.filePath = titleData.filePath.substring(2);
					}
				} else if (this.hasClassName(attrs, CLASS_ADD)) {
					const addressData = this.getTableData(child as Element, CLASS_ADD);
					if (addressData) {
						building.address = addressData.textContent;
					}
				} else if (this.hasClassName(attrs, CLASS_CODE)){
					const codeData = this.getTableData(child as Element, CLASS_CODE);
					if (codeData) {
						building.code = codeData.textContent;
					}
				}
			}
		}

		// Make sure all the necessary properties are defined
		if (building.code && building.full && building.address && building.filePath) {
			return building as BuildingInfo;
		} else {
			return null;
		}
	}

	private static getTableData(tdElement: Element, classID: string): {textContent: string, filePath: string} | null {
		if (!defaultTreeAdapter.isElementNode(tdElement)) {
			return null; // The node is not a <td> element
		}

		let attrs: Attribute[] = defaultTreeAdapter.getAttrList(tdElement);
		if (!this.hasClassName(attrs, classID)) {
			return null; // The <td> does not have the class we are interested in
		}

		// Initialize the object to hold our return values
		let result = {
			textContent: "",
			filePath: ""
		};

		// If we're looking for a link, need to find an <a> element with the href attribute
		if (classID === "views-field-title" || classID === CLASS_HREF) {
			const anchorElement = defaultTreeAdapter.getChildNodes(tdElement).find(
				(node) => defaultTreeAdapter.isElementNode(node) && node.tagName === "a"
			) as Element | undefined;

			if (anchorElement) {
				// Get the href attribute if it exists
				const hrefAttr = defaultTreeAdapter.getAttrList(anchorElement).find((attr) => attr.name === "href");
				if (hrefAttr) {
					result.filePath = hrefAttr.value.trim();
				}

				// Get the text content of the anchor element, which is the full name
				result.textContent = anchorElement.childNodes
					.filter(defaultTreeAdapter.isTextNode)
					.map((node) => defaultTreeAdapter.getTextNodeContent(node))
					.join("")
					.trim();
			}
		} else {
			// For other cases, just return the text content
			result.textContent = defaultTreeAdapter.getChildNodes(tdElement)
				.filter(defaultTreeAdapter.isTextNode)
				.map((node) => defaultTreeAdapter.getTextNodeContent(node))
				.join("")
				.trim();
		}

		return result.textContent || result.filePath ? result : null;
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
}
