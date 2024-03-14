import {defaultTreeAdapter,parse}  from "parse5";
import {BuildingInfo} from "../model/BuildingInfo";
import {Attribute} from "parse5/dist/common/token";
import{Element, ChildNode, ParentNode, Document} from "parse5/dist/tree-adapters/default";
import {
	CLASS_ADD,CLASS_CODE,
	CLASS_HREF, CLASS_FNAME,
	CLASS_CAP,CLASS_ROOM_FURNITURE,
	CLASS_ROOM_NUMBER, CLASS_ROOM_TYPE,
	GEOLOCATION_API_URL} from "./const";
import {Room} from "../model/Room";
import {fetchData} from "./HttpService";
import {assertTrue} from "./Assertions";
import {InsightError} from "../controller/IInsightFacade";
import {Dataset} from "../model/Dataset";
import JSZip from "jszip";

export class RoomsDatasetProcessor {

	public static handleIndexHtm(children: ChildNode[], buildings: BuildingInfo[]){
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

	public static getTableRow(children: ChildNode[]): BuildingInfo | null {
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

	public static getTableData(tdElement: Element, classID: string): {textContent: string, filePath: string} | null {
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

	public static hasClassName(attrs: Attribute[], className: string): boolean {
		return attrs.some((attr) => attr.name === "class" && attr.value.includes(className));
	}

	public static async ProcessBuildingRooms(
		building: BuildingInfo, zip: JSZip, dataset: Dataset<Room>
	): Promise<void> {
		try {
			let htmlContent = await zip.file(building.filePath)?.async("string");
			let document: Document = parse(htmlContent as string);
			await this.ParseRoom(building, defaultTreeAdapter.getChildNodes(document), dataset);
		} catch(e) {
			//	This is where the error length is being caught
			// console.log(`Error: ${e}`);
			return;
		}
	}

	public static async ParseRoom(validRoomsData: BuildingInfo, children: ChildNode[], dataset: Dataset<Room>) {
		if (children) {
			await Promise.all(children.map(async (child) => {
				if (child.nodeName === "tr" && child.parentNode?.nodeName === "tbody") {
					const childNodes: ChildNode[] = defaultTreeAdapter.getChildNodes(child as ParentNode);

					const roomNumber = this.getRoomTD(childNodes, CLASS_ROOM_NUMBER);
					const roomSeatsStr = this.getRoomTD(childNodes, CLASS_CAP);
					const roomSeats = roomSeatsStr ? parseInt(roomSeatsStr, 10) : 0;
					const roomType = this.getRoomTD(childNodes, CLASS_ROOM_TYPE);
					const roomFurniture = this.getRoomTD(childNodes, CLASS_ROOM_FURNITURE);
					const roomHref = this.getRoomTD(childNodes, CLASS_HREF);
					const isRoomDataValid =
						roomNumber !== null && roomSeatsStr !== undefined && roomSeats !== null &&
						roomType !== null && roomFurniture !== null && roomHref !== null;
					// Only create and add the room if all data is valid
					if (isRoomDataValid) {
						const geolocationResponse = await this.getGeoLocation(validRoomsData);

						// console.log("room is valid");
						const room = new Room(
							validRoomsData.full,
							validRoomsData.code,
							roomNumber,
							`${validRoomsData.code}_${roomNumber}`,
							validRoomsData.address,
							geolocationResponse.lat, // TODO: Placeholder for latitude, you will need to set this
							geolocationResponse.lon, // TODO: Placeholder for longitude, you will need to set this
							roomSeats,
							roomType,
							roomFurniture,
							roomHref,
						);
						dataset.addEntry(room);
						return room;
					}
				}
				return await this.ParseRoom(validRoomsData,
					defaultTreeAdapter.getChildNodes(child as ParentNode), dataset);
			}));
		}
	}

	public static async getGeoLocation(buildingInfo: BuildingInfo): Promise<{lat: number; lon: number}>{
		const encodedAddress = encodeURIComponent(buildingInfo.address);
		const apiUrl = `${GEOLOCATION_API_URL}/${encodedAddress}`;
		let responseJson: {lat: number; lon: number};

		try {
			const response = await fetchData(apiUrl);
			responseJson = JSON.parse(response);
			assertTrue(
				Object.prototype.hasOwnProperty.call(responseJson, "lat") &&
					Object.prototype.hasOwnProperty.call(responseJson, "lon"),
				"Invalid Room Details Found",
				InsightError
			);
			return responseJson;
		} catch (e) {
			console.log(e);
			throw new InsightError("Not Able to fetch Lat Long for the room");
		}
	}

	public static getRoomTD(childNodes: ChildNode[], classID: string): string | null {
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

	public static getDataFromCell(tdElement: Element, classID: string):
		{textContent: string, href: string} | null {

		if (!defaultTreeAdapter.isElementNode(tdElement) ||
			!RoomsDatasetProcessor.hasClassName(defaultTreeAdapter.getAttrList(tdElement), classID)) {
			return null;
		}

		// Use helper functions to simplify the main function body
		const anchorElement = this.findAnchorElement(tdElement);
		const href = this.extractHref(anchorElement);
		const textContent = this.extractTextContent(tdElement, anchorElement);

		// If the classID is for href and href is found, return it. Otherwise, return textContent.
		// This ensures that empty td elements return an empty string, not null.
		if (classID === CLASS_HREF && href) {
			return {textContent: "", href};
		} else {
			return {textContent, href: ""};
		}
	}

	public static findAnchorElement(tdElement: Element): Element | undefined {
		return defaultTreeAdapter.getChildNodes(tdElement)
			.find((node) => defaultTreeAdapter.isElementNode(node) && node.tagName === "a") as Element | undefined;
	}

	public static extractHref(anchorElement: Element | undefined): string {
		if (!anchorElement) {
			return "";
		}
		const hrefAttr = defaultTreeAdapter.getAttrList(anchorElement)
			.find((attr) => attr.name === "href");
		return hrefAttr ? hrefAttr.value.trim() : "";
	}


	public static extractTextContent(tdElement: Element, anchorElement: Element | undefined): string {
		// If we have an anchor element, get the text from it; otherwise, get the text from the td element
		const sourceElement = anchorElement || tdElement;
		const childTextNodes = sourceElement.childNodes.filter(defaultTreeAdapter.isTextNode);

		if (childTextNodes.length === 0) {
			// Return an empty string if the td element is present but contains no text nodes
			return "";
		}

		// Concatenate and trim the content of all text nodes
		return childTextNodes.map((node) => defaultTreeAdapter.getTextNodeContent(node)).join("").trim();
	}
}
