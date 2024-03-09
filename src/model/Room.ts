export class Room{
	private fullname: string;
	private shortname: string;
	private number: string;
	private name: string;
	private address: string;
	private lat: number;
	private lon: number;
	private seats: number;
	private type: string;
	private furniture: string;
	private href: string;

	constructor(
		fullname: string,
		shortname: string,
		number: string,
		name: string,
		address: string,
		lat: number,
		lon: number,
		seats: number,
		type: string,
		furniture: string,
		href: string,
	){
		this.fullname = this.alwaysString(fullname);
		this.shortname = this.alwaysString(shortname);
		this.number = this.alwaysString(number);
		this.name = this.alwaysString(name);
		this.address = this.alwaysString(address);
		this.lat = this.alwaysNumber(lat);
		this.lon = this.alwaysNumber(lon);
		this.seats = this.alwaysNumber(seats);
		this.type = this.alwaysString(type);
		this.furniture = this.alwaysString(furniture);
		this.href = this.alwaysString(href);

	}

	private alwaysNumber(value: any): number {
		if (typeof value === "number") {
			return value;
		}

		// If it's not a number, we assume it's a string and try to clean it up.
		// This regex removes any characters that are not digits, decimal points, or minus signs.
		const cleanedValue = String(value).replace(/[^0-9.-]+/g, "");

		// Now try to convert the cleaned string to a number.
		const numberValue = Number(cleanedValue);

		// Check if the resulting number is actually a number and not NaN.
		if (isNaN(numberValue)) {
			throw new Error("Cannot cast to number");
		}

		return numberValue;
	}

	private alwaysString(value: any): string {
		if (typeof value !== "string") {
			return String(value);
		}
		return value;
	}
}

export type RoomNumericalKeys = "lat" | "lon" | "seats";
export const RoomNumericalKeyList: string[] = ["lat", "lon", "seats"];

export type RoomStringKeys = "fullname" | "shortname" | "number" | "name" | "address" | "type" | "furniture" | "href";
export const RoomStringKeyList: string[] = ["fullname", "shortname", "number", "name",
	"address", "type", "furniture", "href"];

export type RoomKey = keyof Room;
export const RoomKeyList = [...RoomNumericalKeyList, ...RoomStringKeyList];
