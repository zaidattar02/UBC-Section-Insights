import {alwaysNumber, alwaysString} from "../service/Sanitization";
import {IDatasetEntry} from "./Dataset";

export interface Room extends IDatasetEntry {
	fullname: string;
	shortname: string;
	number: string;
	name: string;
	address: string;
	lat: number;
	lon: number;
	seats: number;
	type: string;
	furniture: string;
	href: string;
}

export function createRoom(
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
): Room {
	return {
		fullname: alwaysString(fullname),
		shortname: alwaysString(shortname),
		number: alwaysString(number),
		name: alwaysString(name),
		address: alwaysString(address),
		lat: alwaysNumber(lat),
		lon: alwaysNumber(lon),
		seats: alwaysNumber(seats),
		type: alwaysString(type),
		furniture: alwaysString(furniture),
		href: alwaysString(href),
	};
}

export const RoomNumericalKeyList: string[] = ["lat", "lon", "seats"];
export const RoomStringKeyList: string[] = ["fullname", "shortname", "number", "name",
	"address", "type", "furniture", "href"];
export const RoomKeyList = [...RoomNumericalKeyList, ...RoomStringKeyList];
